// How every recorded film sits in its viewport: ONE place for fit, crop anchor and the interim push-in.
//
// Every recorded film COVERS its host (edge to edge at any aspect ratio, so no side bands), and
// recorded-scene.js projects all timeline overlays (vision labels, callouts, quote markers, capacity
// labels, #field-leader) through the very same transform, so they stay on their objects.
//
// position   cover crop anchor, like CSS object-position. The cargo film's value must equal the opening
//            film's CSS object-position (popout.css) so the opening -> cargo handoff shows no jump.
// maxZoom    upper limit for any push-in (1.6 keeps the 2560 px desktop film sharp at 1440 px). The CSS
//            variable --hold-zoom (popout.css) caps it again for every film: set it to 1 to turn every push-in off.
// window     fallback framing window as host fractions [left, top, right, bottom], used until the page
//            reports its real window (platform.js measures the gap between the delivery cards).
// keys       optional push-in over the film's own timeline (t = seconds of the source film):
//              {t, zoom, focus:[x,y]}   zoom about a film point (timeline units = metadata width/height);
//                                       the point stays where plain cover puts it, or lands at `at`
//                                       ([fx,fy] host fractions, or 'window' = the framing window centre)
//              {t, fit:[x0,y0,x1,y1]}   zoom until that film rectangle fills the framing window
//            Values ease between keys; zoom is held within [1, maxZoom]; the frame always covers the host.
//
// A film that is not listed (e.g. a re-render installed in a new folder) gets plain cover at zoom 1.
// To switch the interim push-in off for a listed film, give it `keys: []`.
// A film's own timeline JSON may carry {"framing": {...same fields...}}, which wins over this table.
export const FILM_FRAMING = {
 // Interim (2026-10-23): the v4 cargo camera pulls back and ends on two small trailers in a dark void.
 // Push in on the 20 ft while the camera retreats, then frame both trailers between the size cards.
 'assets/marvel-v4/recorded/cargo': {
  desktop: {
   position: [.5, .62], maxZoom: 1.6, window: [.33, .36, .67, .78],
   keys: [
    {t: 0, zoom: 1},
    {t: 4, zoom: 1.25, focus: [765, 580]},
    {t: 9.5, zoom: 1.25, focus: [765, 580]},
    {t: 14.5, zoom: 1.25, focus: [880, 650], at: 'window'},
    {t: 18, fit: [595, 437, 1025, 775]}
   ]
  },
  mobile: {
   position: [.5, .62], maxZoom: 1.45, window: [.03, .56, .97, .8],
   keys: [
    {t: 0, zoom: 1},
    {t: 4, zoom: 1.2, focus: [251, 654]},
    {t: 9.5, zoom: 1.2, focus: [251, 654]},
    {t: 14.5, zoom: 1.2, focus: [300, 690], at: 'window'},
    {t: 18, fit: [150, 545, 400, 780]}
   ]
  }
 }
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ease = t => t * t * (3 - 2 * t);

export function filmFraming(base, kind, metadata) {
 const f = metadata?.framing || FILM_FRAMING[base]?.[kind] || {};
 return {position: f.position || [.5, .5], maxZoom: f.maxZoom ?? 1.6, window: f.window || [.25, .25, .75, .75], keys: Array.isArray(f.keys) ? f.keys : []};
}

// w,h: host box in CSS px. W,H: film timeline size. time: source-film seconds.
// frameWindow: {x0,y0,x1,y1} in host px, or null for the fallback fractions.
// Returns {scale, dx, dy, cover, zoom}: a film point (x,y) is drawn at (x*scale+dx, y*scale+dy).
export function placeFilm(w, h, W, H, framing, time = 0, frameWindow = null) {
 const cover = Math.max(w / W, h / H), [px, py] = framing.position;
 const baseX = (w - W * cover) * px, baseY = (h - H * cover) * py;
 const win = frameWindow || {x0: framing.window[0] * w, y0: framing.window[1] * h, x1: framing.window[2] * w, y1: framing.window[3] * h};
 function resolve(k) {
  if (k.fit) {
   const [x0, y0, x1, y1] = k.fit;
   const zoom = clamp(Math.min((win.x1 - win.x0) / (x1 - x0), (win.y1 - win.y0) / (y1 - y0)) / cover, 1, framing.maxZoom);
   return {zoom, fx: (x0 + x1) / 2, fy: (y0 + y1) / 2, ax: (win.x0 + win.x1) / 2, ay: (win.y0 + win.y1) / 2};
  }
  const zoom = clamp(k.zoom ?? 1, 1, framing.maxZoom), fx = k.focus?.[0] ?? W * px, fy = k.focus?.[1] ?? H * py;
  const at = k.at === 'window' ? [(win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2] : Array.isArray(k.at) ? [k.at[0] * w, k.at[1] * h] : [fx * cover + baseX, fy * cover + baseY];
  return {zoom, fx, fy, ax: at[0], ay: at[1]};
 }
 const keys = framing.keys;
 let s = {zoom: 1, fx: W * px, fy: H * py, ax: W * px * cover + baseX, ay: H * py * cover + baseY};
 if (keys.length) {
  const next = keys.findIndex(k => k.t > time);
  if (next === 0) s = resolve(keys[0]);
  else if (next < 0) s = resolve(keys[keys.length - 1]);
  else {
   const a = resolve(keys[next - 1]), b = resolve(keys[next]), t = ease(clamp((time - keys[next - 1].t) / (keys[next].t - keys[next - 1].t), 0, 1));
   // Zoom eases geometrically so the push-in reads at a constant rate.
   s = {zoom: a.zoom * Math.pow(b.zoom / a.zoom, t)};
   for (const key of ['fx', 'fy', 'ax', 'ay']) s[key] = a[key] + (b[key] - a[key]) * t;
  }
 }
 const scale = cover * s.zoom;
 const dx = clamp(s.ax - s.fx * scale, w - W * scale, 0), dy = clamp(s.ay - s.fy * scale, h - H * scale, 0);
 return {scale, dx, dy, cover, zoom: s.zoom};
}
