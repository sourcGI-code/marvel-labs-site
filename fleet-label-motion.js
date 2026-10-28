// Keep projection transforms on the labels; animate their text independently.
export function createFleetLabelMotion(container, reduced) {
 let visible = false, animations = [], generation = 0, hideTimer = 0;
 function setVisible(next) {
  if (next === visible) return;
  visible = next;
  const token = ++generation;
  animations.forEach(animation => animation.cancel());
  animations = [];
  container.setAttribute('aria-hidden', String(!next));
  if (reduced.matches) { container.hidden = !next; return; }
  if (next) {
   container.hidden = false;
   [...container.querySelectorAll('.capacity-label')].forEach((label, index) => {
    [...label.children].forEach((text, line) => {
     text.style.display = 'block';
     animations.push(text.animate([
      {opacity:0, transform:'translateY(24px) scale(.94)'},
      {opacity:1, transform:'translateY(-3px) scale(1.015)', offset:.78},
      {opacity:1, transform:'translateY(0) scale(1)'}
     ], {duration:620, delay:index*140+line*65, easing:'cubic-bezier(.22,1,.36,1)', fill:'backwards'}));
    });
   });
  } else {
   const animation = container.animate([{opacity:1}, {opacity:0}], {duration:180, fill:'forwards'});
   animations.push(animation);
   animation.onfinish = () => {
    if (token !== generation) return;
    container.hidden = true;
    animation.cancel();
   };
  }
 }
 return {
  update({inFleet, frameReady}) {
   // Seeking/buffering cannot restart an already-visible fleet reveal. A one-frame dip in the split/visibility test
   // used to drop the cards and replay the pop ("they flash on randomly", owner 10-27): hide only after 300 ms off.
   if (inFleet && (visible || frameReady)) { if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; } setVisible(true); return; }
   if (!visible || hideTimer) return;
   hideTimer = setTimeout(() => { hideTimer = 0; setVisible(false); }, 300);
  }
 };
}
