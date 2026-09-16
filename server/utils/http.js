export function sendJson(response,statusCode,payload) {
  response.statusCode=statusCode;response.setHeader('content-type','application/json; charset=utf-8');
  response.setHeader('cache-control','no-store');response.end(JSON.stringify(payload));
}
export async function readJsonBody(request){
  const limit=256*1024,chunks=[];let bytes=0;
  for await(const chunk of request){
    bytes+=chunk.length;
    if(bytes>limit){const e=new Error('请求内容过大。');e.status=413;throw e;}
    chunks.push(chunk);
  }
  if(!bytes)return {};
  let body;
  try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{const e=new Error('JSON 格式无效。');e.status=400;throw e;}
  if(!body||typeof body!=='object'||Array.isArray(body)){const e=new Error('请求需要一个 JSON 对象。');e.status=400;throw e;}
  return body;
}
