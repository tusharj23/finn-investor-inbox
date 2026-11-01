import { env } from "cloudflare:workers";
import { errorResponse, jsonResponse } from "../../../lib/research";
import { getCatalog } from "../../../lib/store";

export async function GET() {
  try {
    return jsonResponse(await getCatalog((env as unknown as { FINN_DB?: D1Database }).FINN_DB));
  } catch (error) { return errorResponse(error); }
}
