import {CHAT_ENDPOINT} from './crew-chat-config.js?v=live-ai-20261111';
const form=document.querySelector('#chat-form'),input=document.querySelector('#chat-question'),send=document.querySelector('#chat-send');
const messages=document.querySelector('#messages'),conversation=document.querySelector('#conversation');
const note=document.querySelector('.demo-note'),disclosure=document.querySelector('.chat-disclosure');
let history=[],busy=false;
note.textContent=CHAT_ENDPOINT?'Marvel AI · Ask about your business':'AI connection not configured';
disclosure.textContent=CHAT_ENDPOINT?'AI answers can be wrong. No payment or reservation is made in chat.':'The AI service needs to be connected before you can chat.';
function syncInput(){send.disabled=busy||!input.value.trim()||!CHAT_ENDPOINT;input.style.height='44px';input.style.height=`${Math.min(110,Math.max(44,input.scrollHeight))}px`;}
function scrollTo(el){requestAnimationFrame(()=>{conversation.scrollTop+=el.getBoundingClientRect().top-conversation.getBoundingClientRect().top-12;});}
function paragraph(text,container){const p=document.createElement('p');p.textContent=text;container.append(p);}
async function ask(question,existingUser){
 const text=question.trim().slice(0,500);if(!text||busy||!CHAT_ENDPOINT)return;
 busy=true;input.value='';syncInput();
 messages.querySelectorAll('.followups').forEach(el=>el.remove());
 const user=existingUser||document.createElement('div');
 if(!existingUser){user.className='message message-user';user.setAttribute('aria-label','You');user.textContent=text;messages.append(user);}
 const reply=document.createElement('div');reply.className='message message-assistant';reply.setAttribute('aria-busy','true');
 const speaker=document.createElement('span');speaker.className='speaker';speaker.textContent='✦ MARVEL AI';reply.append(speaker);
 const pending=document.createElement('p');pending.className='chat-thinking';pending.textContent='Thinking about your question…';reply.append(pending);messages.append(reply);scrollTo(user);
 const context=[...history,{role:'user',content:text}];
 while(context.length>15||context.reduce((n,m)=>n+m.content.length,0)>15500)context.splice(0,2);
 try {
  const response=await fetch(CHAT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:context}),signal:AbortSignal.timeout(35000),credentials:'omit'});
  let data;
  try{data=await response.json();}catch{throw new Error('The AI connection is temporarily unavailable. Please try again.');}
  if(!response.ok||typeof data.answer!=='string'||!data.answer.trim())throw new Error(response.status===429?'Please wait a minute, then try again.':'The AI connection is temporarily unavailable. Please try again.');
  pending.remove();
  const answer=data.answer.trim().slice(0,6000);
  for(const part of answer.split(/\n\s*\n/))paragraph(part.replace(/\*\*/g,''),reply);
  history=[...context,{role:'assistant',content:answer}];
  note.textContent='Marvel AI · Live conversation';
  const followups=document.createElement('div');followups.className='followups';followups.setAttribute('aria-label','Continue exploring');
  for(const question of ['Compare the trailer sizes','Compare Buy and Lease']){const button=document.createElement('button');button.type='button';button.dataset.question=question;button.textContent=question;followups.append(button);}
  reply.append(followups);
  const link=document.createElement('a');link.className='chat-action';link.href='reserve.html';link.target='_top';link.textContent='Explore reservation options ↗';reply.append(link);scrollTo(user);
 } catch(error){
  const message=error.name==='TimeoutError'?'The AI is taking too long to respond. Try again in a moment.':error.message==='Please wait a minute, then try again.'?error.message:'The AI connection is temporarily unavailable. Please try again.';
  pending.remove();paragraph(message,reply);
  const retry=document.createElement('button');retry.type='button';retry.className='chat-retry';retry.textContent='Try again';retry.addEventListener('click',()=>{if(busy)return;reply.remove();ask(text,user);});reply.append(retry);
 } finally {busy=false;reply.removeAttribute('aria-busy');syncInput();while(messages.children.length>40)messages.firstElementChild.remove();}
}
form.addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
input.addEventListener('input',syncInput);
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();ask(input.value);}});
document.addEventListener('click',event=>{const button=event.target.closest('[data-question]');if(button)ask(button.dataset.question);});
function close(){if(window.parent!==window)window.parent.postMessage({type:'marvel-chat:close'},location.origin);else location.href='./#app';}
document.querySelector('#chat-back').addEventListener('click',close);
document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
syncInput();
