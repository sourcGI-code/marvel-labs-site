// Resend is called only by the server. These settings contain public IDs, never API keys.
let scriptPromise;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) scriptPromise = new Promise((resolve,reject) => {
    const script=document.createElement('script');
    const timer=setTimeout(()=>reject(new Error('verification_failed')),20000);
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
    script.onload=()=>{clearTimeout(timer);window.turnstile ? resolve(window.turnstile) : reject(new Error('verification_failed'));};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('verification_failed'));};
    document.head.append(script);
  }).catch(error=>{scriptPromise=null;throw error;});
  return scriptPromise;
}
const exampleEmail = email => /@(?:[^@.]+\.)*(?:example\.(?:com|org|net)|localhost|test|invalid)$/i.test(email);

export function installEmailDelivery({form,getRecord,getContact}) {
  const config=window.MARVEL_RESERVE?.email || {};
  const enabled=Boolean(config.endpoint?.startsWith('https://') && config.turnstileSiteKey);
  const note=form.querySelector('.rd-email-note'), button=form.querySelector('[data-action="email-send"]');
  const mount=form.querySelector('[data-email-verification]');
  const disclosure=form.querySelector('[data-email-disclosure]');
  const states=new Map(); let sending=false;
  const key=(record,contact)=>JSON.stringify([record?.id,record?.size,record?.plan,record?.status,contact.name,contact.email]);
  if (enabled) disclosure.textContent='We’ll email a clearly marked demo confirmation to your address. Name, email and selected trailer details are sent through Cloudflare and Resend. No payment is taken. Use example details to preview without sending.';
  function update() {
    const record=getRecord(),contact=getContact();
    const state=states.get(key(record,contact));
    const usable=Boolean(contact.email && !exampleEmail(contact.email));
    button.hidden=!enabled || !usable || state?.status==='accepted';button.disabled=sending;
    button.textContent=state?.status==='failed' ? 'Retry confirmation email' : 'Send demo email';
    if (!enabled) note.textContent='Email delivery is not connected yet. Preview or download your confirmation below.';
    else if (!contact.email) note.textContent='Your email address is not saved after refresh. Re-enter your details to email this demo confirmation.';
    else if (!usable) note.textContent='Example details are for preview only. Enter your own email in Details to receive a demo confirmation.';
    else if (state?.status==='accepted') note.textContent=`Demo email submitted to ${contact.email}. Check your inbox or spam folder. No payment was taken.`;
    else if (state?.status==='sending') note.textContent='Sending your demo email… Complete the verification below if prompted.';
    else if (state?.status==='failed') note.textContent=state.error==='rate_limited'
      ? 'Please wait a minute before trying the email again. Your demo confirmation is still available here.'
      : 'Email delivery could not be confirmed. Retry or download the draft; your demo confirmation is still available here.';
    else note.textContent=`Your demo email is ready for ${contact.email}.`;
  }
  async function send() {
    const source=getRecord() || {};
    const record=Object.fromEntries(['id','size','plan','status','createdAt','termsVersion'].map(name=>[name,source[name]]));
    const contact={...getContact()};const requestKey=key(record,contact);
    if (!enabled || !record.id || !contact.email || exampleEmail(contact.email) || sending || states.get(requestKey)?.status==='accepted') {update();return;}
    sending=true;states.set(requestKey,{status:'sending'});update();let widget,turnstile;
    try {
      turnstile=await loadTurnstile();mount.hidden=false;
      const token=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('verification_failed')),120000);
        const finish=(error,value)=>{clearTimeout(timer);error ? reject(new Error('verification_failed')) : resolve(value);};
        widget=turnstile.render(mount,{sitekey:config.turnstileSiteKey,action:'demo_reservation_email',theme:'dark',size:'flexible',
          callback:token=>finish(false,token),'error-callback':()=>{finish(true);return true;},'expired-callback':()=>finish(true),'timeout-callback':()=>finish(true)});
      });
      const response=await fetch(config.endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({record,contact,token}),signal:AbortSignal.timeout(30000)});
      const result=await response.json();
      if (!response.ok || !result.accepted || result.reservationNumber!==record.id) throw new Error(result.error || 'delivery_failed');
      states.set(requestKey,{status:'accepted'});
    } catch(error) {states.set(requestKey,{status:'failed',error:error.message});}
    finally {if(widget!==undefined)turnstile.remove(widget);mount.hidden=true;sending=false;update();}
  }
  button.addEventListener('click',()=>void send());
  return {update,send};
}
