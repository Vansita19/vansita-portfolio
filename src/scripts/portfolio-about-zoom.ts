import { lampClickSound } from './desk-sound';
const root=document.querySelector<HTMLElement>('.portfolio-about')!;
const enabled=matchMedia('(min-width:701px) and (prefers-reduced-motion:no-preference)');
const journey=root.querySelector<HTMLElement>('.journey')!;
const stage=root.querySelector<HTMLElement>('.stage')!;
const frame=root.querySelector<HTMLElement>('.desk-frame')!;
const backdrop=root.querySelector<HTMLVideoElement>('video.desk-backdrop')!;
let videoProgress=0, nightReached=false;
function updateVideo(){
 if(!Number.isFinite(backdrop.duration)||!enabled.matches)return;
 backdrop.pause();
 const end=Math.max(0,backdrop.duration-.04);
 // Seek only to actual frames, keeping at most one decode in flight.
 const target=Math.min(end,Math.round(videoProgress*end*24)/24);
 if(!backdrop.seeking && Math.abs(target-backdrop.currentTime)>1/48)backdrop.currentTime=target;
 const night=videoProgress>=.99;
 if(night!==nightReached){
  nightReached=night;
  lamp.setAttribute('aria-pressed',String(night));
  lamp.setAttribute('aria-label',night?'Turn lamp off':'Turn lamp on');
  if(night)lamp.setAttribute('data-discovered','');
 }
}
backdrop.muted=true;
backdrop.addEventListener('loadeddata',updateVideo);
backdrop.addEventListener('seeked',updateVideo);
backdrop.addEventListener('error',schedule);
const videoLoader=new IntersectionObserver(entries=>{
 if(!enabled.matches||!entries.some(entry=>entry.isIntersecting))return;
 const source=backdrop.querySelector('source')!;source.src=source.dataset.src!;backdrop.load();videoLoader.disconnect();
},{rootMargin:'1000px'});videoLoader.observe(journey);
const about=root.querySelector<HTMLElement>('.about')!;
const preview=root.querySelector<HTMLElement>('.screen-preview')!;
stage.append(preview);
frame.querySelector<HTMLElement>('.personal-laptop')!.inert=true;
const lamp=frame.querySelector<HTMLButtonElement>('.lamp-switch')!;
lamp.addEventListener('click',()=>{document.querySelectorAll('.lamp-switch').forEach(button=>button.setAttribute('data-discovered',''));
 const on=lamp.getAttribute('aria-pressed')!=='true';
 lampClickSound(on);
 lamp.setAttribute('aria-pressed',String(on));
 lamp.setAttribute('aria-label',on?'Turn lamp off':'Turn lamp on');
});
const physicalScreen=frame.querySelector<HTMLElement>('.screen')!;
const corners=[[0,0],[100,0],[100,100],[0,100]].map(([x,y])=>{
 const marker=document.createElement('i');
 Object.assign(marker.style,{position:'absolute',left:`${x}%`,top:`${y}%`,width:'0',height:'0',pointerEvents:'none'});
 physicalScreen.append(marker);return marker;
});
function updateClock(){
 const now=new Date();
 frame.querySelector('.clock')!.textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 frame.querySelector('.laptop-date')!.textContent=now.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
}
updateClock();setInterval(updateClock,60000);
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
about.querySelector('.about-signature')?.classList.add('is-drawn');
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};
let scale=1,dx=0,dy=0,queued=false;
let cx=0,cy=0,sw=0,sh=0;
let lastDistance=-1,lastZoom=-1,lastOpening=-1,phaseLength=1;
function measure(){
 document.documentElement.classList.toggle('about-motion-ready',enabled.matches);
 if(!enabled.matches)return;
 frame.style.transform='none';
 const laptop=frame.querySelector<HTMLElement>('.personal-laptop')!;
 laptop.style.setProperty('--laptop-width',String(laptop.clientWidth));
 const stageRect=stage.getBoundingClientRect();
 const screenRect=physicalScreen.getBoundingClientRect();
 const points=corners.map(marker=>{const r=marker.getBoundingClientRect();return {x:r.left-screenRect.left,y:r.top-screenRect.top};});
 preview.style.clipPath=`polygon(${points.map(pt=>`${pt.x/screenRect.width*100}% ${pt.y/screenRect.height*100}%`).join(',')})`;
 cx=screenRect.left-stageRect.left+screenRect.width/2;
 cy=screenRect.top-stageRect.top+screenRect.height/2;
 sw=screenRect.width;sh=screenRect.height;
 frame.style.transformOrigin=`${cx-frame.offsetLeft}px ${cy-frame.offsetTop}px`;
 const insetX=Math.max(...points.map(pt=>Math.min(pt.x,sw-pt.x)));
 const insetY=Math.max(...points.map(pt=>Math.min(pt.y,sh-pt.y)));
 scale=Math.max(stage.clientWidth/(sw-2*insetX),stage.clientHeight/(sh-2*insetY))*1.005;
 dx=stage.clientWidth/2-cx;dy=stage.clientHeight/2-cy;
 about.style.width=`${stage.clientWidth}px`;
 about.style.height=`${stage.clientHeight}px`;
 phaseLength=Math.max(1,stage.clientHeight*2);
 // Rasterize the live page at its final reading size. Downscale the whole
 // preview into the laptop instead of enlarging a tiny composited text layer.
 Object.assign(preview.style,{left:`${cx-sw*scale/2}px`,top:`${cy-sh*scale/2}px`,width:`${sw*scale}px`,height:`${sh*scale}px`});
 about.style.transform='translate(-50%,-50%)';
 lastDistance=-1;lastZoom=-1;lastOpening=-1;

 schedule();
}
function render(){
 queued=false;
 if(!enabled.matches)return;
 // Keep the stage pinned through both phases, then hold the full About page.
 // Follow native scroll directly; no extra settling loop or delayed catch-up.
 const distance=Math.min(phaseLength*1.9,Math.max(0,-journey.getBoundingClientRect().top));
 if(distance===lastDistance)return;
 lastDistance=distance;
 const p=clamp(distance/phaseLength);
 videoProgress=p;
 updateVideo();
 const zoomProgress=clamp((distance-phaseLength)/(phaseLength*.9));
 const zoom=smooth(zoomProgress);
 if(zoom!==lastZoom){
 lastZoom=zoom;
 const currentScale=Math.exp(Math.log(scale)*zoom);
 frame.style.transform=reduce.matches?'none':`translate(${dx*zoom}px,${dy*zoom}px) scale(${currentScale})`;
 // Project the same screen rectangle, with no independent growth beyond its bezel.
 preview.style.transform=`translate(${dx*zoom}px,${dy*zoom}px) scale(${currentScale/scale})`;
 preview.style.willChange=zoom>=1?'auto':'transform';
 // Once covered by the page, stop compositing the greatly enlarged desk.
 frame.style.visibility=zoom>=1?'hidden':'visible';
 frame.style.willChange=zoom>=1?'auto':'transform';
 about.style.setProperty('--postcard-reveal',String(smooth((zoomProgress-.25)/.35)));
 about.inert=zoom<1;
 about.style.pointerEvents=zoom>=1?'auto':'none';
 }
 // Leave the desktop untouched until midday, then open the complete About card.
 const opening=smooth((p-.5)/.12);
 if(opening!==lastOpening){lastOpening=opening;preview.style.setProperty('--page-open',String(opening));}
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(render);}}
window.addEventListener('scroll',schedule,{passive:true});
window.addEventListener('resize',measure);
reduce.addEventListener('change',measure);
const observer=new ResizeObserver(measure);observer.observe(frame);observer.observe(stage);
enabled.addEventListener('change',measure);
measure();
export {};
