import {hashPassword,checkPassword,isLegacy,makeToken} from "../_auth.js";
const err=(m,s)=>Response.json({error:m},{status:s});
export async function onRequestPost({request,env}){
  if(!env.AUTH_SECRET) return err("На сервере не задан AUTH_SECRET",500);
  if(!env.DB) return err("К проекту не привязана база DB",500);
  let body;try{body=await request.json()}catch{return err("Некорректный запрос",400)}
  const {action,email,password}=body||{};
  if(!email||!password) return err("Email и пароль обязательны",400);
  const norm=String(email).trim().toLowerCase();
  if(action==="register"){
    const exists=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(norm).first();
    if(exists) return err("Пользователь уже существует",409);
    const hash=await hashPassword(String(password));
    const r=await env.DB.prepare("INSERT INTO users(email,password_hash,created_at) VALUES(?,?,datetime('now'))").bind(norm,hash).run();
    return Response.json({token:await makeToken(r.meta.last_row_id,env.AUTH_SECRET)});
  }
  if(action==="login"){
    const u=await env.DB.prepare("SELECT id,password_hash FROM users WHERE email=?").bind(norm).first();
    if(!u||!await checkPassword(String(password),u.password_hash)) return err("Неверный email или пароль",401);
    if(isLegacy(u.password_hash)) await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(await hashPassword(String(password)),u.id).run();
    return Response.json({token:await makeToken(u.id,env.AUTH_SECRET)});
  }
  return err("Неизвестное действие",400);
}
