const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const sharp = require('sharp');
const root = process.cwd();
const lib = path.join(root, 'src/lib/rlottie');
const Module = { wasmBinary: fs.readFileSync(path.join(lib, 'rlottie-wasm.wasm')) };
const ready = new Promise((resolve) => { Module.onRuntimeInitialized = resolve; });
vm.runInNewContext(fs.readFileSync(path.join(lib, 'rlottie-wasm.js'), 'utf8'), {
  Module, console, setTimeout, clearTimeout, WebAssembly,
  TextDecoder, TextEncoder, performance,
});
(async () => {
  await ready;
  const init = Module.cwrap('lottie_init', 'number', []);
  const load = Module.cwrap('lottie_load_from_data', 'number', ['number','number']);
  const resize = Module.cwrap('lottie_resize', '', ['number','number','number']);
  const render = Module.cwrap('lottie_render', '', ['number','number']);
  const buffer = Module.cwrap('lottie_buffer', 'number', ['number']);
  const destroy = Module.cwrap('lottie_destroy', '', ['number']);
  const files = fs.readdirSync('src/assets/lottie').filter((f) => f.startsWith('ion_'));
  fs.mkdirSync(path.dirname(process.argv[2] || 'work/ion-animation-check.png'), { recursive: true });
  const tiles=[];
  for (let i=0;i<files.length;i++) {
    const json=zlib.gunzipSync(fs.readFileSync(`src/assets/lottie/${files[i]}`)).toString();
    const ptr=Module.allocate(Module.intArrayFromString(json),'i8',0);
    const handle=init(); const frames=load(handle,ptr); resize(handle,160,160);
    if(frames!==60) throw new Error(`${files[i]}: invalid frame count ${frames}`);
    render(handle,30); const start=buffer(handle);
    const pixels=Buffer.from(Module.HEAPU8.subarray(start,start+160*160*4));
    if(!pixels.some((v,idx)=>idx%4===3&&v>0)) throw new Error(`${files[i]}: empty frame`);
    tiles.push({input:await sharp(pixels,{raw:{width:160,height:160,channels:4}}).png().toBuffer(),left:(i%7)*160,top:Math.floor(i/7)*160});
    destroy(handle);
  }
  await sharp({create:{width:1120,height:Math.ceil(files.length/7)*160,channels:4,background:'#f0eef8'}}).composite(tiles).png().toFile(process.argv[2] || 'work/ion-animation-check.png');
  console.log(`RLottie: ${files.length} animations loaded, 60 frames each, frame 30 rendered.`);
  const ios=await sharp('mobile/ios/App/App/Resources/IONWallet/Assets.xcassets/AppIcon.appiconset/AppIcon.png').metadata();
  if(ios.hasAlpha||ios.width!==1024||ios.height!==1024) throw new Error('Invalid iOS app icon');
  console.log('iOS icon: 1024 x 1024, no alpha.');
})().catch((e)=>{console.error(e);process.exitCode=1;});

