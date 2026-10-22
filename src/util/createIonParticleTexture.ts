// Four diagonal rays from assets/blockchain/chain_ton.svg form an X-shaped star.
const ION_PATH = [
  'M34.8268 5.77344L24.4988 13.3357L21.3555 19.1078L27.2196 15.9641L34.8268 5.77344Z',
  'M6.07812 34.2289L16.4061 26.6667L19.5494 20.8945L13.6854 24.0382L6.07812 34.2289Z',
  'M35.0034 34.0579L27.27 23.9585L21.3672 20.8848L24.582 26.6189L35.0034 34.0579Z',
  'M5.90234 5.94531L13.6358 16.0448L19.5385 19.1185L16.3237 13.3842L5.90234 5.94531Z',
].join('');

export default function createIonParticleTexture(gl: WebGLRenderingContext) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;

  // Padding keeps the tips inside the point sprite while it rotates.
  context.translate(20, 20);
  context.scale(88 / 40.9064, 88 / 40.0019);
  context.fillStyle = '#fff';
  context.fill(new Path2D(ION_PATH));

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}
