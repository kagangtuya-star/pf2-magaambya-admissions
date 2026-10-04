import http from 'node:http';
import {createLimiter} from './utils/limiter.js';
import {routeRequest} from './router.js';
import {resolveFilmConfig} from './services/filmService.js';
export function createServer(){
  const limit=createLimiter();
  const film=resolveFilmConfig();
  if(film.error)console.warn(`学院影像已停用：${film.error} 修改 .env 后重启服务。`);
  const mediaSource=film.mode==='direct'?` ${new URL(film.src).origin}`:'';
  const frameSource=film.mode==='bilibili'?' https://player.bilibili.com':'';
  return http.createServer((request,response)=>{
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Referrer-Policy','same-origin');
    response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    response.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self'${mediaSource}; frame-src 'self'${frameSource}; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`);
    if(limit(request,response))return;
    routeRequest(request,response).catch(error=>{
      if(response.writableEnded)return;
      response.statusCode=error.status||500;
      response.setHeader('content-type','application/json; charset=utf-8');
      response.end(JSON.stringify({success:false,error:{code:error.status?'INVALID_REQUEST':'INTERNAL_SERVER_ERROR',message:error.status?error.message:'档案服务暂时不可用，请稍后重试。'}}));
      if(!error.status)console.error(error);
    });
  });
}
export function shouldStartServer(entryPath){
  if(!entryPath)return false;
  const normalized=entryPath.replaceAll('\\','/');
  return normalized.endsWith('/server/app.js')||normalized==='server/app.js';
}
if(shouldStartServer(process.argv[1])){
  if(process.env.NODE_ENV==='production'&&((process.env.MAGIC_SCHOOL_SECRET||'').length<32||(process.env.ADMIN_PASSPHRASE||'').length<12)){
    console.error('Production requires MAGIC_SCHOOL_SECRET (32+ characters) and ADMIN_PASSPHRASE (12+ characters).');process.exit(1);
  }
  const server=createServer(),port=Number(process.env.PORT||3001),host=process.env.HOST||'127.0.0.1';
  server.listen(port,host,()=>console.log(`Magaambya admissions: http://${host}:${port}\nAdmin: /admin · Ctrl+C to stop`));
}
