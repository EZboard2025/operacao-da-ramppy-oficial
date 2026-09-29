"use server";

import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDB } from "@/db";
import {
	contatosEvento as contatosTable,
	eventos as eventosTable,
	type ContatoEventoRow,
	type EventoRow,
} from "@/db/schema";
import { getSessaoAtual } from "@/lib/auth-session";
import type {
	ContatoEvento,
	ContatoInput,
	Evento,
	EventoInput,
	StatusContato,
	SyncPipedrive,
} from "@/lib/eventos";
import { enviarContatoParaPipedrive, statusPipedrive } from "@/lib/pipedrive";

function rowToEvento(row: EventoRow): Evento {
	return {
		id: row.id,
		nome: row.nome,
		local: row.local,
		data: row.data,
		notas: row.notas,
		createdAt: row.createdAt,
	};
}

function rowToContato(row: ContatoEventoRow): ContatoEvento {
	return {
		id: row.id,
		eventoId: row.eventoId,
		nome: row.nome,
		empresa: row.empresa,
		cargo: row.cargo,
		telefone: row.telefone,
		email: row.email,
		notas: row.notas,
		status: row.status as StatusContato,
		pipedriveDealId: row.pipedriveDealId,
		pipedriveStatus: row.pipedriveStatus as SyncPipedrive,
		pipedriveErro: row.pipedriveErro,
		createdAt: row.createdAt,
	};
}

// `aviso` é pra quando salvou aqui mas o Pipedrive não aceitou — o contato não
// se perde, só avisa que o CRM ficou pra trás.
export type ResultadoEvento = { ok: true; aviso?: string } | { ok: false; erro: string };

export async function getStatusPipedrive() {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ativo: false, dominio: "", funil: "", estagio: "" };
	return statusPipedrive();
}

// Evento mais recente primeiro — normalmente é o que a pessoa acabou de voltar.
export async function listEventos(): Promise<Evento[]> {
	const usuario = await getSessaoAtual();
	if (!usuario) return [];
	const db = await getDB();
	const rows = await db
		.select()
		.from(eventosTable)
		.orderBy(desc(eventosTable.data), desc(eventosTable.createdAt));
	return rows.map(rowToEvento);
}

export async function listContatos(): Promise<ContatoEvento[]> {
	const usuario = await getSessaoAtual();
	if (!usuario) return [];
	const db = await getDB();
	const rows = await db.select().from(contatosTable).orderBy(asc(contatosTable.createdAt));
	return rows.map(rowToContato);
}

// ===== Eventos =====

export async function createEvento(input: EventoInput): Promise<ResultadoEvento> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	const nome = input.nome.trim();
	if (!nome) return { ok: false, erro: "Nome do evento é obrigatório." };

	const db = await getDB();
	await db.insert(eventosTable).values({
		id: crypto.randomUUID(),
		nome,
		local: input.local.trim(),
		data: input.data,
		notas: input.notas.trim(),
	});
	revalidatePath("/eventos");
	return { ok: true };
}

export async function updateEvento(
	id: string,
	campos: Partial<EventoInput>,
): Promise<ResultadoEvento> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	if (campos.nome !== undefined && !campos.nome.trim()) {
		return { ok: false, erro: "Nome do evento é obrigatório." };
	}

	const db = await getDB();
	await db.update(eventosTable).set(campos).where(eq(eventosTable.id, id));
	revalidatePath("/eventos");
	return { ok: true };
}

// Apaga o evento e os contatos dele — a tabela não tem FK com cascade.
export async function deleteEvento(id: string): Promise<ResultadoEvento> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	await db.delete(contatosTable).where(eq(contatosTable.eventoId, id));
	await db.delete(eventosTable).where(eq(eventosTable.id, id));
	revalidatePath("/eventos");
	return { ok: true };
}

// ===== Contatos =====

