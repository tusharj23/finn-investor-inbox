import { env } from 'cloudflare:workers';
import { errorResponse, jsonResponse, ResearchError } from '../../../lib/research';
import { getEvidenceData } from '../../../lib/store';
import { quarterlyComparison, QuarterlyResultsError } from '../../../lib/quarterly-results';

export async function GET(request:Request) {
  try {
    const id=new URL(request.url).searchParams.get('documentId');
    if(!id||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw new ResearchError(400,'invalid_document','Choose a supported results filing.');
    const {catalog,pages}=await getEvidenceData((env as unknown as {FINN_DB?:D1Database}).FINN_DB,id);
    const document=catalog.companies.flatMap(company=>company.documents).find(item=>item.id===id);
    if(!document)throw new ResearchError(404,'quarterly_results_unavailable','A source-backed quarterly comparison is not connected for this filing.');
    const page=pages.find(item=>item.documentId===id&&item.page===6);
    return jsonResponse(quarterlyComparison(document,page),200,'private, max-age=300');
  }catch(error){if(error instanceof QuarterlyResultsError)return jsonResponse({error:{code:error.code,message:error.message,retryable:false}},error.status);return errorResponse(error);}
}
