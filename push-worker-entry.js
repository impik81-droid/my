import webpush from "web-push";

const SUBJECT = "mailto:impik81@gmail.com";

async function processDue(env) {
  if (!env.DB || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw new Error("Push Worker secrets/bindings are missing");
  webpush.setVapidDetails(SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const due = await env.DB.prepare("SELECT id,user_id,payload FROM rest_timers WHERE sent=0 AND ends_at<=? ORDER BY ends_at LIMIT 100").bind(Date.now()).all();
  for (const timer of due.results || []) {
    const subs = await env.DB.prepare("SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=?").bind(timer.user_id).all();
    let delivered = false;
    for (const sub of subs.results || []) {
      try {
        await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}}, timer.payload || "{}");
        delivered = true;
      } catch (e) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
      }
    }
    await env.DB.prepare("UPDATE rest_timers SET sent=1 WHERE id=?").bind(timer.id).run();
    if (!delivered) console.log("No active Push subscription for timer", timer.id);
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/health") return new Response("ok");
    return new Response("Workout Push Worker", {status:200});
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(processDue(env));
  }
};
