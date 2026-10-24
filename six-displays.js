import {calculateEarnings,pilotEmail} from './six-display-logic.js?v=3';
import {installCinema} from './six-cinema.js?v=4';
import {installLiveScrollScenes} from './live-scroll-scenes.js?v=7';
const $=s=>document.querySelector(s);
installCinema();
installLiveScrollScenes();
// The local editor can hold a pose; normal browsing is always scroll-driven.
$('.motion-button')?.addEventListener('click',()=>document.body.classList.toggle('motion-paused'));
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value);
const inputs=Object.fromEntries(['produced','sold','rate','expenses'].map(k=>[k,$('#calc-'+k)]));
function updateCalculator(){
 const result=calculateEarnings(Object.fromEntries(Object.entries(inputs).map(([k,el])=>[k,el.value])));
 inputs.sold.max=result.produced;if(Number(inputs.sold.value)>result.produced)inputs.sold.value=result.sold;
 $('#calc-net').textContent=money(result.net);$('#calc-gross').textContent=money(result.gross);$('#calc-cost').textContent=money(result.expenses);$('#calc-unsold').textContent=result.unsold;
 $('#calc-equation').textContent=`${result.sold} sold × ${money(result.rate)} − ${money(result.expenses)} = ${money(result.net)}`;
}
Object.values(inputs).forEach(input=>input.addEventListener('input',updateCalculator));
Object.values(inputs).forEach(input=>input.addEventListener('change',()=>{
 const result=calculateEarnings(Object.fromEntries(Object.entries(inputs).map(([key,el])=>[key,el.value])));
 for(const [key,el] of Object.entries(inputs))el.value=result[key];updateCalculator();
}));
$('#calc-reset').addEventListener('click',()=>{for(const [key,value] of Object.entries({produced:20,sold:20,rate:15,expenses:0}))inputs[key].value=value;updateCalculator();});updateCalculator();
const form=$('#inquiry-form'),steps=[...form.querySelectorAll('[data-step]')];let step=0;
function showStep(next,focus=true){
 step=Math.max(0,Math.min(2,next));steps.forEach((el,i)=>{el.hidden=i!==step;el.disabled=i!==step;});
 for(const label of form.querySelectorAll('[data-step-label]')){if(Number(label.dataset.stepLabel)===step)label.setAttribute('aria-current','step');else label.removeAttribute('aria-current');}
 $('#pilot-back').hidden=step===0;$('#pilot-next').hidden=step===2;$('#pilot-submit').hidden=step!==2;
 const trailer=form.querySelector('[name="trailer"]:checked')?.value,loadout=form.querySelector('[name="loadout"]:checked')?.value;
 $('#pilot-summary').textContent=trailer&&loadout?`${trailer} ft trailer · ${loadout}`:'';
 if(focus)steps[step].querySelector('input')?.focus({preventScroll:true});
}
function validateStep(){for(const input of steps[step].querySelectorAll('input'))if(!input.reportValidity())return false;return true;}
$('#pilot-next').addEventListener('click',()=>{if(validateStep())showStep(step+1);});$('#pilot-back').addEventListener('click',()=>showStep(step-1));
for(const input of form.querySelectorAll('[type="radio"]'))input.addEventListener('change',()=>{if(input.checked)showStep(step+1);});
form.addEventListener('input',()=>{$('#email-fallback').hidden=true;$('#form-status').textContent='';});
form.addEventListener('submit',event=>{
 event.preventDefault();if(step<2){if(validateStep())showStep(step+1);return;}if(!validateStep())return;
 try{const href=pilotEmail({trailer:form.querySelector('[name="trailer"]:checked')?.value,loadout:form.querySelector('[name="loadout"]:checked')?.value,zip:$('#route-zip').value.trim()});
 $('#email-fallback').href=href;$('#email-fallback').hidden=false;$('#form-status').textContent='Your request is prepared. Open the email below, review it and send it. Nothing has been submitted yet.';
 }catch(error){$('#form-status').textContent=error.message;}
});
for(const button of document.querySelectorAll('.choose-size'))button.addEventListener('click',()=>{form.querySelector(`[name="trailer"][value="${button.dataset.size}"]`).checked=true;showStep(1,false);document.dispatchEvent(new CustomEvent('display:navigate',{detail:{id:'founding'}}));});
showStep(0,false);
