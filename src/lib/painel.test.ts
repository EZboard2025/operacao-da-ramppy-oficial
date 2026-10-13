import { describe, expect, it } from "vitest";
import { diasAte, ehColunaConcluida, fraseDoDia, rotuloEvento, rotuloPrazo } from "./painel";

describe("diasAte (dia civil em São Paulo)", () => {
	it("prazo às 23h de hoje em SP ainda é hoje, mesmo sendo amanhã em UTC", () => {
		// 13/10 23:30 em SP = 14/10 02:30 UTC
		const prazo = new Date("2026-10-14T02:30:00Z");
		const agora = new Date("2026-10-13T15:00:00Z");
		expect(diasAte(prazo, agora)).toBe(0);
	});

	it("ontem é -1, amanhã é 1", () => {
		const agora = new Date("2026-10-13T15:00:00Z");
		expect(diasAte(new Date("2026-10-12T15:00:00Z"), agora)).toBe(-1);
		expect(diasAte(new Date("2026-10-14T15:00:00Z"), agora)).toBe(1);
	});
});

describe("rótulos", () => {
	it("rotuloPrazo cobre atrasado, hoje, amanhã, dias e semanas", () => {
		expect(rotuloPrazo(-3)).toBe("Atrasada há 3 dias");
		expect(rotuloPrazo(-1)).toBe("Atrasada desde ontem");
		expect(rotuloPrazo(0)).toBe("Vence hoje");
		expect(rotuloPrazo(1)).toBe("Vence amanhã");
		expect(rotuloPrazo(5)).toBe("Vence em 5 dias");
		expect(rotuloPrazo(14)).toBe("Vence em 2 semanas");
	});

	it("rotuloEvento", () => {
		expect(rotuloEvento(0)).toBe("Hoje");
		expect(rotuloEvento(1)).toBe("Amanhã");
		expect(rotuloEvento(4)).toBe("Em 4 dias");
	});
});

describe("fraseDoDia", () => {
	it("junta as partes com vírgula e 'e'", () => {
		expect(fraseDoDia({ atrasadas: 2, semana: 1, eventos: 1 })).toBe(
			"2 tarefas atrasadas, 1 tarefa vence esta semana e 1 evento nos próximos dias.",
		);
		expect(fraseDoDia({ atrasadas: 0, semana: 3, eventos: 0 })).toBe(
			"3 tarefas vencem esta semana.",
		);
		expect(fraseDoDia({ atrasadas: 0, semana: 0, eventos: 0 })).toBe("Nada com prazo esta semana.");
	});
});

describe("ehColunaConcluida", () => {
	it("reconhece variações", () => {
		expect(ehColunaConcluida("Concluído")).toBe(true);
		expect(ehColunaConcluida("Feito")).toBe(true);
		expect(ehColunaConcluida("Em progresso")).toBe(false);
	});
});
