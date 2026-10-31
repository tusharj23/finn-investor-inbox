import { errorResponse, jsonResponse } from "../../../lib/research";
import { getCatalog } from "../../../lib/store";

export async function GET() {
  try {
    return jsonResponse(await getCatalog(undefined));
  } catch (error) { return errorResponse(error); }
}
