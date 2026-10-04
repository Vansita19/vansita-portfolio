import { play } from 'cuelume';
let flowerSoundEnabled = true;
try { flowerSoundEnabled = localStorage.getItem('bloom-flower-sound') !== 'off'; } catch {}
const soundButton = document.querySelector<HTMLButtonElement>('[data-flower-sound]');
function syncFlowerSound() {
 soundButton?.setAttribute('aria-pressed', String(flowerSoundEnabled));
 const label = soundButton?.querySelector('[data-sound-label]');
 if(label) label.textContent = flowerSoundEnabled ? 'Sound on' : 'Sound off';
}
soundButton?.addEventListener('click', () => {
 flowerSoundEnabled = !flowerSoundEnabled; syncFlowerSound();
 try { localStorage.setItem('bloom-flower-sound', flowerSoundEnabled ? 'on' : 'off'); } catch {}
});
syncFlowerSound();
// Each bloom has its own petal contour and color field, evaluated in local space.
const canvas = document.querySelector<HTMLCanvasElement>('#bloom-canvas')!;
const gl = canvas.getContext('webgl', { alpha:true, antialias:true, premultipliedAlpha:false });
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const PALETTE_COUNT = 7;
const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment = `
precision highp float;
varying vec2 uv;
uniform float time;
uniform float intro;
uniform float mobileEntrance;
uniform vec2 resolution;
uniform float sceneScale;
uniform float spins[5];
uniform float paletteFrom[5];
uniform float paletteTo[5];
uniform float changes[5];
float coverage;
// GLSL pow is undefined for negative bases, even for a square.
float square(float x){return x*x;}
float polarAngle(vec2 p){return dot(p,p)<1e-12?0.:atan(p.y,p.x);}
float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 palette(float x,float kind){
 vec3 a;vec3 b;vec3 c;vec3 d;vec3 e;
 if(kind<.5){a=vec3(1.,.65,.20);b=vec3(.97,.37,.47);c=vec3(.91,.47,.77);d=vec3(.74,.64,.94);e=vec3(.64,.69,.97);}
 else if(kind<1.5){a=vec3(.29,.38,.66);b=vec3(.80,.67,.92);c=vec3(1.,.76,.82);d=vec3(.71,.90,.94);e=vec3(.97,.49,.68);}
 else if(kind<2.5){a=vec3(.98,.81,.86);b=vec3(.76,.74,.93);c=vec3(.87,.88,.64);d=vec3(.41,.65,.33);e=vec3(.19,.40,.33);}
 else if(kind<3.5){a=vec3(.97,.30,.38);b=vec3(1.,.59,.32);c=vec3(1.,.87,.66);d=vec3(.96,.73,.87);e=vec3(.73,.48,.83);}
 else if(kind<4.5){a=vec3(.94,.87,.96);b=vec3(.76,.78,.94);c=vec3(.70,.84,.94);d=vec3(.92,.91,.52);e=vec3(.85,.78,.37);}
 // Tangerine enamel: fiery center, golden warmth, and a saturated orange edge.
 else if(kind<5.5){a=vec3(.80,.17,.035);b=vec3(1.,.34,.035);c=vec3(1.,.66,.19);d=vec3(1.,.46,.08);e=vec3(.90,.25,.04);}
 // Tidepool: deep teal through sea glass and mint, returning to emerald.
 else{a=vec3(.025,.30,.29);b=vec3(.08,.64,.56);c=vec3(.72,.95,.83);d=vec3(.38,.80,.62);e=vec3(.055,.43,.34);}
 vec3 col=mix(a,b,smoothstep(.02,.28,x));col=mix(col,c,smoothstep(.26,.52,x));col=mix(col,d,smoothstep(.53,.79,x));return mix(col,e,smoothstep(.79,1.,x));
}
float smoothUnion(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float contour(vec2 p,float petals,float deep){
 if(petals>9.){
  // Eight pillowy lobes in four pairs, with the reference's concave star opening.
  vec2 q=abs(p);
  float lobes=smoothUnion(length(q-vec2(.30,.63))-.33,length(q-vec2(.63,.30))-.33,.07);
  float body=max(q.x,q.y)-.49;
  float outer=smoothUnion(lobes,body,.09);
  float opening=(1.-pow(q.x/.32,.65)-pow(q.y/.32,.65))*.24;
  return 1.+max(outer,opening);
 }
 float angle=polarAngle(p);
 // Some GPUs approximate cos just below -1 at petal valleys. Clamp before
 // the fractional power so NaNs cannot contaminate the mask or its shadow.
 float lobe=pow(clamp(.5+.5*cos(petals*angle),0.,1.),.62);
 return length(p)/(.64+deep*lobe);
}
vec3 bloom(vec3 bg,vec2 point,vec2 center,float size,float turn,float petals,float deep,float kind,float delay,float spin,float fromPalette,float toPalette,float change){
 float progress=clamp((intro-delay)/1.65,0.,1.);float appear=progress*progress*(3.-2.*progress);
 float angle=turn+spin+.022*sin(time*.29+kind*1.8);
 float growth=mix(mix(.87,1.,appear),mix(.02,1.,appear),mobileEntrance);
 vec2 p=(point-center-vec2(0.,.003*sin(time*.38+kind)))/(size*growth);
 p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
 float edge=contour(p,petals,deep);float feather=mix(mix(.075,.003,appear),.003,mobileEntrance);
 // Mobile reveals full-color petals through growth instead of fading through white.
 float opacity=mix(appear,step(.0001,progress),mobileEntrance);
 float mask=(1.-smoothstep(1.-feather,1.+feather,edge))*opacity;
 // Keep the area outside each flower transparent, without a shadow halo.
 coverage=mask+coverage*(1.-mask);
 if(mask<.00001)return bg;
 float a=polarAngle(p);float r=length(p);
 // Traveling heat stays attached to individual petals. No circular gradient layers.
 float petal=cos(a*petals);
 float field=edge + .095*sin(time*.85+kind*1.3-edge*3.5)*sin(edge*3.14159)
             + .04*sin(time*.55+kind*2.+a*2.)*sin(edge*3.14159)
             + .045*sin(a*3.+time*.3+kind)*sin(edge*3.14159)
             + .08*petal*sin(edge*3.14159);
 // Off-axis pools give each flower a directional center, like translucent enamel.
 field+=.09*p.x-.075*p.y+.008*sin(time*.33+kind)*p.y;
 if(petals>9.){
  // Mirror into one heart: each quadrant has its own identical heat source.
  // Measure along a ray to that heart's real boundary, so every color band
  // inherits the paired lobes and inward point instead of forming circles.
  vec2 heart=abs(p);
  vec2 origin=vec2(.435);
  vec2 delta=heart-origin;
  float distanceFromCenter=length(delta);
  vec2 direction=delta/max(distanceFromCenter,.0001);
  float lo=0.;float hi=1.2;
  for(int step=0;step<10;step++){
   float mid=(lo+hi)*.5;
   vec2 samplePoint=origin+direction*mid;
   bool inside=samplePoint.x>0.&&samplePoint.y>0.&&contour(samplePoint,10.,deep)<1.;
   if(inside)lo=mid;else hi=mid;
  }
  float heartField=clamp(distanceFromCenter/max((lo+hi)*.5,.001),0.,1.);
  // The same phase sends color outward through all four hearts together.
  field=heartField+.115*sin(time*.85-heartField*4.)*sin(heartField*3.14159);

 }
 // A traveling satin highlight reveals a completely different palette behind it.
 float sweep=p.x+.16*sin(p.y*5.+change*5.);
 float front=mix(-1.5,1.5,change);
 float reveal=change>=1.?1.:1.-smoothstep(front-.16,front+.16,sweep);
 float shimmer=exp(-square((sweep-front)/.115))*sin(change*3.14159);
 float ripple=.035*sin((sweep-front)*22.)*exp(-square((sweep-front)/.35))*sin(change*3.14159);
 float colorField=clamp(field+ripple,0.,1.);
 vec3 col=mix(palette(colorField,fromPalette),palette(colorField,toPalette),reveal);
 col=mix(col,vec3(1.,.98,1.),shimmer*.65);
 float ridge=pow(max(0.,petal),3.)*smoothstep(.2,.55,r)*(1.-smoothstep(.64,1.,edge));
 col=mix(col,vec3(1.,.96,.89),ridge*.14);
 float rim=exp(-square((edge-.974)/.017));
 float light=clamp(.52+.55*p.y-.42*p.x,0.,1.);
 col=mix(col,vec3(1.,.98,.92),rim*light*.42);
 col*=1.-rim*(1.-light)*.13;
 // Fine fixed grain prevents a glossy, synthetic gradient finish.
 col+=(noise(gl_FragCoord.xy)-.5)*.026;
 return mix(bg,col,mask);
}
void main(){
 vec2 p=vec2(uv.x-.5,(uv.y-.5)*resolution.y/resolution.x)*sceneScale+.5;
 coverage=0.;
 vec3 col=vec3(1.);
 // Deliberately asymmetric bouquet: five different silhouettes, gently overlapping.
 col=bloom(col,p,vec2(.43,.79),.20,.24,6.,.32,4.,.10,spins[0],paletteFrom[0],paletteTo[0],changes[0]);
 col=bloom(col,p,vec2(.25,.55),.245,.09,8.,.29,1.,.36,spins[1],paletteFrom[1],paletteTo[1],changes[1]);
 col=bloom(col,p,vec2(.53,.40),.25,-.12,4.,.24,2.,.88,spins[2],paletteFrom[2],paletteTo[2],changes[2]);
 col=bloom(col,p,vec2(.77,.65),.235,.02,10.,.36,0.,.62,spins[3],paletteFrom[3],paletteTo[3],changes[3]);
 col=bloom(col,p,vec2(.73,.24),.205,.15,5.,.34,3.,1.12,spins[4],paletteFrom[4],paletteTo[4],changes[4]);
 // Remove the white matte while preserving the existing flower appearance.
 // The context uses straight alpha, so unpremultiply before browser compositing.
 gl_FragColor=coverage>.00001?vec4(clamp((col-vec3(1.-coverage))/coverage,0.,1.),coverage):vec4(0.);
}`;
function init(){
 if(!gl)throw new Error('WebGL unavailable');
 const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader compilation failed');return s;};
 const program=gl.createProgram()!;gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Shader linking failed');gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const clock=gl.getUniformLocation(program,'time'),entrance=gl.getUniformLocation(program,'intro'),resolution=gl.getUniformLocation(program,'resolution'),spinUniform=gl.getUniformLocation(program,'spins[0]');
 const scaleUniform=gl.getUniformLocation(program,'sceneScale');
 const mobileUniform=gl.getUniformLocation(program,'mobileEntrance');
 const mobileLayout=matchMedia('(max-width:809.98px)');
 let sceneScale=1;
 const fromUniform=gl.getUniformLocation(program,'paletteFrom[0]'),toUniform=gl.getUniformLocation(program,'paletteTo[0]'),changeUniform=gl.getUniformLocation(program,'changes[0]');
 const paletteFrom=new Float32Array([5,1,6,0,3]),paletteTo=new Float32Array(paletteFrom),changes=new Float32Array([1,1,1,1,1]),queued=new Uint8Array(5);
 let paused=reduced.matches,visible=true,frame=0,last=0,elapsed=0,age=reduced.matches?10:0;
 const angles=new Float32Array(5),speeds=new Float32Array(5);
 // Same placement and contours as the shader, in back-to-front order.
 const flowers=[{x:.43,y:.79,size:.20,turn:.24,petals:6,deep:.32,kind:4},{x:.25,y:.55,size:.245,turn:.09,petals:8,deep:.29,kind:1},{x:.53,y:.40,size:.25,turn:-.12,petals:4,deep:.24,kind:2},{x:.77,y:.65,size:.235,turn:.02,petals:10,deep:.36,kind:0},{x:.73,y:.24,size:.205,turn:.15,petals:5,deep:.34,kind:3}];
 let pointer:{x:number,y:number}|null=null;
 let focused=-1;
 const hitFlower=(point=pointer)=>{
  if(!point)return -1;
  const rect=canvas.getBoundingClientRect();
  const x=((point.x-rect.left)/rect.width-.5)*sceneScale+.5,y=(.5-(point.y-rect.top)/rect.height)*rect.height/rect.width*sceneScale+.5;
  for(let i=flowers.length-1;i>=0;i--){
   const f=flowers[i],angle=f.turn+angles[i]+.022*Math.sin(elapsed*.29+f.kind*1.8),scale=f.size;
   const px=(x-f.x)/scale,py=(y-f.y-.003*Math.sin(elapsed*.38+f.kind))/scale;
   const qx=Math.cos(angle)*px+Math.sin(angle)*py,qy=-Math.sin(angle)*px+Math.cos(angle)*py;
   let edge;
   if(f.petals>9){
    const x=Math.abs(qx),y=Math.abs(qy);
    const union=(a:number,b:number,k:number)=>{const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b*(1-h)+a*h-k*h*(1-h);};
    const lobes=union(Math.hypot(x-.30,y-.63)-.33,Math.hypot(x-.63,y-.30)-.33,.07);
    edge=1+Math.max(union(lobes,Math.max(x,y)-.49,.09),(1-Math.pow(x/.32,.65)-Math.pow(y/.32,.65))*.24);
   }else edge=Math.hypot(qx,qy)/(.64+f.deep*Math.pow(Math.max(0,Math.min(1,.5+.5*Math.cos(f.petals*Math.atan2(qy,qx)))),.62));
   if(edge<=1)return i;
  }
  return -1;
 };
 const changePalette=(i:number)=>{
  if(i<0)return;
  if(changes[i]<1){queued[i]=(queued[i]+1)%PALETTE_COUNT;return;}
  paletteFrom[i]=paletteTo[i];paletteTo[i]=(paletteTo[i]+1)%PALETTE_COUNT;changes[i]=paused?1:0;
  draw();start();
 };
 const tapFlower=(i:number)=>{if(i<0)return;if(flowerSoundEnabled)play('arrival',{volume:.45});changePalette(i);};
 document.querySelectorAll<HTMLButtonElement>('[data-flower]').forEach(button=>{const i=Number(button.dataset.flower);button.addEventListener('click',()=>tapFlower(i));button.addEventListener('focus',()=>{focused=i;});button.addEventListener('blur',()=>{focused=-1;});});
 canvas.addEventListener('click',event=>tapFlower(hitFlower({x:event.clientX,y:event.clientY})));
 canvas.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;pointer={x:event.clientX,y:event.clientY};});
 const clearPointer=()=>{pointer=null;canvas.style.cursor='';};
 canvas.addEventListener('pointerleave',clearPointer);canvas.addEventListener('pointercancel',clearPointer);addEventListener('blur',clearPointer);addEventListener('scroll',clearPointer,{passive:true});
 const draw=()=>{gl.uniform1f(clock,elapsed);gl.uniform1f(entrance,age);gl.uniform1f(mobileUniform,mobileLayout.matches?1:0);gl.uniform2f(resolution,canvas.width,canvas.height);gl.uniform1f(scaleUniform,sceneScale);gl.uniform1fv(spinUniform,angles);gl.uniform1fv(fromUniform,paletteFrom);gl.uniform1fv(toUniform,paletteTo);gl.uniform1fv(changeUniform,changes);gl.drawArrays(gl.TRIANGLES,0,6);};
 let menuCovered=false;
 const tick=(now:number)=>{
  frame=0;const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(!paused){
   elapsed+=dt;age+=dt;
   for(let i=0;i<5;i++){
    changes[i]=Math.min(1,changes[i]+dt/1.6);
    if(changes[i]===1&&queued[i]){queued[i]--;paletteFrom[i]=paletteTo[i];paletteTo[i]=(paletteTo[i]+1)%PALETTE_COUNT;changes[i]=0;}
   }
   const hovered=focused>=0?focused:hitFlower();canvas.style.cursor=hovered>=0?'pointer':'';
   for(let i=0;i<5;i++){speeds[i]+=((hovered===i?.65:0)-speeds[i])*(1-Math.exp(-dt*3));angles[i]=(angles[i]+speeds[i]*dt)%(Math.PI*2);}
  }
  draw();if(!paused&&visible&&!document.hidden&&!menuCovered)frame=requestAnimationFrame(tick);
 };
 const start=()=>{if(!frame&&visible&&!document.hidden&&!menuCovered){last=0;frame=requestAnimationFrame(tick);}};
 const resize=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);sceneScale=r.width/canvas.parentElement!.getBoundingClientRect().width;canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));gl.viewport(0,0,canvas.width,canvas.height);draw();};
 // Freeze the obscured canvas while the menu animates above its blurred backdrop.
 document.addEventListener('bloom-menu-state',event=>{menuCovered=(event as CustomEvent<boolean>).detail;if(menuCovered){cancelAnimationFrame(frame);frame=0;clearPointer();}else start();});
 new ResizeObserver(resize).observe(canvas);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else{cancelAnimationFrame(frame);frame=0;}}).observe(canvas);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;clearPointer();}else start();});
 reduced.addEventListener('change',()=>{paused=reduced.matches;age=10;if(paused){changes.fill(1);queued.fill(0);}if(paused){cancelAnimationFrame(frame);frame=0;draw();}else start();});
 resize();start();
}
try{init();}catch(error){console.warn('Bloom fallback:',error);canvas.hidden=true;document.querySelector<HTMLElement>('.fallback')!.hidden=false;}
