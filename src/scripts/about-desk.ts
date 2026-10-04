import { lampClickSound } from './desk-sound';
const stage=document.querySelector<HTMLElement>('.about-desk:not(#experiment-desk) .desk-scene')!;
stage.addEventListener('dragstart',e=>e.preventDefault());
const lamp=stage.querySelector<HTMLButtonElement>('.lamp-switch')!;
lamp.addEventListener('click',()=>{document.querySelectorAll('.lamp-switch').forEach(button=>button.setAttribute('data-discovered',''));const on=lamp.getAttribute('aria-pressed')!=='true';lampClickSound(on);lamp.setAttribute('aria-pressed',String(on));lamp.setAttribute('aria-label',on?'Turn lamp off':'Turn lamp on');});
// The miniature phone layout is decorative, rather than an app launcher.
const phoneLayout=matchMedia('(max-width:700px)');
const laptop=stage.querySelector<HTMLElement>('.personal-laptop')!;
new ResizeObserver(()=>laptop.style.setProperty('--laptop-width',String(laptop.clientWidth))).observe(laptop);
function syncPhoneLaptop(){
 laptop.inert=phoneLayout.matches;
 laptop.classList.add('open');
}
phoneLayout.addEventListener('change',syncPhoneLaptop);
syncPhoneLaptop();

// The phone scene plays once in place; About remains in normal document flow.
const backgroundVideo=stage.querySelector<HTMLVideoElement>('.mobile-day-video');
if(backgroundVideo){
 let visible=false;
 let playPending=false;
 const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
 // Set both the reflected attribute and property before loading for iOS autoplay.
 backgroundVideo.defaultMuted=true;
 backgroundVideo.muted=true;
 backgroundVideo.playsInline=true;
 const prepare=()=>{
  if(!phoneLayout.matches||reducedMotion.matches||backgroundVideo.getAttribute('src'))return;
  backgroundVideo.src=backgroundVideo.dataset.src!;
  backgroundVideo.load();
 };
 const syncBackground=()=>{
  const shouldPlay=visible&&phoneLayout.matches&&!document.hidden&&!reducedMotion.matches;
  backgroundVideo.autoplay=shouldPlay;
  if(!shouldPlay){backgroundVideo.pause();return;}
  prepare();
  if(backgroundVideo.ended||playPending)return;
  backgroundVideo.muted=true;
  playPending=true;
  void backgroundVideo.play().catch(()=>{}).finally(()=>{playPending=false;});
 };
 // Fetch shortly before the scene arrives, then retry playback when media is ready.
 const preload=new IntersectionObserver(entries=>{
  if(entries.some(entry=>entry.isIntersecting))prepare();
 },{rootMargin:'400px'});
 preload.observe(stage);
 const observer=new IntersectionObserver(entries=>{
  visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.15;
  syncBackground();
 },{threshold:[0,.15]});
 observer.observe(stage);
 backgroundVideo.addEventListener('loadeddata',syncBackground);
 backgroundVideo.addEventListener('canplay',syncBackground);
 phoneLayout.addEventListener('change',syncBackground);
 reducedMotion.addEventListener('change',syncBackground);
 document.addEventListener('visibilitychange',syncBackground);
 stage.addEventListener('pointerdown',syncBackground,{passive:true});
}
