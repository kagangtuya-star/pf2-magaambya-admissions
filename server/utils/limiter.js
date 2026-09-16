/** Single-process limiter; intentionally ignores untrusted forwarding headers. */
export function createLimiter({now=Date.now}={}){
 const buckets=new Map();let sweeps=0;
 return function limit(request,response){
  if(request.method!=='POST')return false;
  const path=request.url?.split('?')[0],isAdmin=path==='/api/admin/session',isUnlock=path==='/api/public/unlock';
  if(!isAdmin&&!isUnlock)return false;
  const time=now(),windowMs=60000,max=isAdmin?12:60,key=`${request.socket.remoteAddress}:${path}`;
  if(++sweeps%100===0)for(const [k,v]of buckets)if(v.reset<=time)buckets.delete(k);
  let bucket=buckets.get(key);if(!bucket||bucket.reset<=time){bucket={count:0,reset:time+windowMs};buckets.set(key,bucket);}
  bucket.count++;if(bucket.count<=max)return false;
  response.statusCode=429;response.setHeader('Content-Type','application/json; charset=utf-8');response.setHeader('Retry-After',String(Math.ceil((bucket.reset-time)/1000)));response.setHeader('Cache-Control','no-store');
  response.end(JSON.stringify({success:false,error:{code:'RATE_LIMITED',message:'尝试次数过多，请稍后再试。'}}));return true;
 };
}
