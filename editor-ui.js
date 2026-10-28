const {displays,displayById}=await import(document.body.dataset.displayFramework==='original'?'./original-display-framework-hqworld4.js?v=sleek20-review-v1':'./display-framework.js?v=4');
import {palettes,frameFor,defaultFrame,frameViewport} from './page-design.js?v=1';
export function openEditor(api){
 document.body.setAttribute('data-page-editor','');
 const css=document.createElement('link');css.rel='stylesheet';css.href='/editor-ui.css?v=4';document.head.append(css);
 const panel=document.createElement('aside');panel.id='visual-editor';panel.setAttribute('aria-label','Visual page editor');
 panel.innerHTML=`<header><h2>Page editor</h2><button id="ve-collapse" aria-expanded="true" aria-label="Collapse editor">−</button></header><div class="editor-body"><p>Click a title or paragraph to edit it. Save keeps your changes on this laptop.</p><div class="row"><button id="ve-mode" aria-pressed="true">Selecting text</button><button id="ve-motion">Pause motion</button></div><p id="ve-selection">No text selected</p><fieldset id="ve-fields" disabled><label>Text<textarea id="ve-text" maxlength="5000" spellcheck="true"></textarea></label><div class="row"><label>Size (px)<input id="ve-size" type="number" min="10" max="160" step="1"></label><label>Color<input id="ve-color" type="color"></label></div><div class="row"><label>Weight<select id="ve-weight"><option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option><option value="900">Heavy</option></select></label><label>Alignment<select id="ve-align"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div><label>Font<select id="ve-font"><option value="">Site font</option><option value="system-ui, sans-serif">Sans serif</option><option value="Georgia, serif">Serif</option><option value="monospace">Monospace</option></select></label><label>Style<select id="ve-style"><option value="normal">Normal</option><option value="italic">Italic</option></select></label><button id="ve-reset" style="margin-top:12px">Restore original</button></fieldset><div class="actions"><button id="ve-save" class="primary" disabled>Save changes</button><button id="ve-close">Done</button></div><p id="ve-status" role="status" aria-live="polite">Saved changes also appear in normal preview.</p><div class="pages"><a href="/framework.html">All website displays</a><a href="/?edit=1">Trailer homepage</a><a href="/marvel/?edit=1">Company pages</a></div></div>`;
 document.body.append(panel);
 const design=document.createElement('section');design.className='design-settings';
 design.innerHTML=`<details open><summary>Website color theme</summary><div id="ve-palettes" class="theme-grid"></div><p>Changes the website colors. Preview full trailer finishes in the 3D studio.</p><a href="/trailer-studio.html" target="_blank" rel="noopener">Open trailer finish studio ↗</a></details><details><summary>Scene placement &amp; size</summary><p id="ve-frame-note"></p><fieldset id="ve-framing"><label>Screen layout<select id="ve-viewport"><option value="desktop">Desktop</option><option value="mobile">Phone</option></select></label><label>Left / right <output id="ve-x-value"></output><input id="ve-x" type="range" min="-25" max="25" step="0.5"></label><label>Up / down <output id="ve-y-value"></output><input id="ve-y" type="range" min="-25" max="25" step="0.5"></label><label>View size <output id="ve-zoom-value"></output><input id="ve-zoom" type="range" min="75" max="150" step="1"></label><button id="ve-frame-reset">Reset framing</button></fieldset><p>Moves the complete scene with its ground and shadows. Connected animation displays share this framing; it does not move one vehicle independently.</p></details>`;
 panel.querySelector('.actions').before(design);
 for(const [key,value] of Object.entries(palettes)){
  const button=document.createElement('button');button.type='button';button.dataset.theme=key;button.innerHTML='<i aria-hidden="true"></i><span></span>';button.querySelector('span').textContent=value.name;button.querySelector('i').style.background=`linear-gradient(135deg,${value.body} 50%,${value.accent} 50%)`;design.querySelector('#ve-palettes').append(button);
 }
 const onHomepage=!!document.querySelector('#hero-title');
 if(onHomepage){
  const framework=document.createElement('section');framework.className='display-framework';framework.setAttribute('aria-label','Website display framework');
  framework.innerHTML=`<h3>Website displays</h3><span id="ve-display-count"></span><label for="ve-display">Choose a display</label><select id="ve-display"></select><div class="row"><button id="ve-previous">← Previous</button><button id="ve-next">Next →</button></div><p id="ve-display-purpose"></p><div class="row"><button id="ve-edit-title">Edit title</button><button id="ve-edit-copy">Edit paragraph</button></div><button id="ve-copy-link">Copy this display’s link</button>`;
  const select=framework.querySelector('select');let group;
  for(const display of displays){if(group?.label!==display.group){group=document.createElement('optgroup');group.label=display.group;select.append(group);}const option=document.createElement('option');option.value=display.id;option.textContent=display.label;group.append(option);}
  panel.querySelector('.editor-body').prepend(framework);
 }

 const $=id=>panel.querySelector('#ve-'+id);let selected,entry,selecting=true,dirty=false,hovered;
 const markDirty=()=>{dirty=true;$('save').disabled=false;$('status').textContent='Unsaved changes';};
 $('viewport').value=frameViewport();
 function sceneKey(){const display=displayById(document.body.dataset.activeDisplay||'arrival');return display?.section;}
 function syncFraming(){
  const scene=sceneKey(),available=!!document.querySelector(scene==='top'?'#hero-visual':scene==='inside'?'#tour-visual':`#${CSS.escape(scene||'none')} .scene-host`);
  $('framing').disabled=!available;
  $('frame-note').textContent=available?(scene==='top'?'Arrival, delivery and bay share one continuous view.':scene==='inside'?'All working-day displays share this view.':'Adjust this scene’s framing.'):'Select an animated display to adjust its framing.';
  const value=frameFor(api.getDesign(),api.page,scene,$('viewport').value);
  for(const key of ['x','y','zoom']){const n=key==='zoom'?Math.round(value[key]*100):value[key];$(key).value=n;$(key+'-value').textContent=n+'%';}
 }
 function syncThemes(){for(const button of $('palettes').children)button.setAttribute('aria-pressed',String(button.dataset.theme===document.documentElement.dataset.palette));}
 $('palettes').addEventListener('click',event=>{const button=event.target.closest('[data-theme]');if(!button)return;const design=api.getDesign();design.palette=button.dataset.theme;const url=new URL(location.href);url.searchParams.delete('palette');history.replaceState(null,'',url);api.setDesign(design);syncThemes();markDirty();});
 $('viewport').addEventListener('change',syncFraming);
 function updateFrame(reset=false){
  const scene=sceneKey();if(!scene||$('framing').disabled)return;
  const design=api.getDesign();design.frames??={};design.frames[api.page]??={};design.frames[api.page][scene]??={};
  design.frames[api.page][scene][$('viewport').value]=reset?defaultFrame():{x:Number($('x').value),y:Number($('y').value),zoom:Number($('zoom').value)/100};
  api.setDesign(design);syncFraming();markDirty();
  if($('viewport').value!==frameViewport())$('status').textContent='Unsaved changes. Resize the preview to that screen layout to see its framing.';
 }
 for(const key of ['x','y','zoom'])$(key).addEventListener('input',()=>updateFrame());
 $('frame-reset').addEventListener('click',()=>updateFrame(true));
 syncFraming();syncThemes();
 function clearSelection(){selected?.classList.remove('visual-editor-selected');selected=null;entry=null;$('fields').disabled=true;$('selection').textContent='Choose a title or paragraph in this display';}
 function syncDisplay(){
  if(!onHomepage)return;
  const id=document.body.dataset.activeDisplay||'arrival',display=displayById(id);if(!display)return;
  $('display').value=id;const index=displays.indexOf(display);$('display-count').textContent=`${String(index+1).padStart(2,'0')} / ${displays.length} DISPLAYS`;
  $('display-purpose').textContent=display.purpose;$('previous').disabled=index===0;$('next').disabled=index===displays.length-1;
  syncFraming();
  clearSelection();
 }
 function goDisplay(id){if(!displayById(id))return;document.dispatchEvent(new CustomEvent('display:navigate',{detail:{id}}));}
 if(onHomepage){
  $('display').addEventListener('change',()=>goDisplay($('display').value));
  for(const [name,offset] of [['previous',-1],['next',1]])$(name).addEventListener('click',()=>{const index=displays.findIndex(d=>d.id===$('display').value);if(displays[index+offset])goDisplay(displays[index+offset].id);});
  for(const [name,key] of [['edit-title','title'],['edit-copy','copy']])$(name).addEventListener('click',()=>{const display=displayById($('display').value),el=display&&document.querySelector(display[key]);if(el){select(el);$('text').focus();}});
  $('copy-link').addEventListener('click',async()=>{const url=new URL(location.href);url.searchParams.set('display',$('display').value);try{await navigator.clipboard.writeText(url.href);$('status').textContent='Display link copied.';}catch{$('status').textContent=url.href;}});
  document.addEventListener('display:change',syncDisplay);syncDisplay();$('motion').textContent=document.querySelector('.motion-button')?.getAttribute('aria-label')||'Play animation';
 }
 // Links and controls keep their normal behavior, including links nested in copy.
 const candidate=target=>target instanceof Element&&!target.closest('#visual-editor,a,button,input,select,textarea,[role="button"]')?target.closest('h1,h2,h3,h4,h5,h6,p,small,.eyebrow'):null;
 function select(el){
  selected?.classList.remove('visual-editor-selected');selected=el;el.classList.add('visual-editor-selected');
  const description=api.describe(el);entry=structuredClone(description.entry);const style=getComputedStyle(el);
  $('fields').disabled=false;$('selection').textContent=el.tagName.toLowerCase()+(el.id?' · '+el.id:'');
  $('text').value=entry.text??description.base.source;$('font').value=entry.styles.fontFamily||'';
  $('size').value=Math.round(parseFloat(style.fontSize));$('weight').value=['400','600','700','900'].includes(style.fontWeight)?style.fontWeight:'400';$('align').value=['left','center','right'].includes(style.textAlign)?style.textAlign:'left';$('style').value=style.fontStyle==='italic'?'italic':'normal';
  const rgb=style.color.match(/[\d.]+/g);$('color').value=rgb?'#'+rgb.slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join(''):'#ffffff';
 }
 document.addEventListener('click',event=>{if(!selecting)return;const el=candidate(event.target);if(!el)return;event.preventDefault();event.stopImmediatePropagation();select(el);},true);
 document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,small,.eyebrow').forEach(el=>{if(!el.closest('#visual-editor'))el.tabIndex=0;});
 document.addEventListener('keydown',event=>{if(selecting&&event.key==='Enter'){const el=candidate(event.target);if(el){event.preventDefault();event.stopImmediatePropagation();select(el);$('text').focus();}}},true);
 document.addEventListener('pointerover',event=>{hovered?.classList.remove('visual-editor-hover');hovered=selecting?candidate(event.target):null;if(hovered!==selected)hovered?.classList.add('visual-editor-hover');});
 $('text').addEventListener('input',()=>{if(!selected)return;entry.text=$('text').value;api.update(selected,entry);markDirty();});
 for(const [id,property] of [['size','fontSize'],['color','color'],['weight','fontWeight'],['align','textAlign'],['style','fontStyle'],['font','fontFamily']])$(id).addEventListener('input',()=>{
  if(!selected)return;let value=$(id).value;if(id==='size'){if(!$(id).checkValidity()||!value)return;value+='px';}
  if(id==='font'&&!value)delete entry.styles[property];else entry.styles[property]=value;api.update(selected,entry);markDirty();
 });
 $('reset').addEventListener('click',()=>{if(!selected)return;api.reset(selected);select(selected);markDirty();});
 $('save').addEventListener('click',async()=>{$('save').disabled=true;try{await api.save();dirty=false;$('status').textContent='Saved to this laptop. Refresh any local preview to see your edits.';}catch(error){$('status').textContent=error.message;$('save').disabled=false;}});
 $('mode').addEventListener('click',()=>{selecting=!selecting;$('mode').textContent=selecting?'Selecting text':'Browsing page';$('mode').setAttribute('aria-pressed',String(selecting));hovered?.classList.remove('visual-editor-hover');});
 document.addEventListener('motion:playback',()=>{$('motion').textContent=document.querySelector('.motion-button')?.getAttribute('aria-label')||'Play animation';});
 $('motion').addEventListener('click',()=>{const control=document.querySelector('.motion-button');if(control){control.click();$('motion').textContent=document.querySelector('.motion-button')?.getAttribute('aria-label')||'Play animation';}else{document.querySelectorAll('video').forEach(v=>v.pause());$('motion').textContent='Videos paused';}});
 $('collapse').addEventListener('click',()=>{const collapsed=panel.classList.toggle('is-collapsed');$('collapse').textContent=collapsed?'+':'−';$('collapse').setAttribute('aria-expanded',String(!collapsed));});
 $('close').addEventListener('click',()=>{if(dirty&&!confirm('Leave without saving these edits?'))return;const url=new URL(location.href);url.searchParams.delete('edit');location.href=url.href;});
 addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
}
