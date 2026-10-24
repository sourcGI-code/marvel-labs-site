import * as THREE from './assets/three.module.js';
import { createCargoModel } from './cargo-model.js?v=2';
import { studioLight } from './studio.js';

const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Every pose is calculated from scroll position. There are no frame boundaries.
export async function createTrailerScene(canvas, { single = false, variant = 'explore', paused = false, readProgress } = {}) {
  const host = canvas.parentElement;
  const started = performance.now();
  // Fetch geometry while the lighting environment is prepared.
  const pendingModels = Promise.all((single ? [20] : [20, 16]).map(feet => createCargoModel(feet, { optimized: true })));
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  studioLight(scene, renderer);
  scene.children.filter(n => n.shadow).forEach(n => n.shadow.mapSize.set(1024, 1024));
  scene.children.filter(n => n.isLight).forEach(n => { n.position.z *= -1; });
  const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, .1, 100);
  const models = await pendingModels;
  function setPalette() {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    for (const model of models) model.root.traverse(mesh => {
      if (!mesh.isMesh || !['Marvel cyan', 'OLED readout'].includes(mesh.name)) return;
      mesh.material.color.set(accent);
      if (mesh.name === 'OLED readout') mesh.material.emissive.set(accent);
    });
  }
  for (const model of models) {
    model.root.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.material.envMapIntensity = .85;
      if (mesh.name.includes('graphite')) { mesh.material.roughness = .42; mesh.material.metalness = .45; }
      if (mesh.name === 'Brushed stainless steel') mesh.material.roughness = .38;
      mesh.material.side = THREE.FrontSide;
      mesh.frustumCulled = true;
    });
  }
  // Each trailer retains its own shadow texture. A camera move does not
  // change object-space lighting, so the closed exterior needs no new pass.
  const views = models.map(model => {
    const view = new THREE.Scene(); view.environment = scene.environment;
    scene.children.forEach(light => view.add(light.clone()));
    view.add(model.root);
    return { scene: view, pose: '' };
  });
  let width = 1, height = 1, progress = 0, target = 0, frame = 0, last = 0, elapsed = 0;
  let active = true, visible = false, lost = false, ready = false, pointer = 0, pointerTarget = 0, orbit = 0;
  const look = new THREE.Vector3();
  function draw() {
    if (!ready || !active || !visible || lost || document.hidden) return;
    renderer.setScissorTest(false); renderer.clear();
    renderer.setScissorTest(true);
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      let opening, explosion = 0, chassis = 0, angle, elevation = 8, zoom = 1, focusX = -.35, focusY = 1.3;
      if (single) {
        const phase = progress * 7;
        opening = smooth(phase, .72, 1.70);
        explosion = smooth(phase, 1.9, 2.75) * (1 - smooth(phase, 2.9, 3.35));
        const detail = smooth(phase, 3.0, 3.6);
        const centers = [-2.1, -.65, .8, 2.05];
        const step = Math.min(3, Math.max(0, phase - 3.5));
        const a = Math.floor(step), b = Math.min(3, a + 1);
        focusX = THREE.MathUtils.lerp(-.35, THREE.MathUtils.lerp(centers[a], centers[b], smooth(step - a, .25, .85)), detail);
        zoom = 1 + detail * .52;
        focusY = 1.3 + detail * .22;
        angle = -.48 + progress * .32;
      } else {
        const phase = progress * 4;
        opening = smooth(phase, .75, 1.8) * (1 - smooth(phase, 3.05, 3.65));
        explosion = variant === 'explore' ? smooth(phase, 2.08, 2.65) * .28 * (1 - smooth(phase, 2.85, 3.2)) : 0;
        chassis = variant === 'frame' ? smooth(phase, 2.05, 2.75) * (1 - smooth(phase, 2.95, 3.55)) : 0;
        // Start moving immediately, then ease into the cutaway angle.
        // The long chapter duration is unchanged.
        const approach = 1 - Math.pow(1 - clamp(phase / .95), 2);
        angle = -.70 + approach * .45 + smooth(phase, 1.1, 2) * .16 - smooth(phase, 3, 4) * .23;
        elevation = 6.2 + approach * 1.8;
        if (variant === 'explore') angle += orbit * smooth(phase, 2, 2.15) * (1 - smooth(phase, 2.85, 3));
      }
      if (paused) {
        opening = single ? (progress * 7 >= 1 ? 1 : 0) : (progress >= .25 && progress < .75 ? 1 : 0);
        explosion = 0; chassis = variant === 'frame' && progress >= .5 && progress < .75 ? 1 : 0;
        angle = -.4;
        elevation = 8;
      }
      model.setState(opening, explosion, chassis);
      // Give the enclosure a visible separation before its translucent exit.
      const separating = Math.sin(opening * Math.PI);
      const viewportWidth = single ? width : width / 2;
      const aspect = viewportWidth / height;
      const halfW = (single ? 4.7 : 4.45) / zoom + separating * .48;
      const halfH = Math.max(halfW / aspect, single ? 2.3 : 2.5 + separating * 1.1);
      camera.left = -halfH * aspect; camera.right = halfH * aspect;
      camera.top = halfH; camera.bottom = -halfH; camera.updateProjectionMatrix();
      const drift = paused ? 0 : Math.sin(elapsed * .48 + i * 1.4) * .035;
      camera.position.set(focusX + Math.sin(angle + pointer * .028) * 12, elevation + opening * 2.6 - drift, -Math.cos(angle + pointer * .028) * 12);
      look.set(focusX, focusY - drift, 0); camera.lookAt(look);
      const view = views[i], pose = `${opening}/${explosion}/${chassis}`;
      renderer.shadowMap.needsUpdate = view.pose !== pose;
      view.pose = pose;
      renderer.setViewport(i * viewportWidth, 0, viewportWidth, height);
      renderer.setScissor(i * viewportWidth, 0, viewportWidth, height);
      renderer.render(view.scene, camera);
      if (i === 0) { host.dataset.open = opening.toFixed(3); host.dataset.chassis = chassis.toFixed(3); }
    }
    host.dataset.renderProgress = progress.toFixed(4);
    if (!host.classList.contains('scene-ready')) {
      host.classList.add('scene-ready');
      host.dataset.readyMs = Math.round(performance.now() - started);
    }
  }
  function tick(time) {
    frame = 0;
    if (!active || !visible || document.hidden || lost) return;
    const dt = last ? Math.min(.5, (time - last) / 1000) : 1 / 60; last = time;
    if (!paused) elapsed += dt;
    // Sample native scroll in the rendering frame itself. Do not smooth a
    // second time or wait for the DOM's separately scheduled scroll update.
    progress = clamp(readProgress ? readProgress() : target);
    pointer = paused ? 0 : THREE.MathUtils.lerp(pointer, pointerTarget, 1 - Math.exp(-dt * 4));
    draw(); if (!paused) frame = requestAnimationFrame(tick);
  }
  function schedule() { if (!frame && active && visible && !document.hidden && !lost) { last = 0; frame = requestAnimationFrame(tick); } }
  function stop() { cancelAnimationFrame(frame); frame = 0; }
  function resize() {
    const r = host.getBoundingClientRect(); width = r.width; height = r.height;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2, Math.sqrt(3200000 / (width * height))));
    renderer.setSize(width, height, false); draw();
  }
  new ResizeObserver(resize).observe(host);
  addEventListener('resize', resize);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) { resize(); schedule(); } else stop(); }).observe(host);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : schedule());
  host.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') pointerTarget = (e.clientX / innerWidth - .5) * 2; });
  host.addEventListener('pointerleave', () => pointerTarget = 0);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; stop(); host.classList.remove('scene-ready'); });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; views.forEach(view => view.pose = ''); resize(); schedule(); });
  setPalette(); resize();
  // Compile before replacing the poster so the first gesture does not pay
  // shader setup costs. The first live frame uses the current scroll pose.
  await Promise.all(views.map(view => renderer.compileAsync(view.scene, camera)));
  ready = true; progress = clamp(readProgress ? readProgress() : target); draw(); schedule();
  return {
    setActive(value) { if (active === value) return; active = value; if (active) { progress = target; resize(); schedule(); } else stop(); },
    setProgress(value) { target = clamp(value); if (paused) { progress = target; draw(); } else schedule(); },
    setPaused(value) { paused = value; stop(); if (paused) { progress = target; draw(); } else schedule(); },
    rotate(delta) { orbit += delta; draw(); },
    setPalette() { setPalette(); draw(); },
    resize
  };
}
