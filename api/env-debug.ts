// Debug: return the NAMES of env vars visible to this edge function
// plus whether the two we care about are set. Never leaks values.
export const config = { runtime: "edge" };

export default async function handler() {
  const keys = Object.keys(process.env).sort();
  const relevant = keys.filter((k) =>
    /GITHUB|VITE/i.test(k)
  );
  const body = {
    total_env_keys: keys.length,
    relevant_keys: relevant, // names only
    has_GITHUB_CLIENT_ID: !!process.env.GITHUB_CLIENT_ID,
    has_VITE_GITHUB_CLIENT_ID: !!process.env.VITE_GITHUB_CLIENT_ID,
    has_GITHUB_CLIENT_SECRET: !!process.env.GITHUB_CLIENT_SECRET,
    GITHUB_CLIENT_SECRET_length: process.env.GITHUB_CLIENT_SECRET?.length || 0,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
