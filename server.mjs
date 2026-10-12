import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4173);
const origin=process.env.APP_ORIGIN||`http://127.0.0.1:${port}`;
const tokens=new Map(),sessions=new Map(),limits=new Map();
const hash=x=>createHash('sha256').update(x).digest('hex');
const normalize=x=>String(x||'').trim().toLowerCase();
async function jsonFile(name,fallback){try{return JSON.parse(await readFile(path.join(root,'private-data',name),'utf8'));}catch{return fallback;}}
async function buyers(){const rows=await jsonFile('buyers.json',[]);const excluded=await jsonFile('인증제외목록.json',{});return new Set(rows.filter(r=>r.status==='완료'&&!excluded.excluded_payment_numbers?.includes(String(r.payment_number))).map(r=>normalize(r.email)));}
async function ready(){return (await buyers()).size>0&&Boolean(process.env.RESEND_API_KEY&&process.env.MAIL_FROM)&&process.env.AUTH_ENABLED==='true';}
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw Error('body too large');}return JSON.parse(text||'{}');}
function throttle(key){const now=Date.now();const item=limits.get(key);if(item&&now<item.until&&item.count>=5)return false;limits.set(key,item&&now<item.until?{...item,count:item.count+1}:{count:1,until:now+900000});return true;}
function sessionCookie(value,age){return `oruri_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${origin.startsWith('https:')?'; Secure':''}`;}
async function member(req){const value=req.headers.cookie?.match(/(?:^|;\s*)oruri_session=([a-f0-9]+)/)?.[1];const s=value&&sessions.get(hash(value));if(!s||s.expires<Date.now()||!(await buyers()).has(s.email))return null;return s;}
setInterval(()=>{const now=Date.now();for(const map of [tokens,sessions])for(const [key,v]of map)if(v.expires<now)map.delete(key);for(const [key,v]of limits)if(v.until<now)limits.delete(key);},60000).unref();
const server=http.createServer(async(req,res)=>{
try{
 const url=new URL(req.url,origin);
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 if(req.method==='POST'&&req.headers.origin!==origin)return send(res,403,{message:'앱 화면에서 다시 시도해 주세요.'});
 if(url.pathname==='/api/status')return send(res,200,{ready:await ready()});
 if(url.pathname==='/api/buyer-check'&&req.method==='POST'){
  if(!throttle('check:'+req.socket.remoteAddress))return send(res,429,{message:'요청이 많습니다. 15분 후 다시 시도해 주세요.'});
  const {email:raw}=await body(req),email=normalize(raw);
  if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254)return send(res,400,{message:'올바른 이메일 주소를 입력해 주세요.'});
  return send(res,200,{eligible:(await buyers()).has(email)});
 }
 if(url.pathname==='/api/auth/request'&&req.method==='POST'){
  if(!await ready())return send(res,503,{message:'구매자 인증 준비 중입니다. 명단과 이메일 발송 서비스 연결 후 이용할 수 있습니다.'});
  const {email:raw,consent}=await body(req),email=normalize(raw);
  if(consent!==true||!/^\S+@\S+\.\S+$/.test(email)||email.length>254)return send(res,400,{message:'이메일과 개인정보 이용 동의를 확인해 주세요.'});
  if(!throttle('ip:'+req.socket.remoteAddress)||!throttle('email:'+hash(email)))return send(res,429,{message:'요청이 많습니다. 15분 후 다시 시도해 주세요.'});
  if((await buyers()).has(email)){
   for(const [key,v]of tokens)if(v.email===email)tokens.delete(key);
   const token=randomBytes(32).toString('hex');tokens.set(hash(token),{email,expires:Date.now()+900000});
   const link=`${origin}/#verify=${token}`;
   try{const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.MAIL_FROM,to:[email],subject:'디지털 오르리 · 구매자 인증 링크',text:`아래 링크에서 입장하기를 눌러 주세요. 링크는 15분 동안 한 번만 사용할 수 있습니다.\n\n${link}\n\n요청하지 않으셨다면 이 이메일을 무시해 주세요.`})});if(!result.ok)throw Error('mail failed');}catch{tokens.delete(hash(token));return send(res,503,{message:'이메일 발송을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
  }
  return send(res,200,{message:'구매자 명단에 등록된 이메일이면 인증 링크가 발송됩니다. 받은편지함과 스팸함을 확인해 주세요. 링크는 15분간 유효합니다.'});
 }
 if(url.pathname==='/api/auth/verify'&&req.method==='POST'){
  if(!throttle('verify:'+req.socket.remoteAddress))return send(res,429,{message:'잠시 후 다시 시도해 주세요.'});
  const {token}=await body(req);if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return send(res,400,{message:'올바른 인증 링크를 이용해 주세요.'});
  const key=hash(token),record=tokens.get(key);tokens.delete(key);
  if(!record||record.expires<Date.now()||!(await buyers()).has(record.email))return send(res,401,{message:'만료되었거나 사용할 수 없는 링크입니다. 인증 이메일을 다시 요청해 주세요.'});
  const id=randomBytes(32).toString('hex');sessions.set(hash(id),{email:record.email,expires:Date.now()+86400000});return send(res,200,{authenticated:true},{'Set-Cookie':sessionCookie(id,86400)});
 }
 if(url.pathname==='/api/me')return send(res,200,{authenticated:Boolean(await member(req))});
 if(url.pathname==='/api/logout'&&req.method==='POST'){const value=req.headers.cookie?.match(/oruri_session=([a-f0-9]+)/)?.[1];if(value)sessions.delete(hash(value));return send(res,200,{ok:true},{'Set-Cookie':sessionCookie('',0)});}
 if(url.pathname==='/api/lessons'){
  if(!await member(req))return send(res,401,{message:'이메일 인증 후 이용해 주세요.'});
  return send(res,200,await jsonFile('lessons.json',[]));
 }
 if(url.pathname.startsWith('/api/'))return send(res,404,{message:'요청한 기능을 찾을 수 없습니다.'});
 if(!['GET','HEAD'].includes(req.method))return send(res,405,{message:'지원하지 않는 요청입니다.'});
 const files={'/':'index.html','/index.html':'index.html','/contact.html':'contact.html','/style.css':'style.css','/app.js':'app.js'};
 const file=files[url.pathname];if(!file)return send(res,404,{message:'페이지를 찾을 수 없습니다.'});
 const types={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
 const bytes=await readFile(path.join(root,'dist',file));res.writeHead(200,{'Content-Type':types[path.extname(file)]+'; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:bytes);
}catch{send(res,500,{message:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`디지털 오르리 앱: ${origin}`));
