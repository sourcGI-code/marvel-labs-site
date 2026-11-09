"""Full-screen product viewer shared by the two public trailer model pages."""

def render(size, model, metadata):
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0e10">
{metadata}
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="trailer-showroom.css?v=fullscreen-20261109">
<link rel="preload" href="assets/lato-latin-regular.woff2" as="font" type="font/woff2" crossorigin>
<script type="importmap">{{"imports":{{"three":"./vendor/three/three.module.min.js","three/addons/":"./vendor/three/addons/"}}}}</script>
<script type="module" src="trailer-product-viewer.js?v=fullscreen-20261109"></script>
<script type="module" src="campaign-links.js?v=launch-20261108"></script>
</head><body class="showroom-page">
<a class="skip-link" href="#model-info">Skip to trailer details</a>
<header class="showroom-header">
 <a class="brand" href="./" aria-label="Marvel Labs home"><span>MARVEL LABS</span></a>
 <nav class="header-links" aria-label="Main navigation"><a href="economics.html">Plans &amp; earnings</a><a href="about.html">Company</a></nav>
 <a class="header-reserve" data-reserve href="reserve.html?size={size}">Reserve ↗</a>
 <button class="menu-button" type="button" aria-expanded="false" aria-controls="showroom-menu">Menu</button>
 <nav id="showroom-menu" aria-label="Mobile navigation" hidden><a href="./">Home</a><a href="economics.html">Plans &amp; earnings</a><a href="about.html">Company</a><a href="specifications.html">Operating requirements</a></nav>
</header>
<main class="showroom-main">
 <section class="trailer-showroom reserve-stage jetblack-stage" data-page="trailer" data-size="{size}" data-open="{size}" data-mode="viewer" data-viewer="loading" aria-labelledby="model-title">
  <div class="showroom-stage">
   <div class="rs-3d" role="img" aria-label="Interactive {size} ft Jet black trailer. Drag to rotate." aria-busy="true"></div>
   <figure class="showroom-poster"><img src="assets/trailer-realism-v2/jet-black-{size}.png" width="960" height="640" alt="{size} ft Marvel Labs trailer design in matte Jet black with grey graphics" fetchpriority="high"></figure>
   <p class="viewer-status" role="status">Loading interactive trailer…</p>
  </div>
  <div class="showroom-selector">
   <div class="rs-switch" role="group" aria-label="Trailer size"><button type="button" data-size="16" aria-pressed="{'true' if size == '16' else 'false'}">16 ft</button><button type="button" data-size="20" aria-pressed="{'true' if size == '20' else 'false'}">20 ft</button></div>
   <button type="button" class="rs-back" disabled>See both</button>
  </div>
  <div class="showroom-tools"><button type="button" class="rs-lock" disabled>Unlock view</button><button type="button" class="rs-ramp-btn" disabled>Open the ramp</button></div>
  <aside id="model-info" class="rv-rail showroom-info" tabindex="-1" aria-label="Trailer information">
   <p class="eyebrow">Jet black · Design preview</p>
   <h1 id="model-title"><span data-model-size>{size}</span> ft <span class="title-small">microfactory trailer.</span></h1>
   <div class="info-tabs" role="tablist" aria-label="Trailer details">
    <button id="tab-layout" type="button" role="tab" aria-selected="true" aria-controls="info-layout">Layout</button>
    <button id="tab-plans" type="button" role="tab" aria-selected="false" aria-controls="info-plans" tabindex="-1">Plans</button>
    <button id="tab-details" type="button" role="tab" aria-selected="false" aria-controls="info-details" tabindex="-1">Details</button>
   </div>
   <div class="info-content">
    <div id="info-layout" role="tabpanel" aria-labelledby="tab-layout"><dl class="model-specs"><div><dt>Width</dt><dd data-model-width>{model['width']}</dd></div><div><dt>Factory</dt><dd>6 ft 2½ in</dd></div><div><dt>Rear bay</dt><dd data-model-cargo>{model['cargo']}</dd></div></dl><p class="fine">Nominal layout. Usable clearances and GVWR pending.</p></div>
    <div id="info-plans" role="tabpanel" aria-labelledby="tab-plans" hidden><div class="plan-line"><span>Buy <strong data-model-price>{model['price']}</strong><small>Preview price · 75% operator profit share</small></span><span>Lease <strong>$0 <small>monthly lease fee</small></strong><small>25% operator profit share</small></span></div><p class="fine">Shares apply to profit from products sold. Operating costs and final terms are separate. <a href="economics.html">Plan details ↗</a></p></div>
    <div id="info-details" role="tabpanel" aria-labelledby="tab-details" hidden><p class="detail-copy">Same front factory concept in both sizes. The 20 ft adds room for equipment.</p><p class="fine">Target delivery: Spring 2027, not guaranteed.<br><a href="specifications.html">Specifications</a> · <a href="validation.html">Development status</a> · <a data-colours href="trailer-colours.html?colour=black&amp;size={size}">Colours</a></p></div>
   </div>
   <a class="showroom-reserve" data-reserve href="reserve.html?size={size}"><span>Reserve <span data-model-size>{size}</span> ft</span><span>$100 deposit ↗</span></a>
   <p class="deposit-note">Fully refundable. Final purchase or lease terms are separate.</p>
  </aside>
 </section>
</main>
<noscript><style>.viewer-status{{display:none}}.info-tabs{{display:none}}</style></noscript>
</body></html>'''
