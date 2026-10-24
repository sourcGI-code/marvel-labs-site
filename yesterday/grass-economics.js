const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(value);
export function calculateContribution({units,price,savings,cost}){
 const sales=units*price;return {sales,savings,cost,contribution:sales+savings-cost};
}
export function setupGrassEconomics(){
 const form=document.querySelector('#earnings-form');if(!form)return;
 const output=document.querySelector('#earnings-total'),detail=document.querySelector('#earnings-breakdown');
 function update(){
  const fields=['units','price','savings','cost'],inputs=fields.map(id=>form.elements[id]);
  const valid=inputs.every(input=>input.value!==''&&input.validity.valid);
  if(!valid){output.textContent='—';delete output.dataset.negative;detail.textContent='Enter your assumptions to see the weekly contribution.';return;}
  const data=Object.fromEntries(fields.map((id,i)=>[id,Number(inputs[i].value)])),r=calculateContribution(data);
  output.textContent=money(r.contribution);output.dataset.negative=String(r.contribution<0);
  detail.textContent=`${money(r.sales)} product sales + ${money(r.savings)} disposal savings − ${money(r.cost)} additional costs`;
 }
 form.addEventListener('input',update);form.addEventListener('submit',e=>e.preventDefault());update();
}
