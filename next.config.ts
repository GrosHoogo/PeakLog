import type { NextConfig } from "next";

// Content-Security-Policy directives.
// - Mapbox GL JS requires blob: for web workers and script-src.
// - Supabase realtime uses wss:// websockets.
// - Adjust connect-src domains when adding new external services.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' required by Next.js inline scripts; 'unsafe-eval' required by Mapbox GL JS workers.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://generativelanguage.googleapis.com https://www.strava.com https://api.maptiler.com https://*.maptiler.com https://api.openrouteservice.org https://router.project-osrm.org https://overpass-api.de https://*.supabase.co wss://*.supabase.co",
  "worker-src blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
