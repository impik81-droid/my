import {readToken} from "../_auth.js";
const err=(m,s)=>Response.json({error:m},{status:s});
async function uid(request,env){const h=request.headers.get("Authorization")||"";return h.startsWith("Bearer ")?await readToken(h.slice(7),env.AUTH_SECRET):null}
export async function onRequest({request,env}){
  if(!env.AUTH_SECRET||!env.DB)return err("Сервер Push не настроен",500);
  if(request.method==="GET")return Response.json({publicKey:env.VAPID_PUBLIC_KEY||null});
  const user=await uid(request,env);if(!user)return err("Требуется вход",401);
  if(request.method==="DELETE"){
    let b;try{b=await request.json()}catch{return err("Некорректный запрос",400)}
    if(!b?.endpoint)return err("Не указан endpoint",400);
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?").bind(user,b.endpoint).run();
    return Response.json({ok:true});
  }
  if(request.method==="POST"){
    let b;try{b=await request.json()}catch{return err("Некорректный запрос",400)}
    const s=b?.subscription;if(!s?.endpoint||!s.keys?.p256dh||!s.keys?.auth)return err("Некорректная Push-подписка",400);
    await env.DB.prepare("INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth,created_at) VALUES(?,?,?,?,datetime('now')) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth").bind(user,s.endpoint,s.keys.p256dh,s.keys.auth).run();
    return Response.json({ok:true});
  }
  return err("Method not allowed",405);
}
