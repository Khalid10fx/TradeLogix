import { getStore } from "@netlify/blobs";

const PREMIUM_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_EMAIL = "yayazhey@gmail.com";
const store = getStore({ name: "tradecycle-premium", consistency: "strong" });

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function page(body, status) {
  const doc = "<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>TradeCycle Premium</title><style>body{font-family:system-ui;background:#07111f;color:#e7eef8;display:grid;place-items:center;min-height:100vh;margin:0}.box{max-width:680px;width:calc(100% - 32px);background:#0b1628;border:1px solid #162a44;border-radius:18px;padding:28px;box-sizing:border-box}code{display:block;font-size:30px;letter-spacing:.12em;background:#07111f;border:1px solid #162a44;border-radius:10px;padding:16px;text-align:center;margin:20px 0;user-select:all}.muted{color:#91a4ba;line-height:1.6}.btn{display:inline-block;padding:12px 18px;border-radius:9px;text-decoration:none;font-weight:700;margin:4px}.yes{background:#38bdf8;color:#04111b}.no{background:#ef4444;color:white}</style><main class=\"box\">" + body + "</main>";
  return new Response(doc, {
    status: status || 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function emailOf(value) { return String(value || "").trim().toLowerCase(); }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function randomHex(bytes) {
  const b = new Uint8Array(bytes || 32);
  crypto.getRandomValues(b);
  return Array.from(b).map(function(x){ return x.toString(16).padStart(2,"0"); }).join("");
}
async function sha256(value) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(d)).map(function(x){ return x.toString(16).padStart(2,"0"); }).join("");
}
function requestId() { return "TC-" + randomHex(6).slice(0,6).toUpperCase(); }
function premiumCode() {
  const r = randomHex(6).toUpperCase();
  return "TC-" + r.slice(0,4) + "-" + r.slice(4,8) + "-" + r.slice(8,12);
}

async function formSubmitAjax(fields) {
  const endpoint = "https://formsubmit.co/ajax/" + encodeURIComponent(ADMIN_EMAIL);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(fields)
  });
  if (!response.ok) throw new Error("FormSubmit " + response.status + " " + (await response.text()).slice(0,300));
  return response.json().catch(function(){ return {}; });
}

async function formSubmitStandard(fields) {
  const endpoint = "https://formsubmit.co/" + encodeURIComponent(ADMIN_EMAIL);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "text/html,application/xhtml+xml" },
    body: new URLSearchParams(fields).toString()
  });
  if (!response.ok) throw new Error("FormSubmit " + response.status + " " + (await response.text()).slice(0,300));
  return true;
}

async function notifyAdmin(email, id, code) {
  await formSubmitAjax({
    name: "TradeCycle Premium",
    email: email,
    _replyto: email,
    _subject: "TradeCycle Premium request — " + id,
    message:
      "TRADECYCLE PREMIUM REQUEST\n\n" +
      "Request ID: " + id + "\n" +
      "Customer email: " + email + "\n" +
      "Amount: $4.99\n" +
      "Plan: Premium — 30 days\n\n" +
      "CHECK BUY ME A COFFEE FIRST. If the $4.99 payment is confirmed, send this one-time code to the customer:\n\n" +
      code + "\n\n" +
      "The code can be used once. Premium lasts 30 days. If payment is not confirmed, do not send the code. No admin link or ADMIN_KEY is required."
  });
}

async function sendCustomerResult

async function requestPremium(body, req) {
  const email = emailOf(body && body.email);
  if (!validEmail(email)) return json({ok:false,error:"Enter a valid email address."},400);

  const id = requestId();
  const clientToken = randomHex(32);
  const adminKey = "pending-admin/" + await sha256(clientToken);
  const clientKey = "pending-client/" + await sha256(clientToken);
  const now = Date.now();
  const code = premiumCode();
  const codeKey = "codes/" + await sha256(code);

  const codeCreated = await store.setJSON(codeKey,{email:email,requestId:id,issuedAt:now,used:false,code:code},{onlyIfNew:true});
  if (!codeCreated.modified) return json({ok:false,error:"Please try again."},500);

  const record = {
    requestId:id,
    email:email,
    createdAt:now,
    status:"issued",
    clientTokenHash:await sha256(clientToken),
    codeKey:codeKey,
    code:code
  };

  const created = await store.setJSON(adminKey,record,{onlyIfNew:true});
  if (!created.modified) {
    await store.delete(codeKey);
    return json({ok:false,error:"Please try again."},500);
  }
  await store.setJSON(clientKey,{requestId:id,adminKey:adminKey},{onlyIfNew:true});

  let emailed = true;
  try {
    await notifyAdmin(email,id,code);
  } catch (e) {
    emailed = false;
    console.error("TradeCycle Premium email failed; request and code remain stored",e);
  }

  return json({
    ok:true,
    requestId:id,
    clientToken:clientToken,
    emailed:emailed,
    message:"Request received. Check Buy Me a Coffee. If payment is confirmed, send the customer the one-time code from the Premium request email."
  });
}

