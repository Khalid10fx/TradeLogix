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

async function notifyAdmin(email, id, approval, denial) {
  const fields = {
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
      "FIRST: Check Buy Me a Coffee and confirm the $4.99 payment.\n\n" +
      "APPROVE: " + approval + "\n\n" +
      "DENY: " + denial
  };
  try {
    await formSubmitAjax(fields);
  } catch (firstError) {
    await formSubmitStandard(fields);
  }
}

async function sendCustomerResult(email, subject, message) {
  const fields = {
    name: "TradeCycle Premium",
    email: email,
    _replyto: ADMIN_EMAIL,
    _subject: subject,
    _autoresponse: message,
    message: message
  };
  try {
    await formSubmitStandard(fields);
  } catch (e) {
    console.error("TradeCycle customer email error", e);
  }
}

async function requestPremium(body, req) {
  const email = emailOf(body && body.email);
  if (!validEmail(email)) return json({ok:false,error:"Enter a valid email address."},400);

  const id = requestId();
  const adminToken = randomHex(32);
  const clientToken = randomHex(32);
  const adminKey = "pending-admin/" + await sha256(adminToken);
  const clientKey = "pending-client/" + await sha256(clientToken);
  const now = Date.now();
  const site = process.env.URL || new URL(req.url).origin;
  const approval = site + "/api/premium/approve?token=" + encodeURIComponent(adminToken) + "&decision=approve";
  const denial = site + "/api/premium/approve?token=" + encodeURIComponent(adminToken) + "&decision=deny";

  const record = {
    requestId:id,
    email:email,
    createdAt:now,
    status:"pending",
    clientTokenHash:await sha256(clientToken)
  };

  const created = await store.setJSON(adminKey,record,{onlyIfNew:true});
  if (!created.modified) return json({ok:false,error:"Please try again."},500);
  await store.setJSON(clientKey,{requestId:id,adminKey:adminKey},{onlyIfNew:true});

  try {
    await notifyAdmin(email,id,approval,denial);
  } catch (e) {
    await store.delete(adminKey);
    await store.delete(clientKey);
    throw e;
  }

  return json({
    ok:true,
    requestId:id,
    clientToken:clientToken,
    message:"Request received. We will check your $4.99 payment and approve or deny the request."
  });
}

async function approve(token, decision, req) {
  if (!token) return page("<h1>Invalid approval link</h1><p class=\"muted\">This link is invalid.</p>",400);

  const key = "pending-admin/" + await sha256(token);
  const got = await store.getWithMetadata(key,{type:"json"});
  if (!got || !got.data) return page("<h1>Request not found</h1><p class=\"muted\">This request was already processed or the link is invalid.</p>",404);

  const current = got.data;
  if (current.status !== "pending") {
    if (current.status === "issued") {
      return page("<h1>Already approved</h1><p class=\"muted\">This request already has a Premium code.</p><code>" + current.code + "</code>",409);
    }
    if (current.status === "denied") return page("<h1>Already denied</h1><p class=\"muted\">This request was already denied.</p>",409);
    return page("<h1>Already processed</h1><p class=\"muted\">This request has already been processed.</p>",409);
  }

  const site = process.env.URL || new URL(req.url).origin;

  if (decision === "deny") {
    const denied = {...current,status:"denied",deniedAt:Date.now()};
    const write = await store.setJSON(key,denied,{onlyIfMatch:got.etag});
    if (!write.modified) return page("<h1>Already processed</h1><p class=\"muted\">This request was processed by another click.</p>",409);
    await sendCustomerResult(current.email,"TradeCycle Premium request denied","Your TradeCycle Premium request was denied because the $4.99 payment could not be confirmed. If you believe this is a mistake, please contact TradeCycle support.");
    return page("<h1>Premium request denied</h1><p class=\"muted\">The customer has been notified. No Premium code was created.</p>");
  }

  if (decision !== "approve") return page("<h1>Invalid decision</h1><p class=\"muted\">Use the approve or deny link from the request email.</p>",400);

  const code = premiumCode();
  const codeKey = "codes/" + await sha256(code);
  const now = Date.now();

  const issued = {
    ...current,
    status:"issued",
    issuedAt:now,
    codeKey:codeKey,
    code:code,
    emailSent:false
  };

  const codeCreated = await store.setJSON(codeKey,{email:current.email,requestId:current.requestId,issuedAt:now,used:false,code:code},{onlyIfNew:true});
  if (!codeCreated.modified) return page("<h1>Please try again</h1><p class=\"muted\">A unique code could not be created. No customer access was changed.</p>",500);

  const write = await store.setJSON(key,issued,{onlyIfMatch:got.etag});
  if (!write.modified) {
    await store.delete(codeKey);
    return page("<h1>Already processed</h1><p class=\"muted\">This request was processed by another click.</p>",409);
  }

  await sendCustomerResult(
    current.email,
    "Your TradeCycle Premium code — 30 days",
    "Your TradeCycle Premium payment was approved.\n\nYour one-time TradeCycle Premium code is:\n\n" + code + "\n\nEnter this code in TradeCycle with the same email you used for payment. Premium lasts 30 days. Your journal data is never deleted when Premium expires."
  );

  await store.setJSON(key,{...issued,emailSent:true,emailSentAt:Date.now()},{onlyIfNew:false});
  return page("<h1>Premium approved</h1><p class=\"muted\"><b>Customer:</b> " + current.email + "<br><b>Request:</b> " + current.requestId + "</p><code>" + code + "</code><p class=\"muted\">The one-time code was generated on the server and the customer was sent the code automatically. Premium lasts 30 days.</p>");
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
  if (r.status === "issued") return json({ok:true,status:"approved",requestId:r.requestId,code:r.code});

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
    if (action === "approve" && req.method === "GET") {
      const url = new URL(req.url);
      return approve(url.searchParams.get("token"),url.searchParams.get("decision"),req);
    }
    return json({ok:false,error:"Not found"},404);
  } catch (e) {
    console.error("TradeCycle premium error",e);
    return json({ok:false,error:"Server error. Please try again later."},500);
  }
}

export const config = { path:"/api/premium/:action" };
