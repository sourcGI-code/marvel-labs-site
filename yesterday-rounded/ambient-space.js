// Static gradients keep the atmosphere without adding grain to the product view.
export function createAmbientSpace(){
 const root=document.createElement('div');root.className='ambient-space ambient-static';root.setAttribute('aria-hidden','true');
 document.body.prepend(root);
 const api={setPaused(){},setPalette(){},inspect:()=>({rendering:'css',animated:false,draws:0})};
 window.__ambientSpace={state:api.inspect};return api;
}
