function userId(request,env){
  const h=request.headers.get("Authorization")||"";
  if(!h.startsWith("Bearer ")) return null;
  try{const raw=atob(h.slice(7));const p=raw.split(".");if(p.length<3||p.slice(2).join(".")!==(env.AUTH_SECRET||"change-me"))return null;return Number(p[0])}catch{return null}
}
export async function onRequest({request,env}){
 const uid=userId(request,env); if(!uid)return Response.json({error:"Требуется вход"}, {status:401});
 if(request.method==="GET"){const r=await env.DB.prepare("SELECT payload,updated_at FROM data WHERE user_id=?").bind(uid).first();return Response.json({data:r?.payload||null,updated_at:r?.updated_at||null})}
 if(request.method==="PUT"){const {data}=await request.json();if(typeof data!=="string")return Response.json({error:"Некорректные данные"},{status:400});await env.DB.prepare("INSERT INTO data(user_id,payload,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at").bind(uid,data).run();return Response.json({ok:true})}
 return Response.json({error:"Method not allowed"},{status:405})
}
