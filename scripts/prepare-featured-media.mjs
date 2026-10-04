// GFVC starts with an empty fade: use its opening logo at 2s for the poster.
// Generate lightweight card videos and matching first-frame posters; keep originals.
// Usage: FFMPEG=/path/to/ffmpeg node scripts/prepare-featured-media.mjs
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
const home=JSON.parse(await fs.readFile('src/data/home.json','utf8'));
const manifest={};
await fs.mkdir('public/assets/featured',{recursive:true});
for(const project of home.featured){
 const original=project.href==='/gfvc'?'/assets/growth-factory-intro-1080p.mp4':project.media[2].src.replace('.mov','.mp4');
 const input='public'+original.split('?')[0];
 const slug=project.href.slice(1);
 const poster=`/assets/featured/${slug}.webp`;
 if(/\.mp4$/.test(original)){
  const src=`/assets/featured/${slug}.mp4`;
  execFileSync(process.env.FFMPEG||'ffmpeg',['-y','-i',input,'-an','-vf','scale=1200:-2,fps=24','-c:v','libx264','-crf','25','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','public'+src],{stdio:['ignore','ignore','pipe']});
  const frame=execFileSync(process.env.FFMPEG||'ffmpeg',['-ss',slug==='gfvc'?'2':'0','-i','public'+src,'-frames:v','1','-f','image2pipe','-vcodec','png','-'],{maxBuffer:20*1024*1024,stdio:['ignore','pipe','ignore']});
  await sharp(frame).webp({quality:85}).toFile('public'+poster);
  manifest[project.href]={src,poster};
 }else{
  await sharp(input).resize({width:1200,withoutEnlargement:true}).webp({quality:85}).toFile('public'+poster);
  manifest[project.href]={src:poster,poster};
 }
 console.log(slug,manifest[project.href]);
}
await fs.writeFile('src/data/featured-media.json',JSON.stringify(manifest,null,2)+'\n');
