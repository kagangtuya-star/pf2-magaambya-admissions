import {readdir,readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);const files=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name==='vendor')continue;const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else if(/\.(js|mjs)$/.test(p))files.push(p);}}
for(const dir of ['web','server','scripts','tests'])await walk(dir);
let failed=0;for(const file of files){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0){failed++;console.error(result.stderr);}}
const html=await readFile('web/index.html','utf8');if(html.includes('<!--')){failed++;console.error('Unexpected HTML comment in public page.');}
console.log(`${files.length} JavaScript modules checked; ${failed} failure(s).`);process.exitCode=failed?1:0;
