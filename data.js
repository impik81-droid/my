export async function onRequest({request,env}) {
 const h=request.headers.get("Authorization")||""; const token=h.replace("Bearer ","");
 if(!token)return Response.json({error:"Unauthorized"},{status:401});
 const s=await env.DB.prepare("SELECT * FROM sessions WHERE token=? AND expires_at>?").bind(token,Date.now()).first();
 if(!s)return Response.json({error:"Unauthorized"},{status:401});
 if(request.method==="GET"){const d=await env.DB.prepare("SELECT data FROM user_data WHERE user_id=?").bind(s.user_id).first();return Response.json({data:d?JSON.parse(d.data):null});}
 if(request.method==="POST"){const body=await request.json();const data=JSON.stringify(body.data||{});await env.DB.prepare("INSERT INTO user_data(user_id,data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at").bind(s.user_id,data,new Date().toISOString()).run();return Response.json({ok:true});}
 return new Response("Method Not Allowed",{status:405});
}