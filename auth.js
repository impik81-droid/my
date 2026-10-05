export async function onRequestPost({request, env}) {
  const body = await request.json();
  const {action,email,password}=body||{};
  if(!email||!password) return Response.json({error:"Email и пароль обязательны"}, {status:400});
  const norm=email.trim().toLowerCase();
  const hash=await sha256(password);
  if(action==="register"){
    const exists=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(norm).first();
    if(exists) return Response.json({error:"Пользователь уже существует"}, {status:409});
    const r=await env.DB.prepare("INSERT INTO users(email,password_hash,created_at) VALUES(?,?,datetime('now'))").bind(norm,hash).run();
    const token=await makeToken(r.meta.last_row_id,norm,env);
    return Response.json({token});
  }
  if(action==="login"){
    const u=await env.DB.prepare("SELECT id,email,password_hash FROM users WHERE email=?").bind(norm).first();
    if(!u||u.password_hash!==hash) return Response.json({error:"Неверный email или пароль"}, {status:401});
    return Response.json({token:await makeToken(u.id,u.email,env)});
  }
  return Response.json({error:"Неизвестное действие"}, {status:400});
}
async function sha256(s){const b=new TextEncoder().encode(s),h=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function makeToken(id,email,env){const raw=`${id}.${email}.${env.AUTH_SECRET||"change-me"}`;return btoa(raw)}
