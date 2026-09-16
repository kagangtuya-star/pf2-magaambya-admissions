import {existsSync,readFileSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
const file=path.join(root,'.env');if(existsSync(file)){for(const line of readFileSync(file,'utf8').split(/\r?\n/)){const match=line.trim().match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(match&&!Object.hasOwn(process.env,match[1]))process.env[match[1]]=match[2].replace(/^(["'])(.*)\1$/,'$2');}}
if(process.env.MAGIC_DATA_DIR){const dir=path.resolve(process.env.MAGIC_DATA_DIR);mkdirSync(dir,{recursive:true});for(const name of ['settings.json','exam-content.json'])if(!existsSync(path.join(dir,name)))copyFileSync(path.join(root,'server/data',name),path.join(dir,name));if(!existsSync(path.join(dir,'submissions.json')))writeFileSync(path.join(dir,'submissions.json'),JSON.stringify({items:[],updated_at:new Date().toISOString()}));}
if(!existsSync('web/vendor/three.module.js')){if(existsSync('node_modules/three/package.json')){const{vendor}=await import('./vendor.mjs');await vendor();}else console.warn('Three.js is not installed. Run npm install to enable the 3D courtyard. The accessible 2D interface remains available.');}
const child=spawn(process.execPath,['server/app.js'],{cwd:root,env:process.env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??0;});
