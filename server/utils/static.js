import {readFile,stat} from 'node:fs/promises';
import {existsSync,createReadStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const source=path.resolve(fileURLToPath(new URL('../../web/',import.meta.url)));
const dist=path.resolve(fileURLToPath(new URL('../../dist/',import.meta.url)));
const base=process.env.SERVE_DIST==='1'&&existsSync(dist)?dist:source;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.ogg':'audio/ogg','.webm':'video/webm','.webp':'image/webp'};
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
    response.setHeader('Accept-Ranges','bytes');
    // Byte ranges let browsers seek within media such as the promotional film.
    const range=/^bytes=(\d*)-(\d*)$/.exec(request.headers.range||'');
    if(range&&(range[1]||range[2])){
      const start=range[1]?Number(range[1]):Math.max(0,info.size-Number(range[2])),end=range[1]&&range[2]?Math.min(Number(range[2]),info.size-1):info.size-1;
      if(start>end||start>=info.size){response.statusCode=416;response.setHeader('Content-Range',`bytes */${info.size}`);response.end();return true;}
      response.statusCode=206;response.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);response.setHeader('Content-Length',end-start+1);
      if(request.method==='HEAD'){response.end();return true;}
      createReadStream(target,{start,end}).on('error',()=>response.destroy()).pipe(response);return true;
    }
    if(request.method==='HEAD'){response.end();return true;}
    response.end(await readFile(target));return true;
  }catch{return false;}
}
