import * as THREE from './assets/three.module.js';
import { roundedBox } from './studio.js';
import {edgeBox} from './fabricated-parts.js?v=1';

// Original illustration assets for the Marvel Labs journey. All dimensions are
// metres, Y is up, and the base of each freestanding prop is at Y = 0.
const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

export function createJourneyProps() {
  const m = {
    paint: new THREE.MeshStandardMaterial({ color: 0x263237, metalness: .62, roughness: .3 }),
    charcoal: new THREE.MeshStandardMaterial({ color: 0x131b1e, metalness: .22, roughness: .4 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x121719, roughness: .85 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xb8c5c9, metalness: .84, roughness: .28 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x53656c, metalness: .75, roughness: .36 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x3cc5ca, metalness: .28, roughness: .3 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xd4ad4a, metalness: .28, roughness: .36 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x213b48, metalness: .45, roughness: .13, clearcoat: 1 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xe5f9ff, emissive: 0xbdefff, emissiveIntensity: .8, roughness: .2 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb53329, emissive: 0x661d17, emissiveIntensity: .3, roughness: .22 }),
    sink: new THREE.MeshPhysicalMaterial({ color: 0x263b36, metalness: .24, roughness: .36, clearcoat: .28 }),
    card: new THREE.MeshStandardMaterial({ color: 0xb3976b, roughness: .92, side: THREE.DoubleSide }),
    cardEdge: new THREE.MeshStandardMaterial({ color: 0x8b704d, roughness: .95 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe0e5dc, roughness: .68 }),
    black: new THREE.MeshStandardMaterial({ color: 0x070b0c, roughness: .5 }),
  };
  Object.entries(m).forEach(([name, material]) => { material.name = `journey-${name}`; });

  function group(name) { const g = new THREE.Group(); g.name = name; return g; }
  function mesh(parent, geometry, material, xyz = [0, 0, 0], rotation) {
    const o = new THREE.Mesh(geometry, material);
    o.position.set(...xyz);
    if (rotation) o.rotation.set(...rotation);
    o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function box(parent, size, material, xyz, rotation) {
    // Fine seams, tread blocks and labels do not need a multi-ring bevel.
    const geometry = Math.min(...size) < .04 ? new THREE.BoxGeometry(...size) : roundedBox(...size);
    return mesh(parent, geometry, material, xyz, rotation);
  }
  function cylinder(parent, radius, height, material, xyz, rotation, radiusTop = radius, segments = 24) {
    return mesh(parent, new THREE.CylinderGeometry(radiusTop, radius, height, segments), material, xyz, rotation);
  }
  function tube(parent, a, b, radius, material, segments = 12) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const o = cylinder(parent, radius, start.distanceTo(end), material, start.clone().add(end).multiplyScalar(.5).toArray(), undefined, radius, segments);
    o.quaternion.setFromUnitVectors(UP, end.sub(start).normalize()); return o;
  }
  function torus(parent, radius, thickness, material, xyz, rotation, radial = 8, tubular = 40) {
    return mesh(parent, new THREE.TorusGeometry(radius, thickness, radial, tubular), material, xyz, rotation);
  }
  function profile(parent, points, depth, material, z = 0, bevel = .035) {
    const shape = new THREE.Shape(); shape.moveTo(...points[0]);
    points.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6, steps: 1 });
    geometry.translate(0, 0, z - depth / 2 + bevel);
    return mesh(parent, geometry, material);
  }

  // Bake static pieces into one draw per material. Wheels and carton hinges stay
  // separate so animation can address their pivots without rebuilding geometry.
  function batch(root) {
    root.updateMatrixWorld(true);
    const buckets = new Map(), inverse = root.matrixWorld.clone().invert();
    const remove = [];
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
      const key = o.material.uuid;
      if (!buckets.has(key)) buckets.set(key, { material: o.material, geometries: [] });
      const g = o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
      if (g.index) { buckets.get(key).geometries.push(g.toNonIndexed()); g.dispose(); }
      else buckets.get(key).geometries.push(g);
      remove.push(o);
    });
    for (const o of remove) o.removeFromParent();
    for (const { material, geometries } of buckets.values()) {
      let length = 0; geometries.forEach(g => { length += g.attributes.position.array.length; });
      const positions = new Float32Array(length), normals = new Float32Array(length);
      let offset = 0;
      for (const g of geometries) {
        if (!g.attributes.normal) g.computeVertexNormals();
        positions.set(g.attributes.position.array, offset); normals.set(g.attributes.normal.array, offset);
        offset += g.attributes.position.array.length; g.dispose();
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.computeBoundingSphere(); mesh(root, geometry, material);
    }
    return root;
  }

  function wheel(radius, width, hubMaterial = m.silver, tread = true) {
    const g = group('Wheel • roll about local Z');
    // Rounded tire shoulders, dished stamped hubs and staggered turf tread.
    const tireProfile=[
      [.48,-.48],[.67,-.53],[.85,-.51],[.96,-.39],[.99,-.23],
      [1,.0],[.99,.23],[.96,.39],[.85,.51],[.67,.53],[.48,.48]
    ].map(([r,z])=>new THREE.Vector2(radius*r,width*z));
    mesh(g,new THREE.LatheGeometry(tireProfile,56),m.rubber,[0,0,0],[Math.PI/2,0,0]);
    for (const side of [-1, 1]) {
      cylinder(g,radius*.51,.022,hubMaterial,[0,0,side*width*.44],[Math.PI/2,0,0],radius*.51,40);
      torus(g,radius*.48,radius*.025,hubMaterial,[0,0,side*width*.48],undefined,8,40);
      cylinder(g,radius*.24,.026,hubMaterial,[0,0,side*width*.51],[Math.PI/2,0,0]);
      cylinder(g,radius*.12,.033,m.charcoal,[0,0,side*width*.55],[Math.PI/2,0,0]);
      for(let i=0;i<5;i++){
        const a=i*TAU/5;
        cylinder(g,radius*.035,.026,m.silver,[Math.sin(a)*radius*.30,Math.cos(a)*radius*.30,side*width*.49],[Math.PI/2,0,0],radius*.035,6);
      }
    }
    if(tread){
      for(let i=0;i<36;i++)for(const row of [-1,1]){
        const a=(i+(row>0?.45:0))*TAU/36;
        const lug=box(g,[radius*.105,.012,width*.44],m.rubber,[Math.sin(a)*radius*.99,Math.cos(a)*radius*.99,row*width*.21]);
        lug.rotation.z=-a;lug.rotateY(row*.28);
      }
    }
    return batch(g);
  }

  const truck = group('ML / electric tow vehicle concept');
  truck.userData = { length: 5.55, width: 2.08, hitch: [2.92, .47, 0], faces: '-X' };
  box(truck, [5.05, .2, 1.65], m.charcoal, [0, .48, 0]);
  profile(truck, [[-2.58, .62], [-2.58, 1.13], [-1.08, 1.28], [1, 1.23], [2.52, 1.18], [2.52, .63]], 1.87, m.paint);
  // Glazed cabin has an inclined windscreen and pillars, not a solid box.
  profile(truck, [[-1.06, 1.13], [-.62, 1.82], [.66, 1.82], [1.12, 1.13]], 1.67, m.glass, 0, .04);
  box(truck, [1.37, .085, 1.78], m.paint, [.01, 1.88, 0]);
  for (const z of [-.86, .86]) {
    tube(truck, [-1.08, 1.12, z], [-.65, 1.83, z], .038, m.paint);
    tube(truck, [.7, 1.83, z], [1.14, 1.12, z], .043, m.paint);
    tube(truck, [.13, 1.19, z], [.13, 1.85, z], .033, m.paint);
    box(truck, [1.83, .038, .05], m.silver, [.06, 1.16, z]);
    box(truck, [1.68, .41, .035], m.paint, [.05, .91, z * 1.1]);
    box(truck, [.2, .031, .035], m.silver, [.55, 1.08, z * 1.13]);
    box(truck, [1.82, .055, .15], m.charcoal, [.05, .59, z * 1.12]);
    tube(truck, [-.75, 1.23, z], [-.72, 1.27, z * 1.18], .025, m.charcoal);
    box(truck, [.17, .1, .14], m.paint, [-.72, 1.27, z * 1.22]);
  }
  box(truck, [1.33, .045, 1.79], m.paint, [-1.84, 1.23, 0], [0, 0, .055]);
  box(truck, [.07, .25, 1.4], m.charcoal, [-2.64, .92, 0]);
  for (let i = 0; i < 7; i++) box(truck, [.082, .014, 1.3], m.steel, [-2.685, .83 + i * .032, 0]);
  box(truck, [.12, .12, 1.92], m.silver, [-2.64, .61, 0]);
  for (const z of [-.74, .74]) {
    box(truck, [.095, .08, .37], m.lamp, [-2.68, 1.12, z]);
    box(truck, [.09, .22, .13], m.red, [2.57, 1.02, z * 1.16]);
  }
  // Open pickup bed, with rails and an inset ribbed floor.
  box(truck, [1.32, .04, 1.55], m.charcoal, [1.82, 1.245, 0]);
  for (const z of [-.86, .86]) box(truck, [1.48, .25, .12], m.paint, [1.8, 1.34, z]);
  box(truck, [.11, .25, 1.78], m.paint, [2.52, 1.34, 0]);
  for (let i = 0; i < 10; i++) box(truck, [1.29, .014, .027], m.steel, [1.8, 1.274, -.65 + i * .145]);
  box(truck, [.13, .13, 1.8], m.silver, [2.59, .66, 0]);
  box(truck, [.34, .08, .12], m.steel, [2.73, .44, 0]);
  cylinder(truck, .045, .11, m.silver, [2.9, .48, 0]);
  mesh(truck, new THREE.SphereGeometry(.052, 16, 12), m.silver, [2.9, .55, 0]);
  for (const x of [-1.74, 1.65]) for (const z of [-.96, .96]) {
    // Dark wheel arch lips mask the body / wheel intersection.
    const arch = new THREE.TorusGeometry(.465, .041, 8, 28, Math.PI);
    mesh(truck, arch, m.charcoal, [x, .46, z]);
  }
  batch(truck);
  const truckWheels = [];
  for (const x of [-1.74, 1.65]) for (const z of [-.95, .95]) {
    const w = wheel(.43, .255); w.position.set(x, .43, z); truck.add(w); truckWheels.push(w);
  }

  const zeroTurn = group('Zero-turn mower / concept loadout');
  box(zeroTurn, [1.28, .12, .85], m.charcoal, [.05, .32, 0]);
  // A stamped three-lobe deck with rounded corners, a skirt and discharge chute.
  const deckShape=new THREE.Shape();deckShape.moveTo(-.83,-.42);deckShape.quadraticCurveTo(-.9,-.60,-.65,-.64);deckShape.lineTo(.02,-.64);deckShape.quadraticCurveTo(.23,-.55,.25,-.32);deckShape.lineTo(.25,.32);deckShape.quadraticCurveTo(.18,.6,-.03,.64);deckShape.lineTo(-.64,.64);deckShape.quadraticCurveTo(-.9,.56,-.83,.35);deckShape.closePath();
  const deckGeometry=new THREE.ExtrudeGeometry(deckShape,{depth:.105,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:3,curveSegments:20});deckGeometry.rotateX(-Math.PI/2);mesh(zeroTurn,deckGeometry,m.yellow,[0,.1,0]);
  box(zeroTurn,[.43,.07,.26],m.rubber,[-.24,.2,.73],[.14,0,-.08]);
  for (const z of [-.33, .33]) cylinder(zeroTurn, .29, .09, m.yellow, [-.33, .25, z]);
  // Air-cooled engine: crankcase, cylinder fins, fan shroud and guard.
  box(zeroTurn,[.42,.22,.37],m.charcoal,[.53,.53,0]);
  for(const side of [-1,1]){
    const head=group('Finned engine cylinder');head.position.set(.51,.57,side*.14);head.rotation.x=side*.36;zeroTurn.add(head);
    cylinder(head,.105,.23,m.steel,[0,.08,0]);
    for(let i=0;i<8;i++)box(head,[.25,.013,.22],m.steel,[0,i*.025,0]);
    box(head,[.24,.055,.20],m.silver,[0,.23,0]);
    tube(zeroTurn,[.40,.78,side*.20],[.27,.52,side*.30],.013,m.black);
  }
  cylinder(zeroTurn,.245,.11,m.charcoal,[.53,.82,0],undefined,.205,64);
  cylinder(zeroTurn,.14,.012,m.black,[.53,.884,0],undefined,.14,48);
  for(let i=0;i<32;i++){
    const a=i*TAU/32;
    box(zeroTurn,[.065,.008,.007],m.steel,[.53+Math.cos(a)*.18,.879,Math.sin(a)*.18],[0,-a,0]);
  }
  cylinder(zeroTurn,.065,.29,m.charcoal,[.77,.53,.12],[0,0,Math.PI/2]);
  tube(zeroTurn,[.73,.54,.23],[.85,.48,.33],.022,m.steel);
  tube(zeroTurn,[.81,.37,-.39],[.81,.72,-.39],.025,m.charcoal);
  tube(zeroTurn,[.81,.72,-.39],[.81,.72,.39],.025,m.charcoal);
  tube(zeroTurn,[.81,.72,.39],[.81,.37,.39],.025,m.charcoal);
  // Suspended bucket seat with shaped side bolsters and a curved back shell.
  box(zeroTurn,[.36,.045,.36],m.steel,[-.01,.67,0]);
  for(const z of [-.14,.14]){
    for(let i=0;i<5;i++)torus(zeroTurn,.035,.006,m.steel,[-.02,.66+i*.012,z],[Math.PI/2,0,0],6,16);
  }
  function seatPad(width,height,depth){
    const columns=28,rows=24,positions=[],indices=[],r=.065;
    for(const side of [-1,1])for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
      const u=i/columns*2-1,v=j/rows*2-1,y=v*height/2;
      const dy=Math.max(0,Math.abs(y)-(height/2-r));
      const hw=width/2-r+Math.sqrt(Math.max(0,r*r-dy*dy));
      const x=side*(depth/2+.024*(1-u*u)*(1-v*v))-.065*Math.pow(u,4);
      positions.push(x,y,u*hw);
    }
    const count=(columns+1)*(rows+1);
    for(let side=0;side<2;side++)for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
      const a=side*count+j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;
      indices.push(...(side?[a,d,b,a,c,d]:[a,b,d,a,d,c]));
    }
    const perimeter=[];
    for(let i=0;i<=columns;i++)perimeter.push(i);
    for(let j=1;j<=rows;j++)perimeter.push(j*(columns+1)+columns);
    for(let i=columns-1;i>=0;i--)perimeter.push(rows*(columns+1)+i);
    for(let j=rows-1;j>0;j--)perimeter.push(j*(columns+1));
    for(let i=0;i<perimeter.length;i++){const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];indices.push(a,b+count,b,a,a+count,b+count);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  mesh(zeroTurn,seatPad(.48,.45,.04),m.charcoal,[.18,.93,0],[0,0,-.16]);
  mesh(zeroTurn,seatPad(.43,.40,.055),m.rubber,[.155,.94,0],[0,0,-.16]);
  mesh(zeroTurn,seatPad(.43,.42,.045),m.rubber,[-.035,.73,0],[0,0,Math.PI/2]);
  // Fine upholstery channels retain the shaped silhouette at close range.
  for(const z of [-.13,0,.13])tube(zeroTurn,[.205,.83,z],[.155,1.05,z],.003,m.charcoal,6);
  box(zeroTurn, [.47, .035, .49], m.steel, [-.47, .39, 0], [0, 0, .1]);
  for (let i = 0; i < 5; i++) box(zeroTurn, [.34, .013, .014], m.rubber, [-.47, .414, -.18 + i * .09]);
  for (const z of [-.32, .32]) {
    tube(zeroTurn, [.09, .43, z], [-.03, .92, z], .018, m.steel);
    tube(zeroTurn, [-.03, .92, z], [-.26, .97, z], .024, m.rubber);
    const fender=new THREE.Shape();
    fender.moveTo(-.28,.54);fender.bezierCurveTo(-.20,.72,.13,.78,.47,.72);fender.quadraticCurveTo(.65,.69,.70,.53);
    fender.lineTo(.65,.51);fender.quadraticCurveTo(.59,.64,.44,.66);fender.bezierCurveTo(.11,.71,-.16,.66,-.23,.51);fender.closePath();
    const fg=new THREE.ExtrudeGeometry(fender,{depth:.21,bevelEnabled:true,bevelSize:.014,bevelThickness:.014,bevelSegments:4,curveSegments:24});
    mesh(zeroTurn,fg,m.yellow,[0,0,z*1.55-.105]);
  }
  for(const z of [-.39,.39]){
   tube(zeroTurn,[.44,.58,z],[.51,1.39,z],.033,m.charcoal);
   cylinder(zeroTurn,.045,.024,m.silver,[.51,1.37,z],[Math.PI/2,0,0]);
   box(zeroTurn,[.32,.06,.075],m.rubber,[.02,.98,z]);
  }
  cylinder(zeroTurn,.055,.025,m.black,[.4,.76,-.48]);
  box(zeroTurn,[.16,.018,.10],m.black,[.12,.74,.47]);
  cylinder(zeroTurn,.015,.024,m.red,[.12,.765,.46]);
  for(const x of [-.64,-.05])for(const z of [-.51,.51])cylinder(zeroTurn,.015,.012,m.silver,[x,.257,z]);
  box(zeroTurn, [.12, .055, .16], m.cyan, [-.15, .28, -.51]);
  for(const z of [-.52,.52]){
    tube(zeroTurn,[-.55,.35,z*.85],[-1.04,.28,z*.85],.029,m.charcoal);
    cylinder(zeroTurn,.04,.12,m.steel,[-1.04,.23,z*.85]);
    for(const side of [-1,1])tube(zeroTurn,[-1.04,.24,z*.85+side*.06],[-1.04,.12,z*.85+side*.06],.015,m.steel);
  }
  batch(zeroTurn);
  const rollBar=group('Folding rollover bar');
  for(const z of [-.39,.39])tube(rollBar,[0,0,z],[.13,.40,z],.033,m.charcoal);
  tube(rollBar,[.13,.40,-.39],[.13,.40,.39],.033,m.charcoal);batch(rollBar);
  rollBar.position.set(.51,1.37,0);rollBar.rotation.z=-Math.PI/2;rollBar.userData.rolloverBar=true;zeroTurn.add(rollBar);
  for (const z of [-.52, .52]) {
    const rear = wheel(.31, .24, m.silver); rear.position.set(.4, .31, z);rear.userData.wheelRadius=.31; zeroTurn.add(rear);
    const caster = wheel(.12, .09, m.steel, false); caster.position.set(-1.04, .12, z * .85);caster.userData.wheelRadius=.12; zeroTurn.add(caster);
  }
  zeroTurn.userData = { asset:'detailed-zero-turn-concept', faces: '-X', footprint: [2.12, 1.6], height: 1.41,workingHeight:1.81 };

  const pushMower = group('Push mower / concept loadout');
  box(pushMower, [.72, .11, .51], m.yellow, [0, .17, 0]);
  cylinder(pushMower, .19, .1, m.yellow, [0, .23, 0]);
  box(pushMower, [.33, .2, .28], m.charcoal, [.02, .37, 0]);
  cylinder(pushMower, .14, .045, m.paint, [.02, .49, 0]);
  cylinder(pushMower, .04, .028, m.yellow, [.12, .527, -.07]);
  box(pushMower, [.36, .26, .38], m.rubber, [.43, .29, 0], [0, 0, -.1]);
  for (const z of [-.23, .23]) {
    tube(pushMower, [.28, .27, z], [.74, 1.03, z], .017, m.steel);
    tube(pushMower, [.74, 1.03, z], [.9, 1.1, z], .022, m.rubber);
  }
  tube(pushMower, [.9, 1.1, -.23], [.9, 1.1, .23], .023, m.rubber);
  tube(pushMower, [.28, .43, -.19], [.75, 1.01, -.19], .006, m.black);
  for (const x of [-.27, .3]) for (const z of [-.27, .27]) {
    const w = wheel(.115, .065, m.silver, false); w.position.set(x, .115, z); pushMower.add(w);
  }
  batch(pushMower);
  pushMower.userData = { faces: '-X', deck: [.72, .55], height: 1.12, handleExtendsToX: .92 };

  const trimmers = group('Three mounted weed trimmers');
  box(trimmers, [.93, .055, .07], m.steel, [0, .46, .08]);
  box(trimmers, [.93, .055, .07], m.steel, [0, 1.31, .08]);
  for (const x of [-.32, 0, .32]) {
    tube(trimmers, [x, .19, -.04], [x + .045, 1.52, 0], .014, m.silver);
    box(trimmers, [.15, .2, .14], m.charcoal, [x + .045, 1.53, 0]);
    box(trimmers, [.12, .12, .16], m.yellow, [x + .045, 1.58, .015]);
    box(trimmers, [.07, .2, .06], m.rubber, [x + .025, 1.15, -.01]);
    torus(trimmers, .065, .014, m.charcoal, [x + .015, .93, -.04], [0, Math.PI / 2, 0], 6, 20);
    cylinder(trimmers, .07, .05, m.charcoal, [x, .12, -.05]);
    cylinder(trimmers, .105, .018, m.yellow, [x, .16, -.045], undefined, .1, 24);
    tube(trimmers, [x - .12, .105, -.05], [x + .12, .105, -.05], .003, m.cyan, 6);
    for (const y of [.46, 1.31]) box(trimmers, [.07, .08, .12], m.rubber, [x, y, .035]);
  }
  batch(trimmers);

  function roundedLoop(hx, hz, r, segments = 16) {
    const out = [];
    const corners = [[hx - r, hz - r], [-hx + r, hz - r], [-hx + r, -hz + r], [hx - r, -hz + r]];
    corners.forEach(([x, z], k) => {
      for (let j = 0; j < segments; j++) {
        const a = (k + j / segments) * Math.PI / 2;
        out.push([x + Math.cos(a) * r, z + Math.sin(a) * r]);
      }
    });
    return out;
  }
  const sink = group('Seaweed sink / ribbed basin concept');
  const layers = [
    [.385, .26, .07, 0], [.4, .275, .085, .035], [.4, .275, .085, .207],
    [.396, .271, .083, .22], [.377, .252, .076, .22], [.372, .247, .074, .211],
    [.365, .24, .076, .17], [.352, .227, .084, .126], [.328, .204, .095, .088],
    [.285, .17, .104, .068], [.2, .126, .104, .057], [.09, .073, .06, .052],
    [.034, .034, .034, .048], [.034, .034, .034, .022],
  ];
  const positions = [], indices = [], loops = layers.map(([hx, hz, r]) => roundedLoop(hx, hz, r));
  layers.forEach((layer, n) => loops[n].forEach(([x, z]) => positions.push(x, layer[3], z)));
  const n = loops[0].length;
  for (let layer = 0; layer < layers.length - 1; layer++) {
    for (let j = 0; j < n; j++) {
      const a = layer * n + j, b = layer * n + (j + 1) % n, c = (layer + 1) * n + j, d = (layer + 1) * n + (j + 1) % n;
      indices.push(a, c, b, b, c, d);
    }
  }
  const basin = new THREE.BufferGeometry(); basin.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); basin.setIndex(indices); basin.computeVertexNormals();
  mesh(sink, basin, m.sink);
  // Evenly distribute tactile vertical fluting around the rounded perimeter.
  const perimeter = roundedLoop(.398, .273, .083, 48);
  const lengths = [0];
  for (let i = 0; i < perimeter.length; i++) {
    const a = perimeter[i], b = perimeter[(i + 1) % perimeter.length]; lengths.push(lengths[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const ribs = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0056, .0056, .191, 7), m.sink, 152);
  const transform = new THREE.Object3D();
  for (let i = 0; i < 152; i++) {
    const at = i / 152 * lengths.at(-1);
    let j = 0; while (lengths[j + 1] < at) j++;
    const a = perimeter[j], b = perimeter[(j + 1) % perimeter.length], f = (at - lengths[j]) / (lengths[j + 1] - lengths[j]);
    transform.position.set(THREE.MathUtils.lerp(a[0], b[0], f), .112, THREE.MathUtils.lerp(a[1], b[1], f)); transform.updateMatrix(); ribs.setMatrixAt(i, transform.matrix);
  }
  ribs.castShadow = true; ribs.receiveShadow = true; sink.add(ribs);
  torus(sink, .035, .0045, m.steel, [0, .049, 0], [Math.PI / 2, 0, 0], 8, 32);
  cylinder(sink, .031, .008, m.black, [0, .019, 0]);
  sink.userData = { width: .812, depth: .562, height: .22, origin: 'base centre' };

  const carton = group('Sink shipping carton');
  const W = .98, D = .7, H = .42, t = .004;
  const panel=(parent,size,at)=>mesh(parent,edgeBox(size,.00065),m.card,at);
  panel(carton, [W, t, D], [0, t / 2, 0]);
  for (const x of [-(W-t) / 2, (W-t) / 2]) panel(carton, [t, H, D-2*t], [x, H / 2, 0]);
  for (const z of [-(D-t) / 2, (D-t) / 2]) panel(carton, [W, H, t], [0, H / 2, z]);
  // Protective recycled-fibre corner pads leave the product visible when open.
  for (const x of [-.432, .432]) for (const z of [-.294, .294]) box(carton, [.075, .26, .075], m.white, [x, .146, z]);
  box(carton, [.22, .13, .003], m.white, [.17, .235, -D / 2 - .008]);
  for (let i = 0; i < 15; i++) box(carton, [.003 + (i % 3) * .001, .046, .004], m.black, [.1 + i * .01, .22, -D / 2 - .01]);
  box(carton, [.13, .012, .004], m.charcoal, [.16, .277, -D / 2 - .01]);
  batch(carton);
  const flaps = [];
  function flap(name, axis, openAngle, position, size, centre) {
    const pivot = group(name); pivot.position.set(...position);
    panel(pivot, size, centre); pivot.rotation[axis] = openAngle;
    pivot.userData = { axis, openAngle, closedAngle: 0 }; carton.add(pivot); flaps.push(pivot);
  }
  flap('Left long flap', 'z', 1.85, [-W / 2, H, 0], [W / 2, t, D], [W / 4, 0, 0]);
  flap('Right long flap', 'z', -1.85, [W / 2, H, 0], [W / 2, t, D], [-W / 4, 0, 0]);
  flap('Front short flap', 'x', -1.85, [0, H - .009, -D / 2], [W - .025, t, D / 2], [0, 0, D / 4]);
  flap('Back short flap', 'x', 1.85, [0, H - .009, D / 2], [W - .025, t, D / 2], [0, 0, -D / 4]);
  carton.userData = { width: W, depth: D, height: H, sinkBaseY: .025 };
  const paper=new THREE.TextureLoader().load('./assets/surfaces/powder.png');
  paper.wrapS=paper.wrapT=THREE.RepeatWrapping;paper.repeat.set(12,12);
  m.card.bumpMap=paper;m.card.bumpScale=.00018;m.card.roughness=.86;
  // Metre-scaled grain on both batched carton walls and hinged flaps.
  carton.traverse(o=>{
    if(!o.isMesh||o.material!==m.card)return;
    const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){
      const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));
      uv[i*2]=x>y&&x>z?p.getZ(i):p.getX(i);uv[i*2+1]=y>x&&y>z?p.getZ(i):p.getY(i);
    }
    o.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  });

  const rack = group('Withdrawn handling placeholder');
  rack.visible=false;
  rack.userData = {shelfHeights:[],width:0,depth:0,height:0,front:'-Z'};

  const conveyor = group('Exterior finished product conveyor');
  for (const x of [-.49, .49]) {
    box(conveyor, [.055, .12, 2.6], m.steel, [x, 1.11, 0]);
    for (const z of [-1, 1]) {
      box(conveyor, [.055, 1.02, .055], m.silver, [x, .51, z]);
      cylinder(conveyor, .055, .035, m.rubber, [x, .018, z]);
    }
    tube(conveyor, [x, .24, -1], [x, .95, 1], .014, m.steel);
  }
  for (const z of [-1, 1]) box(conveyor, [.98, .05, .05], m.steel, [0, .27, z]);
  for (let i = 0; i < 23; i++) cylinder(conveyor, .042, .94, m.silver, [0, 1.138, -1.23 + i * .112], [0, 0, Math.PI / 2], .042, 16);
  box(conveyor, [.16, .19, .27], m.paint, [.57, .98, -.9]);
  cylinder(conveyor, .025, .035, m.red, [.67, 1.065, -.9], [0, 0, Math.PI / 2]);
  batch(conveyor); conveyor.userData = { deckY: 1.18, width: 1.05, length: 2.6, direction: 'Z' };

  const cameras = group('Stereo vision camera / illustrative sensor');
  box(cameras, [.27, .085, .082], m.silver, [0, 0, 0]);
  box(cameras, [.248, .067, .018], m.charcoal, [0, 0, -.048]);
  for (const x of [-.09, .09]) {
    cylinder(cameras, .023, .014, m.steel, [x, 0, -.062], [Math.PI / 2, 0, 0]);
    cylinder(cameras, .017, .017, m.glass, [x, 0, -.071], [Math.PI / 2, 0, 0]);
    cylinder(cameras, .008, .018, m.black, [x, 0, -.073], [Math.PI / 2, 0, 0]);
    cylinder(cameras, .004, .019, m.cyan, [x + .004, .005, -.074], [Math.PI / 2, 0, 0]);
  }
  box(cameras, [.029, .019, .02], m.glass, [0, 0, -.063]);
  cylinder(cameras, .003, .02, m.lamp, [.04, .017, -.061], [Math.PI / 2, 0, 0], .003, 8);
  box(cameras, [.07, .02, .055], m.steel, [0, -.052, .015]);
  tube(cameras, [0, -.06, .015], [0, -.13, .11], .016, m.steel);
  box(cameras, [.09, .07, .018], m.charcoal, [0, -.13, .12]);
  batch(cameras); cameras.userData = { forward: [0, 0, -1], housingWidth: .27, illustrative: true };

  const rtk = group('RTK positioning antenna / illustrative sensor');
  cylinder(rtk, .055, .025, m.steel, [0, .0125, 0]);
  cylinder(rtk, .016, .62, m.silver, [0, .335, 0]);
  cylinder(rtk, .024, .09, m.charcoal, [0, .63, 0]);
  cylinder(rtk, .09, .034, m.charcoal, [0, .687, 0]);
  cylinder(rtk, .089, .045, m.white, [0, .723, 0], undefined, .075, 32);
  torus(rtk, .082, .005, m.cyan, [0, .703, 0], [Math.PI / 2, 0, 0], 8, 32);
  tube(rtk, [.019, .66, 0], [.019, .04, 0], .004, m.rubber);
  batch(rtk); rtk.userData = { height: .75, diameter: .18, illustrative: true };

  return { truck, truckWheels, zeroTurn, pushMower, trimmers, sink, carton, flaps, rack, conveyor, cameras, rtk };
}
