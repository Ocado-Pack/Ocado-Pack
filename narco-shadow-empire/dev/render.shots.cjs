// Screenshot matrix for the rendering core. Run from the project root:
//   node tools/shot.cjs "dev/render.html?quality=medium" --w 960 --h 540 --scenario dev/render.shots.cjs
// Environment: SHOT_DIR (default dev/out), SHOTS (comma-separated names to keep it short), e.g. SHOTS=night-rain,noon-overcast
// Each entry: [name, {time, weather, intensity?, cam?, quality?, res?}]. The report lists the numbers behind every image.
const path = require('node:path');

const MATRIX = [
  ['night-rain', { time: 22.5, weather: 'rain', cam: 'street' }],
  ['night-rain-low', { time: 22.5, weather: 'rain', cam: 'low' }],
  ['night-rain-wide', { time: 22.5, weather: 'rain', cam: 'wide' }],
  ['night-storm', { time: 23.5, weather: 'storm', cam: 'street' }],
  ['night-clear-sky', { time: 22.5, weather: 'clear', cam: 'moon' }],
  ['night-clear', { time: 1, weather: 'clear', cam: 'street' }],
  ['dawn-fog', { time: 6.3, weather: 'fog', cam: 'street' }],
  ['dawn-clear', { time: 6.3, weather: 'clear', cam: 'wide' }],
  ['noon-overcast', { time: 12.5, weather: 'overcast', cam: 'street' }],
  ['noon-clear', { time: 12.5, weather: 'clear', cam: 'wide' }],
  ['noon-rain', { time: 13, weather: 'rain', cam: 'street' }],
  ['afternoon-dust', { time: 16, weather: 'dust', cam: 'street' }],
  ['dusk-clear', { time: 19.05, weather: 'clear', cam: 'wide' }],
  ['dusk-sky', { time: 18.6, weather: 'clear', cam: 'sun' }],
];

module.exports = async ({ evalJs, shot }) => {
  const dir = process.env.SHOT_DIR || path.join('dev', 'out');
  const only = (process.env.SHOTS || '').split(',').filter(Boolean);
  const out = {};
  for (const [name, state] of MATRIX) {
    if (only.length && !only.includes(name)) continue;
    const i = await evalJs(`window.__h.set(${JSON.stringify(state)}, 4)`);
    out[name] = `${i.bufferW}x${i.bufferH} ${i.preset} ${i.post ? 'post' : 'direct'} calls ${i.drawCalls} tris ${i.triangles} exp ${i.exposure} wet ${i.wetness} rain ${i.weatherStats ? i.weatherStats.streaks : '-'}`;
    await shot(path.join(dir, name + '.png'));
  }
  return out;
};
