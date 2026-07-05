// Minimal Vercel Edge proxy for GitHub OAuth Device Flow.
// GitHub's /login/device/code and /login/oauth/access_token don't send CORS
// headers, so browsers can't POST there directly. This function just forwards
// the request, no secrets involved (device flow uses only the public client_id).
//
// POST /api/github-proxy?target=device      → proxied to /login/device/code
// POST /api/github-proxy?target=token       → proxied to /login/oauth/access_token
// Body: application/x-www-form-urlencoded, same params as the GitHub endpoint.

export const config = { runtime: "edge" };

const ENDPOINTS: Record<string, string> = {
  device: "https://github.com/login/device/code",
  token: "https://github.com/login/oauth/access_token",
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }
  const url = new URL(req.url);
  const target = url.searchParams.get("target") ?? "";
  const upstream = ENDPOINTS[target];
  if (!upstream) return new Response("bad target", { status: 400 });

  const body = await req.text();
  const upstreamRes = await fetch(upstream, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await upstreamRes.text();
  return new Response(text, {
    status: upstreamRes.status,
    headers: {
      "content-type":
        upstreamRes.headers.get("content-type") ?? "application/json",
      // Same-origin call from our own site — CORS not strictly needed but be permissive.
      "access-control-allow-origin": "*",
    },
  });
}
