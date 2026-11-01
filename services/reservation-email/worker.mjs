import {createReservationEmail} from '../../reservation-email.js';

const LIMIT = 8192;
const json = (body, status, origin = '') => Response.json(body, {status, headers: {
  'Cache-Control': 'no-store', 'Vary': 'Origin',
  ...(origin ? {'Access-Control-Allow-Origin': origin} : {})
}});
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const configured = env => env.EMAIL_ENABLED === 'true' && env.RESEND_API_KEY && env.TURNSTILE_SECRET_KEY
  && env.EMAIL_FROM && env.ALLOWED_ORIGIN && env.EMAIL_RATE_LIMITER;

function parseInput(data) {
  const r = data?.record, c = data?.contact;
  if (!r || !c || !/^DEMO-[A-F0-9]{8}$/.test(r.id) || !['16','20'].includes(r.size)
    || !['buy','lease'].includes(r.plan) || !['reserved','cancelled'].includes(r.status)
    || r.termsVersion !== 'demo-2026-11-01' || typeof r.createdAt !== 'string'
    || !Number.isFinite(Date.parse(r.createdAt)) || Date.now() - Date.parse(r.createdAt) > 86400000
    || Date.parse(r.createdAt) - Date.now() > 300000) return null;
  if (typeof c.email !== 'string' || c.email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(c.email)
    || /@(?:[^@.]+\.)*(?:example\.(?:com|org|net)|localhost|test|invalid)$/i.test(c.email)) return null;
  if (typeof c.name !== 'string' || c.name.length > 100 || /[\x00-\x1f\x7f]/.test(c.name)
    || typeof data.token !== 'string' || data.token.length < 1 || data.token.length > 2048) return null;
  // Never accept caller-supplied HTML, links, subject, price, sender or additional recipients.
  return {record: {id:r.id,size:r.size,plan:r.plan,status:r.status,createdAt:r.createdAt,termsVersion:r.termsVersion},
    contact: {name:c.name.trim(),email:c.email.toLowerCase()}, token:data.token};
}

async function readBody(request) {
  if (!request.body) return null;
  const reader = request.body.getReader(); let size = 0; const parts = [];
  while (true) {
    const {done, value} = await reader.read(); if (done) break;
    size += value.length;
    if (size > LIMIT) { await reader.cancel(); return null; }
    parts.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const p of parts) { bytes.set(p, offset); offset += p.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; }
}

export async function handle(request, env, fetcher = fetch) {
  const origin = request.headers.get('Origin');
  if (origin !== env.ALLOWED_ORIGIN) return json({error:'origin_not_allowed'}, 403);
  const path = new URL(request.url).pathname;
  if (request.method === 'OPTIONS' && path === '/confirmation') return new Response(null, {status:204,headers:{
    'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'
  }});
  if (request.method === 'GET' && path === '/health') return json({ready:Boolean(configured(env)),mode:'demo'},200,origin);
  if (path !== '/confirmation') return json({error:'not_found'},404,origin);
  if (request.method !== 'POST') return json({error:'method_not_allowed'},405,origin);
  if (!configured(env)) return json({error:'email_unavailable'},503,origin);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({error:'json_required'},415,origin);
  if (Number(request.headers.get('Content-Length')) > LIMIT) return json({error:'request_too_large'},413,origin);
  try {
    const input = parseInput(await readBody(request));
    if (!input) return json({error:'invalid_request'},400,origin);
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return json({error:'email_unavailable'},503,origin);
    // Cloudflare's binding is approximate and per location. Turnstile is also required.
    for (const key of [`ip:${await hash(ip)}`,`recipient:${await hash(input.contact.email)}`]) {
      const {success} = await env.EMAIL_RATE_LIMITER.limit({key});
      if (!success) return json({error:'rate_limited'},429,origin);
    }
    const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
      body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:input.token,remoteip:ip})
    });
    const challenge = await verification.json();
    if (!verification.ok || !challenge.success || challenge.hostname !== new URL(env.ALLOWED_ORIGIN).hostname
      || challenge.action !== 'demo_reservation_email') return json({error:'verification_failed'},403,origin);
    const message = createReservationEmail(input.record,input.contact);
    const payload = {from:env.EMAIL_FROM,to:[input.contact.email],subject:message.subject,text:message.text,html:message.html};
    const body = JSON.stringify(payload);
    const delivery = await fetcher('https://api.resend.com/emails', {
      method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json',
        'Idempotency-Key':`demo-email/${await hash(body)}`},body,signal:AbortSignal.timeout(15000)
    });
    const result = await delivery.json().catch(()=>null);
    if (!delivery.ok || typeof result?.id !== 'string') return json({error:'delivery_failed'},502,origin);
    return json({accepted:true,reservationNumber:input.record.id},200,origin);
  } catch {
    // No recipient/contact/secret/provider-error logging or echoing in responses.
    return json({error:'email_unavailable'},503,origin);
  }
}
export default {fetch(request, env) { return handle(request, env); }};