async function status(body) {
  const token = String((body && body.clientToken) || "").trim();
  if (!token) return json({ok:false,error:"Missing request token."},400);

  const clientKey = "pending-client/" + await sha256(token);
  const link = await store.getWithMetadata(clientKey,{type:"json"});
  if (!link || !link.data) return json({ok:false,error:"Request not found."},404);

  const got = await store.getWithMetadata(link.data.adminKey,{type:"json"});
  if (!got || !got.data) return json({ok:false,error:"Request not found."},404);

  const r = got.data;
  if (r.status === "pending") return json({ok:true,status:"pending",requestId:r.requestId});
  if (r.status === "denied") return json({ok:true,status:"denied",requestId:r.requestId});
  if (r.status === "issued") return json({ok:true,status:"issued",requestId:r.requestId});

  return json({ok:true,status:r.status,requestId:r.requestId});
}

async function activate(body) {
  const email = emailOf(body && body.email);
  const code = String((body && body.code) || "").trim().toUpperCase();
  if (!validEmail(email) || !/^TC-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
    return json({ok:false,error:"Invalid email or Premium code."},400);
  }

  const key = "codes/" + await sha256(code);
  const got = await store.getWithMetadata(key,{type:"json"});
  if (!got || !got.data) return json({ok:false,error:"That Premium code is invalid."},400);
  if (got.data.email !== email) return json({ok:false,error:"That code does not match this email."},400);
  if (got.data.used) return json({ok:false,error:"That Premium code has already been used."},400);

  const now = Date.now();
  const customerKey = "customers/" + await sha256(email);
  const customer = await store.getWithMetadata(customerKey,{type:"json"});
  const currentExpiry = customer && customer.data ? Number(customer.data.expiresAt || 0) : 0;
  const base = Number.isFinite(currentExpiry) && currentExpiry > now ? currentExpiry : now;
  const expiresAt = base + PREMIUM_MS;

  const write = await store.setJSON(key,{...got.data,used:true,activatedAt:now,expiresAt:expiresAt},{onlyIfMatch:got.etag});
  if (!write.modified) return json({ok:false,error:"That Premium code has already been used."},409);

  await store.setJSON(customerKey,{email:email,expiresAt:expiresAt,updatedAt:now},{onlyIfNew:!customer});
  if (customer) {
    const latest = await store.getWithMetadata(customerKey,{type:"json"});
    if (latest && latest.data && Number(latest.data.expiresAt || 0) !== expiresAt) {
      await store.setJSON(customerKey,{...latest.data,expiresAt:expiresAt,updatedAt:now},{onlyIfMatch:latest.etag});
    }
  }

  return json({ok:true,expiresAt:expiresAt,days:30});
}

export default async function(req, context) {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null,{status:204,headers:{
        "access-control-allow-origin":"*",
        "access-control-allow-methods":"GET,POST,OPTIONS",
        "access-control-allow-headers":"content-type"
      }});
    }

    const action = (context.params && context.params.action) || "";
    if (action === "request" && req.method === "POST") return requestPremium(await req.json(),req);
    if (action === "status" && req.method === "POST") return status(await req.json());
    if (action === "activate" && req.method === "POST") return activate(await req.json());
    return json({ok:false,error:"Not found"},404);
  } catch (e) {
    console.error("TradeCycle premium error",e);
    return json({ok:false,error:"Server error. Please try again later."},500);
  }
}

export const config = { path:"/api/premium/:action" };
