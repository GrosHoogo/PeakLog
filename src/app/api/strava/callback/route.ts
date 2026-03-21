import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code", req.url));
  }

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
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
      console.error("Strava token exchange failed. Status:", tokenRes.status);
      return NextResponse.redirect(
        new URL("/settings?error=token_exchange", req.url),
      );
    }

    const tokens = await tokenRes.json();

    const isProduction = process.env.NODE_ENV === "production";
    const response = NextResponse.redirect(
      new URL("/settings?strava=connected", req.url),
    );

    // Store tokens in httpOnly cookies (server-readable only).
    // In production, replace with pgcrypto-encrypted DB storage.
    response.cookies.set("strava_access_token", tokens.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: tokens.expires_in ?? 21600,
      path: "/",
    });

    response.cookies.set("strava_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    response.cookies.set("strava_expires_at", String(tokens.expires_at), {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    // Non-httpOnly flag so the client can check connection state.
    response.cookies.set("strava_connected", "true", {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=strava_error", req.url),
    );
  }
}
