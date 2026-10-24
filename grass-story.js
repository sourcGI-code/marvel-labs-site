// The material study is a baked still; CSS supplies its small scroll movement.
export async function createGrassStory(canvas){
 if(false /* live authoring is local-only */)return (await import('./grass-story-live.js')).createGrassStory(canvas);
 const image=new Image();image.src='assets/recorded/materials/desktop.webp?v=1';image.alt=canvas.getAttribute('aria-label')||'Grass-fiber panel samples';image.className='grass-product-still';
 canvas.style.display='none';canvas.after(image);
 try{await image.decode();canvas.parentElement.classList.add('product-ready');}catch{}
 let paused=false;
 return {setActive(){},setProgress(p){image.style.transform=paused?'none':`translateY(${Math.sin(p*Math.PI)*-10}px) rotate(${(p-.5)*8}deg)`;},setPaused(value){paused=value;if(value)image.style.transform='none';},setPalette(){}};
}
