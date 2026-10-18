const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = ['settings.js','ambient.js','tint.js'].map(n=>fs.readFileSync(`${__dirname}/${n}`,'utf8')).join('\n');
const {glyphTint,makeTintClusters,defaultSettings:c} = vm.runInNewContext(code+'\n({glyphTint,makeTintClusters,defaultSettings})');
const candidates = Array.from({length:400},(_,i)=>({x:i%20*18,y:Math.floor(i/20)*20}));
const clusters = makeTintClusters(candidates,0,c);
assert.equal(clusters.length,2);
assert.notEqual(JSON.stringify(clusters),JSON.stringify(makeTintClusters(candidates,1,c)));
let colored=0;
for(let y=0;y<400;y+=20) for(let x=0;x<360;x+=18){
 const t=glyphTint(x,y,0.4,0,c,clusters);
 if(t>0.05)colored++;
 assert.equal(glyphTint(x,y,2.29,0,c,clusters),0);
 assert.equal(glyphTint(x,y,0.4,0,{...c,tint:0},clusters),0);
 assert.equal(glyphTint(x,y,0.4,0.5,c,clusters),0);
}
assert(colored>=6 && colored<=8);
for (const cluster of clusters) {
 const [a,b,d] = cluster.members;
 assert.notEqual((b.x-a.x)*(d.y-a.y),(b.y-a.y)*(d.x-a.x));
 assert(cluster.members.every(p=>Math.hypot(p.x-cluster.x,p.y-cluster.y)<=44));
 assert(glyphTint(a.x,a.y,1.2,0,c,clusters)>0.4);
 assert.equal(glyphTint(a.x,a.y,1.2,0,{...c,tintDuration:0.8},clusters),0);
 assert(glyphTint(a.x,a.y,2.5,0,{...c,tintDuration:3},clusters)>0.4);
}
assert.equal(makeTintClusters([],0,c).length,0);
assert.equal(makeTintClusters(candidates,0,{...c,tintClusters:0}).length,0);
console.log('PASS: sparse neighboring accents, idle activation, disappearance, new locations, gray toggle, protected crest');
const large = Array.from({length:4000},(_,i)=>({x:i%80*18,y:Math.floor(i/80)*20}));
for (const count of [0,1,6,12]) for (const glyphs of [1,2,3,7,12]) {
 const groups=makeTintClusters(large,2,{...c,tintClusters:count,tintGlyphs:glyphs});
 assert.equal(groups.length,count);
 const occupied=new Set();
 for(const group of groups){
  assert.equal(group.members.length,glyphs);
  for(const point of group.members){
   const key=`${point.x}:${point.y}`;
   assert(!occupied.has(key)); occupied.add(key);
  }
 }
}
console.log('PASS: independent integer cluster and glyph counts, no duplicated members');
