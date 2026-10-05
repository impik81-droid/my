import {readToken} from "../_auth.js";
const err=(m,s)=>Response.json({error:m},{status:s});
export async function onRequest({request,env}){
  if(!env.AUTH_SECRET) return err("На сервере не задан AUTH_SECRET",500);
  if(!env.DB) return err("К проекту не привязана база DB",500);
  const h=request.headers.get("Authorization")||"";
  const uid=h.startsWith("Bearer ")?await readToken(h.slice(7),env.AUTH_SECRET):null;
  if(!uid) return err("Требуется вход",401);
  if(request.method==="GET"){
    const r=await env.DB.prepare("SELECT payload,updated_at FROM data WHERE user_id=?").bind(uid).first();
    return Response.json({data:r?.payload||null,updated_at:r?.updated_at||null});
  }
  if(request.method==="PUT"){
    let body;try{body=await request.json()}catch{return err("Некорректный запрос",400)}
    const {data}=body||{};
    if(typeof data!=="string") return err("Некорректные данные",400);
    if(data.length>1000000) return err("Слишком много данных",413);
    await env.DB.prepare("INSERT INTO data(user_id,payload,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at").bind(uid,data).run();
    return Response.json({ok:true});
  }
  return err("Method not allowed",405);
}
