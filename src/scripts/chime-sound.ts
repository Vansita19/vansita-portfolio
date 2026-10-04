let context:AudioContext|undefined;
let lastTone=0;
export function unlockChime(){
 try{context??=new AudioContext();if(context.state==='suspended')void context.resume().catch(()=>{});}catch{}
}
export function chimeTone(index:number){
 try{if(localStorage.getItem('bloom-flower-sound')==='off')return;}catch{}
 if(!context||context.state!=='running'||performance.now()-lastTone<95)return;
 lastTone=performance.now();
 const now=context.currentTime;
 const frequency=[659.25,783.99,880,987.77,1174.66][index%5];
 // Quiet inharmonic overtones give each strike a glass-and-metal decay.
 for(const [ratio,level,decay] of [[1,.065,1.7],[2.76,.015,.8],[5.4,.004,.3]]){
  const oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.frequency.value=frequency*ratio;oscillator.type='sine';
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+decay);
  oscillator.connect(gain).connect(context.destination);oscillator.start(now);oscillator.stop(now+decay+.05);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
 }
}
