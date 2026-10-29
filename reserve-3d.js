// Reserve stage in real 3D (v3 test, Claude 10-28). Owner: "i want people to lock this onto an axis and truly see all of
// it, also I want the full screen to be the animation so the text and if they click it locks the position"; "they just
// need to hover over the 16ft one for it to transition". The exact film trailers (tools/export_viewer_glb.py), on the
// round stage, from the fleet film's camera. Hover a trailer: it comes forward under the light and the camera flies to
// it; then the cursor turns the view all the way round and from low to overhead; a click locks it (again to unlock).
// The other trailer waits in a small card on the left: hovering it switches.
// 10-29 owner: "I want the 3d trailer page to not be on the scroll down part, that should be a new page" -> reserve.html
// (data-page="reserve"): the stage fills the left column, the size cards and checkout sit in a rail on the right; the
// rail and the stage talk through two events on the section: 'rs:enter' (go to a size) and 'rs:size' (size shown).
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
// 10-29 owner: "the paint is super bad looking and the display of it doesnt grab me" -> trailer v2 (tools/build_trailer_v2.py,
// one 'Marvel <finish>' material per finish) gets its look here: gloss black clearcoat paint over metallic flake, blackout
// plate, steel, rubber, lit marker lenses; a showroom of soft light boards for the paint to mirror, an overhead light frame
// (area light) over the chosen trailer, a polished stage floor that reflects the trailers, a little bloom on the lights,
// and the lights come up when the page opens. Phones skip the floor mirror and the bloom.

const sec = document.querySelector('section.reserve-stage');
if (sec) start(sec);

