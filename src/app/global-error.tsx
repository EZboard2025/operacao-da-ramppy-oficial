"use client";

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("global-error", { digest: error.digest, message: error.message });
	}, [error]);

	return (
		<html lang="pt-BR">
			<body
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "100vh",
					fontFamily: "system-ui, sans-serif",
					padding: "2rem",
					textAlign: "center",
					background: "#fafafa",
					color: "#171717",
				}}
			>
				<h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Ops, algo deu errado</h1>
				<p style={{ color: "#666", marginBottom: "1.5rem", maxWidth: "32rem" }}>
					Tivemos um problema inesperado. Tenta recarregar a página. Se persistir, avisa a equipe de
					dev.
				</p>
				{error.digest && (
					<p style={{ fontSize: "0.75rem", color: "#999", marginBottom: "1.5rem" }}>
						ID do erro: <code>{error.digest}</code>
					</p>
				)}
				<button
					type="button"
					onClick={reset}
					style={{
						background: "#16a34a",
						color: "white",
						border: "none",
						borderRadius: "0.5rem",
						padding: "0.6rem 1.2rem",
						fontSize: "0.9rem",
						fontWeight: 500,
						cursor: "pointer",
					}}
				>
					Tentar de novo
				</button>
			</body>
		</html>
	);
}
