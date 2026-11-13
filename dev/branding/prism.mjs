// PRISM: one 512-unit construction shared by every wallet icon export.
// Eight identical kites, 45-degree spacing, a 29-unit central aperture.
// Lighting changes between facets; the geometry does not.
export const PRISM_BACKGROUND = '#100C1F';

const palettes = [
  ['#FFFFFF', '#DCE4FF', '#8180C8'],
  ['#EDF4FF', '#C3CCFA', '#6963B5'],
  ['#E3D9FF', '#AA98ED', '#55458C'],
  ['#EDDEFF', '#B79AEE', '#654C98'],
  ['#F4E3FF', '#C5A6F4', '#7859AD'],
  ['#E4CEFF', '#A480DE', '#5B438C'],
  ['#DCD9FF', '#9295DB', '#4B4C88'],
  ['#F0FAFF', '#C5D7F5', '#727CC1'],
];
const outline = 'M0-178 32-88 0-29-32-88Z';
const smallLeft = 'M0-178 0-29-32-88Z';
const smallRight = 'M0-178 32-88 0-29Z';
const gradient = (id, x1, y1, x2, y2, stops) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('')}</linearGradient>`;

/**
 * Native launchers use an opaque square or a transparent foreground.
 * Desktop/web launchers use rounded corners; in-app avatars use a circle.
 * At <=32 px, two broad facets preserve the material without subpixel bevels.
 * Monochrome and transparent marks contain no background, glow or blur filters.
 */
export function prismSvg({ kind = 'rounded', scale = 1, size = 512, monochrome = false, symbol = true } = {}) {
  if (!['rounded', 'square', 'circle', 'none'].includes(kind)) throw new Error(`Unknown icon shape: ${kind}`);
  const small = size <= 32;
  const hasBackground = kind !== 'none';
  const effects = hasBackground && !small && !monochrome && symbol;
  const defs = [];
  const body = [];
  const shape = kind === 'circle'
    ? '<circle cx="256" cy="256" r="256"/>'
    : `<rect width="512" height="512"${kind === 'rounded' ? ' rx="112"' : ''}/>`;

  if (hasBackground) {
    defs.push(`<linearGradient id="prism-shell" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#29213D"/><stop offset="0.46" stop-color="${PRISM_BACKGROUND}"/><stop offset="1" stop-color="#080811"/></linearGradient>`);
    defs.push('<radialGradient id="prism-ambient" cx="0.45" cy="0.35" r="0.65"><stop stop-color="#5C30A8" stop-opacity="0.28"/><stop offset="1" stop-color="#251343" stop-opacity="0"/></radialGradient>');
    defs.push('<linearGradient id="prism-edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#BCAAD9" stop-opacity="0.42"/><stop offset="0.42" stop-color="#4D4164" stop-opacity="0.16"/><stop offset="0.78" stop-color="#291F42" stop-opacity="0.3"/><stop offset="1" stop-color="#826BBA" stop-opacity="0.3"/></linearGradient>');
    defs.push(`<clipPath id="prism-clip">${shape}</clipPath>`);
    body.push(`<g clip-path="url(#prism-clip)"><g fill="url(#prism-shell)">${shape}</g><g fill="url(#prism-ambient)">${shape}</g>`);
    if (effects) {
      defs.push('<radialGradient id="prism-floor"><stop stop-color="#9060F5" stop-opacity="0.24"/><stop offset="1" stop-color="#9060F5" stop-opacity="0"/></radialGradient>');
      body.push('<ellipse cx="256" cy="419" rx="175" ry="58" fill="url(#prism-floor)"/>');
    }
    if (!small && kind !== 'square') body.push(`<g fill="none" stroke="url(#prism-edge)" stroke-width="2">${shape}</g>`);
    body.push('</g>');
  }

  if (symbol) {
    body.push(`<g transform="translate(256 256) scale(${scale})">`);
    if (effects) {
      defs.push('<filter id="prism-shadow" x="-0.5" y="-0.5" width="2" height="2" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="7"/></filter>');
      defs.push('<radialGradient id="prism-core"><stop stop-color="#D9BDFF" stop-opacity="0.3"/><stop offset="0.3" stop-color="#B78BFF" stop-opacity="0.12"/><stop offset="1" stop-color="#9460FA" stop-opacity="0"/></radialGradient>');
      body.push('<circle r="112" fill="url(#prism-core)"/>');
      body.push(`<g fill="#000000" opacity="0.6" filter="url(#prism-shadow)" transform="translate(0 12)">${palettes.map((_, i) => `<path d="${outline}" transform="rotate(${i * 45})"/>`).join('')}</g>`);
      // Extrusions all follow the same light/depth direction, not the ray rotation.
      body.push(`<g fill="#29213F" transform="translate(0 5)">${palettes.map((_, i) => `<path d="${outline}" transform="rotate(${i * 45})"/>`).join('')}</g>`);
    }

    palettes.forEach(([light, mid, dark], i) => {
      body.push(`<g transform="rotate(${i * 45})">`);
      if (monochrome) {
        body.push(`<path d="${outline}" fill="#FFFFFF"/>`);
      } else if (small) {
        defs.push(gradient(`prism-left-${i}`, -32, -130, 0, -50, [[0, light], [1, mid]]));
        defs.push(gradient(`prism-right-${i}`, 0, -178, 20, -29, [[0, light], [0.55, dark], [1, mid]]));
        body.push(`<path d="${outline}" fill="${mid}"/><path d="${smallLeft}" fill="url(#prism-left-${i})"/><path d="${smallRight}" fill="url(#prism-right-${i})"/>`);
      } else {
        defs.push(gradient(`prism-bevel-${i}`, -32, -138, 34, -52, [[0, '#E9EDFF'], [0.23, light], [0.48, mid], [0.7, dark], [1, '#B09AE1']]));
        defs.push(gradient(`prism-a-${i}`, -24, -88, 24, -88, [[0, mid], [0.85, light], [1, '#FFFFFF']]));
        defs.push(gradient(`prism-b-${i}`, 0, -164, 0, -41, [[0, light], [0.33, mid], [0.55, dark], [1, mid]]));
        defs.push(gradient(`prism-c-${i}`, -24, -88, 0, -41, [[0, light], [0.5, mid], [1, dark]]));
        defs.push(gradient(`prism-d-${i}`, 24, -88, 0, -41, [[0, dark], [1, mid]]));
        body.push(`<path d="${outline}" fill="url(#prism-bevel-${i})"/>`);
        body.push(`<path d="M0-164-24-88 0-92Z" fill="url(#prism-a-${i})"/><path d="M0-164 0-92 24-88Z" fill="url(#prism-b-${i})"/>`);
        body.push(`<path d="M-24-88 0-41 0-92Z" fill="url(#prism-c-${i})"/><path d="M0-92 0-41 24-88Z" fill="url(#prism-d-${i})"/>`);
        body.push('<path d="M0-164V-41" fill="none" stroke="#FFFFFF" stroke-width="0.75" stroke-opacity="0.36"/>');
        body.push('<path d="M0-178-32-88 0-29" fill="none" stroke="#F1EFFF" stroke-width="0.9" stroke-opacity="0.4"/>');
      }
      body.push('</g>');
    });
    body.push('</g>');
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-labelledby="prism-title prism-description">
<title id="prism-title">ION Wallet — PRISM</title>
<desc id="prism-description">Eight identical crystal rays, spaced at 45 degrees, with ice and amethyst facets.</desc>
<defs>${defs.join('\n')}</defs>
${body.join('\n')}
</svg>\n`;
}
