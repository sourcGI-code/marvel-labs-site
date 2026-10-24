// Share downloads across the arrival and working-day scenes. Decode compressed
// buffers in the browser stream instead of downloading the same geometry twice.
const assets=new Map();
export function packedBuffer(url){
 if(!assets.has(url))assets.set(url,(async()=>{
  const compressed=typeof DecompressionStream==='function';
  const response=await fetch(compressed?url+'.gz':url);
  if(!response.ok)throw Error('Model geometry could not load');
  return compressed?new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():response.arrayBuffer();
 })().catch(error=>{assets.delete(url);throw error;}));
 return assets.get(url);
}
