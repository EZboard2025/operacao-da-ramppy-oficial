import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen">
			<Sidebar />
			<main className="pl-16">
				<div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
			</main>
		</div>
	);
}
