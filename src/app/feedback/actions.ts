"use server";

import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDB } from "@/db";
import { feedbacks as feedbacksTable, type FeedbackRow } from "@/db/schema";
import type { Canal, Feedback, Sentimento } from "@/lib/feedbacks";

function rowToFeedback(row: FeedbackRow): Feedback {
	return {
		id: row.id,
		empresa: row.empresa,
		canal: row.canal as Canal,
		conteudo: row.conteudo,
		sentimento: row.sentimento as Sentimento,
		categoria: row.categoria,
		createdAt: row.createdAt,
	};
}

export async function listFeedbacks(): Promise<Feedback[]> {
	const db = await getDB();
	const rows = await db.select().from(feedbacksTable).orderBy(desc(feedbacksTable.createdAt));
	return rows.map(rowToFeedback);
}

export async function createFeedback(
	input: Omit<Feedback, "id" | "createdAt">,
): Promise<Feedback> {
	const db = await getDB();
	const id = crypto.randomUUID();
	const createdAt = new Date();
	await db.insert(feedbacksTable).values({
		id,
		empresa: input.empresa,
		canal: input.canal,
		conteudo: input.conteudo,
		sentimento: input.sentimento,
		categoria: input.categoria,
		createdAt,
	});
	revalidatePath("/feedback");
	return { ...input, id, createdAt };
}
