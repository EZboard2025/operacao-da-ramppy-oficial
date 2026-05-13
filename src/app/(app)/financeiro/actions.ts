"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDB } from "@/db";
import { custos as custosTable, type CustoRow } from "@/db/schema";
import type { Custo, CustoCobranca, CustoStatus } from "@/lib/custos";

function rowToCusto(row: CustoRow): Custo {
	return {
		id: row.id,
		servico: row.servico,
		categoria: row.categoria,
		plano: row.plano,
		custoMensalBRL: row.custoMensalBRL,
		cobranca: row.cobranca as CustoCobranca,
		status: row.status as CustoStatus,
		notas: row.notas,
		dataInicio: row.dataInicio,
	};
}

export async function listCustos(): Promise<Custo[]> {
	const db = await getDB();
	const rows = await db.select().from(custosTable).orderBy(custosTable.createdAt);
	return rows.map(rowToCusto);
}

export async function createCusto(input: Omit<Custo, "id">): Promise<Custo> {
	const db = await getDB();
	const id = crypto.randomUUID();
	await db.insert(custosTable).values({
		id,
		servico: input.servico,
		categoria: input.categoria,
		plano: input.plano,
		custoMensalBRL: input.custoMensalBRL,
		cobranca: input.cobranca,
		status: input.status,
		notas: input.notas,
		dataInicio: input.dataInicio,
	});
	revalidatePath("/financeiro");
	return { ...input, id };
}

export async function updateCusto(
	id: string,
	campos: Partial<Omit<Custo, "id">>,
): Promise<void> {
	const db = await getDB();
	await db.update(custosTable).set(campos).where(eq(custosTable.id, id));
	revalidatePath("/financeiro");
}

export async function deleteCusto(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(custosTable).where(eq(custosTable.id, id));
	revalidatePath("/financeiro");
}