export async function createContato(input: ContatoInput): Promise<ResultadoEvento> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	const nome = input.nome.trim();
	if (!nome) return { ok: false, erro: "Nome do contato é obrigatório." };
	if (!input.eventoId) return { ok: false, erro: "Escolha o evento do contato." };

	const db = await getDB();
	const evento = await db
		.select({ id: eventosTable.id })
		.from(eventosTable)
		.where(eq(eventosTable.id, input.eventoId))
		.limit(1);
	if (evento.length === 0) return { ok: false, erro: "Evento não encontrado." };

	const id = crypto.randomUUID();
	const dados = {
		nome,
		empresa: input.empresa.trim(),
		cargo: input.cargo.trim(),
		telefone: input.telefone.trim(),
		email: input.email.trim(),
		notas: input.notas.trim(),
	};

	// Grava primeiro. Se o Pipedrive estiver fora do ar, o contato continua
	// salvo aqui e o envio pode ser refeito depois pelo botão da tela.
	await db.insert(contatosTable).values({
		id,
		eventoId: input.eventoId,
		...dados,
		status: input.status,
	});

	const sincronia = await sincronizarComPipedrive(id, input.eventoId, dados);
	revalidatePath("/eventos");
	return sincronia.ok ? { ok: true } : { ok: true, aviso: sincronia.aviso };
}

// Manda o contato pro Pipedrive e anota na linha como foi. Nunca lança: o
// contato já está salvo e uma falha no CRM não pode derrubar o fluxo.
async function sincronizarComPipedrive(
	contatoId: string,
	eventoId: string,
	dados: {
		nome: string;
		empresa: string;
		cargo: string;
		telefone: string;
		email: string;
		notas: string;
	},
): Promise<{ ok: boolean; aviso?: string }> {
	const db = await getDB();
	const eventoRows = await db
		.select()
		.from(eventosTable)
		.where(eq(eventosTable.id, eventoId))
		.limit(1);
	if (eventoRows.length === 0) {
		return { ok: false, aviso: "Contato salvo, mas não achei o evento pra mandar pro Pipedrive." };
	}

	const resultado = await enviarContatoParaPipedrive(dados, rowToEvento(eventoRows[0]));

	if (resultado.ok) {
		await db
			.update(contatosTable)
			.set({ pipedriveStatus: "enviado", pipedriveDealId: resultado.dealId, pipedriveErro: "" })
			.where(eq(contatosTable.id, contatoId));
		return { ok: true };
	}

	// Integração desligada não é erro — é só não estar configurada ainda.
	await db
		.update(contatosTable)
		.set({
			pipedriveStatus: resultado.desligado ? "desligado" : "erro",
			pipedriveErro: resultado.desligado ? "" : resultado.erro,
		})
		.where(eq(contatosTable.id, contatoId));

	if (resultado.desligado) return { ok: true };
	return { ok: false, aviso: `Contato salvo, mas o Pipedrive recusou: ${resultado.erro}` };
}

// Reenvio manual, pro botão que aparece no card quando o envio falhou.
export async function reenviarContatoPipedrive(id: string): Promise<ResultadoEvento> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	const rows = await db.select().from(contatosTable).where(eq(contatosTable.id, id)).limit(1);
	if (rows.length === 0) return { ok: false, erro: "Contato não encontrado." };

	const contato = rowToContato(rows[0]);
	if (contato.pipedriveStatus === "enviado") {
		return { ok: true, aviso: "Esse contato já está no Pipedrive." };
	}

	const sincronia = await sincronizarComPipedrive(id, contato.eventoId, {
		nome: contato.nome,
		empresa: contato.empresa,
		cargo: contato.cargo,
		telefone: contato.telefone,
		email: contato.email,
		notas: contato.notas,
	});
	revalidatePath("/eventos");
	if (!sincronia.ok) return { ok: false, erro: sincronia.aviso ?? "Não deu pra enviar." };
	return { ok: true };
}

export async function updateContato(
	id: string,
	campos: Partial<ContatoInput>,
): Promise<ResultadoEvento> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	if (campos.nome !== undefined && !campos.nome.trim()) {
		return { ok: false, erro: "Nome do contato é obrigatório." };
	}

	const db = await getDB();
	await db.update(contatosTable).set(campos).where(eq(contatosTable.id, id));
	revalidatePath("/eventos");
	return { ok: true };
}

export async function updateStatusContato(
	id: string,
	status: StatusContato,
): Promise<ResultadoEvento> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	await db.update(contatosTable).set({ status }).where(eq(contatosTable.id, id));
	revalidatePath("/eventos");
	return { ok: true };
}

export async function deleteContato(id: string): Promise<ResultadoEvento> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	await db.delete(contatosTable).where(eq(contatosTable.id, id));
	revalidatePath("/eventos");
	return { ok: true };
}
