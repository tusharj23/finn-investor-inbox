import handler from "vinext/server/fetch-handler";
import { ingestionApi } from '../lib/ingestion-api';
// The slice uses public primary documents and no connected-account capabilities.
export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    // Enforce the origin boundary before the framework consumes a POST body.
    const origin = request.headers.get("Origin");
    if (["POST", "PUT"].includes(request.method) && origin && origin !== new URL(request.url).origin) {
      const reader = request.body?.getReader();
      let size = 0;
      if (reader) while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65536) { await reader.cancel(); break; }
      }
      return Response.json({ error: { code: "origin_not_allowed", message: "Please send this request from FINN.", retryable: false } }, {
        status: 403,
        headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
      });
    }
    return (await ingestionApi(request, env, ctx)) ?? handler.fetch(request, env, ctx);
  },
};
