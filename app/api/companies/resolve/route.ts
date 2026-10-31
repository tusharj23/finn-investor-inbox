import { errorResponse, jsonResponse } from "../../../../lib/research";
import { getCatalog } from "../../../../lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { symbol?: unknown };
    const raw = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase().replace(/\.NS$/, "") : "";
    if (!/^[A-Z0-9&.\-]{1,24}$/.test(raw)) {
      return jsonResponse({ error: { message: "Enter a valid NSE ticker symbol." } }, 400);
    }
    const catalog = await getCatalog();
    const company = catalog.companies.find(item => item.symbol.toUpperCase() === raw);
    if (!company) {
      return jsonResponse({ error: { message: `${raw} is not included in this dated snapshot. Netlify hosting does not discover or ingest new companies.` } }, 404);
    }
    return jsonResponse({ company });
  } catch (error) { return errorResponse(error); }
}
