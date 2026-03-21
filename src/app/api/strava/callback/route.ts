import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code", req.url));
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_config", req.url),
    );
  }

  try {
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      // Log only the status code, never the body which may contain sensitive data.
      console.error("Strava token exchange failed. Status:", tokenRes.status);
      return NextResponse.redirect(
        new URL("/settings?error=token_exchange", req.url),
      );
    }

    const tokens = await tokenRes.json();

    // TODO: store tokens in Supabase using pgcrypto encryption.
    // Required columns: encrypted_access_token, encrypted_refresh_token, expires_at.
    // Never store tokens in plaintext. Never log token values.

    if (process.env.NODE_ENV === "development") {
      console.error(
        "Strava callback successful for athlete ID:",
        tokens.athlete?.id,
      );
    }

    return NextResponse.redirect(
      new URL("/settings?strava=connected", req.url),
    );
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=strava_error", req.url),
    );
  }
}
