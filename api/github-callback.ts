// GitHub OAuth Web App flow — the callback that exchanges `code` for a token
// and hands it back to the browser tab that started the flow.
//
// GitHub redirects to /api/github-callback?code=…&state=… after the user
// authorizes. We POST code + client_secret to GitHub, get an access token,
// then return a tiny HTML page that postMessage's the token to the opener
// window and closes itself. Token never lands in browser URL history.

export const config = { runtime: "edge" };

const html = (script: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><title>Sign in</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;padding:24px;color:#222}</style>
<script>${script}</script>
`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const err = url.searchParams.get("error");

  if (err) {
    return html(
      `try{opener.postMessage({source:'elsway-cms-oauth',error:${JSON.stringify(err)}},'*')}catch(_){}
       document.write('Sign-in failed: ${err}. You can close this tab.');`
    );
  }
  if (!code) return new Response("missing code", { status: 400 });

  const CLIENT_ID = process.env.VITE_GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response("missing GitHub env vars", { status: 500 });
  }

  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });
  const data = (await r.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    return html(
      `try{opener.postMessage({source:'elsway-cms-oauth',error:${JSON.stringify(
        data.error || "no_token"
      )}},'*')}catch(_){}
       document.write('Sign-in failed: ${JSON.stringify(
         data.error_description || data.error || "no token"
       )}');`
    );
  }

  const payload = JSON.stringify({
    source: "elsway-cms-oauth",
    token: data.access_token,
    state,
  });
  return html(
    `try{opener.postMessage(${payload},'*')}catch(_){}
     document.title='Signed in — you can close this tab';
     document.write('<p>Signed in. This window will close automatically.</p>');
     setTimeout(function(){window.close()},400);`
  );
}
