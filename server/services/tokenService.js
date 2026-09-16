import crypto from 'node:crypto';
// Without a configured key, development tokens intentionally expire on restart.
const SECRET=process.env.MAGIC_SCHOOL_SECRET||crypto.randomBytes(32).toString('hex');
const encode=payload=>Buffer.from(JSON.stringify(payload)).toString('base64url');
const signature=value=>crypto.createHmac('sha256',SECRET).update(value).digest('base64url');
function sign(payload,ttlSeconds){
  const now=Math.floor(Date.now()/1000),encoded=encode({...payload,iat:now,exp:now+ttlSeconds});
  return `${encoded}.${signature(encoded)}`;
}
export function signAdminToken({ttlSeconds=60*60*8}={}){return sign({role:'admin'},ttlSeconds);}
export function signAttemptToken({attemptId,contentVersion,ttlSeconds=60*60*2}){return sign({role:'public',attempt_id:attemptId,spell_verified:true,...(contentVersion?{content_version:contentVersion}:{})},ttlSeconds);}
export function verifyToken(token){
  if(typeof token!=='string')throw new Error('INVALID_TOKEN');
  const parts=token.split('.');if(parts.length!==2||!parts.every(Boolean))throw new Error('INVALID_TOKEN');
  const [encoded,provided]=parts,expected=signature(encoded),a=Buffer.from(provided),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw new Error('INVALID_TOKEN');
  let payload;try{payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));}catch{throw new Error('INVALID_TOKEN');}
  if(!Number.isFinite(payload.exp)||payload.exp<=Math.floor(Date.now()/1000))throw new Error('TOKEN_EXPIRED');
  return payload;
}
