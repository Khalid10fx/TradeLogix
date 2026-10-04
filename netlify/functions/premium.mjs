import { getStore } from "@netlify/blobs";

const PREMIUM_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_EMAIL = "yayazhey@gmail.com";
const store = getStore({ name: "tradecycle-premium", consistency: "strong" });

function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function page(body, status) {
  const doc = "<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>TradeCycle Premium</title><style>body{font-family:system-ui;background:#07111f;color:#e7eef8;display:grid;place-items:center;min-height:100vh;margin:0}.box{max-width:620px;width:calc(100% - 32px);background:#0b1628;border:1px solid #162a44;border-radius:18px;padding:28px;box-sizing:border-box}code{display:block;font-size:30px;letter-spacing:.12em;background:#07111f;border:1px solid #162a44;border-radius:10px;padding:16px;text-align:center;margin:20px 0;user-select:all}.muted{color:#91a4ba;line-height:1.6}</style><main class=\"box\">" + body + "</main>";
  return new Response(doc, { status: status || 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function emailOf(value) { return String(value || "").trim().toLowerCase(); }
function validEmail(value) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); }
function randomHex(bytes) { const b = new Uint8Array(bytes || 32); crypto.getRandomValues(b); return Array.from(b).map(function(x){ return x.toString(16).padStart(2,"0"); }).join(""); }
async function sha256(value) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(d)).map(function(x){ return x.toString(16).padStart(2,"0"); }).join(""); }
function requestId() { return "TC-" + randomHex(6).slice(0,6).toUpperCase(); }
function premiumCode() { const r = randomHex(9).toUpperCase(); return "TC-" + r.slice(0,4) + "-" + r.slice(4,8) + "-" + r.slice(8,12); }

async function sendMail(to, subject, text, html, replyTo) {
  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
  if (!key || !from) throw new Error("Missing RESEND_API_KEY or RESEND_FROM");
  const payload = { from: from, to: [to], subject: subject, text: text, html: html };
  if (replyTo) payload.reply_to = replyTo;
  const response = await fetch("https://api.resend.com/emails", { method:"POST", headers:{ "Authorization":"Bearer " + key, "Content-Type":"application/json" }, body:JSON.stringify(payload) });
  if (!response.ok) throw new Error("Resend " + response.status + " " + (await response.text()).slice(0,300));
  return response.json();
}

async function requestPremium(body, req) {
  const email = emailOf(body && body.email);
  if (!validEmail(email)) return json({ok:false,error:"Enter a valid email address."},400);
  const id = requestId(), token = randomHex(32), key = "pending/" + await sha256(token), now = Date.now();
  const site = process.env.URL || new URL(req.url).origin;
  const approval = site + "/api/premium/approve?token=" + encodeURIComponent(token);
  await store.setJSON(key,{requestId:id,email:email,createdAt:now,status:"pending"},{onlyIfNew:true});
  await sendMail(ADMIN_EMAIL, "TradeCycle Premium request — " + id,
    "TRADECYCLE PREMIUM REQUEST\\n\\nRequest ID: " + id + "\\nCustomer email: " + email + "\\nAmount: $4.99\\nPlan: Premium — 30 days\\n\\nFIRST: Check Buy Me a Coffee and confirm the $4.99 payment.\\n\\nAfter confirmation, open this secure link to generate the unique one-time code:\\n" + approval,
    "<h2>TradeCycle Premium Request</h2><p><b>Request ID:</b> " + id + "<br><b>Customer:</b> " + email + "<br><b>Amount:</b> $4.99<br><b>Plan:</b> Premium — 30 days</p><p><b>FIRST:</b> Check Buy Me a Coffee and confirm the $4.99 payment.</p><p><a href=\"" + approval + "\" style=\"display:inline-block;padding:12px 18px;background:#38bdf8;color:#04111b;text-decoration:none;border-radius:8px;font-weight:700\">Confirm Payment &amp; Generate Code</a></p>", email);
  return json({ok:true,requestId:id,message:"Request sent. Your Premium code will be provided after payment is confirmed."});
}

async function approve(token) {
  if (!token) return page("<h1>Invalid approval link</h1><p class=\"muted\">This link is invalid.</p>",400);
  const key = "pending/" + await sha256(token), got = await store.getWithMetadata(key,{type:"json"});
  if (!got || !got.data) return page("<h1>Request not found</h1><p class=\"muted\">This request was already processed or the link is invalid.</p>",404);
  if (got.data.status !== "pending") return page("<h1>Already processed</h1><p class=\"muted\">This request has already been processed.</p>",409);
  const code = premiumCode(), codeKey = "codes/" + await sha256(code), now = Date.now();
  await store.setJSON(codeKey,{email:got.data.email,requestId:got.data.requestId,issuedAt:now,used:false},{onlyIfNew:true});
  const write = await store.setJSON(key,{...got.data,status:"issued",issuedAt:now,codeKey:codeKey},{onlyIfMatch:got.etag});
  if (!write.modified) { await store.delete(codeKey); return page("<h1>Already processed</h1><p class=\"muted\">This request was processed by another click.</p>",409); }
  return page("<h1>Premium code generated</h1><p class=\"muted\"><b>Customer:</b> " + got.data.email + "<br><b>Request:</b> " + got.data.requestId + "</p><code>" + code + "</code><p class=\"muted\">Copy this one-time code and send it to the customer. It activates Premium for 30 days.</p>");
}

async function activate(body) {
  const email = emailOf(body && body.email), code = String((body && body.code) || "").trim().toUpperCase();
  if (!validEmail(email) || !/^TC-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) return json({ok:false,error:"Invalid email or Premium code."},400);
  const key = "codes/" + await sha256(code), got = await store.getWithMetadata(key,{type:"json"});
  if (!got || !got.data) return json({ok:false,error:"That Premium code is invalid."},400);
  if (got.data.email !== email) return json({ok:false,error:"That code does not match this email."},400);
  if (got.data.used) return json({ok:false,error:"That Premium code has already been used."},400);
  const now = Date.now(), current = Number((body && body.currentExpiry) || 0);
  const safeCurrent = Number.isFinite(current) && current > now && current < now + PREMIUM_MS ? current : 0;
  const expiresAt = Math.max(now,safeCurrent) + PREMIUM_MS;
  const write = await store.setJSON(key,{...got.data,used:true,activatedAt:now,expiresAt:expiresAt},{onlyIfMatch:got.etag});
  if (!write.modified) return json({ok:false,error:"That Premium code has already been used."},409);
  return json({ok:true,expiresAt:expiresAt,days:30});
}

export default async function(req, context) {
  try {
    if (req.method === "OPTIONS") return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type"}});
    const action = (context.params && context.params.action) || "";
    if (action === "request" && req.method === "POST") return requestPremium(await req.json(),req);
    if (action === "activate" && req.method === "POST") return activate(await req.json());
    if (action === "approve" && req.method === "GET") return approve(new URL(req.url).searchParams.get("token"));
    return json({ok:false,error:"Not found"},404);
  } catch (e) { console.error("TradeCycle premium error",e); return json({ok:false,error:"Server error. Please try again later."},500); }
}

export const config = { path:"/api/premium/:action" };