import sharp from 'sharp';
import fs from 'node:fs/promises';
const projects=JSON.parse(await fs.readFile('src/data/projects.json','utf8'));
const urls=[...new Set(JSON.stringify(projects).match(/\/assets\/[^"\s]+\.png(?:\?[^"\s]*)?/g))];
const result={};let saved=0;
for(const url of urls){
 const path='public'+url.split('?')[0];const output=path.replace(/\.png$/,'.lossless.webp');
 const original=await fs.readFile(path);
 const encoded=await sharp(original).keepMetadata().webp({lossless:true,effort:4}).toBuffer();
 const [a,b]=await Promise.all([sharp(original).ensureAlpha().raw().toBuffer(),sharp(encoded).ensureAlpha().raw().toBuffer()]);
 if(!a.equals(b)){console.log('Keeping original to preserve exact pixels: '+path);continue;}
 if(encoded.length<original.length){await fs.writeFile(output,encoded);result[url]=output.slice(6);saved+=original.length-encoded.length;}
}
await fs.writeFile('src/data/case-image-sources.json',JSON.stringify(result,null,2)+'\n');
console.log(Object.keys(result).length+' pixel-identical lossless images; '+(saved/1e6).toFixed(1)+' MB saved');
