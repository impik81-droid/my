import {readToken} from "../_auth.js";
const err=(m,s)=>Response.json({error:m},{status:s});
async function uid(request,env){const h=request.headers.get("Authorization")||"";return h.startsWith("Bearer ")?await readToken(h.slice(7),env.AUTH_SECRET):null}
export async function onRequest({request,env}){
  if(!env.AUTH_SECRET||!env.DB)return err("Серверный таймер не настроен",500);
  const user=await uid(request,env);if(!user)return err("Требуется вход",401);
  if(request.method==="DELETE"){
    await env.DB.prepare("DELETE FROM rest_timers WHERE user_id=? AND sent=0").bind(user).run();
    return Response.json({ok:true});
  }
  if(request.method==="POST"){
    let b;try{b=await request.json()}catch{return err("Некорректный запрос",400)}
    const ends=Number(b?.endsAt);if(!Number.isFinite(ends)||ends<Date.now()-60000||ends>Date.now()+86400000)return err("Некорректное время таймера",400);
    await env.DB.prepare("DELETE FROM rest_timers WHERE user_id=? AND sent=0").bind(user).run();
    await env.DB.prepare("INSERT INTO rest_timers(user_id,ends_at,payload,sent,created_at) VALUES(?,?,?,0,datetime('now'))").bind(user,Math.round(ends),JSON.stringify({title:"Время отдыха закончилось",body:"Можно выполнять следующий подход",tag:"workout-rest"})).run();
    return Response.json({ok:true,endsAt:Math.round(ends)});
  }
  return err("Method not allowed",405);
}
