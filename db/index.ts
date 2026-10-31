import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.FINN_DB) {
    throw new Error(
      "Cloudflare D1 binding `FINN_DB` is unavailable. Set the `d1` field in .openai/hosting.json to `FINN_DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.FINN_DB, { schema });
}
