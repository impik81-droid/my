export async function onRequestPost({request,env}) {
 const {email,password}=await request.json();
 if(!email||!password||password.length<6)return Response.json({error:"Нужны email и пароль от 6 символов"}, {status:400});
 const hash=await sha256(password);
 let u=await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email.toLowerCase()).first();
 if(!u){await env.DB.prepare("INSERT INTO users(email,password_hash,created_at) VALUES(?,?,?)").bind(email.toLowerCase(),hash,new Date().toISOString()).run();u=await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email.toLowerCase()).first();}
 else if(u.password_hash!==hash)return Response.json({error:"Неверный пароль"}, {status:401});
 const token=crypto.randomUUID()+crypto.randomUUID();
 await env.DB.prepare("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)").bind(token,u.id,Date.now()+30*86400000).run();
 const d=await env.DB.prepare("SELECT data FROM user_data WHERE user_id=?").bind(u.id).first();
 return Response.json({token,data:d?JSON.parse(d.data):null});
}
async function sha256(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}