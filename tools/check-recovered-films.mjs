import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),base='assets/scene-recovery-v2/';
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const manifest=await read('film-sources-hqworld4.json'),audit=await read(base+'release-audit.json');
const preserved='3891326ea6294683f06e13d4f3a053285dae9e8ddc0e1f50e36cd56f7abf598a';
assert.equal(audit.sourceScene.file,'workday-package-v2.blend');
assert.equal(audit.originalAnimationSHA256,preserved);
assert.equal(audit.finalOriginalAnimationSHA256,preserved,'The corrected package, yard and mower animation must survive exterior replacement.');
assert.equal(audit.preservedCorrections.approvedPackageRevision,'owner-package-v2');
assert.equal(audit.workdayMotion.revision,'rife-4.6-native-frames-preserved');
assert.equal(audit.workdayMotion.nativeFrames,1544);assert.equal(audit.workdayMotion.nativeFramesPreserved,true);
assert.equal(audit.workdayMotion.outputFrames,3088);
for(const key of ['collection_visibility_repaired','releasePackageFix','releasePhoneFix','grassContactRevision','neighborhood_route'])assert(audit.preservedCorrections[key],`Missing recovered correction: ${key}`);
const entries=[['opening',manifest.opening,'mobile'],['opening',manifest.opening.desktop,'desktop'],['cargo',manifest.cargo,'mobile'],['cargo',manifest.cargo.desktop,'desktop'],['field',manifest.field,'desktop'],['field',manifest.fieldMobile,'mobile']];
for(const [scene,source,kind] of entries){
 assert.equal(source.base,base+scene);assert.equal(source.revision,audit.revision);assert.equal(source.modelRevision,'realism-v2');
 const info=audit.media[`${scene}/${kind}.mp4`];
 assert.equal(source.nativeVideo.width,info.width);assert.equal(source.nativeVideo.height,info.height);
 if(scene==='field'){
  const timeline=await read(`${base}${scene}/${kind}.json`);
  assert.equal(timeline.frames,3088);assert.equal(timeline.packageRevision,'owner-package-v2');assert.equal(timeline.animationSHA256,preserved);
  assert.equal(timeline.interpolationRevision,'rife-4.6-native-frames-preserved');
  assert.equal(timeline.howItWorks.fieldLeadFrames,1416);
 }else if(scene==='cargo'){
  const timeline=await read(`${base}${scene}/${kind}.json`);
  assert.equal(timeline.layoutRevision,'20ft-up-left-with-16ft-anchor-preserved');assert.equal(timeline.playbackFrames,541);
  for(const sample of timeline.samples){
   assert.equal(sample.factoryFeet,6+2.5/12);
   assert(Math.abs(sample.factoryFeet+sample.cargoFeet[0]-20)<1e-9);
   assert(Math.abs(sample.factoryFeet+sample.cargoFeet[1]-16)<1e-9);
  }
 }
}
assert.equal(Object.keys(audit.media).length,13);
for(const [name,info] of Object.entries(audit.media)){
 const url=new URL(base+name,root),hash=createHash('sha256');
 for await(const chunk of createReadStream(url))hash.update(chunk);
 assert.equal(hash.digest('hex'),info.sha256,`Unreviewed film replacement: ${name}`);
 assert((await stat(url)).size<95_000_000);
 const actual=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,r_frame_rate','-of','json',fileURLToPath(url)],{encoding:'utf8'})).streams[0];
 for(const key of ['width','height','nb_frames','r_frame_rate'])assert.equal(actual[key],info[key],`${name}: ${key}`);
 if(name.startsWith('field/'))assert.equal(Number(actual.nb_frames),3088);
 if(name==='cargo/desktop.mp4')assert(actual.width>=3840,'The comparison must not return to the half-resolution draft.');
}
const html=await readFile(new URL('index.html',root),'utf8');
assert(!html.includes('data-film-presentation="full-page"'),'Homepage intro must retain its copy-aware glide.');
// The trailer has settled at this pose. Check every ending frame so the rear
// stripe cannot turn black again immediately before the 16 ft chapter.
const stripe=execFileSync('ffmpeg',['-v','error','-i',fileURLToPath(new URL(base+'opening/desktop.mp4',root)),'-vf','select=gte(n\\,560),format=gray,crop=3:3:1727:842','-vsync','0','-f','rawvideo','-']);
assert.equal(stripe.length,40*9,'All forty ending frames must be decoded.');
for(let frame=0;frame<40;frame++){
 const mean=stripe.subarray(frame*9,frame*9+9).reduce((sum,value)=>sum+value,0)/9;
 assert(mean>180,`Rear decal disappeared at ending frame ${frame}: ${mean}`);
}
console.log('Recovered films verified: 13 files, matching timelines, native resolution and preserved original animation.');
