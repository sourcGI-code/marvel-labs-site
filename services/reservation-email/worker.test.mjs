import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {handle} from './worker.mjs';
const origin='https://sourcgi-code.github.io';
const base=()=>({record:{id:'DEMO-A1B2C3D4',size:'16',plan:'buy',status:'reserved',createdAt:new Date().toISOString(),termsVersion:'demo-2026-11-01'},contact:{name:'Alex <script>',email:'alex@business.testmail.com'},token:'test-human-token'});
const env=()=>({EMAIL_ENABLED:'true',RESEND_API_KEY:'fake-resend-key',TURNSTILE_SECRET_KEY:'fake-turnstile-key',EMAIL_FROM:'Marvel Labs Demo <reservations@updates.marvellabs.com>',ALLOWED_ORIGIN:origin,EMAIL_RATE_LIMITER:{limit:async()=>({success:true})}});
const request=(data=base(),headers={},method='POST')=>new Request('https://worker.example/confirmation',{method,headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},...(method==='POST'?{body:JSON.stringify(data)}:{})});
const mock=(calls,challenge={},provider=200)=>async(url,opts)=>{
  calls.push({url,...opts});return url.includes('siteverify') ? Response.json({success:true,hostname:'sourcgi-code.github.io',action:'demo_reservation_email',...challenge}) : Response.json(provider===200?{id:'provider-demo-id'}:{message:'SECRET PROVIDER ERROR'},{status:provider});
};
test('fixed DEMO template, correct number, one recipient, no arbitrary HTML; identical retry idempotency',async()=>{
 const calls=[],data=base();data.html='EVIL';data.from='attacker@example.com';data.to=['second@example.com'];data.record.amount=99999;
 for(let i=0;i<2;i++){const r=await handle(request(data),env(),mock(calls));assert.equal(r.status,200);assert.deepEqual(await r.json(),{accepted:true,reservationNumber:data.record.id});}
 const sends=calls.filter(x=>x.url.includes('api.resend'));assert.equal(sends.length,2);assert.equal(sends[0].headers['Idempotency-Key'],sends[1].headers['Idempotency-Key']);
 const body=JSON.parse(sends[0].body);assert.deepEqual(body.to,[data.contact.email]);assert.match(body.subject,/^\[DEMO\].*DEMO-A1B2C3D4/);assert.match(body.html, /Alex &lt;script&gt;/);assert.match(body.text, /\$100 USD/);assert.ok(!body.html.includes('EVIL'));assert.ok(!body.html.includes('<script>'));assert.ok(body.text.includes('no production slot was reserved'));
});
test('cancellation has separate idempotency and explicitly simulated refund',async()=>{
 const calls=[],data=base();await handle(request(data),env(),mock(calls));data.record.status='cancelled';await handle(request(data),env(),mock(calls));
 const sends=calls.filter(x=>x.url.includes('api.resend'));assert.notEqual(sends[0].headers['Idempotency-Key'],sends[1].headers['Idempotency-Key']);assert.match(JSON.parse(sends[1].body).subject,/Cancellation/);assert.match(JSON.parse(sends[1].body).text,/no money was charged or refunded/);
});
test('reject invalid, stale, multi-recipient, sample, oversized and injection requests without contacting services',async()=>{
 const bad=[x=>x.record.size='99',x=>x.record.id='REAL-123',x=>x.record.createdAt=new Date(Date.now()-86401000).toISOString(),x=>x.contact.email='a@x.com,b@x.com',x=>x.contact.email='a@x.com\r\nBcc: evil@x.com',x=>x.contact.email='alex@example.com',x=>x.token='',x=>x.contact.name='x'.repeat(10000)];
 for(const change of bad){const calls=[],data=base();change(data);const r=await handle(request(data),env(),mock(calls));assert.equal(r.status,400);assert.equal(calls.length,0);}
});
test('origin, method, disabled service, rate limit and missing protection fail closed',async()=>{
 const cases=[{headers:{Origin:'https://evil.example'},status:403},{method:'GET',status:405},{set:e=>e.EMAIL_ENABLED='false',status:503},{set:e=>e.TURNSTILE_SECRET_KEY='',status:503},{set:e=>e.EMAIL_RATE_LIMITER={limit:async()=>({success:false})},status:429}];
 for(const c of cases){const calls=[],e=env();c.set?.(e);const r=await handle(request(base(),c.headers,c.method),e,mock(calls));assert.equal(r.status,c.status);assert.equal(calls.length,0);}
});
test('Turnstile failure or wrong host/action never sends email',async()=>{
 for(const c of [{success:false},{hostname:'evil.example'},{action:'login'}]){const calls=[];const r=await handle(request(),env(),mock(calls,c));assert.equal(r.status,403);assert.equal(calls.length,1);}
});
test('provider failure never reports success or leaks internal errors',async()=>{
 const r=await handle(request(),env(),mock([],{},500));assert.equal(r.status,502);assert.deepEqual(await r.json(),{error:'delivery_failed'});
});
test('worker entrypoint handles preflight and health with a real execution-context argument',async()=>{
 const r=await worker.fetch(request(base(),{},'OPTIONS'),env(),{});assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
 const h=await worker.fetch(new Request('https://worker.example/health',{headers:{Origin:origin}}),env(),{});assert.deepEqual(await h.json(),{ready:true,mode:'demo'});
});
