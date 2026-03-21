import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Whitelist of local paths that `next` may redirect to.
const ALLOWED_NEXT_PREFIXES = [
  "/",
  "/journal",
  "/plan",
  "/map",
  "/stats",
  "/settings",
];

function isSafeNext(next: string): boolean {
  // Reject any value that looks like an absolute or protocol-relative URL.
  if (next.startsWith("http") || next.startsWith("//")) return false;
  return ALLOWED_NEXT_PREFIXES.some((prefix) => next.startsWith(prefix));
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const rawNext = req.nextUrl.searchParams.get("next") ?? "/";
  const next = isSafeNext(rawNext) ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  return NextResponse.redirect(new URL("/?error=auth", req.url));
}
