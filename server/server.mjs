import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || '/var/lib/my-workout/workout.json';
const VIDEO_DIR = process.env.VIDEO_DIR || '/var/www/workout-copy/videos';
const VIDEO_META = process.env.VIDEO_META || '/var/lib/my-workout/videos.json';
const AUTH_SECRET = process.env.AUTH_SECRET;
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
if (!AUTH_SECRET) throw new Error('AUTH_SECRET is required');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({users:[],data:[]}, null, 2));
if (!fs.existsSync(VIDEO_META)) fs.writeFileSync(VIDEO_META, '[]');
const load = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const save = db => { const tmp=DB_PATH+'.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_PATH); };
const videos = () => JSON.parse(fs.readFileSync(VIDEO_META, 'utf8'));
const saveVideos = v => { const tmp=VIDEO_META+'.tmp'; fs.writeFileSync(tmp, JSON.stringify(v, null, 2)); fs.renameSync(tmp, VIDEO_META); };
const json = (res, status, body) => { const out=JSON.stringify(body); res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(out); };
const readBody = (req,max=1100000) => new Promise((resolve,reject)=>{let a=[],n=0;req.on('data',c=>{n+=c.length;if(n>max){reject(new Error('too large'));req.destroy()}else a.push(c)});req.on('end',()=>resolve(Buffer.concat(a)));req.on('error',reject)});
const readJson = async req => JSON.parse((await readBody(req)).toString('utf8')||'{}');
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u = s => Buffer.from(String(s).replace(/-/g,'+').replace(/_/g,'/'),'base64');
const safeEq = (a,b) => { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && crypto.timingSafeEqual(x,y); };
const hashPassword = pw => { const salt=crypto.randomBytes(16); return new Promise((resolve,reject)=>crypto.pbkdf2(pw,salt,100000,32,'sha256',(e,key)=>e?reject(e):resolve(`pbkdf2$${b64u(salt)}$${key.toString('hex')}`))); };
const checkPassword = (pw,stored) => new Promise((resolve,reject)=>{ if(!stored?.startsWith('pbkdf2$')) return resolve(crypto.createHash('sha256').update(pw).digest('hex')===stored); const [,salt,hash]=stored.split('$'); crypto.pbkdf2(pw,unb64u(salt),100000,32,'sha256',(e,key)=>e?reject(e):resolve(safeEq(key.toString('hex'),hash))); });
const makeToken = id => { const p=b64u(Buffer.from(JSON.stringify({id,exp:Date.now()+90*864e5}))); const s=crypto.createHmac('sha256',AUTH_SECRET).update(p).digest(); return `${p}.${b64u(s)}`; };
const readToken = token => { try { const [p,s]=String(token||'').split('.'); if(!p||!s)return null; const sig=crypto.createHmac('sha256',AUTH_SECRET).update(p).digest(); if(!safeEq(sig,unb64u(s)))return null; const d=JSON.parse(unb64u(p).toString('utf8')); return d.exp>Date.now()?Number(d.id):null; } catch { return null; } };
const uid = req => { const h=req.headers.authorization||''; return h.startsWith('Bearer ')?readToken(h.slice(7)):null; };
const admin = req => { const id=uid(req); if(!id||!ADMIN_EMAIL)return null; const u=load().users.find(x=>x.id===id); return u&&u.email.toLowerCase()===ADMIN_EMAIL?u:null; };
const safeName = s => String(s||'video').replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g,'_').slice(0,100);
function parseMultipart(buf,boundary){const out={};const mark=Buffer.from('--'+boundary);let p=0;while((p=buf.indexOf(mark,p))>=0){p+=mark.length;if(buf[p]===45)break;if(buf[p]===13)p+=2;const end=buf.indexOf(Buffer.from('\r\n\r\n'),p);if(end<0)break;const h=buf.slice(p,end).toString();p=end+4;let stop=buf.indexOf(mark,p);if(stop<0)break;let val=buf.slice(p,Math.max(p,stop-2));const nm=/name="([^"]+)"/.exec(h)?.[1];const fn=/filename="([^"]*)"/.exec(h)?.[1];if(nm)out[nm]={filename:fn||'',data:val,text:val.toString()};p=stop;}return out;}
async function route(req,res){
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/api/health') return json(res,200,{ok:true});
  if(u.pathname==='/api/auth' && req.method==='POST'){let b;try{b=await readJson(req)}catch{return json(res,400,{error:'Некорректный запрос'})};const email=String(b.email||'').trim().toLowerCase(),pw=String(b.password||'');if(!email||!pw)return json(res,400,{error:'Email и пароль обязательны'});const db=load();if(b.action==='register'){if(db.users.some(x=>x.email===email))return json(res,409,{error:'Пользователь уже существует'});const id=Math.max(0,...db.users.map(x=>x.id||0))+1;db.users.push({id,email,password_hash:await hashPassword(pw),created_at:new Date().toISOString()});save(db);return json(res,200,{token:makeToken(id)})}if(b.action==='login'){const x=db.users.find(x=>x.email===email);if(!x||!(await checkPassword(pw,x.password_hash)))return json(res,401,{error:'Неверный email или пароль'});if(!x.password_hash.startsWith('pbkdf2$')){x.password_hash=await hashPassword(pw);save(db)}return json(res,200,{token:makeToken(x.id)})}return json(res,400,{error:'Неизвестное действие'})}
  if(u.pathname==='/api/data'&&(req.method==='GET'||req.method==='PUT')){const id=uid(req);if(!id)return json(res,401,{error:'Требуется вход'});const db=load(),row=db.data.find(x=>x.user_id===id);if(req.method==='GET')return json(res,200,{data:row?.payload||null,updated_at:row?.updated_at||null});let b;try{b=await readJson(req)}catch{return json(res,400,{error:'Некорректные данные'})};if(typeof b.data!=='string'||b.data.length>1000000)return json(res,413,{error:'Слишком много данных'});if(row){row.payload=b.data;row.updated_at=new Date().toISOString()}else db.data.push({user_id:id,payload:b.data,updated_at:new Date().toISOString()});save(db);return json(res,200,{ok:true})}
  if(u.pathname==='/api/videos'&&req.method==='GET')return json(res,200,videos().map(x=>({id:x.id,exercise:x.exercise,title:x.title,url:'/videos/'+encodeURIComponent(x.file)})));
  if(u.pathname==='/api/admin/videos'&&req.method==='POST'){if(!admin(req))return json(res,403,{error:'Доступ только администратору'});if(!String(req.headers['content-type']||'').includes('multipart/form-data'))return json(res,415,{error:'Нужна multipart-загрузка'});const boundary=/boundary=([^;]+)/i.exec(req.headers['content-type'])?.[1];if(!boundary)return json(res,400,{error:'Нет boundary'});let parts;try{parts=parseMultipart(await readBody(req,125*1024*1024),boundary)}catch{return json(res,413,{error:'Видео слишком большое'})};const file=parts.file,exercise=String(parts.exercise?.text||'').trim();if(!file?.data?.length||!exercise)return json(res,400,{error:'Укажите упражнение и видео'});const ext=path.extname(file.filename||'').toLowerCase();if(!['.mp4','.webm','.mov'].includes(ext))return json(res,400,{error:'Разрешены MP4, WebM или MOV'});const id=crypto.randomUUID(),name=id+ext;fs.writeFileSync(path.join(VIDEO_DIR,name),file.data);const item={id,file:name,exercise,title:String(parts.title?.text||exercise).trim(),created_at:new Date().toISOString()};const all=videos();all.push(item);saveVideos(all);return json(res,200,{ok:true,video:{...item,url:'/videos/'+encodeURIComponent(name)}})}
  if(u.pathname.startsWith('/api/admin/videos/')&&req.method==='DELETE'){if(!admin(req))return json(res,403,{error:'Доступ только администратору'});const id=u.pathname.split('/').pop(),all=videos(),x=all.find(v=>v.id===id);if(!x)return json(res,404,{error:'Видео не найдено'});try{fs.unlinkSync(path.join(VIDEO_DIR,x.file))}catch{}saveVideos(all.filter(v=>v.id!==id));return json(res,200,{ok:true})}
  return json(res,404,{error:'Not found'});
}
http.createServer((req,res)=>route(req,res).catch(e=>{console.error(e);json(res,500,{error:'Ошибка сервера'})})).listen(PORT,'127.0.0.1',()=>console.log(`API listening on ${PORT}`));
