// Run against a preview of the current site with BASE_URL and PLAYWRIGHT_MODULE.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:4248')+'/reserve.html?debug3d=1');
  await page.waitForFunction(()=>window.__rs3d&&document.querySelector('.rv').dataset.viewer==='interactive');
  for(const [kind,width,height]of [['desktop',1600,1000],['compact',1024,900],['mobile',600,500]]){
   const data=await page.evaluate(async({width,height})=>{
    const THREE=await import('/vendor/three/three.module.min.js');
    const {fitYardCamera}=await import('/reserve-yard.js');
    const {renderer,camera,scene,T,head}=__rs3d;
    renderer.setAnimationLoop(null);renderer.setPixelRatio(1);renderer.setSize(width,height,false);
    const bounds=new THREE.Box3();for(const t of Object.values(T))bounds.union(t.bounds.clone().translate(t.group.position));
    const plan=fitYardCamera(bounds,new THREE.Vector3(-.58,.22,1),{width,height,top:55,bottom:55});
    camera.clearViewOffset();camera.aspect=width/height;camera.updateProjectionMatrix();camera.position.copy(plan.position);camera.lookAt(plan.target);
    camera.setViewOffset(width,height,plan.shiftX*width,plan.shiftY*height,width,height);
    head.position.copy(plan.position).add(new THREE.Vector3(0,3,0));head.lookAt(plan.target);renderer.shadowMap.needsUpdate=true;
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL('image/webp',.9).split(',')[1];
   },{width,height});
   const file=path.resolve(__dirname,'../assets/trailer-realism-v2/yard-'+kind+'.webp');fs.writeFileSync(file,Buffer.from(data,'base64'));console.log(file);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
