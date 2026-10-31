// Keep local credentials outside the deployable dist tree.
import { readFile, writeFile, mkdir, symlink, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import './sites-env.mjs';
const root=process.cwd();
const source=resolve(root,'dist/server/wrangler.json');
const config=JSON.parse(await readFile(source,'utf8'));
config.main=resolve(dirname(source),config.main);
config.assets.directory=resolve(dirname(source),config.assets.directory);
const directory=resolve(root,'.wrangler/preview');
const port=process.env.FINN_PORT||'8787';
await mkdir(directory,{recursive:true});
await writeFile(resolve(directory,'wrangler.json'),JSON.stringify(config));
try { await lstat(resolve(directory,'.dev.vars')); }
catch { try { await lstat(resolve(root,'.dev.vars')); await symlink(resolve(root,'.dev.vars'),resolve(directory,'.dev.vars')); } catch {} }
const child=spawn(process.execPath,['--import',resolve(root,'scripts/sites-env.mjs'),resolve(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--config',resolve(directory,'wrangler.json'),'--local','--persist-to',resolve(root,'.wrangler/state'),'--ip','127.0.0.1','--port',port,'--inspector-port','0','--log-level','warn'],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??0;});
