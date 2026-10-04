import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const routes=['','pitch-protocol','turboml','shapeshifter','puch','my-drip','docus','gfvc','venture-os','ether','travello','playground'];
const root=resolve('dist');
const errors=[];
for(const route of routes){
 const file=join(root,route,'index.html');
 if(!existsSync(file)){errors.push(`Missing route /${route}`);continue;}
 const html=readFileSync(file,'utf8');
 if(/framerusercontent\.com|events\.framer\.com|vansitadesign\.framer\.website/.test(html))errors.push(`Framer dependency on /${route}`);
 if(!/<title>[^<]+<\/title>/.test(html))errors.push(`Missing title on /${route}`);
 for(const match of html.matchAll(/(?:src|poster|href)="(\/[^"#?]*)[^" ]*"/g)){
  const target=decodeURIComponent(match[1]);
  if(!existsSync(join(root,target))&&!existsSync(join(root,target,'index.html')))errors.push(`Missing ${target} on /${route}`);
 }
}
assert.equal(errors.length,0,errors.join('\n'));
const walk=d=>readdirSync(d).flatMap(f=>statSync(join(d,f)).isDirectory()?walk(join(d,f)):[join(d,f)]);
for(const f of walk(root).filter(f=>/\.(css|js)$/.test(f))){
 const code=readFileSync(f,'utf8');
 assert(!/https?:\/\/[^\s"')]*framerusercontent/.test(code),`Remote Framer dependency in ${f}`);
 for(const m of code.matchAll(/url\(["']?(\/assets\/[^"')]+)["']?\)/g))assert(existsSync(join(root,m[1].split(/[?#]/)[0])),`Missing CSS asset ${m[1]}`);
}
console.log(`Verified ${routes.length} routes, page metadata, internal links, local assets, and independence from Framer.`);

// Production must render the reviewed case study, not the legacy DEV-only branch.
const pitch=readFileSync(join(root,'pitch-protocol/index.html'),'utf8');
for(const marker of ['local-pitch-draft','pitch-draft-hero','Pitch Protocol connects founders with investors','interaction-design','Systems thinking'.toLowerCase()]) {
 assert(pitch.includes(marker), `Production Pitch Protocol is missing: ${marker}`);
}
console.log('Verified updated Pitch Protocol copy, layout, cover, scope, and navigation in production output.');

// Each case study recommends its neighbors in the homepage sequence.
const { load } = await import('cheerio');
const recommendations = {
 'pitch-protocol': ['venture-os', 'turboml', 'shapeshifter'],
 'venture-os': ['pitch-protocol', 'turboml', 'shapeshifter'],
 turboml: ['venture-os', 'shapeshifter', 'gfvc'],
 shapeshifter: ['turboml', 'gfvc', 'docus'],
 gfvc: ['turboml', 'shapeshifter', 'docus'],
 docus: ['turboml', 'shapeshifter', 'gfvc'],
 travello: ['pitch-protocol', 'venture-os', 'turboml'],
 puch: ['pitch-protocol', 'venture-os', 'turboml'],
 'my-drip': ['pitch-protocol', 'venture-os', 'turboml'],
 ether: ['pitch-protocol', 'venture-os', 'turboml'],
};
for (const [slug, expected] of Object.entries(recommendations)) {
 const $ = load(readFileSync(join(root, slug, 'index.html'), 'utf8'));
 if (!$('body').hasClass('case-light')) continue;
 const actual = $('.case-related-link').map((_, el) => $(el).attr('href').replace(/^\//, '')).get();
 assert.deepEqual(actual, expected, `Incorrect related projects on ${slug}`);
}
console.log('Verified three ordered project recommendations across all ten case studies.');
