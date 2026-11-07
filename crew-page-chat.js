// Available only on the Marvel Crew section, separate from the phone and its app.
const section = document.querySelector('#app[data-phone-mode="interactive"]');
if (section) {
  const widget = document.createElement('aside');
  widget.className = 'crew-page-chat';
  widget.setAttribute('aria-label', 'Marvel website assistant');
  widget.hidden = true;

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'crew-chat-launch';
  launch.textContent = '✦ Ask Marvel';
  launch.setAttribute('aria-expanded', 'false');
  launch.setAttribute('aria-controls', 'crew-website-chat');

  const panel = document.createElement('div');
  panel.id = 'crew-website-chat';
  panel.className = 'crew-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ask Marvel — guided website chat');
  panel.hidden = true;
  const frame = document.createElement('iframe');
  frame.title = 'Ask Marvel — guided website chat';
  frame.src = 'about:blank';
  const url = new URL('crew-chat.html?v=page-chat-v2', document.baseURI);
  panel.append(frame);
  widget.append(launch, panel);
  document.body.append(widget);

  function open() {
    panel.hidden = false;
    launch.hidden = true;
    launch.setAttribute('aria-expanded', 'true');
    if (frame.src === 'about:blank') frame.src = url.href;
    frame.focus({preventScroll: true});
  }
  function close({restoreFocus = true} = {}) {
    panel.hidden = true;
    launch.hidden = false;
    launch.setAttribute('aria-expanded', 'false');
    if (restoreFocus && !widget.hidden) launch.focus({preventScroll: true});
  }
  launch.addEventListener('click', open);
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== url.origin) return;
    if (event.data?.type === 'marvel-chat:close') close();
  });
  // Scene changes hide the widget; the conversation stays in this page's memory.
  let visible = false;
  function syncVisibility() {
    const active = document.body.dataset.activeScene;
    const show = active ? active === 'app' : visible;
    if (!show) close({restoreFocus:false});
    widget.hidden = !show;
  }
  new MutationObserver(syncVisibility).observe(document.body, {attributes:true, attributeFilter:['data-active-scene']});
  new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    syncVisibility();
  }, {threshold:.25}).observe(section);
  syncVisibility();
}
