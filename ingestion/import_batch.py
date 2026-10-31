"""Import a collector batch and original PDFs into the running private ingestion API.

The credential is read locally, never printed or placed in command arguments.
Use --baseline once on an empty installation to retain the verified filing example.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent

def clean(value):
    if isinstance(value, list): return [clean(v) for v in value]
    if isinstance(value, dict): return {k:clean(v) for k,v in value.items() if k not in {'rawFile','localFile','file_path'}}
    return value

def normalize(batch):
    value=clean(batch)
    for company in value.get('companies',[]):
        company['documents']=[]
        company['coverageNote']='Coverage reflects acquired sources; inspect each source date and any gaps below.'
    # Latest company summary carries the daily change. Historical rows remain in the acquisition artifact.
    value['history']=value.pop('market',[])
    value['market']=[c['market'] for c in value.get('companies',[]) if c.get('market')]
    for doc in value.get('documents',[]):
        period=doc.get('reportingPeriod')
        if isinstance(period,dict):
            doc.update(reportingPeriod=period['label'],periodStart=period['start'],periodEnd=period['end'],periodVerification=period)
        doc['indexingStatus']='indexed'
    states=value.get('sourceStates',[])
    for symbol in {s['companySymbol'] for s in states}:
        docstates=[s for s in states if s['companySymbol']==symbol and s['source'] in {'annual_report','earnings_call_transcript'}]
        if not docstates: continue
        errors=[s for s in docstates if s.get('error')]
        successful=[s for s in docstates if s.get('lastSuccessAt')]
        states.append({'companySymbol':symbol,'source':'documents','status':'partial' if errors and successful else 'error' if errors else 'success',
          'lastAttemptAt':max(s['lastAttemptAt'] for s in docstates),'lastSuccessAt':max((s['lastSuccessAt'] for s in successful),default=None),
          'dataAsOf':'; '.join(d['period'] for d in value.get('documents',[]) if d['companySymbol']==symbol),
          'fromCache':all(s.get('fromCache') for s in docstates),'stale':any(s.get('stale') for s in docstates),
          'error':'; '.join(s['source']+': '+s['error'] for s in errors) or None,'components':docstates,
          'message':f'{len(successful)} of {len(docstates)} requested document types acquired.'})
    return value

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('batch',nargs='?',default='ingestion/output/latest.json')
    parser.add_argument('--origin',default='http://127.0.0.1:8787')
    parser.add_argument('--key-file',default='.dev.vars')
    parser.add_argument('--baseline',action='store_true')
    args=parser.parse_args()
    if urlsplit(args.origin).scheme!='https' and urlsplit(args.origin).hostname not in {'127.0.0.1','localhost'}:raise SystemExit('Remote import requires HTTPS.')
    token=os.environ.get('FINN_INGEST_TOKEN')
    if not token:
        for line in Path(args.key_file).read_text().splitlines():
            if line.startswith('FINN_INGEST_TOKEN='):token=line.split('=',1)[1].strip().strip('"\'')
    if not token:raise SystemExit('FINN_INGEST_TOKEN is missing.')
    def send(path,value,method='POST'):
        data=value if isinstance(value,bytes) else json.dumps(value).encode()
        request=Request(args.origin+path,data=data,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':'application/pdf' if isinstance(value,bytes) else 'application/json'})
        with urlopen(request,timeout=90) as r:return json.load(r)
    if args.baseline:
        catalog=json.loads((ROOT/'lib/data/catalog.json').read_text());pages=json.loads((ROOT/'lib/data/pages.json').read_text())
        for f in catalog['filings']:f['historical']=True
        docs=[dict(d,companySymbol=c['symbol']) for c in catalog['companies'] for d in c['documents']]
        send('/api/ingest/batch',{'companies':catalog['companies'],'documents':docs,'filings':catalog['filings']})
        for i in range(0,len(pages),80):send('/api/ingest/batch',{'pages':pages[i:i+80]})
    raw=json.loads(Path(args.batch).read_text());batch=normalize(raw);pages=batch.pop('pages',[])
    result=send('/api/ingest/batch',batch);mapping=result['documentIdMap']
    for page in pages:page['documentId']=mapping.get(page['documentId'],page['documentId'])
    for i in range(0,len(pages),80):send('/api/ingest/batch',{'pages':pages[i:i+80]})
    uploaded=0
    for doc in raw.get('documents',[]):
        local=doc.get('localFile');identifier=mapping.get(doc['id'],doc['id'])
        if local:
            send('/api/documents/'+identifier,Path(local).read_bytes(),'PUT');uploaded+=1
    print(json.dumps({'companies':result['companies'],'filings':result['filings'],'documents':result['documents'],'indexedPages':len(pages),'originalsUploaded':uploaded},indent=2))

if __name__=='__main__':main()
