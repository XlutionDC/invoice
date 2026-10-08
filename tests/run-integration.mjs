import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {rmSync} from 'node:fs';
const require=createRequire(import.meta.url);const {build}=require(require.resolve('esbuild',{paths:[require.resolve('drizzle-kit')]}));
for(const input of (process.argv.slice(2).length?process.argv.slice(2):['tests/integration.test.ts','tests/ui.test.tsx'])){const output=join(tmpdir(),'luxora-'+input.split('/').pop()+'.mjs');await build({entryPoints:[input],bundle:true,platform:'node',format:'esm',external:['node:*'],banner:{js:'import {createRequire as __nodeRequire} from "node:module"; const require=__nodeRequire(import.meta.url);'},alias:{'@/db':'./tests/test-db.ts','@/app/chatgpt-auth':'./tests/test-auth.ts'},outfile:output,jsx:'automatic'});const r=spawnSync(process.execPath,[output],{stdio:'inherit'});rmSync(output,{force:true});if(r.status!==0)process.exit(r.status||1);}
