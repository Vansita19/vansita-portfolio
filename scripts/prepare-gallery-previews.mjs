import sharp from 'sharp';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const texts=await Promise.all(['src/data/playground.json','src/data/home.json'].map(p=>fs.readFile(p,'utf8')));
const urls=[...new Set(texts.join('\n').match(/\/assets\/[^"\s]+\.(?:png|jpe?g|webp)(?:\?[^"\s]*)?/g))];
const map={};let before=0,after=0;
await fs.mkdir('public/assets/previews',{recursive:true});
for(const url of urls){
 const bytes=await fs.readFile('public'+url.split('?')[0]);
 const key=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
 const dest='/assets/previews/'+key+'.webp';
 const preview=await sharp(bytes).resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).keepMetadata().webp({lossless:true,effort:4}).toBuffer();
 if(preview.length<bytes.length){await fs.writeFile('public'+dest,preview);map[url]=dest;before+=bytes.length;after+=preview.length;}
}
await fs.writeFile('src/data/gallery-previews.json',JSON.stringify(map,null,2)+'\n');
console.log(`${Object.keys(map).length} previews: ${(before/1e6).toFixed(1)} MB → ${(after/1e6).toFixed(1)} MB; originals retained`);
