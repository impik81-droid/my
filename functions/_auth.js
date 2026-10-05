const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64u=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
function safeEq(a,b){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
async function pbkdf2(pw,salt){const k=await crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:100000},k,256))}
async function sha256(s){return hex(await crypto.subtle.digest("SHA-256",enc.encode(s)))}
export async function hashPassword(pw){const salt=crypto.getRandomValues(new Uint8Array(16));return "pbkdf2$"+b64u(salt)+"$"+await pbkdf2(pw,salt)}
export const isLegacy=h=>!h.startsWith("pbkdf2$");
export async function checkPassword(pw,stored){
  if(!isLegacy(stored)){const [,s,h]=stored.split("$");return safeEq(await pbkdf2(pw,unb64u(s)),h)}
  return safeEq(await sha256(pw),stored)
}
const hmacKey=secret=>crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
export async function makeToken(id,secret){
  const p=b64u(enc.encode(JSON.stringify({id,exp:Date.now()+90*864e5})));
  const s=await crypto.subtle.sign("HMAC",await hmacKey(secret),enc.encode(p));
  return p+"."+b64u(s)
}
export async function readToken(token,secret){
  try{const [p,s]=String(token).split(".");if(!p||!s)return null;
    if(!await crypto.subtle.verify("HMAC",await hmacKey(secret),unb64u(s),enc.encode(p)))return null;
    const d=JSON.parse(new TextDecoder().decode(unb64u(p)));return d.exp>Date.now()?Number(d.id):null}catch{return null}
}
