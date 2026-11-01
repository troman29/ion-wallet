import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { gunzipSync, gzipSync } from 'node:zlib';
import sharp from 'sharp';

const ICONS = [
  'add', 'send', 'earn', 'earn_purple',
  'wallet', 'wallet_solid', 'explore', 'explore_solid', 'settings', 'settings_solid',
];
const LEGACY_ACCENTS = new Set(['0088CC', '0063FF', '2C92F0', '469CEC', '5E6BDE', '95A0FE']);
const hex = (channels) => channels.slice(0, 3)
  .map((value) => Math.round(value * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const rgb = (value) => value.match(/../g).map((channel) => parseInt(channel, 16) / 255);

// Recolor the vector sources and render their reduced-motion/loading previews with
// the same WASM renderer as the app. Read the palette from CSS to avoid drift.
export async function generateActionIcons(root) {
  const variables = await fs.readFile(path.join(root, 'src/styles/variables.scss'), 'utf8');
  const darkStart = variables.indexOf('  &.theme-dark,');
  const sections = { light: variables.slice(0, darkStart), dark: variables.slice(darkStart) };
  const Module = {
    wasmBinary: await fs.readFile(path.join(root, 'src/lib/rlottie/rlottie-wasm.wasm')),
  };
  const ready = new Promise((resolve) => { Module.onRuntimeInitialized = resolve; });
  vm.runInNewContext(await fs.readFile(path.join(root, 'src/lib/rlottie/rlottie-wasm.js'), 'utf8'), {
    Module, console, setTimeout, clearTimeout, WebAssembly, TextDecoder, TextEncoder, performance,
  });
  await ready;
  const init = Module.cwrap('lottie_init', 'number', []);
  const load = Module.cwrap('lottie_load_from_data', 'number', ['number', 'number']);
  const resize = Module.cwrap('lottie_resize', '', ['number', 'number', 'number']);
  const render = Module.cwrap('lottie_render', '', ['number', 'number']);
  const buffer = Module.cwrap('lottie_buffer', 'number', ['number']);
  const destroy = Module.cwrap('lottie_destroy', '', ['number']);

  for (const theme of ['light', 'dark']) {
    const token = (name) => {
      const match = sections[theme].match(new RegExp(`--${name}: #([\\dA-F]{6});`));
      if (!match) throw new Error(`Missing ${theme} token: ${name}`);
      return match[1];
    };
    const accent = token('color-default-accent');
    const text = token('color-black');
    const buttonText = token('color-accent-button-text');
    for (const icon of ICONS) {
      const name = icon === 'earn_purple' ? `earn_${theme}_purple` : `${icon}_${theme}`;
      const animationPath = path.join(root, `src/assets/lottie/${name}.tgs`);
      const previewPath = path.join(root, `src/assets/lottiePreview/${name}.png`);
      const animation = JSON.parse(gunzipSync(await fs.readFile(animationPath)));
      const recolor = (node) => {
        if (!node || typeof node !== 'object') return;
        if (['fl', 'st'].includes(node.ty) && node.c?.a === 0 && Array.isArray(node.c.k)) {
          const original = hex(node.c.k);
          const replacement = LEGACY_ACCENTS.has(original) ? accent
            : ['2C333E', 'F6F7F8'].includes(original) ? text
              : theme === 'dark' && icon.startsWith('earn') && original === 'FFFFFF' ? buttonText : undefined;
          if (replacement) node.c.k = [...rgb(replacement), node.c.k[3] ?? 1];
        }
        Object.values(node).forEach(recolor);
      };
      recolor(animation);
      const json = JSON.stringify(animation);
      const handle = init();
      const ptr = Module.allocate(Module.intArrayFromString(json), 'i8', 0);
      try {
        const frames = load(handle, ptr);
        if (frames !== animation.op - animation.ip) throw new Error(`${name}: invalid frame count`);
        const { width, height } = await sharp(previewPath).metadata();
        resize(handle, width, height);
        for (const frame of [0, Math.floor(frames / 2)]) {
          render(handle, frame);
          const start = buffer(handle);
          const pixels = Buffer.from(Module.HEAPU8.subarray(start, start + width * height * 4));
          if (!pixels.some((value, index) => index % 4 === 3 && value > 0)) throw new Error(`${name}: empty frame ${frame}`);
          if (frame === 0) {
            await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(previewPath);
          }
        }
        await fs.writeFile(animationPath, gzipSync(json));
      } finally {
        destroy(handle);
      }
    }
  }
  console.log('ION action icons: 20 animations recolored, frames 0/30 verified, PNG previews rendered.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateActionIcons(path.resolve(process.argv[2] || '.'));
}
