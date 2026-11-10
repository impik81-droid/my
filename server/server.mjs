import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || '/var/lib/my-workout/workout.json';
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) throw new Error('AUTH_SECRET is required');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({users:[],data:[]}, null, 2));
const load = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const save = db => { const tmp=DB_PATH+'.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_PATH); };
const json = (res, status, body) => { const out=JSON.stringify(body); res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(out); };
const readBody = req => new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1100000)reject(new Error('too large'))});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch{reject(new Error('bad json'))}});req.on('error',reject)});
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u = s => Buffer.from(String(s).replace(/-/g,'+').replace(/_/g,'/'),'base64');
const safeEq = (a,b) => { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && crypto.timingSafeEqual(x,y); };
const hashPassword = pw => { const salt=crypto.randomBytes(16); return new Promise((resolve,reject)=>crypto.pbkdf2(pw,salt,100000,32,'sha256',(e,key)=>e?reject(e):resolve(`pbkdf2$${b64u(salt)}$${key.toString('hex')}`))); };
const checkPassword = (pw,stored) => new Promise((resolve,reject)=>{ if(!stored?.startsWith('pbkdf2$')) return resolve(crypto.createHash('sha256').update(pw).digest('hex')===stored); const [,salt,hash]=stored.split('$'); crypto.pbkdf2(pw,unb64u(salt),100000,32,'sha256',(e,key)=>e?reject(e):resolve(safeEq(key.toString('hex'),hash))); });
const makeToken = id => { const p=b64u(Buffer.from(JSON.stringify({id,exp:Date.now()+90*864e5}))); const s=crypto.createHmac('sha256',AUTH_SECRET).update(p).digest(); return `${p}.${b64u(s)}`; };
const readToken = token => { try { const [p,s]=String(token||'').split('.'); if(!p||!s)return null; const sig=crypto.createHmac('sha256',AUTH_SECRET).update(p).digest(); if(!safeEq(sig,unb64u(s)))return null; const d=JSON.parse(unb64u(p).toString('utf8')); return d.exp>Date.now()?Number(d.id):null; } catch { return null; } };
const uid = req => { const h=req.headers.authorization||''; return h.startsWith('Bearer ')?readToken(h.slice(7)):null; };
async function route(req,res){
  if(req.url==='/api/health') return json(res,200,{ok:true});
  if(req.url==='/api/auth' && req.method==='POST') { let b;try{b=await readBody(req)}catch{return json(res,400,{error:'Некорректный запрос'})}; const email=String(b.email||'').trim().toLowerCase(),pw=String(b.password||''); if(!email||!pw)return json(res,400,{error:'Email и пароль обязательны'}); const db=load(); if(b.action==='register'){if(db.users.some(u=>u.email===email))return json(res,409,{error:'Пользователь уже существует'});const h=await hashPassword(pw),id=(Math.max(0,...db.users.map(u=>u.id||0))+1);db.users.push({id,email,password_hash:h,created_at:new Date().toISOString()});save(db);return json(res,200,{token:makeToken(id)})} if(b.action==='login'){const u=db.users.find(x=>x.email===email);if(!u||!(await checkPassword(pw,u.password_hash)))return json(res,401,{error:'Неверный email или пароль'});if(!u.password_hash.startsWith('pbkdf2$')){u.password_hash=await hashPassword(pw);save(db)}return json(res,200,{token:makeToken(u.id)})}return json(res,400,{error:'Неизвестное действие'}); }
  if(req.url==='/api/data' && (req.method==='GET'||req.method==='PUT')) { const id=uid(req);if(!id)return json(res,401,{error:'Требуется вход'}); const db=load(),row=db.data.find(x=>x.user_id===id); if(req.method==='GET')return json(res,200,{data:row?.payload||null,updated_at:row?.updated_at||null}); let b;try{b=await readBody(req)}catch{return json(res,400,{error:'Некорректные данные'})};if(typeof b.data!=='string'||b.data.length>1000000)return json(res,413,{error:'Слишком много данных'});if(row){row.payload=b.data;row.updated_at=new Date().toISOString()}else db.data.push({user_id:id,payload:b.data,updated_at:new Date().toISOString()});save(db);return json(res,200,{ok:true}); }
  return json(res,404,{error:'Not found'});
}
http.createServer((req,res)=>route(req,res).catch(e=>{console.error(e);json(res,500,{error:'Ошибка сервера'})})).listen(PORT,'127.0.0.1',()=>console.log(`API listening on ${PORT}`));
