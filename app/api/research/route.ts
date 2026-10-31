import { errorResponse, jsonResponse, readResearchRequest, researchFromDocuments } from "../../../lib/research";
import { getResearchData } from "../../../lib/store";

export async function POST(request: Request) {
  try {
    const input = await readResearchRequest(request);
    const symbol = input && typeof input === "object" && "companySymbol" in input && typeof input.companySymbol === "string" ? input.companySymbol.trim().toUpperCase() : undefined;
    const { catalog, pages } = await getResearchData(undefined, symbol);
    const result = researchFromDocuments(catalog, pages, input);
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
