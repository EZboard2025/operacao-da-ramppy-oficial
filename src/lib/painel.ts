// Helpers puros da home ("o que importa hoje"). Datas sempre no dia civil de
// São Paulo, porque o servidor roda em UTC e um prazo de "hoje 23h" não pode
// virar "amanhã".

export const FUSO_RAMPPY = "America/Sao_Paulo";

// Dia civil como número de dias desde 1970, no fuso dado.
export function diaCivil(data: Date, fuso: string = FUSO_RAMPPY): number {
	const texto = new Intl.DateTimeFormat("en-CA", {
		timeZone: fuso,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(data);
	const [ano, mes, dia] = texto.split("-").map(Number);
	return Math.round(Date.UTC(ano, mes - 1, dia) / 86_400_000);
}

// Negativo = atrasado, 0 = hoje, 1 = amanhã...
export function diasAte(prazo: Date, agora: Date, fuso: string = FUSO_RAMPPY): number {
	return diaCivil(prazo, fuso) - diaCivil(agora, fuso);
}

export function rotuloPrazo(dias: number): string {
	if (dias < -1) return `Atrasada há ${-dias} dias`;
	if (dias === -1) return "Atrasada desde ontem";
	if (dias === 0) return "Vence hoje";
	if (dias === 1) return "Vence amanhã";
	if (dias <= 7) return `Vence em ${dias} dias`;
	const semanas = Math.round(dias / 7);
	return semanas === 1 ? "Vence em 1 semana" : `Vence em ${semanas} semanas`;
}

export function rotuloEvento(dias: number): string {
	if (dias < 0) return "Já passou";
	if (dias === 0) return "Hoje";
	if (dias === 1) return "Amanhã";
	return `Em ${dias} dias`;
}

// Uma frase pra abrir o dia. Junta só o que existe.
export function fraseDoDia(contagem: {
	atrasadas: number;
	semana: number;
	eventos: number;
}): string {
	const partes: string[] = [];
	if (contagem.atrasadas > 0) {
		partes.push(
			contagem.atrasadas === 1 ? "1 tarefa atrasada" : `${contagem.atrasadas} tarefas atrasadas`,
		);
	}
	if (contagem.semana > 0) {
		partes.push(
			contagem.semana === 1
				? "1 tarefa vence esta semana"
				: `${contagem.semana} tarefas vencem esta semana`,
		);
	}
	if (contagem.eventos > 0) {
		partes.push(
			contagem.eventos === 1
				? "1 evento nos próximos dias"
				: `${contagem.eventos} eventos nos próximos dias`,
		);
	}
	if (partes.length === 0) return "Nada com prazo esta semana.";
	if (partes.length === 1) return `${partes[0]}.`;
	return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}.`;
}

// Coluna "concluída" do kanban é dinâmica; reconhecemos pelo nome.
export function ehColunaConcluida(label: string): boolean {
	return /conclu|feit|pronto|done|finaliz/i.test(label);
}
