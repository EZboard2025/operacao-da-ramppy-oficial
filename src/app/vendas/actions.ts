"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDB } from "@/db";
import { vendas as vendasTable, type VendaRow } from "@/db/schema";
import type { StatusVenda, Venda } from "@/lib/vendas";

function rowToVenda(row: VendaRow): Venda {
	return {
		id: row.id,
		cliente: row.cliente,
		numeroFuncionarios: row.numeroFuncionarios,
		valorMensalBRL: row.valorMensalBRL,
		plano: row.plano,
		status: row.status as StatusVenda,
		dataInicio: row.dataInicio,
		notas: row.notas,
		createdAt: row.createdAt,
	};
}

export async function listVendas(): Promise<Venda[]> {
	const db = await getDB();
	const rows = await db.select().from(vendasTable).orderBy(desc(vendasTable.dataInicio));
	return rows.map(rowToVenda);
}

export async function createVenda(
	input: Omit<Venda, "id" | "createdAt">,
): Promise<Venda> {
	const db = await getDB();
	const id = crypto.randomUUID();
	const createdAt = new Date();
	await db.insert(vendasTable).values({
		id,
		cliente: input.cliente,
		numeroFuncionarios: input.numeroFuncionarios,
		valorMensalBRL: input.valorMensalBRL,
		plano: input.plano,
		status: input.status,
		dataInicio: input.dataInicio,
		notas: input.notas,
		createdAt,
	});
	revalidatePath("/vendas");
	return { ...input, id, createdAt };
}

export async function updateVenda(
	id: string,
	campos: Partial<Omit<Venda, "id" | "createdAt">>,
): Promise<void> {
	const db = await getDB();
	await db.update(vendasTable).set(campos).where(eq(vendasTable.id, id));
	revalidatePath("/vendas");
}

export async function deleteVenda(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(vendasTable).where(eq(vendasTable.id, id));
	revalidatePath("/vendas");
}
