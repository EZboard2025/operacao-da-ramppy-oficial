import { notFound } from "next/navigation";
import { getNota } from "../actions";
import { EditorNota } from "../editor-nota";

export const dynamic = "force-dynamic";

export default async function NotaPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const nota = await getNota(id);
	if (!nota) notFound();
	// key força um editor novo por nota; sem isso o TipTap manteria o doc anterior.
	return <EditorNota key={nota.id} nota={nota} />;
}
