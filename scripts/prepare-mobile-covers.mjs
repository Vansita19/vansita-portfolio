import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const home=JSON.parse(await fs.readFile('src/data/home.json'));
const projects=JSON.parse(await fs.readFile('src/data/projects.json'));
const media=JSON.parse(await fs.readFile('src/data/featured-media.json'));
const sources=new Set(Object.values(media).map(x=>x.poster));
for(const p of [...home.featured,...home.more])for(const m of p.media)if(m.src&&/\.(png|jpe?g|webp)(\?|$)/i.test(m.src))sources.add(m.src);
for(const p of projects.filter(p=>['travello','my-drip','puch'].includes(p.slug)))for(const m of p.galleries.flat())if(m.type==='image'&&m.src)sources.add(m.src);
sources.add('/assets/1m3F4NdhvGWCrHJQF7JarCOB2s.jpg');
await fs.mkdir('public/assets/mobile-covers',{recursive:true});
const manifest={};let original=0,total=0;
for(const src of sources){
 const input=await fs.readFile(path.join('public',src.split('?')[0]));
 const hash=crypto.createHash('sha256').update(input).digest('hex').slice(0,12);
 const entries=[];
 for(const width of [400,640]){
  const url=`/assets/mobile-covers/${hash}-q40-${width}.webp`;
  const result=await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:40,effort:4}).toBuffer();
  await fs.writeFile(path.join('public',url),result);entries.push({src:url,width});if(width===640)total+=result.length;
 }
 original+=input.length;manifest[src]=entries;
}
await fs.writeFile('src/data/mobile-covers.json',JSON.stringify(manifest,null,2));
console.log(`${sources.size} mobile image sets: ${(original/1e6).toFixed(2)} MB originals → ${(total/1e6).toFixed(2)} MB at 640px, quality 40`);
