import { NextResponse, type NextRequest } from "next/server";
import { SESSAO_COOKIE } from "@/lib/sessao";

const ROTAS_PUBLICAS = ["/login"];

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	if (ROTAS_PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))) {
		return NextResponse.next();
	}

	const cookie = req.cookies.get(SESSAO_COOKIE);
	if (!cookie) {
		const url = req.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("from", pathname);
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
