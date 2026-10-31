import { applyBatch, getDocument } from './store';
import { getCatalog, getMarketHistory } from './store';
import { calculatePortfolioAlerts, validateAlertSettings } from './alerts';
import { advanceJob, getJob, normalizeSymbol, resolveListedCompany, startJob } from './sources';

const response=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function body(request:Request,limit:number){
  const reader=request.body?.getReader();if(!reader)return {};
  const parts:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error('Request exceeds the allowed size.');}parts.push(value);}
  const all=new Uint8Array(size);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}
  return JSON.parse(new TextDecoder().decode(all));
}
function sanitize(value:unknown):unknown {
  if(Array.isArray(value))return value.map(sanitize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['localFile','rawFile','file_path'].includes(k)).map(([k,v])=>[k,sanitize(v)]));
  return value;
}
export async function ingestionApi(request:Request,env:Cloudflare.Env,ctx:ExecutionContext):Promise<Response|undefined>{
  const url=new URL(request.url);const path=url.pathname;
  if(!['/api/refresh','/api/companies/resolve','/api/ingest/batch','/api/alerts'].includes(path)&&!path.startsWith('/api/documents/'))return;
  if(!env.FINN_DB)return response({error:{message:'Persistent ingestion storage is not configured.'}},503);
  try {
    const privateWrite=path==='/api/ingest/batch'||(path.startsWith('/api/documents/')&&request.method==='PUT');
    if(privateWrite&&(!env.FINN_INGEST_TOKEN||request.headers.get('Authorization')!==`Bearer ${env.FINN_INGEST_TOKEN}`))return response({error:{message:'An ingestion credential is required.'}},401);
    if(path==='/api/ingest/batch'&&request.method==='POST'){
      const batch=sanitize(await body(request,3*1024*1024)) as Parameters<typeof applyBatch>[1];
      return response(await applyBatch(env.FINN_DB,batch));
    }
    if(path.startsWith('/api/documents/')){
      const id=path.slice('/api/documents/'.length);if(!/^[a-zA-Z0-9_-]{1,120}$/.test(id))return response({error:{message:'Invalid document ID.'}},400);
      const doc=await getDocument(env.FINN_DB,id);if(!doc)return response({error:{message:'Document not found.'}},404);
      if(request.method==='PUT'){
        const size=Number(request.headers.get('Content-Length'));if(!size||size>55*1024*1024)return response({error:{message:'PDF uploads require a size up to 55 MB.'}},413);
        const bytes=await request.arrayBuffer();if(bytes.byteLength!==size||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return response({error:{message:'Expected a complete original PDF.'}},400);
        const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
        if(doc.sha256&&doc.sha256!==sha)return response({error:{message:'PDF checksum does not match the registered original.'}},409);
        await env.FINN_DOCS.put(id,bytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{sha256:sha,sourceUrl:doc.sourceUrl}});
        await applyBatch(env.FINN_DB,{documents:[{...doc,sha256:sha,localPdfUrl:`/api/documents/${id}`} ]});
        return response({id,stored:true,sha256:sha});
      }
      if(request.method==='GET'||request.method==='HEAD'){
        const file=await env.FINN_DOCS.get(id);if(!file)return response({error:{message:'Saved original unavailable. Use the preserved source URL.'}},404);
        return new Response(request.method==='HEAD'?null:file.body,{headers:{'Content-Type':'application/pdf','Content-Length':String(file.size),'Content-Disposition':`inline; filename="${id}.pdf"`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=3600','ETag':file.httpEtag}});
      }
    }
    if(path==='/api/companies/resolve'&&request.method==='POST'){
      const input=await body(request,1024);return response({company:await resolveListedCompany(env.FINN_DB,normalizeSymbol(input.symbol))});
    }
    if(path==='/api/alerts'&&request.method==='POST'){
      const input=await body(request,2048);
      const settings=validateAlertSettings(input.settings);
      const period=input.period==='7d'||input.period==='30d'?input.period:'24h';
      const catalog=await getCatalog(env.FINN_DB);
      const portfolio=catalog.companies.filter(company=>company.membership?.portfolio).map(company=>({symbol:company.symbol,name:company.name,portfolio:true}));
      const history=await getMarketHistory(env.FINN_DB,portfolio.map(company=>company.symbol));
      return response(calculatePortfolioAlerts({history,companies:portfolio,settings,period,now:Date.now()}));
    }
    if(path==='/api/refresh'){
      if(request.method==='POST'){
        const input=await body(request,1024);const job=await startJob(env.FINN_DB,input.symbol?normalizeSymbol(input.symbol):undefined);
        ctx.waitUntil(advanceJob(env.FINN_DB,job.id));return response({jobId:job.id},202);
      }
      if(request.method==='GET'){
        const id=url.searchParams.get('jobId')||'';if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))return response({error:{message:'Invalid refresh ID.'}},400);
        const job=await getJob(env.FINN_DB,id);if(!job)return response({error:{message:'Refresh not found.'}},404);
        // Polls perform bounded work and resume incomplete jobs after a restart.
        return response(await advanceJob(env.FINN_DB,id));
      }
    }
    return response({error:{message:'Method not allowed.'}},405);
  }catch(error){return response({error:{message:error instanceof Error?error.message:'Ingestion failed; saved data is retained.',retryable:true}},400);}
}
