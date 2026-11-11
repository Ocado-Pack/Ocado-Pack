// Maps simulation state → visual status. Used by the 3D scene, HTML labels and the tests,
// so a fault in the engine always produces a visible, non-color-only indicator.
// Palette: Okabe–Ito (colorblind-safe). Every status also has an icon, a text label and a shape.
export const STATUS = {
  working: { label: 'WORKING', icon: '▶', shape: 'circle', color: '#0072B2' },
  idle: { label: 'IDLE', icon: '■', shape: 'square-outline', color: '#7a8794' },
  waiting: { label: 'WAITING', icon: '⏸', shape: 'diamond', color: '#E69F00' },
  charging: { label: 'CHARGING', icon: '⚡', shape: 'circle', color: '#56B4E9' },
  charge_fault: { label: 'NOT CHARGING', icon: '⚠', shape: 'triangle', color: '#E69F00' },
  stopped: { label: 'STOPPED', icon: '✕', shape: 'square', color: '#D55E00' },
  nolink: { label: 'NO LINK', icon: '⊘', shape: 'ring', color: '#CC79A7' },
  estop: { label: 'E-STOP', icon: '⛔', shape: 'octagon', color: '#D55E00' },
  isolated: { label: 'ISOLATED', icon: '⊗', shape: 'ring', color: '#6b6b6b' },
  service: { label: 'MAINTENANCE', icon: '🔧', shape: 'square', color: '#6b6b6b' },
  rebooting: { label: 'REBOOTING', icon: '↻', shape: 'ring', color: '#CC79A7' },
};

const STOP_TEXT = { blocked: 'obstacle ahead', loc_lost: 'localization lost', comms_stop: 'link lost (safe stop)', fault: 'drive fault', battery_critical: 'battery critical' };

export function robotVisual(sim, r) {
  let key;
  if (r.state === 'estop') key = 'estop';
  else if (r.state === 'rebooting') key = 'rebooting';
  else if (['in_maintenance', 'to_maintenance'].includes(r.state)) key = 'service';
  else if (r.isolated) key = 'isolated';
  else if (!sim.connected(r) || r.state === 'comms_stop') key = 'nolink';
  else if (['blocked', 'loc_lost', 'fault', 'battery_critical'].includes(r.state)) key = 'stopped';
  else if (r.state === 'charging') key = r.chargeA === 0 ? 'charge_fault' : 'charging';
  else if (['waiting_station', 'waiting_charger'].includes(r.state)) key = 'waiting';
  else if (r.state === 'idle') key = 'idle';
  else key = 'working';
  const st = STATUS[key];
  const detail = STOP_TEXT[r.state] || (r.state === 'waiting_station' ? 'waiting for station' : r.state.replace(/_/g, ' '));
  return { key, ...st, detail };
}

export const STATION_STATUS = (st, inRotation) => st.ready ? (inRotation ? { label: 'READY', icon: '✓', color: '#009E73' } : { label: 'OUT OF ROTATION', icon: '⊗', color: '#6b6b6b' }) : { label: 'UNAVAILABLE', icon: '✕', color: '#D55E00' };
export const AP_STATUS = (ap) => ap.status === 'up' ? { label: 'UP', icon: '✓', color: '#009E73' } : { label: 'DEGRADED', icon: '⚠', color: '#E69F00' };
