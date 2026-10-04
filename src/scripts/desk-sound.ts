import { play } from 'cuelume';
export function lampClickSound(on:boolean){
 try { if(localStorage.getItem('bloom-flower-sound')==='off')return; } catch {}
 play(on?'tick':'press',{volume:.3});
}

export function deskTapSound(kind:'book'|'drink'){
 try { if(localStorage.getItem('bloom-flower-sound')==='off')return; } catch {}
 play(kind==='book'?'press':'tick',{volume:kind==='book'?.65:.6});
}
