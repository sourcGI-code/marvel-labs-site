import * as THREE from './assets/three.module.js';
import {fabricatedBox,fastener,slottedChannel,hollowBeam} from './fabricated-parts.js?v=1';
const mix=THREE.MathUtils.lerp;
const ramp=(p,a,b)=>{const t=THREE.MathUtils.clamp((p-a)/(b-a),0,1);return t*t*(3-2*t);};

// Partition-mounted receiving, lift and storage. All dimensions are metres.
// The sink's measured outer footprint is exactly 20 × 20 inches.
export function createAutonomousStorage(model,props){
 const floor=.8275,wall=model.meta.partitionX+.06,deck=floor+.73;
 const root=new THREE.Group();root.name='Partition-mounted autonomous storage';model.root.add(root);
 const metal=new THREE.MeshStandardMaterial({name:'Storage / brushed galvanized steel',color:0xa7b0b0,metalness:.85,roughness:.38});
 const dark=new THREE.MeshStandardMaterial({name:'Storage / graphite powder coat',color:0x30383b,metalness:.08,roughness:.57});
 const accent=new THREE.MeshStandardMaterial({name:'Storage / identification accent',color:0x3b777b,metalness:.02,roughness:.56});
 const lining=new THREE.MeshStandardMaterial({name:'Storage / coated partition',color:0xb4b9b5,roughness:.57,metalness:0});
 const tapeMaterial=new THREE.MeshPhysicalMaterial({name:'Pack / kraft sealing tape',color:0xb59b73,roughness:.42,clearcoat:.12});
 function box(parent,size,at,material=metal){
  return fabricatedBox(parent,size,at,material);
 }
 // A baffled product opening keeps the machinery behind the opaque partition.
 const bottom=deck+.055,top=deck+.75,left=-.34,right=.34;
 model.parts.partition.clear();
 box(model.parts.partition,[.06,bottom-floor,2.325],[wall-.03,(floor+bottom)/2,0],lining);
 box(model.parts.partition,[.06,2.485-top,2.325],[wall-.03,(top+2.485)/2,0],lining);
 for(const sign of [-1,1])box(model.parts.partition,[.06,top-bottom,1.1625-.34],[wall-.03,(top+bottom)/2,sign*(1.1625+.34)/2],lining);
 const port=new THREE.Group();port.name='Baffled pack outlet';model.root.add(port);
 box(port,[.025,.73,.72],[wall-.75,(top+bottom)/2,0],dark);
 for(const z of [left,right])box(port,[.78,.73,.025],[wall-.37,(top+bottom)/2,z],dark);
 for(const y of [bottom,top])box(port,[.78,.025,.71],[wall-.37,y,0],dark);
 const gateHinge=new THREE.Group();gateHinge.name='Rigid inward-opening outlet flap';gateHinge.position.set(wall+.008,top,0);port.add(gateHinge);
 box(gateHinge,[.02,top-bottom,.675],[0,-(top-bottom)/2,0],lining);
 for(const z of [-.36,.36])box(port,[.04,.75,.035],[wall+.04,(top+bottom)/2,z]);
 box(port,[.04,.025,.76],[wall+.04,top+.025,0],accent);
 const shelfLevels=[floor+.16,floor+.62,floor+1.08];
 const rubber=new THREE.MeshStandardMaterial({name:'Storage / EPDM buffers',color:0x181c1d,roughness:.88});
 // Each bay is a bolted folded-steel frame; the slot webs have real openings.
 for(const centre of [-.745,.745]){
  for(const x of [wall+.12,wall+.82])for(const dz of [-.34,.34]){
   const z=centre+dz;
   slottedChannel(root,[x,floor+.745,z],1.47,dark);
   box(root,[.035,.006,.047],[x,floor+1.483,z],rubber).name='Moulded upright end cap';
   box(root,[.085,.004,.085],[x,floor+.008,z],metal).name='Bolted rack foot';
   for(const dx of [-.027,.027])for(const dz2 of [-.027,.027])fastener(root,[x+dx,floor+.012,z+dz2],metal,{axis:'y',radius:.005});
  }
  for(const y of shelfLevels){
   // 2.5 mm bent runners, with an open centre for the moving forks.
   for(const dz of [-.28,.28]){
    box(root,[.69,.0025,.055],[wall+.47,y+.010,centre+dz],metal).name='Folded shelf runner';
    box(root,[.69,.032,.0025],[wall+.47,y-.005,centre+dz+Math.sign(dz)*.026],metal);
    box(root,[.024,.005,.047],[wall+.79,y+.014,centre+dz],rubber).name='Pack landing buffer';
   }
   for(const x of [wall+.12,wall+.82]){
    box(root,[.0025,.045,.72],[x,y-.10,centre],metal).name='Bolted transverse tie';
    for(const dz of [-.34,.34]){
     box(root,[.037,.145,.003],[x+.022,y-.05,centre+dz],metal).name='Shelf connector plate';
     box(root,[.042,.003,.095],[x+.018,y+.007,centre+Math.sign(dz)*.303],metal).name='Folded runner support bracket';
     fastener(root,[x+.020,y-.015,centre+dz],metal,{radius:.005});
    }
   }
   box(root,[.004,.022,.10],[wall+.844,y-.098,centre],accent).name='Shelf location tag';
  }
  // Rear braces stay behind the carton insertion envelope.
  const brace=box(root,[.003,Math.hypot(1.20,.68),.018],[wall+.1025,floor+.75,centre],metal);
  brace.rotation.x=Math.atan2(.68,1.20);brace.name='Rack diagonal brace';
  for(const sign of [-1,1])fastener(root,[wall+.101,floor+.75+sign*.60,centre+sign*.34],metal,{radius:.005});
 }
 for(const z of [-1.10,1.10]){
  hollowBeam(root,[.060,1.56,.050],[wall+1.04,floor+.78,z],dark,'Lift mast section');
  box(root,[.014,1.43,.018],[wall+1.078,floor+.79,z],metal).name='Machined linear guide';
  box(root,[.13,.006,.14],[wall+1.04,floor+.014,z],metal).name='Lift mast anchor plate';
  for(const dx of [-.043,.043])for(const dz of [-.047,.047])fastener(root,[wall+1.04+dx,floor+.021,z+dz],metal,{axis:'y',radius:.006});
  // A covered timing belt sits beside the guide, with real end pulleys.
  const beltZ=z-Math.sign(z)*.039;
  box(root,[.024,1.43,.006],[wall+1.079,floor+.79,beltZ],dark).name='Timing belt guard';
  box(root,[.014,1.36,.003],[wall+1.094,floor+.79,beltZ],rubber).name='Reinforced lift timing belt';
  for(const y of [floor+.10,floor+1.48]){
   const pulley=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,.018,32),metal);
   pulley.rotation.x=Math.PI/2;pulley.position.set(wall+1.083,y,beltZ);root.add(pulley);pulley.name='Lift belt pulley';
   fastener(root,[wall+1.083,y,beltZ-Math.sign(z)*.011],dark,{axis:'z',radius:.005});
  }
 }
 const lift=new THREE.Group();root.add(lift);
 hollowBeam(lift,[.060,.065,2.20],[wall+1.04,0,0],metal,'Lift crossmember');
 for(const z of [-1.10,1.10]){
  box(lift,[.075,.125,.075],[wall+1.06,0,z],dark).name='Linear bearing block';
  for(const y of [-.041,.041])for(const dz of [-.022,.022])fastener(lift,[wall+1.102,y,z+dz],metal,{radius:.004});
 }
 // Small geared drive and exposed shaft flange give the lift a physical drive.
 const drive=box(root,[.105,.115,.105],[wall+1.08,floor+1.50,1.01],dark);drive.name='Lift drive housing';
 for(let y=-.04;y<=.04;y+=.016)box(drive,[.008,.003,.11],[.056,y,0],metal).name='Drive cooling fin';
 const coupling=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.065,20),metal);
 coupling.rotation.x=Math.PI/2;coupling.position.set(wall+1.083,floor+1.48,1.045);root.add(coupling);coupling.name='Lift motor to pulley coupling';
 const traverseShaft=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,2.08,24),metal);
 traverseShaft.rotation.x=Math.PI/2;traverseShaft.position.set(wall+1.084,-.052,0);lift.add(traverseShaft);traverseShaft.name='Traverse drive shaft';
 box(lift,[.07,.07,.085],[wall+1.084,-.052,1.055],dark).name='Traverse geared motor';
 // One clipped electrical route follows the wall, outside the pack envelope.
 const cablePath=new THREE.CatmullRomCurve3([
  [wall+1.08,floor+1.55,1.01],[wall+1.08,2.43,1.04],
  [wall+1.04,2.455,1.12],[wall+.12,2.455,1.12],[wall+.07,2.42,1.12]
 ].map(p=>new THREE.Vector3(...p)),false,'centripetal');
 const cable=new THREE.Mesh(new THREE.TubeGeometry(cablePath,48,.0055,8,false),rubber);
 cable.name='Clipped lift power conduit';root.add(cable);
 for(let x=wall+.20;x<wall+1.04;x+=.28){
  box(root,[.018,.014,.025],[x,2.455,1.12],dark).name='Conduit saddle clip';
  fastener(root,[x,2.455,1.135],metal,{axis:'z',radius:.003});
 }
 const carriage=new THREE.Group();lift.add(carriage);
 box(carriage,[.006,.145,.34],[wall+1.09,0,0],dark).name='Traverse bearing plate';
 for(const y of [-.046,.046])for(const z of [-.125,.125])fastener(carriage,[wall+1.098,y,z],metal,{radius:.005});
 for(const z of [-.19,.19])box(carriage,[.075,.095,.045],[wall+1.05,0,z],dark).name='Traverse bearing';
 box(carriage,[.008,.035,.072],[wall+1.105,.014,.015],accent).name='Drive identification plate';
 for(const z of [-.28,.28])hollowBeam(carriage,[.82,.028,.026],[wall+1.42,-.005,z],metal,'Telescopic traverse slide');
 const slider=new THREE.Group();carriage.add(slider);
 const tray=new THREE.Group();tray.position.set(wall+1.02,0,0);slider.add(tray);
 for(const z of [-.22,.22]){
  hollowBeam(tray,[.77,.032,.049],[-.335,.012,z],metal,'Telescoping receiving fork');
  box(tray,[.27,.005,.041],[-.55,.031,z],dark).name='Replaceable fork wear strip';
  box(tray,[.015,.024,.041],[-.708,.010,z],rubber).name='Rounded fork end cap';
 }
 box(tray,[.055,.035,.55],[.075,.012,0],dark).name='Fork heel bridge outside shelf envelope';
 const pusher=box(port,[.028,.24,.55],[wall-.68,deck+.24,0],dark);
 const sink=props.sink,carton=props.carton;
 sink.removeFromParent();sink.rotation.set(0,0,0);sink.scale.setScalar(1);sink.position.set(0,0,0);sink.updateMatrixWorld(true);
 const size=new THREE.Box3().setFromObject(sink).getSize(new THREE.Vector3());
 const sinkScale=new THREE.Vector3(.508/size.x,1,.508/size.z);
 root.add(carton,sink);carton.name='20-inch sink protective pack';
 const tape=box(carton,[.98,.0008,.075],[0,.422,0],tapeMaterial);tape.name='Kraft tape across closing seam';
 // Measure the real closed envelope, including labels and tape, rather than
 // assuming the source wall centre lines are the outer dimensions.
 props.flaps.forEach(flap=>flap.rotation[flap.userData.axis]=0);
 carton.updateMatrixWorld(true);
 const cartonSize=new THREE.Box3().setFromObject(carton).getSize(new THREE.Vector3());
 const cartonScale=new THREE.Vector3(.60/cartonSize.x,.27/cartonSize.y,.60/cartonSize.z);
 const stored=[];
 for(const [z,level] of [[-.745,0],[.745,0],[.745,1]]){
  const pack=carton.clone(true);pack.name='Stored sink pack';pack.scale.copy(cartonScale);pack.rotation.set(0,0,0);
  pack.traverse(o=>{if(o.userData.axis)o.rotation[o.userData.axis]=0;});
  pack.position.set(wall+.47,shelfLevels[level]+.0125,z);root.add(pack);stored.push(pack);
 }
 let state={};
 function draw(progress,{visible=true}={}){
  const p=THREE.MathUtils.clamp(progress,0,1);root.visible=visible;
  const unfold=ramp(p,0,.18),emerge=ramp(p,.25,.40),land=ramp(p,.40,.47),seal=ramp(p,.48,.58);
  const raise=ramp(p,.61,.70),traverse=ramp(p,.72,.82),insert=ramp(p,.84,.91),release=ramp(p,.915,.94),withdraw=ramp(p,.945,.985);
  const gate=ramp(p,.19,.25)*(1-ramp(p,.45,.50));gateHinge.rotation.z=-Math.PI/2*gate;
  const liftY=mix(deck,shelfLevels[2]+.085,raise)-release*.13;
  lift.position.y=liftY;carriage.position.z=-.745*traverse;
  // Retract the supported pack beyond the rack uprights before traversing.
  const transferClearance=.72*ramp(p,.685,.72)*(1-ramp(p,.82,.84));
  slider.position.x=-.18*insert+.72*withdraw+transferClearance;
  tray.rotation.z=Math.PI/2*(1-unfold);
  const landedX=wall+.65,packX=(p<.61?mix(wall-.37,landedX,emerge):mix(landedX,wall+.47,insert))+transferClearance;
  const packY=mix(mix(deck+.035+.12*(1-land),shelfLevels[2]+.12,raise),shelfLevels[2]+.0125,release);
  carton.position.set(packX,packY,-.745*traverse);carton.rotation.set(0,0,0);carton.scale.copy(cartonScale);
  carton.visible=sink.visible=visible&&p>=.25;
  // Upright flaps clear the receiving bay; folding them out flat intersects
  // the inner rack posts. The short pair closes before the long pair.
  props.flaps.forEach((flap,i)=>flap.rotation[flap.userData.axis]=Math.sign(flap.userData.openAngle)*mix(1.5,1.62,ramp(p,.40,.47))*(1-ramp(seal,i<2?.4:0,i<2?1:.5)));
  tape.visible=seal>=1;
  sink.scale.copy(sinkScale);sink.rotation.set(0,0,0);sink.position.copy(carton.position).add(new THREE.Vector3(0,.024,0));
  pusher.position.x=mix(mix(wall-.68,wall+.33,emerge),wall-.68,ramp(p,.42,.50));
  props.conveyor.visible=false;props.rack.visible=false;
  stored.forEach(pack=>pack.visible=visible);
  state={visible,progress:p,unfold,portOpen:gate,productOut:emerge,landed:land===1,sealed:seal===1,lift:raise,traverse,insert,onRack:release===1,ready:withdraw===1,
   sinkInches:[20,20],sinkMetres:[size.x*sinkScale.x,size.z*sinkScale.z],cartonMetres:[.60,.27,.60],cartonPosition:carton.position.toArray(),receiverY:liftY,transferClearance,conveyorVisible:false,
   partitionX:wall,storageDepth:1.10,storedPacks:stored.length+(release===1?1:0),stage:p<.19?'unfold':p<.48?'receive':p<.61?'protect':p<.84?'lift':p<.945?'place':'ready'};
  return state;
 }
 draw(0,{visible:false});
 return {draw,root,portPoint:[wall+.08,deck+.26,0],floor,deck,setPalette(color){accent.color.set(color);},inspect:()=>state};
}
