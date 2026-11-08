import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

// Capture the actual underside, so each tire has a contact patch and the body
// casts a softer, lighter occlusion shadow. Cached once per trailer size.
export function createContactShadow(renderer,root){
  const shadowScene=new THREE.Scene(),model=root.clone(true);model.visible=true;
  model.traverse(o=>{if(o.userData.colourStudioOverlay)o.visible=false;});shadowScene.add(model);
  const camera=new THREE.OrthographicCamera(-5.5,5.5,3,-3,.01,3.7);
  camera.position.set(0,-.02,0);camera.up.set(0,0,1);camera.lookAt(0,1,0);
  const capture=new THREE.WebGLRenderTarget(1024,512),scratch=capture.clone(),result=capture.clone();
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.BasicDepthPacking,side:THREE.DoubleSide});
  depth.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );','gl_FragColor=vec4(vec3(0.0),exp(-fragCoordZ*6.0)*.88);');};
  shadowScene.overrideMaterial=depth;
  const blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{map:{value:null},step:{value:new THREE.Vector2()}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D map;uniform vec2 step;varying vec2 vUv;void main(){vec4 c=vec4(0.);float total=0.;for(int i=-16;i<=16;i++){float weight=exp(-float(i*i)/98.);c+=texture2D(map,vUv+step*float(i))*weight;total+=weight;}gl_FragColor=c/total;}`});
  const quad=new FullScreenQuad(blur),oldTarget=renderer.getRenderTarget(),oldColour=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
  renderer.setClearColor(0x000000,0);renderer.setRenderTarget(capture);renderer.clear();renderer.render(shadowScene,camera);
  blur.uniforms.map.value=capture.texture;blur.uniforms.step.value.set(1.5/1024,0);renderer.setRenderTarget(scratch);renderer.clear();quad.render(renderer);
  blur.uniforms.map.value=scratch.texture;blur.uniforms.step.value.set(0,1.5/512);renderer.setRenderTarget(result);renderer.clear();quad.render(renderer);
  renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColour,oldAlpha);
  capture.dispose();scratch.dispose();depth.dispose();blur.dispose();quad.dispose();
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(11,6),new THREE.MeshBasicMaterial({map:result.texture,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  plane.rotation.x=Math.PI/2;plane.position.y=.003;plane.userData.colourStudioOverlay=true;
  plane.userData.shadowTarget=result;plane.renderOrder=1;plane.visible=false;return plane;
}
