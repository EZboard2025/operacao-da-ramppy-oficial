import { redirect } from "next/navigation";
import { getSessaoAtual } from "@/lib/auth-session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
	const usuario = await getSessaoAtual();
	if (usuario) redirect("/");
	return <LoginForm />;
}
