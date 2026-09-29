import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

// Dentro do produto a fonte é a do sistema (SF, Segoe, Roboto), definida em
// globals.css. Geist Mono fica só para códigos e URLs.
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Ramppy · Plataforma Interna",
	description: "Plataforma interna da Ramppy para tarefas, feedback e financeiro.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pt-BR">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body className={`${geistMono.variable} antialiased`}>{children}</body>
		</html>
	);
}
