import * as THREE from './assets/three.module.js';

// Static, view-space contact occlusion for the authoring render. The finished
// site uses its recorded frames, so this pass adds no public playback cost.
export function createGroundedRenderer(renderer){
 const size=new THREE.Vector2(),target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,samples:4});
 target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 const material=new THREE.ShaderMaterial({
  depthTest:false,depthWrite:false,
  uniforms:{colorMap:{value:target.texture},depthMap:{value:target.depthTexture},inverseProjection:{value:new THREE.Matrix4()},resolution:{value:new THREE.Vector2(1,1)},projectionScale:{value:1},strength:{value:.65}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`
   uniform sampler2D colorMap;uniform sampler2D depthMap;
   uniform mat4 inverseProjection;uniform vec2 resolution;uniform float projectionScale;uniform float strength;
   varying vec2 vUv;
   #include <common>
   vec3 viewPosition(vec2 uv,float depth){vec4 p=inverseProjection*vec4(uv*2.-1.,depth*2.-1.,1.);return p.xyz/p.w;}
   void main(){
    vec4 color=texture2D(colorMap,vUv);float depth=texture2D(depthMap,vUv).x;
    if(depth<.99998){
     vec3 p=viewPosition(vUv,depth);
     vec3 normal=normalize(cross(dFdx(p),dFdy(p)));
     float radius=.22;float ao=0.;float weight=0.;
     vec2 screenRadius=vec2(projectionScale*radius/max(.1,-p.z))/vec2(resolution.x/resolution.y,1.);
     for(int i=0;i<24;i++){
      float k=float(i);float angle=(mod(k,8.)+.25)*.785398163;
      float scale=(floor(k/8.)+1.)/3.;
      vec2 uv=vUv+vec2(cos(angle),sin(angle))*screenRadius*scale;
      float sd=texture2D(depthMap,clamp(uv,vec2(.001),vec2(.999))).x;
      vec3 delta=viewPosition(uv,sd)-p;float distance=length(delta);
      float occ=max(0.,dot(normal,delta/max(.0001,distance))-.09);
      ao+=occ*(1.-smoothstep(radius*.35,radius*1.6,distance))*step(.012,distance);weight+=1.;
     }
     color.rgb*=1.-clamp(ao/max(1.,weight)*strength*3.8,0.,.22);
    }
    gl_FragColor=color;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material),scene=new THREE.Scene(),camera=new THREE.Camera();scene.add(quad);
 return {
  render(world,view){
   renderer.getDrawingBufferSize(size);
   if(target.width!==size.x||target.height!==size.y){target.setSize(size.x,size.y);material.uniforms.resolution.value.copy(size);}
   material.uniforms.inverseProjection.value.copy(view.projectionMatrixInverse);material.uniforms.projectionScale.value=view.projectionMatrix.elements[5]*.5;
   const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.render(world,view);renderer.setRenderTarget(previous);renderer.render(scene,camera);
  },
  dispose(){target.dispose();material.dispose();quad.geometry.dispose();}
 };
}
