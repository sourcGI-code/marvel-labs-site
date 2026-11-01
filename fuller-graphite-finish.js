import * as THREE from 'three';

// The owner's Fuller/Mirror Graphite preview reflection environment.
// Applied to trailer materials so each page can retain its existing background.
export function createFullerGraphiteFinish(renderer) {
  const environment=new THREE.Scene();
  const sphere=new THREE.SphereGeometry(50,48,32), positions=sphere.attributes.position;
  const colors=new Float32Array(positions.count*3);
  const stops=[[-1,[.025,.04,.06]],[0,[.07,.10,.14]],[1,[.10,.14,.19]]];
  for(let i=0;i<positions.count;i++){
    const t=positions.getY(i)/50,k=t<0?0:1;
    const [a,ca]=stops[k],[b,cb]=stops[k+1],u=THREE.MathUtils.clamp((t-a)/(b-a),0,1);
    for(let j=0;j<3;j++)colors[i*3+j]=ca[j]+(cb[j]-ca[j])*u;
  }
  sphere.setAttribute('color',new THREE.BufferAttribute(colors,3));
  environment.add(new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const material=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.62,.75),side:THREE.DoubleSide,toneMapped:false});
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,window=new THREE.Group();
    window.position.set(Math.cos(angle)*18,-1.4,Math.sin(angle)*18);window.lookAt(0,-1.4,0);
    for(const x of [-3,0,3])for(const y of [-3,0,3]){
      const pane=new THREE.Mesh(new THREE.PlaneGeometry(2.65,2.35),material);pane.position.set(x,y,0);window.add(pane);
    }
    environment.add(window);
  }
  for(const x of [-4,4])for(const z of [-4,4]){
    const pane=new THREE.Mesh(new THREE.PlaneGeometry(2.8,6.8),material);pane.position.set(x,14,z);pane.rotation.x=Math.PI/2;environment.add(pane);
  }
  const pmrem=new THREE.PMREMGenerator(renderer), target=pmrem.fromScene(environment,0);
  target.texture.name='Fuller / approved Mirror Graphite reflections';
  environment.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  material.dispose();pmrem.dispose();
  return mat=>{mat.envMap=target.texture;mat.userData.approvedTrailerFinish='fuller-graphite-v1';mat.needsUpdate=true;return mat;};
}
