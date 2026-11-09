import {TRAILER_MODEL_BASE,TRAILER_MODEL_REVISION} from './trailer-jetblack-source.js?v=dark-stage-20261108';
import * as THREE from 'three';
import {prepareTrailerMaterials,createTrailerEnvironment} from './trailer-jetblack-realism.js?v=factory-yard-20261108';
import {createContactShadow} from './trailer-contact-shadow.js?v=studio-v3';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {createFactoryYard,fitYardCamera} from './reserve-yard.js?v=factory-yard-20261108';
import {YARD_PARKING,YARD_VIEW_DIRECTION,YARD_FOV} from './reserve-yard-layout.js?v=factory-yard-20261108';

export async function startReservationViewer(sec,{signal,onReady,onError}){
  const on=(target,type,listener,options={})=>target?.addEventListener(type,listener,{...options,signal});
  const own=sec.dataset.page==='trailer',rv=sec.dataset.page==='reserve';
  const A=TRAILER_MODEL_BASE,LIFT=.012;
  const host=sec.querySelector('.rs-3d'),panels=[...sec.querySelectorAll('.rs-panel')];
  const radios=[...sec.querySelectorAll('.rs-switch button')],back=sec.querySelector('.rs-back');
  const other=sec.querySelector('.rs-other'),rampBtn=sec.querySelector('.rs-ramp-btn');
  const lockChip=sec.querySelector('.rs-lock'),copy=sec.querySelector('.rs-copy');
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  let composer=null,modelsReady=false,presented=false;
  signal.addEventListener('abort',()=>{renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove();},{once:true});
  on(renderer.domElement,'webglcontextlost',e=>{e.preventDefault();onError();},{once:true});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.28;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  host.append(renderer.domElement);RectAreaLightUniformsLib.init();
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x9dadb5);scene.fog=new THREE.Fog(0x9dadb5,65,135);
  const camera=new THREE.PerspectiveCamera(YARD_FOV,1.6,.08,180);
  const yard=createFactoryYard(scene,renderer);signal.addEventListener('abort',()=>yard.dispose(),{once:true});
  scene.add(new THREE.HemisphereLight(0xe6f1ff,0x666758,1.65));
  const head=new THREE.RectAreaLight(0xffffff,3.5,10,6);scene.add(head);
  const rim=new THREE.RectAreaLight(0xdceaff,6,12,5);rim.position.set(4,6,-7);rim.lookAt(0,1,0);scene.add(rim);
  const frame=new THREE.RectAreaLight(0xffffff,0,8,4);scene.add(frame);
  const LIGHTS=[];
  const modelEnvironment=await createTrailerEnvironment(renderer,{daylight:true});
  if(signal.aborted){modelEnvironment.dispose();return;}
  signal.addEventListener('abort',()=>modelEnvironment.dispose(),{once:true});
  scene.environment=modelEnvironment.texture;
  // ---- the trailers
  let meta = null, focus = null, hover = null, mode = 'overview', locked = false, dirty = true;
  const disposeModel=root=>{const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;if(!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}for(const m of Array.isArray(o.material)?o.material:[o.material]){if(seen.has(m))continue;seen.add(m);for(const key of ['map','alphaMap','normalMap','roughnessMap','metalnessMap','emissiveMap'])if(m[key]&&!seen.has(m[key])){seen.add(m[key]);m[key].dispose();}m.dispose();}});};
  const T = {};
  signal.addEventListener('abort',()=>{clearTimeout(intent);for(const t of Object.values(T))disposeModel(t.group);if(window.__rs3d?.renderer===renderer)delete window.__rs3d;},{once:true});                                        // '20' / '16' -> {group, hinge, ramp, scale, park}
  const draco = new DRACOLoader(); draco.setDecoderPath('vendor/three/addons/libs/draco/gltf/');
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);

  // camera rig: everything eases toward its target values every frame
  const cur = {pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: 0, shiftY: 0}, want = {pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: 0, shiftY: 0};
  let az = .6, el = .32, radius = 12;
  let touring = false, tourTime = 0, tourAz = 0, entrance = 1;
  function syncLock() {
    sec.classList.toggle('is-locked', locked);
    if (rv && lockChip) {
      lockChip.textContent = mode === 'overview' ? (locked ? 'Play motion' : 'Pause motion') : locked ? 'Rotate trailer' : touring ? 'Pause rotation' : 'Lock view';
      lockChip.setAttribute('aria-pressed', String(locked));
    }
  }
  function startTour() { touring = rv && !still; tourTime = 0; tourAz = az; syncLock(); }
  function stopTour() { if (touring) { touring = false; syncLock(); } }
  const pointer = {x: .5, y: .5, inside: false};

  function fittedView(bounds,direction){
    const rail=sec.querySelector('.rv-rail'),box=host.getBoundingClientRect();
    const showroom=sec.classList.contains('trailer-showroom');
    const fitReserve=sec.dataset.reservationLayout==='viewport';
    const desktop=fitReserve?sec.dataset.reservationStacked!=='true':innerWidth>860||(showroom&&innerWidth>=600&&innerHeight<=580);
    const plan=fitYardCamera(bounds,direction,{width:host.clientWidth,height:host.clientHeight,
      left:desktop?Math.max(0,rail.getBoundingClientRect().right-box.left)+(showroom?12:0):0,
      top:showroom?62:fitReserve?(desktop?22:8):(desktop?84:12),bottom:showroom?54:fitReserve?(desktop&&innerHeight>580?100:sec.dataset.orderStep==='review'?8:48):155,fov:YARD_FOV});
    want.pos.copy(plan.position);want.look.copy(plan.target);want.shift=plan.shiftX;want.shiftY=plan.shiftY;
  }
  function filmView(){
    const bounds=new THREE.Box3();
    for(const t of Object.values(T))bounds.union(t.bounds.clone().translate(t.group.position));
    if(bounds.isEmpty()){bounds.min.set(-4,0,-4);bounds.max.set(6,2.8,4);}
    const direction=new THREE.Vector3(...YARD_VIEW_DIRECTION);
    if(rv){direction.y=.22;direction.applyAxisAngle(new THREE.Vector3(0,1,0),Math.sin(tourTime*.28)*.12);}
    fittedView(bounds,direction);
  }
  function orbitView(){
    const t=T[focus];if(!t)return;
    const bounds=t.bounds.clone().translate(t.group.position);
    fittedView(bounds,new THREE.Vector3(Math.cos(el)*Math.cos(az),Math.sin(el),Math.cos(el)*Math.sin(az)));
  }
  function resize(){
    if(signal.aborted)return;
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,rv?2:1.5,Math.sqrt(3000000/(w*h))));
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=YARD_FOV;camera.updateProjectionMatrix();dirty=true;
    if(mode==='overview')filmView();else orbitView();
  }

  function setPanel(size) {
    for (const p of panels) p.hidden = p.dataset.size !== size;
    for (const b of radios) b.setAttribute(b.getAttribute('role')==='radio'?'aria-checked':'aria-pressed', String(b.dataset.size === size));
    sec.dataset.size = size;
    if (own || 'swapUrl' in sec.dataset) history.replaceState(null, '', `trailer-${size}.html` + location.search);
    sec.dispatchEvent(new CustomEvent('rs:size', {detail: size}));
  }

  function light(size) {                               // the hovered/chosen trailer comes forward under the light
    hover = size;
    for (const t of Object.values(T)) t.scaleTo = 1;
    if (size) { const p = T[size].group.position; frame.position.set(p.x, 6.4, p.z); frame.lookAt(p.x, 0, p.z); }
    frame.userData.to = 0; dirty = true;
  }

  function enter(size) {
    if (!modelsReady || signal.aborted || !T[size] || (sec.dataset.orderStep==='review' && size!==sec.dataset.size)) return;
    if (mode === 'viewer' && focus === size) return;
    clearTimeout(intent);
    const from = focus; focus = size; mode = 'viewer'; sec.dataset.mode = 'viewer';
    setPanel(size); light(size);
    for (const [s, t] of Object.entries(T)) t.show = s === size;
    renderer.shadowMap.needsUpdate=true;
    radius = size === '20' ? 13.5 : 11.5;             // the framing: the 16 ft fills the frame the way the 20 ft does
    // 10-30 owner: "if I click to lock the trailer then I switch to view another one I want that same pov on the other
    // trailer not to just unlock when I switch" -> the lock, the azimuth and the elevation carry over; only the first entry
    // from the overview picks its angle from where the camera already is
    if (!from) { az=Math.atan2(1,-.58); el=rv?.16:.06; locked=rv?still:true; startTour(); syncLock(); }
    setRamp(0);
    const o = size === '20' ? '16' : '20';
    if (other) {
      other.dataset.size = o; other.querySelector('img').src = `${TRAILER_MODEL_BASE}${document.documentElement.dataset.siteTheme==='mono'?'mono':'cyan'}-${o}.webp?v=${TRAILER_MODEL_REVISION}`;
      other.querySelector('.rs-other-size').textContent = `${o} ft`;
    }
    orbitView();
  }
  function leave() {
    if (!modelsReady || signal.aborted) return;
    mode = 'overview'; sec.dataset.mode = 'overview'; focus = null; locked = still; startTour(); syncLock();
    for (const t of Object.values(T)) t.show = true;
    renderer.shadowMap.needsUpdate=true;
    setRamp(0); light(null); filmView();
  }
  function setRamp(to) {
    if (!focus) { for (const t of Object.values(T)) t.rampTo = 0; return; }
    T[focus].rampTo = to; rampBtn.textContent = to ? 'Close the ramp' : 'Open the ramp';
    if (to) {                                          // look into the bay from behind, and hold the view there
      az = Math.atan2(-.55, 1); el = .2; locked = true; stopTour(); syncLock(); orbitView();
    }
    dirty = true;
  }

  // ---- pointer: click a trailer to select it; then the cursor turns the view; click locks
  // 10-30 owner: "I want that to follow everywhere even when off the screen unless clicked off, I want it to follow even
  // when its selecting on the trailer. They have to click when they want a solid move" -> the cursor steers from anywhere
  // on the page (the rail and its cards, the masthead, the trailer itself) on every page and variant, not only variant B;
  // when the pointer leaves the window the view simply holds. A click on the stage, the trailer included, locks the view
  // where it is (the cursor no longer turns it); a click again frees it. Touch and pen still drag
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let intent = 0;
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const hit of ray.intersectObjects(Object.values(T).filter(t => t.group.visible).map(t => t.group), true)) {
      let o = hit.object; while (o && !o.userData.size) o = o.parent;
      if (o) return o.userData.size;
    }
    return null;
  }
  const overCopy = e => { if (!copy) return false; const r = copy.getBoundingClientRect(); return e.clientX < r.right + 10 && !matchMedia('(max-width:760px)').matches; };
  let drag = null;
  const onMove = (e, fromPage) => {
    if (!modelsReady || signal.aborted) return;
    const r = renderer.domElement.getBoundingClientRect();
    if (drag && !fromPage && mode === 'viewer' && T[focus]) { // touch / pen, or dragging while locked: turn it by hand
      stopTour();
      if(drag.horizontal&&!drag.moved){
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(Math.abs(dx)<8||Math.abs(dy)>Math.abs(dx))return;
      }
      az += (e.clientX - drag.x) * .008;
      if(!drag.horizontal)el = Math.min(.7, Math.max(.04, el + (e.clientY - drag.y) * .006));
      drag.x = e.clientX; drag.y = e.clientY; drag.moved = true; orbitView(); return;
    }
    if (e.pointerType !== 'mouse') return;
    if (mode === 'overview') {
      const s = pick(e);
      if (!fromPage) renderer.domElement.style.cursor = s ? 'pointer' : '';
      if (s !== hover) light(s); // hover is visual feedback; only a click selects
      return;
    }
    if (locked || overCopy(e)) return;
    stopTour();
    // the area right of the copy is the control surface: left..right = once all the way round, top..bottom = overhead..low
    const x0 = !copy || matchMedia('(max-width:760px)').matches ? r.left : copy.getBoundingClientRect().right;
    const u = Math.min(1, Math.max(0, (e.clientX - x0) / (r.right - x0))), v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    az = Math.PI * .2 + (u - .5) * Math.PI * 2; el = .55 - v * .48; orbitView();
  };
  on(renderer.domElement,'pointermove', e => onMove(e, false));
  // the cursor steers the trailer from anywhere on the page, the rail included (10-29 variant B's data-pointer="page";
  // 10-30 owner: everywhere, on every page). Phones keep the drag
  on(window,'pointermove', e => { if (e.target !== renderer.domElement && !matchMedia('(max-width:860px)').matches) onMove(e, true); });
  on(renderer.domElement,'pointerdown', e => {
    if (mode === 'viewer') stopTour();
    if (mode === 'viewer' && (e.pointerType !== 'mouse' || locked)) drag = {x: e.clientX, y: e.clientY, moved: false, horizontal:e.pointerType==='touch'&&matchMedia('(max-width:860px)').matches};
    renderer.domElement.setPointerCapture?.(e.pointerId);
  });
  on(renderer.domElement,'pointerup', e => {
    const was = drag; drag = null;
    if (was?.moved) return;
    if (mode === 'overview') { const s = pick(e); if (s) enter(s); return; }
    if (e.pointerType === 'mouse' && !overCopy(e)) { locked = !locked; if (!locked) startTour(); syncLock(); }
  });
  on(renderer.domElement,'pointercancel', () => { drag = null; });
  on(renderer.domElement,'lostpointercapture', () => { drag = null; });
  on(renderer.domElement,'pointerleave', () => { if (mode === 'overview') { light(null); clearTimeout(intent); } });
  on(back,'click', leave);
  on(other,'click', () => enter(other.dataset.size));
  let pending = sec.dataset.open || '';                // the reserve page's rail: go to a size (before the models load: on arrival)
  on(sec,'rs:enter', e => { if (modelsReady && T[e.detail]) enter(e.detail); else pending = e.detail; });
  on(sec,'rs:leave', () => { if (mode === 'viewer') leave(); });
  for (const b of radios) on(b,'click', () => enter(b.dataset.size));
  for (const a of sec.querySelectorAll('.rs-explore')) on(a,'click', e => { e.preventDefault(); enter(a.closest('.rs-panel').dataset.size); });
  on(rampBtn,'click', () => { if (focus) setRamp(T[focus].rampTo ? 0 : 1); });
  on(lockChip,'click', () => { locked = own || rv ? !locked : false; if (!locked) startTour(); else stopTour(); syncLock(); });

    // Keep unconfigured links within the reservation flow.
  for (const a of sec.querySelectorAll('.rs-reserve')) {
    const size = a.closest('.rs-panel').dataset.size, link = sec.dataset['checkout' + size];
    a.href = link || `reserve.html?size=${encodeURIComponent(size)}`;
  }

  // ---- load, then run (only while the section is on screen)
  let visible = true;
  const visibilityObserver = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) dirty = true; });
  visibilityObserver.observe(sec);
  signal.addEventListener('abort', () => visibilityObserver.disconnect(), {once: true});
  fetch(A + 'viewer.json?v=' + TRAILER_MODEL_REVISION, {cache:'no-store', signal}).then(r => {
    if (!r.ok) throw new Error('Trailer manifest unavailable');
    return r.json();
  }).then(async m => {
    if (signal.aborted) return;
    meta = m;
    resize(); filmView(); cur.pos.copy(want.pos); cur.look.copy(want.look); cur.shift = want.shift; cur.shiftY=want.shiftY;
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
    if(rv)sizeObserver.observe(sec.querySelector('.rv-rail'));
    signal.addEventListener('abort', () => sizeObserver.disconnect(), {once: true});
    await Promise.all(Object.entries(m.trailers).filter(([size]) => size === '20' || size === '16').map(async ([size, t]) => {
      const g = await loader.loadAsync(A + t.file);
      if (signal.aborted) {disposeModel(g.scene);return;}
      const group = new THREE.Group(); group.userData.size = size; group.add(g.scene);
      group.position.set(...YARD_PARKING[size]);
      if(rv&&size==='16')group.position.x-=2.2;
      prepareTrailerMaterials(g,renderer,{colour:'black',finish:'matte',decal:'grey'});
      g.scene.traverse(o=>{if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material])material.envMap=modelEnvironment.texture;});
      const modelBounds=new THREE.Box3().setFromObject(group).translate(group.position.clone().negate());
      const shadow=createContactShadow(renderer,g.scene);shadow.visible=true;group.add(shadow);
      signal.addEventListener('abort',()=>{shadow.userData.shadowTarget.dispose();shadow.geometry.dispose();shadow.material.dispose();},{once:true});
      // the ramp: the old rigs carry a 'Ramp hinge' node turned about Z; the owner's new 20 ft names its own (ramp_door, axis in meta)
      const hinge = (t.hingeNode && g.scene.getObjectByName(t.hingeNode)) || g.scene.getObjectByName(`Ramp_hinge_${size}`) || g.scene.getObjectByName(`Ramp hinge ${size}`);
      if(hinge){g.scene.updateMatrixWorld(true);const locks=[];g.scene.traverse(o=>{if(o.name.startsWith('ramp_bar_lock_'))locks.push(o);});for(const lock of locks)hinge.attach(lock);}
      scene.add(group);
      T[size] = {group, hinge, bounds: modelBounds, base: hinge ? hinge.quaternion.clone() : null, axis: new THREE.Vector3(...(t.rampAxis || [0, 0, 1])),
                 open: t.rampAxis ? t.rampOpen : -t.rampOpen, ramp: 0, rampTo: 0, scale: 1, scaleTo: 1, show: true, fade: 1};
    }));
    if (signal.aborted) return;
    modelsReady = true; dirty = true; filmView(); cur.pos.copy(want.pos); cur.look.copy(want.look); cur.shift=want.shift; cur.shiftY=want.shiftY; renderer.shadowMap.needsUpdate=true;
    if (/[?&]debug3d/.test(location.search)) window.__rs3d = {scene, T, renderer, camera, composer, head, frame, LIGHTS,   // 10-30: the QA grid drives the view
      state: () => ({az, el, radius, locked, mode, focus, touring, entering:entrance<1}), enter, leave,
      view: (a, e, snap) => { az = a; el = e; if (focus) { orbitView(); if (snap) { cur.pos.copy(want.pos); cur.look.copy(want.look); cur.shift = want.shift; } dirty = true; } },
      lock: v => { locked = v; if (v) stopTour(); syncLock(); }};
    if (own) enter(pending || sec.dataset.open || sec.dataset.size || '20');
    else if (pending) enter(pending);
    else if (rv) leave();
    if(rv&&!still){
      // Restore the original entrance: start farther away and lower, then
      // glide in to the live trailers. Their wheels remain on the yard.
      cur.look.copy(want.look);cur.shift=want.shift;cur.shiftY=want.shiftY;
      const away=want.pos.clone().sub(want.look);away.y*=.55;
      cur.pos.copy(want.look).addScaledVector(away,1.45);
      entrance=0;sec.dataset.entrance='arriving';
    }else sec.dataset.entrance='ready';
  }).catch(onError);

  let last = performance.now(), frameNo = 0, shown = true;
  const qRamp = new THREE.Quaternion();
  renderer.setAnimationLoop(t => {
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (!modelsReady || signal.aborted || !visible) return;
    if ((frameNo = (frameNo + 1) % 30) === 0) shown = sec.checkVisibility ? sec.checkVisibility({opacityProperty: true, visibilityProperty: true}) : true;
    if (!shown) return;                               // the immersive page keeps every section fixed: skip while hidden
    // A restrained camera sweep makes the live model evident on arrival.
    // Pointer movement, dragging, the ramp and the pause button take control.
    if (touring && !locked && !drag && sec.dataset.orderStep !== 'review') {
      tourTime += dt;
      if(mode === 'overview')filmView();
      else {az = tourAz + Math.sin(tourTime * .32) * .28; orbitView();}
    }
    if(entrance<1){entrance=Math.min(1,entrance+dt/2.4);if(entrance===1)sec.dataset.entrance='ready';}
    const k = still ? 1 : 1 - Math.exp(-dt * (entrance<1?1.7:3.2)), kf = still ? 1 : 1 - Math.exp(-dt * 7);
    let moving = false;
    const ease = (a, b, f) => { const d = b - a; if (Math.abs(d) > 1e-4) moving = true; return a + d * f; };
    // Interpolate around the target, not along a chord through the product.
    // Maintain the orbit's radius even when a pointer jumps to the opposite edge.
    const currentOrbit = new THREE.Spherical().setFromVector3(cur.pos.clone().sub(cur.look));
    const targetOrbit = new THREE.Spherical().setFromVector3(want.pos.clone().sub(want.look));
    let turn = targetOrbit.theta - currentOrbit.theta;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    currentOrbit.theta = ease(currentOrbit.theta, currentOrbit.theta + turn, k);
    currentOrbit.phi = ease(currentOrbit.phi, targetOrbit.phi, k);
    currentOrbit.radius = ease(currentOrbit.radius, targetOrbit.radius, k);
    cur.look.set(ease(cur.look.x, want.look.x, k), ease(cur.look.y, want.look.y, k), ease(cur.look.z, want.look.z, k));
    cur.pos.copy(cur.look).add(new THREE.Vector3().setFromSpherical(currentOrbit));
    cur.shift = ease(cur.shift, want.shift, k);
    cur.shiftY = ease(cur.shiftY, want.shiftY, k);
    frame.intensity = ease(frame.intensity, frame.userData.to || 0, kf);
    for (const tr of Object.values(T)) {
      tr.scale = ease(tr.scale, tr.scaleTo, kf); tr.group.scale.setScalar(tr.scale);
      tr.fade = ease(tr.fade, tr.show ? 1 : 0, kf * 1.4);
      tr.group.visible = tr.show;
      tr.group.position.y = LIFT;
      const previousRamp=tr.ramp;
      tr.ramp = still ? tr.rampTo : ease(tr.ramp, tr.rampTo, 1 - Math.exp(-dt * 2.4));
      if(Math.abs(previousRamp-tr.ramp)>1e-5)renderer.shadowMap.needsUpdate=true;
      if (tr.hinge) tr.hinge.quaternion.copy(tr.base).multiply(qRamp.setFromAxisAngle(tr.axis, tr.open * tr.ramp));
    }
    if (!moving && !dirty) return;
    dirty = false;
    camera.position.copy(cur.pos); camera.lookAt(cur.look);
    head.position.copy(cur.pos).add(new THREE.Vector3(0, 3, 0)); head.lookAt(cur.look);
    const w = host.clientWidth, h = host.clientHeight;
    camera.setViewOffset(w,h,cur.shift*w,cur.shiftY*h,w,h);   // Blender lens shift: + moves the frame right
    try {
      if (composer) composer.render(); else renderer.render(scene, camera);
      if (!presented && !renderer.getContext().isContextLost()) { presented = true; onReady(); }
    } catch (error) { onError(error); }
  });
}