function start(sec) {
  const own = sec.dataset.page === 'trailer', rv = sec.dataset.page === 'reserve';
  const A = 'assets/reserve-3d/', BG = 0x0a0e10, ACCENT = 0x4dd8e8, LIFT = .21;
  const host = sec.querySelector('.rs-3d'), panels = [...sec.querySelectorAll('.rs-panel')];
  const radios = [...sec.querySelectorAll('.rs-switch button')], back = sec.querySelector('.rs-back');
  const other = sec.querySelector('.rs-other'), rampBtn = sec.querySelector('.rs-ramp-btn');
  const lockChip = sec.querySelector('.rs-lock'), copy = sec.querySelector('.rs-copy');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fancy = !matchMedia('(max-width:860px)').matches;
  const b2t = ([x, y, z]) => new THREE.Vector3(x, z, -y);          // Blender Z-up -> three Y-up

  const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.12;
  RectAreaLightUniformsLib.init();
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, 18, 46);
  const camera = new THREE.PerspectiveCamera(30, 1.6, .1, 200);

  // ---- the studio: dark floor that fades into the page, the round stage with its cyan underglow, the film's light
  const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 96), new THREE.MeshStandardMaterial({color: 0x090b0c, roughness: .55, envMapIntensity: .25}));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const deckMat = new THREE.MeshPhysicalMaterial({color: 0x0c0f10, roughness: .5, metalness: 0, clearcoat: .12, clearcoatRoughness: .35, envMapIntensity: .3});
  function stage(r) {
    const g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .16, 160), deckMat); deck.position.y = .05 + .08;
    deck.receiveShadow = true; deck.castShadow = true;
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(r - .3, r - .3, .05, 160), new THREE.MeshStandardMaterial({color: 0x050707, roughness: .6}));
    plinth.position.y = .025;
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(r - .29, r - .29, .026, 160, 1, true),
      new THREE.MeshBasicMaterial({color: ACCENT, toneMapped: false}));
    glow.position.y = .025;
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');   // the halo it casts
    const grad = x.createRadialGradient(256, 256, 0, 256, 256, 256);
    const k = (r - .3) / (r + 1.6);
    grad.addColorStop(0, 'rgba(77,216,232,0)'); grad.addColorStop(Math.max(0, k - .02), 'rgba(77,216,232,0)');
    grad.addColorStop(k, 'rgba(77,216,232,.55)'); grad.addColorStop(Math.min(1, k + .12), 'rgba(77,216,232,.08)'); grad.addColorStop(1, 'rgba(77,216,232,0)');
    x.fillStyle = grad; x.fillRect(0, 0, 512, 512);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2 * (r + 1.6), 2 * (r + 1.6)),
      new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}));
    halo.rotation.x = -Math.PI / 2; halo.position.y = .004;
    g.add(deck, plinth, glow, halo);
    if (fancy) {                                       // polished top: the trailers stand on their own reflection
      const mirror = new Reflector(new THREE.CircleGeometry(r - .02, 160), {clipBias: .003, textureWidth: 1024, textureHeight: 1024, color: 0x9aa2a8});
      mirror.rotation.x = -Math.PI / 2; mirror.position.y = .2105;
      const gloss = new THREE.Mesh(new THREE.CircleGeometry(r - .02, 160), new THREE.MeshPhysicalMaterial({
        color: 0x0a0d0f, roughness: .32, metalness: 0, transparent: true, opacity: .78, clearcoat: .7, clearcoatRoughness: .08, envMapIntensity: .15}));
      gloss.rotation.x = -Math.PI / 2; gloss.position.y = .2125; gloss.receiveShadow = true;
      g.add(mirror, gloss);
    }
    g.userData.glow = glow; return g;
  }
  const deckGroup = stage(6.4); scene.add(deckGroup);
  scene.add(new THREE.HemisphereLight(0xcfe3ea, 0x0a0e10, .35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-2, 14, 4); sun.castShadow = true;
  Object.assign(sun.shadow.camera, {left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40}); sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; scene.add(sun, sun.target);
  for (const [px, pz] of [[9, -9], [9, 9]]) { const rim = new THREE.DirectionalLight(0xbfe6ff, .45); rim.position.set(px, 5, pz); scene.add(rim); }
  const head = new THREE.DirectionalLight(0xffffff, .55); scene.add(head, head.target);   // follows the camera: the sides never go black
  const spot = new THREE.SpotLight(0xeaf4ff, 0, 0, .5, .85, 1.2);   // the light frame over the chosen trailer
  spot.position.set(0, 8, 0); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0004;
  scene.add(spot, spot.target);
  const frame = new THREE.RectAreaLight(0xffffff, 0, 8.5, 3.2); frame.position.set(0, 6.4, 0); frame.lookAt(0, 0, 0); scene.add(frame);
  const LIGHTS = [];                                   // [light, full intensity]: they come up together when the page opens
  scene.traverse(o => { if (o.isLight && o !== spot && o !== frame) LIGHTS.push([o, o.intensity]); });
  if (!still) for (const [l] of LIGHTS) l.intensity = 0;
  // reflections: a dark showroom with white light frames (a big one overhead, strips round the walls), so the glossy paint
  // and the roof shine the way they do in the film; the warm workshop HDR tinted the dark paint brown
  const pmrem = new THREE.PMREMGenerator(renderer);
  {
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(44, 18, 44), new THREE.MeshBasicMaterial({color: 0x0b0e10, side: THREE.BackSide}));
    room.position.y = 7; env.add(room);
    const panel = (w, h, pos, rot, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(.95, .97, 1).multiplyScalar(k), side: THREE.DoubleSide}));
      m.position.set(...pos); m.rotation.set(...rot); env.add(m);
    };
    panel(16, 7, [0, 15.8, 0], [Math.PI / 2, 0, 0], 7);           // the overhead light frame
    panel(2.5, 9, [-21.8, 7, -4], [0, Math.PI / 2, 0], 2.6); panel(2.5, 9, [-21.8, 7, 6], [0, Math.PI / 2, 0], 2.6);
    panel(2.5, 9, [21.8, 7, 0], [0, -Math.PI / 2, 0], 2.2);
    panel(22, 1.6, [0, 4.5, -21.8], [0, 0, 0], 1.8); panel(22, 1.6, [0, 4.5, 21.8], [0, Math.PI, 0], 1.4);
    // a big softbox high on the far side from the film camera: the roofs mirror it
    for (const dy of [-1.6, 0, 1.6]) {                // three slim bars, so the reflection reads as a light frame, not a grey sheet
      const m = new THREE.Mesh(new THREE.PlaneGeometry(14, .45), new THREE.MeshBasicMaterial({color: new THREE.Color(.95, .97, 1).multiplyScalar(5), side: THREE.DoubleSide}));
      m.position.set(-13.6, 9.6 + dy, 11.8); m.lookAt(0, dy, 0); env.add(m);
    }
    // one slim light board each side, along the trailers: the long glossy sides pick it up as a clean horizontal line
    // (more boards, or wider ones, blur into a grey sheen on black paint)
    panel(26, .45, [0, -1.99, -3.4], [-Math.PI / 2, 0, 0], 2.8); panel(26, .45, [0, -1.99, 3.4], [-Math.PI / 2, 0, 0], 2.2);
    scene.environment = pmrem.fromScene(env, .02).texture;   // a touch of blur: sharper stair-steps the thin lines
    if (/[?&]debug3d/.test(location.search)) window.__env = env;
  }

  // ---- finishes for the v2 trailer's 'Marvel <finish>' materials
  const flake = (() => {                               // metallic flake: every texel a tiny mirror tilted a little, any way
    const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'), img = x.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * .5;
      img.data[i * 4] = 128 + Math.cos(a) * r * 127; img.data[i * 4 + 1] = 128 + Math.sin(a) * r * 127; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
    t.colorSpace = THREE.NoColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  })();
  const FINISH = {
    // gloss black: the base hardly reflects (a blurred base reflection reads grey); the clear coat carries every crisp line
    // (clear coat roughness .07, not lower: on a dead-flat panel a sharper coat turns a light's highlight into a peak past the
    // half-float range of the bloom buffers, and the bloom spreads it until the whole frame goes black)
    paint: {color: 0x060708, metalness: .25, roughness: .5, specularIntensity: .25, clearcoat: 1, clearcoatRoughness: .07, envMapIntensity: 1.6,
            normalMap: flake, normalScale: new THREE.Vector2(.12, .12)},
    plate: {color: 0x1b1e21, metalness: .92, roughness: .3, envMapIntensity: 1.35},
    trim: {color: 0x0c0e10, metalness: .75, roughness: .3, envMapIntensity: 1.25},
    chassis: {color: 0x0a0b0c, metalness: .35, roughness: .55, envMapIntensity: .8},
    steel: {color: 0x9ea4aa, metalness: 1, roughness: .26, envMapIntensity: 1.2},
    wheel: {color: 0x0e1012, metalness: .7, roughness: .24, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: 1.2},
    tyre: {color: 0x0b0b0c, metalness: 0, roughness: .88, envMapIntensity: .35},
    'lens red': {color: 0x3a0306, emissive: 0xff1d24, emissiveIntensity: 2.4, roughness: .12, clearcoat: 1},
    'lens amber': {color: 0x4a2004, emissive: 0xff8a14, emissiveIntensity: 2, roughness: .12, clearcoat: 1},
    'lens clear': {color: 0x8a9096, emissive: 0xe4ecff, emissiveIntensity: .7, roughness: .08, clearcoat: 1},
    wood: {color: 0x8a6a48, roughness: .8, envMapIntensity: .5},
    liner: {color: 0x6f6963, roughness: .75, envMapIntensity: .5},
    rubber: {color: 0x0d0d0d, roughness: .8, envMapIntensity: .4},
    // the film's own trailers (owner 10-29: "I want the old trailer but give it the glossy ness and shine")
    accent: {color: 0x43d5e4, metalness: .2, roughness: .3, clearcoat: 1, clearcoatRoughness: .03, emissive: 0x43d5e4, emissiveIntensity: .22, envMapIntensity: 1},
    filmtrim: {color: 0x4a5558, metalness: .9, roughness: .3, envMapIntensity: 1.2}
  };
  const FILM = [[/Marvel finish \/ body/, 'paint'], [/Marvel finish \/ trim/, 'filmtrim'], [/Marvel finish \/ accent/, 'accent'],
                [/Marvel v4 \/ tire/, 'tyre'], [/Marvel v4 \/ (rim|lip|hub)/, 'wheel'], [/Marvel v4 \/ lug/, 'steel'], [/Marvel v4 \/ fender/, 'trim']];
  const made = new Map();
  function finish(mat, uv) {                           // uv: the mesh has UVs (the flake map needs them)
    if (!mat) return mat;
    const id = mat.uuid + (uv ? '' : '/nouv');
    if (made.has(id)) return made.get(id);
    let key = (mat.name || '').replace(/^Marvel /, '').replace(/\.\d+$/, '');
    for (const [re, k] of FILM) if (re.test(mat.name || '')) { key = k; break; }
    let out = mat;
    if (FINISH[key]) {
      out = new THREE.MeshPhysicalMaterial({name: mat.name, ...FINISH[key], side: mat.side});   // the film's panels are double-sided
      if (!uv) out.normalMap = null;
    }
    else if (mat.map) {                                 // the wrap: printed vinyl under the same clear gloss, white reads white in shade
      out = new THREE.MeshPhysicalMaterial({name: mat.name, map: mat.map, transparent: mat.transparent, alphaTest: mat.alphaTest, side: mat.side,
        depthWrite: mat.depthWrite, roughness: .38, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.2,
        emissive: new THREE.Color(1, 1, 1), emissiveMap: mat.map, emissiveIntensity: /lettering|wordmark/i.test(mat.name) ? .3 : .18,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
    } else if ('envMapIntensity' in mat) mat.envMapIntensity = 1.15;
    made.set(id, out); return out;
  }

  // the film trailer's side, roof and rear panels are scanned surfaces, a few mm wavy: fine under the film's satin metal,
  // broken-up streaks under gloss. Each triangle within 25 deg of an axis gets that axis as its normal (a flat panel);
  // the rest (fenders, the V-nose, rounded trim) keep the model's own smooth normals
  const COS25 = Math.cos(THREE.MathUtils.degToRad(25));
  function flatten(o) {
    o.updateWorldMatrix(true, false);
    if (Math.abs(o.matrixWorld.determinant()) < 1e-12 || !o.geometry.attributes.normal) return;   // parts the film scaled to nothing
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(), P = g.attributes.position, N = g.attributes.normal;
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld), inv = nm.clone().invert();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3(), w = new THREE.Vector3(), s0 = new THREE.Vector3();
    for (let i = 0; i < P.count; i += 3) {
      a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
      f.subVectors(c, b).cross(a.sub(b)); if (f.lengthSq() < 1e-14) continue; f.normalize();
      s0.fromBufferAttribute(N, i).add(b.fromBufferAttribute(N, i + 1)).add(c.fromBufferAttribute(N, i + 2));
      if (f.dot(s0) < 0) f.negate();                   // keep the side the model's own normals face
      w.copy(f).applyMatrix3(nm).normalize();
      const ax = [Math.abs(w.x), Math.abs(w.y), Math.abs(w.z)], k = ax.indexOf(Math.max(...ax));
      if (ax[k] < COS25) continue;
      const sg = Math.sign(w.getComponent(k)); w.set(0, 0, 0).setComponent(k, sg); f.copy(w).applyMatrix3(inv).normalize();
      for (let j = 0; j < 3; j++) N.setXYZ(i + j, f.x, f.y, f.z);
    }
    N.needsUpdate = true; o.geometry = g;
  }

  // ---- the trailers
  let meta = null, focus = null, hover = null, mode = 'overview', locked = false, dirty = true;
  const T = {};                                        // '20' / '16' -> {group, hinge, ramp, scale, park}
  const draco = new DRACOLoader(); draco.setDecoderPath('vendor/three/addons/libs/draco/gltf/');
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);

  // camera rig: everything eases toward its target values every frame
  const cur = {pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: 0}, want = {pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: 0};
  let az = .6, el = .32, radius = 12, filmFov = 30, filmShift = 0;
  const pointer = {x: .5, y: .5, inside: false};

  function filmView() {
    const c = meta.camera;
    if (rv) {                                          // its own column: the film's angle, aimed at the middle of the stage, back far enough to hold all of it
      const dir = b2t(c.position).sub(b2t(c.target)).normalize(), look = new THREE.Vector3(0, .9, 0), s = rvShift();
      const vh = THREE.MathUtils.degToRad(camera.fov) / 2, hh = Math.atan(Math.tan(vh) * camera.aspect * (1 - 2 * Math.abs(s)));
      want.look.copy(look); want.pos.copy(look).addScaledVector(dir, 7.4 / Math.sin(Math.min(vh, hh))); want.shift = s; return;
    }
    want.pos.copy(b2t(c.position)); want.look.copy(b2t(c.target)); want.shift = filmShift;
  }
  function rvShift() {                                  // 10-29 full-screen variants: data-shift (-.15) moves the trailers right of the floating rail
    return rv && !matchMedia('(max-width:860px)').matches ? (parseFloat(sec.dataset.shift || '0') || 0) : 0;
  }
  function orbitView() {
    const t = T[focus], target = new THREE.Vector3(t.group.position.x, LIFT + 1.25, t.group.position.z);   // its resting height: when it was the other one it is still rising
    want.look.copy(target);
    want.pos.copy(target).add(new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(radius));
    want.shift = rv ? rvShift() : matchMedia('(max-width:760px)').matches ? 0 : -.16;   // the trailer sits right of the copy
  }

  let composer = null;
  if (fancy) {                                         // a little bloom on the lit lenses and the stage glow; MSAA kept
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 4}));
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .5, .95));
    composer.addPass(new OutputPass());
  }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    // "cover" like the renders: keep the film's framing at 16:10, crop the other way on other screens
    const vf = 2 * Math.atan(Math.tan(filmFov / 2) / meta.camera.aspect);
    camera.fov = THREE.MathUtils.radToDeg(camera.aspect > meta.camera.aspect ? 2 * Math.atan(Math.tan(vf / 2) * meta.camera.aspect / camera.aspect) : vf);
    camera.updateProjectionMatrix(); dirty = true;
    if (rv && mode === 'overview') filmView();
  }

  function setPanel(size) {
    for (const p of panels) p.hidden = p.dataset.size !== size;
    for (const b of radios) b.setAttribute('aria-checked', String(b.dataset.size === size));
    sec.dataset.size = size;
    if (own || 'swapUrl' in sec.dataset) history.replaceState(null, '', `trailer-${size}.html` + location.search);
    sec.dispatchEvent(new CustomEvent('rs:size', {detail: size}));
  }

  function light(size) {                               // the hovered/chosen trailer comes forward under the light
    hover = size;
    for (const [s, t] of Object.entries(T)) t.scaleTo = s === size ? 1.08 : 1;
    if (size) {
      const p = T[size].group.position; spot.target.position.set(p.x, 1, p.z); spot.position.set(p.x - 1.5, 8.5, p.z + 1.2);
      frame.position.set(p.x, 6.4, p.z); frame.lookAt(p.x, 0, p.z);
    }
    spot.userData.to = size ? 180 : 0; frame.userData.to = size ? 3.5 : 0; dirty = true;
  }

  function enter(size) {
    if (mode === 'viewer' && focus === size) return;
    clearTimeout(intent);
    const from = focus; focus = size; mode = 'viewer'; sec.dataset.mode = 'viewer';
    setPanel(size); light(size);
    for (const [s, t] of Object.entries(T)) t.show = s === size;
    radius = size === '20' ? 13.5 : 11.5; locked = false; sec.classList.remove('is-locked');
    if (!from) { az = Math.atan2(cur.pos.z - T[size].group.position.z, cur.pos.x - T[size].group.position.x); el = .3; }
    setRamp(0);
    const o = size === '20' ? '16' : '20';
    if (other) {
      other.dataset.size = o; other.querySelector('img').src = `assets/reserve-viewer/thumb-${o}.webp?v=new1`;
      other.querySelector('.rs-other-size').textContent = `${o} ft`;
    }
    orbitView();
  }
  function leave() {
    mode = 'overview'; sec.dataset.mode = 'overview'; focus = null; locked = false; sec.classList.remove('is-locked');
    for (const t of Object.values(T)) t.show = true;
    setRamp(0); light(null); filmView();
  }
  function setRamp(to) {
    if (!focus) { for (const t of Object.values(T)) t.rampTo = 0; return; }
    T[focus].rampTo = to; rampBtn.textContent = to ? 'Close the ramp' : 'Open the ramp';
    if (to) {                                          // look into the bay from behind, and hold the view there
      az = Math.atan2(-.55, 1); el = .2; locked = true; sec.classList.add('is-locked'); orbitView();
    }
    dirty = true;
  }

  // ---- pointer: hover a trailer to go to it; then the cursor turns the view; click locks
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
    if (!meta) return;
    const r = renderer.domElement.getBoundingClientRect();
    if (drag && !fromPage) {                           // touch / pen, or dragging while locked: turn it by hand
      az += (e.clientX - drag.x) * .008; el = Math.min(1.42, Math.max(.04, el + (e.clientY - drag.y) * .006));
      drag.x = e.clientX; drag.y = e.clientY; drag.moved = true; orbitView(); return;
    }
    if (e.pointerType !== 'mouse') return;
    if (mode === 'overview') {
      const s = pick(e);
      if (!fromPage) renderer.domElement.style.cursor = s ? 'pointer' : '';
      if (s !== hover) { light(s); if (s) setPanel(s); clearTimeout(intent); if (s) intent = setTimeout(() => enter(s), 380); }
      return;
    }
    if (locked || overCopy(e)) return;
    // the area right of the copy is the control surface: left..right = once all the way round, top..bottom = overhead..low
    const x0 = !copy || matchMedia('(max-width:760px)').matches ? r.left : copy.getBoundingClientRect().right;
    const u = Math.min(1, Math.max(0, (e.clientX - x0) / (r.right - x0))), v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    az = Math.PI * .2 + (u - .5) * Math.PI * 2; el = 1.42 - v * 1.36; orbitView();
  };
  renderer.domElement.addEventListener('pointermove', e => onMove(e, false));
  if (sec.dataset.pointer === 'page')                  // 10-29 variant B: the cursor steers the trailer from anywhere on the page, the rail included
    window.addEventListener('pointermove', e => { if (e.target !== renderer.domElement && !matchMedia('(max-width:860px)').matches) onMove(e, true); });
  renderer.domElement.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || locked) drag = {x: e.clientX, y: e.clientY, moved: false};
    renderer.domElement.setPointerCapture?.(e.pointerId);
  });
  renderer.domElement.addEventListener('pointerup', e => {
    const was = drag; drag = null;
    if (was?.moved) return;
    if (mode === 'overview') { const s = pick(e); if (s) enter(s); return; }
    if (e.pointerType === 'mouse' && !overCopy(e)) { locked = !locked; sec.classList.toggle('is-locked', locked); }
  });
  renderer.domElement.addEventListener('pointerleave', () => { if (mode === 'overview') { light(null); clearTimeout(intent); } });
  back?.addEventListener('click', leave);
  other?.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') enter(other.dataset.size); });   // hover = switch
  other?.addEventListener('click', () => enter(other.dataset.size));
  let pending = sec.dataset.open || '';                // the reserve page's rail: go to a size (before the models load: on arrival)
  sec.addEventListener('rs:enter', e => { if (T[e.detail]) enter(e.detail); else pending = e.detail; });
  sec.addEventListener('rs:leave', () => { if (mode === 'viewer') leave(); });
  for (const b of radios) b.addEventListener('click', () => enter(b.dataset.size));
  for (const a of sec.querySelectorAll('.rs-explore')) a.addEventListener('click', e => { e.preventDefault(); enter(a.closest('.rs-panel').dataset.size); });
  rampBtn.addEventListener('click', () => { if (focus) setRamp(T[focus].rampTo ? 0 : 1); });
  lockChip?.addEventListener('click', () => { locked = false; sec.classList.remove('is-locked'); });

  // reserve: $100 fully refundable deposit credited toward the trailer (owner 10-28); a mailto until checkout exists
  for (const a of sec.querySelectorAll('.rs-reserve')) {
    const s = a.closest('.rs-panel').dataset.size, link = sec.dataset['checkout' + s];
    if (link) { a.href = link; continue; }
    const subject = `Reserve a ${s} ft Marvel Labs trailer ($100 refundable deposit)`;
    const body = `Hi Marvel Labs,\n\nI'd like to reserve a ${s} ft autonomous microfactory trailer with the $100 fully refundable deposit.\n\nName:\nBusiness / service area:\nPhone:\n\nThanks!`;
    a.href = `mailto:hello@marvellabs.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // ---- load, then run (only while the section is on screen)
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) dirty = true; }).observe(sec);
  fetch(A + 'viewer.json?v=' + (sec.dataset.rev || '1')).then(r => r.json()).then(async m => {
    meta = m;
    const c = m.camera, hfov = 2 * Math.atan(c.sensor / 2 / c.lens);
    filmFov = hfov; filmShift = c.shift[0];
    resize(); filmView(); cur.pos.copy(want.pos); cur.look.copy(want.look); cur.shift = want.shift;
    if (!still && !own && !pending) {                  // the opening: from further out and lower, gliding in as the lights come up
      const away = cur.pos.clone().sub(cur.look); away.y *= .55; cur.pos.copy(cur.look).addScaledVector(away, 1.45);
    }
    new ResizeObserver(resize).observe(host);
    await Promise.all(Object.entries(m.trailers).filter(([size]) => size === '20' || size === '16').map(([size, t]) => new Promise((ok, bad) => loader.load(A + t.file, g => {
      const group = new THREE.Group(); group.userData.size = size; group.add(g.scene);
      group.position.copy(b2t(t.park)).add(new THREE.Vector3(0, LIFT, 0));
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        if (/Marvel finish \/ body/.test((Array.isArray(o.material) ? o.material[0] : o.material)?.name || '')) flatten(o);
        const uv = !!o.geometry.attributes.uv;
        o.material = Array.isArray(o.material) ? o.material.map(m => finish(m, uv)) : finish(o.material, uv);
      });
      // the ramp: the old rigs carry a 'Ramp hinge' node turned about Z; the owner's new 20 ft names its own (ramp_door, axis in meta)
      const hinge = (t.hingeNode && g.scene.getObjectByName(t.hingeNode)) || g.scene.getObjectByName(`Ramp_hinge_${size}`) || g.scene.getObjectByName(`Ramp hinge ${size}`);
      scene.add(group);
      T[size] = {group, hinge, base: hinge ? hinge.quaternion.clone() : null, axis: new THREE.Vector3(...(t.rampAxis || [0, 0, 1])),
                 open: t.rampAxis ? t.rampOpen : -t.rampOpen, ramp: 0, rampTo: 0, scale: 1, scaleTo: 1, show: true, fade: 1};
      ok();
    }, undefined, bad))));
    sec.classList.add('rs-live'); dirty = true;
    if (/[?&]debug3d/.test(location.search)) window.__rs3d = {scene, T, renderer, camera, composer};
    if (own) enter(sec.dataset.size || '20');
    else if (pending) enter(pending);
  });

  let last = performance.now(), frameNo = 0, shown = true, reveal = still ? 1 : 0;
  const qRamp = new THREE.Quaternion();
  renderer.setAnimationLoop(t => {
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (!meta || !visible) return;
    if ((frameNo = (frameNo + 1) % 30) === 0) shown = sec.checkVisibility ? sec.checkVisibility({opacityProperty: true, visibilityProperty: true}) : true;
    if (!shown) return;                               // the immersive page keeps every section fixed: skip while hidden
    const k = 1 - Math.exp(-dt * (still ? 60 : 3.2)), kf = 1 - Math.exp(-dt * 7);
    let moving = false;
    const ease = (a, b, f) => { const d = b - a; if (Math.abs(d) > 1e-4) moving = true; return a + d * f; };
    cur.pos.set(ease(cur.pos.x, want.pos.x, k), ease(cur.pos.y, want.pos.y, k), ease(cur.pos.z, want.pos.z, k));
    cur.look.set(ease(cur.look.x, want.look.x, k), ease(cur.look.y, want.look.y, k), ease(cur.look.z, want.look.z, k));
    cur.shift = ease(cur.shift, want.shift, k);
    spot.intensity = ease(spot.intensity, spot.userData.to || 0, kf);
    frame.intensity = ease(frame.intensity, frame.userData.to || 0, kf);
    if (reveal < .999 && T['20']) {
      reveal = ease(reveal, 1, 1 - Math.exp(-dt * 1.6));
      for (const [l, full] of LIGHTS) l.intensity = full * reveal;
      deckGroup.userData.glow.material.color.setHex(ACCENT).multiplyScalar(.15 + .85 * reveal);
    }
    for (const tr of Object.values(T)) {
      tr.scale = ease(tr.scale, tr.scaleTo, kf); tr.group.scale.setScalar(tr.scale);
      tr.fade = ease(tr.fade, tr.show ? 1 : 0, kf * 1.4);
      tr.group.visible = tr.fade > .02;
      tr.group.position.y = LIFT - (1 - tr.fade) * 3.2;        // the other one sinks out of view
      tr.ramp = ease(tr.ramp, tr.rampTo, 1 - Math.exp(-dt * 2.4));
      if (tr.hinge) tr.hinge.quaternion.copy(tr.base).multiply(qRamp.setFromAxisAngle(tr.axis, tr.open * tr.ramp));
    }
    if (!moving && !dirty) return;
    dirty = false;
    camera.position.copy(cur.pos); camera.lookAt(cur.look);
    head.position.copy(cur.pos).add(new THREE.Vector3(0, 3, 0)); head.target.position.copy(cur.look);
    const w = host.clientWidth, h = host.clientHeight;
    if (Math.abs(cur.shift) > 1e-4) camera.setViewOffset(w, h, cur.shift * w, 0, w, h); else camera.clearViewOffset();   // Blender lens shift: + moves the frame right
    if (composer) composer.render(); else renderer.render(scene, camera);
  });
}
