import { documentEvidence, errorResponse, jsonResponse } from "../../../lib/research";
import { getEvidenceData } from "../../../lib/store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get("documentId");
    const { catalog, pages } = await getEvidenceData(undefined, documentId);
    const evidence = documentEvidence(catalog, pages, documentId, url.searchParams.get("page"));
    return jsonResponse(evidence, 200, "private, max-age=300");
  } catch (error) {
    return errorResponse(error);
  }
}
