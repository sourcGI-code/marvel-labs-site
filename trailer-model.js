import * as THREE from './assets/three.module.js';
import {roundedBox} from './studio.js?v=float-20261016';

export const trailerDimensions = { bodyLength:6, bodyWidth:2.4, interiorHeight:2.3, deckHeight:.8, overallLength:7.8 };
export {componentInfo} from './component-info.js?v=float-20261016';

function material(color,metalness=.15,roughness=.55){return new THREE.MeshStandardMaterial({color,metalness,roughness});}
export function createTrailerModel(){
  const root=new THREE.Group();root.name='Marvel_Labs_Generic_Trailer_Study';
  root.userData={units:'metres',status:'Illustrative concept geometry; not a production specification'};
  const palette={shell:material(0xf2f3f2,.45,.32),dark:material(0x192127,.65,.4),metal:material(0xb5bfc4,.75,.3),rubber:material(0x171c20,.05,.88),green:material(0x4dd8e8,.3,.48),light:material(0xe8edef,.25,.5),glass:material(0x243e48,.45,.3),amber:material(0xd1ad54,.35,.4)};
  const parts={},shellGroups=[],moving=[];
  const addGroup=(name,parent=root)=>{const g=new THREE.Group();g.name=name;parent.add(g);return g;};
  function box(parent,name,dimensions,position,mat=palette.metal){const mesh=new THREE.Mesh(roundedBox(...dimensions),mat.clone());mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(parent,name,r1,r2,h,position,mat=palette.metal,segments=64){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat.clone());mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function beam(parent,name,start,end,width,height,mat=palette.dark){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);const mesh=box(parent,name,[width,height,a.distanceTo(b)],a.clone().add(b).multiplyScalar(.5).toArray(),mat);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.sub(a).normalize());return mesh;}
  const frame=addGroup('chassis');parts.chassis=frame;
  for(const z of [-1.06,1.06])box(frame,'Longitudinal_rail',[6,.2,.14],[0,.59,z],palette.dark);
  for(let x=-2.8;x<=2.8;x+=.7)box(frame,'Cross_member',[.08,.14,2.2],[x,.59,0],palette.dark);
  box(frame,'Deck',[6,.15,2.4],[0,.76,0],palette.dark);
  box(frame,'Floor_surface',[5.94,.025,2.34],[0,.851,0],palette.light);
  beam(frame,'Drawbar_left',[-3,.58,-.97],[-4.5,.58,0],.14,.15);
  beam(frame,'Drawbar_right',[-3,.58,.97],[-4.5,.58,0],.14,.15);
  const coupler=cylinder(frame,'Hitch_coupler',.13,.13,.38,[-4.55,.6,0]);coupler.rotation.z=Math.PI/2;
  box(frame,'Coupler_latch',[.23,.06,.07],[-4.55,.74,0]);
  cylinder(frame,'Support_jack',.045,.045,.52,[-3.9,.37,.12]);box(frame,'Jack_foot',[.25,.035,.25],[-3.9,.12,.12]);
  for(const x of [.3,1.45]){
    const axle=cylinder(frame,'Axle',.075,.075,2.5,[x,.44,0],palette.dark);axle.rotation.x=Math.PI/2;
    for(const side of [-1,1]){
      const wheel=addGroup(`Wheel_${x}_${side}`,frame);wheel.position.set(x,.46,side*1.28);
      const tire=new THREE.Mesh(new THREE.TorusGeometry(.32,.135,20,64),palette.rubber.clone());tire.name='Tire';wheel.add(tire);
      const rim=cylinder(wheel,'Wheel_rim',.24,.24,.14,[0,0,0],palette.metal);rim.rotation.x=Math.PI/2;
      const hub=cylinder(wheel,'Hub',.085,.085,.21,[0,0,side*.03],palette.dark);hub.rotation.x=Math.PI/2;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;const bolt=cylinder(wheel,'Lug',.018,.018,.03,[Math.sin(a)*.14,Math.cos(a)*.14,side*.09],palette.light,8);bolt.rotation.x=Math.PI/2;}
      for(let i=0;i<24;i++){const a=i*Math.PI/12;const tread=box(wheel,'Tread',[.07,.025,.22],[Math.sin(a)*.445,Math.cos(a)*.445,0],palette.rubber);tread.rotation.z=-a;}
    }
  }
  for(const side of [-1,1]){box(frame,'Fender_top',[2.1,.075,.38],[.87,.98,side*1.29],palette.shell);box(frame,'Fender_front',[.07,.35,.38],[-.16,.83,side*1.29],palette.shell);box(frame,'Fender_rear',[.07,.35,.38],[1.9,.83,side*1.29],palette.shell);}
  const roof=addGroup('Roof');box(roof,'Roof_panel',[6.08,.1,2.48],[0,3.2,0],palette.shell);box(roof,'Roof_lip',[6.1,.07,2.5],[0,3.25,0],palette.dark);shellGroups.push(roof);moving.push({group:roof,delta:[0,1.45,0]});
  const rear=addGroup('Far_wall');box(rear,'Far_wall_panel',[6,2.3,.075],[0,2.025,-1.2],palette.shell);for(let x=-2.95;x<3;x+=.6)box(rear,'Vertical_frame',[.035,2.28,.055],[x,2.02,-1.14],palette.metal);shellGroups.push(rear);moving.push({group:rear,delta:[0,.2,-1.35]});
  const near=addGroup('Near_wall');box(near,'Near_wall_panel',[6,2.3,.075],[0,2.025,1.2],palette.shell);box(near,'Signature_band',[5.65,.06,.02],[0,1.43,1.245],palette.green);for(let x=-2.8;x<3;x+=1.4)box(near,'Panel_seam',[.018,2.15,.012],[x,2.02,1.245],palette.dark);shellGroups.push(near);moving.push({group:near,delta:[0,.2,1.65]});
  const nose=addGroup('Front_wall');box(nose,'Front_panel',[.075,2.3,2.4],[-3,2.025,0],palette.shell);shellGroups.push(nose);moving.push({group:nose,delta:[-.8,.2,0]});
  const tail=addGroup('Rear_doors');for(const z of [-.6,.6]){box(tail,'Rear_door',[.08,2.3,1.17],[3,2.025,z],palette.shell);const bar=cylinder(tail,'Door_lock',.018,.018,1.8,[3.065,2.05,z],palette.metal,10);box(tail,'Door_handle',[.08,.06,.16],[3.09,1.9,z]);}shellGroups.push(tail);moving.push({group:tail,delta:[.9,.1,0]});
  for(const side of [-1,1]){box(frame,'Tail_lamp',[.04,.22,.12],[3.06,.73,side*1.06],material(0xa83928));for(let x=-2.7;x<3;x+=.5)box(frame,'Reflector',[.2,.045,.02],[x,.71,side*1.214],(Math.round(x*2)%2===0)?palette.light:material(0xb04f42));}
  const xs={intake:-2.15,formulation:-.72,forming:.79,quality:2.2};
  Object.entries(xs).forEach(([id,x],i)=>{const g=addGroup(id);g.position.x=x;g.userData.part=id;parts[id]=g;box(g,'Module_base',[1.28,.12,1.9],[0,.94,0],palette.green);for(const z of [-.85,.85])for(const lx of [-.53,.53])box(g,'Module_leg',[.07,.18,.07],[lx,.9,z]);moving.push({group:g,delta:[(i-1.5)*.18,.3+i*.03,.15]});});
  const intake=parts.intake;box(intake,'Preparation_unit',[.92,.75,1.05],[0,1.39,-.25],palette.light);
  const hopper=new THREE.Mesh(new THREE.LatheGeometry([[.19,0],[.53,.6],[.54,.62],[.51,.62],[.17,0]].map(p=>new THREE.Vector2(...p)),64),palette.metal.clone());hopper.name='Receiving_hopper';hopper.position.set(0,1.76,-.25);intake.add(hopper);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(.525,.018,12,64),palette.metal.clone());lip.rotation.x=Math.PI/2;lip.position.set(0,2.38,-.25);intake.add(lip);box(intake,'Intake_control',[.22,.24,.08],[.34,1.65,.33],palette.glass);
  const formulation=parts.formulation;cylinder(formulation,'Mixing_vessel',.43,.43,.85,[0,1.53,-.25],palette.metal);cylinder(formulation,'Vessel_lid',.46,.46,.06,[0,1.99,-.25],palette.dark);cylinder(formulation,'Mixer_motor',.16,.16,.3,[0,2.17,-.25],palette.green);box(formulation,'Dosing_cabinet',[.4,.75,.35],[.35,1.5,.53],palette.light);box(formulation,'Dosing_display',[.24,.16,.025],[.35,1.73,.72],palette.glass);
  const forming=parts.forming;box(forming,'Forming_cell',[1.1,1.7,1.5],[0,1.85,-.12],palette.light);box(forming,'Cell_window',[.84,1.05,.025],[0,2.04,.645],palette.glass);box(forming,'Forming_panel',[.86,.09,.03],[0,1.34,.65],palette.green);box(forming,'Control_screen',[.25,.22,.035],[.32,2.55,.66],palette.dark);box(forming,'Cell_louver',[.1,1.32,.03],[-.48,1.83,.66],palette.dark);
  const quality=parts.quality;box(quality,'Conveyor_base',[1.05,.34,1.3],[0,1.18,0],palette.dark);for(let x=-.44;x<=.45;x+=.11){const roller=cylinder(quality,'Conveyor_roller',.045,.045,1.18,[x,1.4,0],palette.metal,12);roller.rotation.x=Math.PI/2;}
  for(const z of [-.68,.68])box(quality,'Vision_post',[.06,1.1,.06],[-.33,1.88,z],palette.green);box(quality,'Vision_arch',[.1,.07,1.45],[-.33,2.42,0],palette.green);box(quality,'Inspection_camera',[.17,.12,.21],[-.33,2.31,0],palette.dark);
  const vessel=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.04,0),new THREE.Vector2(.27,0),new THREE.Vector2(.33,.17),new THREE.Vector2(.3,.2),new THREE.Vector2(.24,.05),new THREE.Vector2(.04,.05)],40),palette.light.clone());vessel.name='Illustrative_vessel';vessel.position.set(.1,1.45,0);quality.add(vessel);
  // Small service details make the study read as manufactured equipment.
  for(const [parent,x,y,z] of [[intake,.34,1.65,.38],[formulation,.35,1.73,.75],[forming,.32,2.55,.70]]){
    box(parent,'Display_glass',[.19,.13,.012],[x,y,z],palette.glass);
    for(let row=0;row<3;row++)box(parent,'Display_line',[.11-row*.02,.008,.004],[x-.015,y+.035-row*.03,z+.009],palette.green);
  }
  box(forming,'Door_recess',[.035,.42,.03],[.4,1.96,.68],palette.dark);
  box(forming,'Door_pull',[.025,.32,.06],[.4,1.96,.71],palette.metal);
  for(let i=0;i<6;i++)box(intake,'Cooling_louver',[.035,.18,.018],[-.24+i*.075,1.33,.285],palette.dark);
  for(const y of [1.12,1.94]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.432,.018,10,64),palette.metal.clone());ring.rotation.x=Math.PI/2;ring.position.set(0,y,-.25);formulation.add(ring);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;cylinder(formulation,'Lid_fastener',.019,.019,.025,[Math.sin(a)*.36,2.03,-.25+Math.cos(a)*.36],palette.metal,12);}
  const pipePath=new THREE.CatmullRomCurve3([new THREE.Vector3(.25,1.12,-.25),new THREE.Vector3(.47,1.15,-.25),new THREE.Vector3(.49,1.4,.1),new THREE.Vector3(.35,1.5,.4)]);
  const pipe=new THREE.Mesh(new THREE.TubeGeometry(pipePath,24,.025,10,false),palette.metal.clone());pipe.name='Illustrative_service_pipe';formulation.add(pipe);
  for(const part of Object.values(parts))part.traverse(node=>{if(node.isMesh){node.userData.part=part.name;node.userData.originalColor=node.material.color.getHex();node.userData.originalEmissive=node.material.emissive.getHex();}});
  root.traverse(node=>{if(node.isMesh){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(node.geometry,35),new THREE.LineBasicMaterial({color:0x27343d,transparent:true,opacity:.035}));edges.name='Technical_edges';node.add(edges);}});
  moving.forEach(item=>{item.origin=item.group.position.clone();});
  return {root,parts,shellGroups,moving,palette};
}
