import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';

// Small vector illustrations replace inherited TON-branded stickers. Shapes are
// shared by the Lottie animation and its static (reduced-motion) preview.
export async function generateIllustrations(root, mark) {
  const glyphs = {
    ion_receipt: [[[113,108],[113,130],[129,130],[129,108],[113,108]],[[117,115],[125,115]],[[117,121],[125,121]]],
    ion_complete: [[[110,120],[118,128],[132,111]]],
    ion_guard: [[[111,117],[111,132],[131,132],[131,117],[111,117]],[[115,117],[115,111],[121,107],[127,111],[127,117]]],
    ion_happy: [[[110,120],[118,128],[132,111]]],
    ion_welcome: [[[109,120],[132,120]],[[124,111],[133,120],[124,129]]],
    'ion_no-data': [[[109,110],[125,110],[125,126],[109,126],[109,110]],[[125,126],[133,134]]],
    ion_transfer: [[[109,120],[132,120]],[[124,111],[133,120],[124,129]]],
    ion_privacy: [[[111,117],[111,132],[131,132],[131,117],[111,117]],[[115,117],[115,111],[121,107],[127,111],[127,117]]],
    ion_growth: [[[109,130],[109,123],[117,123],[117,116],[125,116],[125,109],[133,109]]],
    ion_approved: [[[110,120],[118,128],[132,111]]],
    ion_secure: [[[111,117],[111,132],[131,132],[131,117],[111,117]],[[115,117],[115,111],[121,107],[127,111],[127,117]]],
    ion_wait: [[[121,109],[121,121],[130,125]]],
    ion_success: [[[110,120],[118,128],[132,111]]],
  };
  const polygons = mark.split('M').filter(Boolean).map((part) => {
    const nums = part.match(/-?\d*\.?\d+/g).map(Number);
    return Array.from({length: nums.length/2}, (_, i) => [nums[i*2]*2.25+34,nums[i*2+1]*2.25+35]);
  });
  const shapePath = (vertices, closed) => ({ i: vertices.map(()=>[0,0]), o: vertices.map(()=>[0,0]), v: vertices, c: closed });
  const fill = (color) => ({ty:'fl',c:{a:0,k:color},o:{a:0,k:100},r:1});
  const transform = {ty:'tr',p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}};
  for (const [name, lines] of Object.entries(glyphs)) {
    const groups = lines.map((points)=>({ty:'gr',it:[{ty:'sh',ks:{a:0,k:shapePath(points,false)}},{ty:'st',c:{a:0,k:[17/255,7/255,60/255,1]},o:{a:0,k:100},w:{a:0,k:3},lc:2,lj:2},transform]}));
    groups.push({ty:'gr',it:[{ty:'el',p:{a:0,k:[121,120]},s:{a:0,k:[43,43]}},fill([0.91,0.89,1,1]),transform]});
    groups.push({ty:'gr',it:[...polygons.map((v)=>({ty:'sh',ks:{a:0,k:shapePath(v,true)}})),fill([1,1,1,1]),transform]});
    groups.push({ty:'gr',it:[{ty:'el',p:{a:0,k:[80,80]},s:{a:0,k:[132,132]}},fill([17/255,7/255,60/255,1]),transform]});
    const animation={v:'5.7.4',fr:30,ip:0,op:60,w:160,h:160,nm:`ION ${name.replace('ion_','')}`,ddd:0,assets:[],layers:[{ddd:0,ind:1,ty:4,nm:'ION',sr:1,ks:{o:{a:0,k:100},r:{a:0,k:0},p:{a:0,k:[80,80,0]},a:{a:0,k:[80,80,0]},s:{a:1,k:[{t:0,s:[96,96,100],e:[100,100,100],o:{x:[0.33],y:[0]},i:{x:[0.67],y:[1]}},{t:30,s:[100,100,100],e:[96,96,100],o:{x:[0.33],y:[0]},i:{x:[0.67],y:[1]}},{t:60,s:[96,96,100]}]}},ao:0,shapes:groups,ip:0,op:60,st:0,bm:0}]};
    await fs.writeFile(path.join(root,`src/assets/lottie/${name}.tgs`),gzipSync(JSON.stringify(animation)));
    const preview=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><circle cx="80" cy="80" r="66" fill="#11073C"/>${polygons.map(p=>`<polygon points="${p.map(v=>v.join(',')).join(' ')}" fill="white"/>`).join('')}<circle cx="121" cy="120" r="21.5" fill="#e8e3ff"/>${lines.map(p=>`<polyline points="${p.map(v=>v.join(',')).join(' ')}" fill="none" stroke="#11073C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
    await sharp(Buffer.from(preview)).resize(320).png().toFile(path.join(root,`src/assets/lottiePreview/${name}.png`));
  }
}
