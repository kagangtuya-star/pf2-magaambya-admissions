import {readFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const source=path.resolve(fileURLToPath(new URL('../../web/',import.meta.url)));
const dist=path.resolve(fileURLToPath(new URL('../../dist/',import.meta.url)));
const base=process.env.SERVE_DIST==='1'&&existsSync(dist)?dist:source;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
export function hasThree(){return existsSync(path.join(base,'vendor','three.module.js'));}
export async function serveStatic(request,response) {
  if(!['GET','HEAD'].includes(request.method))return false;
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{return false;}
  const entry=pathname==='/'||pathname==='/admin'||pathname.startsWith('/admin/');
  const relative=entry?'index.html':pathname.replace(/^\//,'');
  const target=path.resolve(base,relative);
  if(!target.startsWith(base+path.sep)||relative.includes('\\')||relative.includes('\0'))return false;
  try{
    const info=await stat(target);if(!info.isFile())return false;
    response.statusCode=200;response.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');
    response.setHeader('Cache-Control',path.extname(target)==='.html'?'no-store':'no-cache');
    if(request.method==='HEAD'){response.end();return true;}
    response.end(await readFile(target));return true;
  }catch{return false;}
}
