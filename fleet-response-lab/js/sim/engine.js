// =============================================================================
// SIMULATED fulfillment system engine.
// Order service → Task scheduler → Fleet manager → Robot → Picking station → Order completion
// Everything here is fictional and simplified for training. It does NOT model any
// real vendor's robots, software, APIs, or procedures.
//
// Design rule: ONE shared state object (sim.s). The 3D scene, logs, metrics, alarms,
// task records and checks all read from it, so symptoms stay consistent.
// =============================================================================
import { rngNext, fmtClock, clamp, round, deepClone } from '../util.js';

export const AISLES = { A: -24, B: -8, C: 8, D: 24 };
export const SLOT_Z = [-10, -7, -4, -1, 2, 5, 8, 11, 14];
export const ROAD_Z = -15;
export const NORTH_Z = 18;
export const STATIONS = { 'P-1': { x: -21, z: -21 }, 'P-2': { x: -7, z: -21 }, 'P-3': { x: 7, z: -21 }, 'P-4': { x: 21, z: -21 } };
export const CHARGERS = { 'C-1': { x: 37, z: -27 }, 'C-2': { x: 37, z: -24 }, 'C-3': { x: 37, z: -21 }, 'C-4': { x: 37, z: -18 } };
export const MAINT = { x: -34, z: -8 };
export const APS = {
  'AP-1': { zone: 'A', x: -24, z: 2 }, 'AP-2': { zone: 'B', x: -8, z: 2 }, 'AP-3': { zone: 'C', x: 8, z: 2 },
  'AP-4': { zone: 'D', x: 24, z: 2 }, 'AP-5': { zone: 'S', x: 8, z: -21 },
};
export const ZONE_AP = { A: 'AP-1', B: 'AP-2', C: 'AP-3', D: 'AP-4', S: 'AP-5' };
export const SERVICES = ['order-service', 'task-scheduler', 'inventory-service', 'fleet-manager', 'station-service', 'robot-gateway'];
export const SERVICE_DEPS = {
  'order-service': ['task-scheduler'],
  'task-scheduler': ['inventory-service', 'fleet-manager', 'station-service'],
  'inventory-service': [],
  'fleet-manager': ['robot-gateway'],
  'station-service': [],
  'robot-gateway': [],
};
export const STOPPED_STATES = ['blocked', 'loc_lost', 'comms_stop', 'fault', 'estop', 'battery_critical'];
const ROBOT_SPEED = 1.5;

export function zoneOf(x, z) {
  if (z < ROAD_Z + 0.6) return 'S';
  if (x < -16) return 'A';
  if (x < 0) return 'B';
  if (x < 16) return 'C';
  return 'D';
}
export function locPos(loc) {
  const [a, n] = loc.split('-');
  const i = Math.floor((parseInt(n, 10) - 1) / 2);
  return { x: AISLES[a], z: SLOT_Z[i], aisle: a };
}
export function aisleAt(x) {
  for (const [a, ax] of Object.entries(AISLES)) if (Math.abs(x - ax) < 0.6) return a;
  return null;
}

export class Sim {
  constructor(opts = {}) {
    this.listeners = new Set();
    if (opts.snapshot) { this.s = deepClone(opts.snapshot); return; }
    const seed = (opts.seed ?? 12345) >>> 0;
    this.s = {
      seed, rng: seed, t: 0, step: 0, clock0: opts.clock0 ?? 6 * 3600,
      ids: { order: 1001, task: 5001, log: 1, alarm: 1, session: 40, corr: 0 },
      robots: [], tasks: {}, taskIds: [], orders: {}, orderIds: [],
      stations: {}, chargers: {}, aps: {}, inventory: {}, skuLocs: {}, pickedKeys: {},
      services: {}, config: {
        ackTimeoutMs: 5000, maxRedeliveries: 3, reserveTimeoutMs: 3000, schedulerConcurrency: 4,
        inventoryPoolMax: 50, stationRotation: { 'P-1': true, 'P-2': true, 'P-3': true, 'P-4': true },
        orderIntervalMin: 14, orderIntervalMax: 26,
      },
      releases: [], faults: {}, events: [], logs: [], alarms: [], samples: [], winEv: [],
      counters: { completed: 0, failed: 0, aborted: 0, dupIgnored: 0, dupPickPrevented: 0 },
      fm: { assignments: {}, reachable: {}, lastHeard: {} },
      restricted: {}, lockouts: {}, audit: [], preserved: [], evidenceLost: [], incidents: [],
      nextOrderAt: 3, lastSample: -999, lastAlarmEval: 0, stationRR: 0, pendingOps: [],
      autoOrders: opts.autoOrders ?? true,
    };
    this._build(opts);
  }

  // ---------------------------------------------------------------- RNG/time
  rand() { const [v, n] = rngNext(this.s.rng); this.s.rng = n; return v; }
  randInt(a, b) { return a + Math.floor(this.rand() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.rand() * arr.length)]; }
  clock(t = this.s.t) { return this.s.clock0 + t; }
  clockStr(t = this.s.t, ms = false) { return fmtClock(this.clock(t), ms); }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, data) { for (const fn of this.listeners) { try { fn(type, data); } catch (e) { console.error(e); } } }
  snapshot() { return deepClone(this.s); }
  static fromSnapshot(snap) { return new Sim({ snapshot: snap }); }
  clone() { return Sim.fromSnapshot(this.s); }

  // ---------------------------------------------------------------- build
  _build() {
    const s = this.s;
    // Inventory: 4 aisles x 18 locations; 36 SKUs each stored in 2 aisles.
    const locs = [];
    for (const a of Object.keys(AISLES)) for (let n = 1; n <= 18; n++) locs.push(`${a}-${String(n).padStart(2, '0')}`);
    for (let k = 0; k < 36; k++) {
      const sku = `SKU-${3100 + k}`;
      const l1 = locs[k], l2 = locs[(k + 36) % 72];
      s.skuLocs[sku] = [l1, l2];
      for (const l of [l1, l2]) s.inventory[l] = { sku, sys: 20 + this.randInt(0, 40), phys: 0, reserved: 0, hold: false, lastCount: null, note: null };
    }
    for (const l of Object.keys(s.inventory)) s.inventory[l].phys = s.inventory[l].sys;

    for (const id of Object.keys(STATIONS)) s.stations[id] = { id, ...STATIONS[id], ready: true, reason: null, kind: null, busyUntil: 0, serving: null, served: 0, hmi: 'READY', scanner: 'OK', lastHeartbeat: 0 };
    for (const id of Object.keys(CHARGERS)) s.chargers[id] = { id, ...CHARGERS[id], status: 'available', occupiedBy: null, outputA: 0, fault: null };
    for (const id of Object.keys(APS)) s.aps[id] = { id, ...APS[id], status: 'up', channelUtil: 22 + this.randInt(0, 10), clients: 0, retries: 2 };
    for (const name of SERVICES) s.services[name] = { name, version: { 'order-service': '3.4.1', 'task-scheduler': '2.7.4', 'inventory-service': '1.9.2', 'fleet-manager': '5.1.0', 'station-service': '1.3.0', 'robot-gateway': '2.2.0' }[name], restartingUntil: 0, lat: [] };

    s.releases.push(
      { id: 'REL-298', t: -2 * 86400 + 3600, service: 'task-scheduler', from: '2.7.3', to: '2.7.4', changes: ['Fix: order priority tie-break', 'Log message wording'], by: 'deploy pipeline (simulated)' },
      { id: 'REL-311', t: -4100, service: 'order-service', from: '3.4.0', to: '3.4.1', changes: ['Log format: added customer region field'], by: 'deploy pipeline (simulated)' },
      { id: 'CHG-2288', t: -2900, service: 'station-service', from: 'log_level=INFO', to: 'log_level=INFO (no-op re-apply)', changes: ['Configuration re-applied, no value change'], by: 'config bot (simulated)' },
    );

    // Robots: 12 units with stable IDs.
    const homes = [];
    for (let i = 0; i < 12; i++) {
      const st = Object.values(STATIONS)[i % 4];
      homes.push({ x: st.x + ((i >> 2) - 1) * 2.2, z: ROAD_Z - 1.2 });
    }
    for (let i = 0; i < 12; i++) {
      const id = `R-${String(i + 1).padStart(2, '0')}`;
      const h = homes[i];
      s.robots.push({
        id, x: h.x, z: h.z, heading: 0, state: 'idle', resume: null, path: [], speed: ROBOT_SPEED,
        battery: 45 + this.randInt(0, 50), charger: null, chargeA: 0,
        loc: 0.96, rssi: -52 - this.randInt(0, 8), connected: true, dropUntil: 0, lastConn: 0, commsStopSince: null,
        estop: false, isolated: false, rebootUntil: 0, session: `s-${s.ids.session++}`, firmware: 'rc-4.2.1',
        encL: 0, encR: 0, wheelL: 0, wheelR: 0, motorL: 1.1, motorR: 1.1, residual: 0, odo: 0,
        obstacle: 6.0, payload: 'empty', taskId: null, idem: null, deliveryNo: 0, waitT: 0, retryAt: 0,
        stopSince: null, faultCodes: [], ctrlTemp: 41 + this.randInt(0, 4), uptime: 86400 + this.randInt(0, 40000),
        skew: 0, buffer: [], localLog: [], disconnects: 0, tasksDone: 0, tasksFailed: 0, maint: null, bootAt: -(86400 + this.randInt(0, 40000)), ratio: null,
      });
      s.fm.reachable[id] = true; s.fm.lastHeard[id] = 0;
    }
    s.robots[6].skew = 1.8; // R-07's clock runs 1.8 s fast (teaches timestamp alignment)
    s.robots[10].skew = -0.6;
  }

  robot(id) { return this.s.robots.find((r) => r.id === id); }
  task(id) { return this.s.tasks[id]; }

  // ---------------------------------------------------------------- logging
  log(sev, service, code, msg, ex = {}) {
    const s = this.s;
    const e = { id: s.ids.log++, t: s.t, ts: s.t, ingest: s.t, sev, service, code, msg, robot: ex.robot || null, order: ex.order || null, task: ex.task || null, corr: ex.corr || null, zone: ex.zone || null };
    s.logs.push(e);
    if (s.logs.length > 6000) s.logs.splice(0, s.logs.length - 6000);
    return e;
  }
  rlog(r, sev, code, msg, ex = {}) {
    const s = this.s;
    const tk = r.taskId ? s.tasks[r.taskId] : null;
    const e = { id: s.ids.log++, t: s.t, ts: s.t + r.skew, ingest: null, sev, service: 'robot-agent', code, msg, robot: r.id, order: ex.order ?? tk?.orderId ?? null, task: ex.task ?? r.taskId ?? null, corr: ex.corr ?? tk?.corr ?? null, zone: zoneOf(r.x, r.z) };
    r.localLog.push(e); if (r.localLog.length > 400) r.localLog.shift();
    if (this.connected(r)) { e.ingest = s.t; s.logs.push(e); } else r.buffer.push(e);
    return e;
  }
  audit(msg, ex = {}) {
    const e = this.log('INFO', 'audit', 'OPERATOR_ACTION', `[learner action, simulated] ${msg}`, ex);
    this.s.audit.push({ t: this.s.t, msg });
    return e;
  }
  win(type, data = {}) { this.s.winEv.push({ t: this.s.t, type, ...data }); }

  // ---------------------------------------------------------------- events
  schedule(dt, type, data) {
    const at = this.s.t + dt;
    const ev = { at, type, data };
    const ev2 = this.s.events;
    let i = ev2.length; while (i > 0 && ev2[i - 1].at > at) i--; ev2.splice(i, 0, ev);
  }

  // ---------------------------------------------------------------- run loop
  run(seconds) { const n = Math.round(seconds / 0.5); for (let i = 0; i < n; i++) this._step(0.5); this.emit('tick'); }
  tick(seconds) { this.run(seconds); }

  _step(dt) {
    const s = this.s;
    s.t = round(s.t + dt, 3); s.step++;
    while (s.events.length && s.events[0].at <= s.t) { const ev = s.events.shift(); this._handle(ev); }
    if (s.autoOrders && s.t >= s.nextOrderAt) { this.createOrder(); s.nextOrderAt = s.t + this.randInt(s.config.orderIntervalMin, s.config.orderIntervalMax); }
    this._network(dt);
    this._scheduler();
    this._fleetManager();
    for (const r of s.robots) this._robot(r, dt);
    this._stations();
    this._replenish();
    if (s.t - s.lastAlarmEval >= 5) { s.lastAlarmEval = s.t; this._alarms(); }
    if (s.t - s.lastSample >= 30) { s.lastSample = s.t; this._sample(); }
    if (s.step % 120 === 0) this._trim();
  }

  _trim() {
    const s = this.s;
    const cut = s.t - 7200;
    if (s.winEv.length && s.winEv[0].t < cut) s.winEv = s.winEv.filter((e) => e.t >= cut);
    if (s.samples.length > 300) s.samples.splice(0, s.samples.length - 300);
    // drop old finished tasks/orders (> 90 min) to keep snapshots small
    const old = s.t - 5400;
    s.taskIds = s.taskIds.filter((id) => { const tk = s.tasks[id]; if (['completed', 'failed', 'cancelled'].includes(tk.state) && (tk.doneAt ?? 0) < old) { delete s.tasks[id]; return false; } return true; });
    s.orderIds = s.orderIds.filter((id) => { const o = s.orders[id]; if (o.state !== 'open' && (o.doneAt ?? 0) < old) { delete s.orders[id]; return false; } return true; });
    for (const r of s.robots) if (r.buffer.length > 300) r.buffer.splice(0, r.buffer.length - 300);
  }

  // ---------------------------------------------------------------- orders & scheduler
  createOrder(items = null, opts = {}) {
    const s = this.s;
    const id = `O-${s.ids.order++}`;
    const corr = `c-${(this.randInt(0x100000, 0xffffff)).toString(16)}`;
    const n = items ? items.length : (this.rand() < 0.45 ? 1 : this.rand() < 0.64 ? 2 : 3);
    const skus = items || Array.from({ length: n }, () => this.pick(Object.keys(s.skuLocs)));
    const o = { id, corr, createdAt: s.t, items: skus.slice(), tasks: [], state: 'open', doneAt: null, priority: opts.priority || 'standard' };
    s.orders[id] = o; s.orderIds.push(id);
    this.log('INFO', 'order-service', 'ORDER_CREATED', `Order ${id} created with ${skus.length} line(s)`, { order: id, corr });
    this._svcCall('order-service', 6 + this.rand() * 8, true);
    for (const sku of skus) {
      const tid = `T-${s.ids.task++}`;
      const loc = opts.loc || this._chooseLoc(sku);
      const station = opts.station || this._chooseStation();
      const tk = { id: tid, orderId: id, corr, idem: `${tid}-k1`, sku, loc, station, state: 'queued', robot: null, attempts: 0, failCount: 0, nextAttemptAt: s.t, createdAt: s.t, readyAt: null, assignedAt: null, ackAt: null, doneAt: null, deliveries: 0, excluded: {}, history: [], spans: [], blocked: null };
      tk.spans.push({ svc: 'order-service', op: 'createOrder', start: s.t, dur: 0.01, status: 'ok' });
      tk.spans.push({ svc: 'task-scheduler', op: 'planTask', start: s.t + 0.01, dur: 0.012, status: 'ok' });
      this._th(tk, 'queued', `planned for ${loc} → ${station}`);
      s.tasks[tid] = tk; s.taskIds.push(tid); o.tasks.push(tid);
      this.log('INFO', 'task-scheduler', 'TASK_PLANNED', `Task ${tid} planned: pick ${sku} at ${loc}, deliver to ${station}`, { order: id, task: tid, corr });
    }
    this.emit('order', o);
    return o;
  }
  _th(tk, state, note = '') { tk.state = state; tk.history.push({ t: this.s.t, state, note }); }
  _chooseLoc(sku, avoid = null) {
    const s = this.s;
    const opts = s.skuLocs[sku].filter((l) => l !== avoid && !s.inventory[l].hold && !s.restricted[l[0]] && s.inventory[l].sys > 0);
    if (opts.length) return opts.length > 1 ? opts[Math.floor(this.rand() * opts.length)] : opts[0];
    return s.skuLocs[sku].find((l) => l !== avoid) || s.skuLocs[sku][0];
  }
  _chooseStation() {
    const s = this.s;
    const ids = Object.keys(STATIONS).filter((id) => s.config.stationRotation[id]);
    const id = ids[s.stationRR % ids.length]; s.stationRR++;
    return id;
  }
  invLatency() {
    const s = this.s;
    const f = s.faults.slowService;
    const inflight = s.taskIds.filter((id) => s.tasks[id].state === 'reserving').length;
    let base = 90 + this.rand() * 80;
    if (f && !(f.suppressedUntil > s.t)) base = 2500 + inflight * 900 + this.rand() * 1000;
    return base;
  }
  _svcCall(name, ms, ok) {
    const sv = this.s.services[name]; sv.lat.push(ms); if (sv.lat.length > 60) sv.lat.shift();
    this.win('svc_call', { service: name, ok });
  }
  svcDown(name) { return this.s.services[name].restartingUntil > this.s.t; }

  _scheduler() {
    const s = this.s;
    if (this.svcDown('task-scheduler')) return;
    let inflight = 0;
    for (const id of s.taskIds) if (s.tasks[id].state === 'reserving') inflight++;
    for (const id of s.taskIds) {
      const tk = s.tasks[id];
      if (tk.state === 'queued' && tk.nextAttemptAt <= s.t) {
        if (inflight >= s.config.schedulerConcurrency) break;
        // re-choose location if held/restricted
        const inv = s.inventory[tk.loc];
        if (inv.hold || s.restricted[tk.loc[0]]) {
          const alt = this._chooseLoc(tk.sku, tk.loc);
          if (alt !== tk.loc && !s.inventory[alt].hold && !s.restricted[alt[0]]) { this.log('INFO', 'task-scheduler', 'TASK_RELOCATED', `Task ${tk.id} moved from ${tk.loc} to alternate location ${alt}`, { task: tk.id, order: tk.orderId, corr: tk.corr }); tk.loc = alt; }
        }
        if (this.svcDown('inventory-service')) {
          tk.attempts++; tk.nextAttemptAt = s.t + Math.min(30, 2 ** tk.attempts);
          this.log('ERROR', 'task-scheduler', 'RESERVE_UNAVAILABLE', `inventory-service unavailable (503) for ${tk.id}; retry in ${Math.min(30, 2 ** tk.attempts)}s`, { task: tk.id, order: tk.orderId, corr: tk.corr });
          this._svcCall('inventory-service', 1, false);
          continue;
        }
        const lat = this.invLatency();
        tk.state = 'reserving'; inflight++;
        tk._resStart = s.t;
        const timeout = s.config.reserveTimeoutMs;
        if (lat > timeout) this.schedule(timeout / 1000, 'reserve_timeout', { task: tk.id, lat });
        else this.schedule(lat / 1000, 'reserve_ok', { task: tk.id, lat });
      }
    }
  }

  // ---------------------------------------------------------------- fleet manager
  _fleetManager() {
    const s = this.s;
    const fmDown = this.svcDown('fleet-manager');
    // reachability
    for (const r of s.robots) {
      const heard = s.fm.lastHeard[r.id];
      const reach = s.t - heard <= 3;
      if (s.fm.reachable[r.id] && !reach) {
        s.fm.reachable[r.id] = false; r.disconnects++;
        const z = zoneOf(r.x, r.z);
        if (!r.isolated) this.win('disconnect', { robot: r.id, zone: z }); // isolated robots are alarm-suppressed
        this.log('WARN', 'fleet-manager', 'ROBOT_HEARTBEAT_MISSED', `No heartbeat from ${r.id} for >3 s (zone ${z}, ${ZONE_AP[z]})`, { robot: r.id, zone: z });
        r._discAt = s.t;
      } else if (!s.fm.reachable[r.id] && reach) {
        s.fm.reachable[r.id] = true;
        this.log('INFO', 'fleet-manager', 'ROBOT_RECONNECTED', `${r.id} reachable again after ${round(s.t - (r._discAt ?? s.t), 1)} s`, { robot: r.id, zone: zoneOf(r.x, r.z) });
        if (r._fmSession && r._fmSession !== r.session) this._sessionChange(r);
      }
      if (reach && this.connected(r)) r._fmSession = r.session;
    }
    if (fmDown) return;
    // ack deadlines
    for (const [rid, a] of Object.entries(s.fm.assignments)) {
      if (a.acked || a.deadline == null) continue;
      if (s.t > a.deadline) {
        const tk = s.tasks[a.taskId];
        if (a.redeliveries < s.config.maxRedeliveries) {
          a.redeliveries++; a.deliveryNo++; a.deadline = s.t + s.config.ackTimeoutMs / 1000; tk.deliveries++;
          this.log('WARN', 'fleet-manager', 'ACK_TIMEOUT_REDELIVER', `No ack from ${rid} for ${tk.id} within ${s.config.ackTimeoutMs} ms; redelivering (#${a.deliveryNo}) with idempotency key ${tk.idem}`, { robot: rid, task: tk.id, order: tk.orderId, corr: tk.corr });
          this._sendToRobot(rid, 'assign', { task: tk.id, idem: tk.idem, deliveryNo: a.deliveryNo, session: a.session });
        } else {
          this.log('ERROR', 'fleet-manager', 'ACK_TIMEOUT_GIVEUP', `Gave up on ${rid} for ${tk.id} after ${a.redeliveries + 1} deliveries; cancelling and requeueing`, { robot: rid, task: tk.id, order: tk.orderId, corr: tk.corr });
          delete s.fm.assignments[rid];
          this._sendToRobot(rid, 'cancel', { task: tk.id });
          tk.excluded[rid] = s.t + 30; tk.robot = null;
          this._th(tk, 'ready', `requeued after ack timeout on ${rid}`);
          s.counters.aborted++; this.win('task_aborted', { robot: rid, zone: zoneOf(this.robot(rid).x, this.robot(rid).z) });
        }
      }
    }
    // orphan execution guard (robot executing a task FM did not assign to it)
    for (const r of s.robots) {
      if (r.taskId && this.connected(r) && s.fm.reachable[r.id]) {
        const a = s.fm.assignments[r.id];
        if ((!a || a.taskId !== r.taskId) && r.payload === 'empty' && !r._orphanWarned) {
          r._orphanWarned = true;
          this.log('WARN', 'fleet-manager', 'ORPHAN_TASK_EXECUTION', `${r.id} reports executing ${r.taskId} which is not assigned to it; sending cancel (duplicate-work safeguard)`, { robot: r.id, task: r.taskId });
          this._sendToRobot(r.id, 'cancel', { task: r.taskId });
        }
      }
    }
    // assignment
    const ready = s.taskIds.map((id) => s.tasks[id]).filter((tk) => tk.state === 'ready');
    for (const tk of ready) {
      if (s.restricted[tk.loc[0]] || s.inventory[tk.loc].hold) {
        const alt = this._chooseLoc(tk.sku, tk.loc);
        if (alt !== tk.loc && !s.inventory[alt].hold && !s.restricted[alt[0]]) {
          s.inventory[tk.loc].reserved = Math.max(0, s.inventory[tk.loc].reserved - 1); s.inventory[alt].reserved++;
          this.log('INFO', 'task-scheduler', 'TASK_RELOCATED', `${tk.id} moved from ${tk.loc} to alternate location ${alt}`, { task: tk.id, order: tk.orderId, corr: tk.corr });
          tk.loc = alt;
        } else { tk.blocked = s.restricted[tk.loc[0]] ? `aisle ${tk.loc[0]} restricted and no alternate stock` : `location ${tk.loc} on hold and no alternate stock`; continue; }
      }
      if (s.lockouts[tk.loc[0]] > s.t) { tk.blocked = `aisle ${tk.loc[0]} under lockout`; continue; }
      tk.blocked = null;
      const p = locPos(tk.loc);
      let best = null, bd = 1e9;
      for (const r of s.robots) {
        if (!this.fmAvailable(r)) continue;
        if (tk.excluded[r.id] > s.t) continue;
        const d = Math.abs(r.x - p.x) + Math.abs(r.z - p.z);
        if (d < bd) { bd = d; best = r; }
      }
      if (!best) continue;
      this.assign(tk, best);
    }
  }
  fmAvailable(r) {
    const s = this.s;
    return r.state === 'idle' && !r.isolated && !r.estop && s.fm.reachable[r.id] && r.battery >= 25 && !s.fm.assignments[r.id] && !r.taskId && r.rebootUntil <= s.t;
  }
  assign(tk, r) {
    const s = this.s;
    s.fm.assignments[r.id] = { taskId: tk.id, session: r.session, deliveryNo: 1, deadline: s.t + s.config.ackTimeoutMs / 1000, redeliveries: 0, acked: false, at: s.t };
    tk.robot = r.id; tk.assignedAt = s.t; tk.deliveries++;
    tk.spans.push({ svc: 'fleet-manager', op: 'waitForRobot', start: tk.readyAt ?? s.t, dur: Math.max(0.01, s.t - (tk.readyAt ?? s.t)), status: 'ok' });
    tk._sentAt = s.t;
    this._th(tk, 'assigned', `assigned to ${r.id} (session ${r.session})`);
    this.log('INFO', 'fleet-manager', 'TASK_ASSIGNED', `${tk.id} assigned to ${r.id}; awaiting ack (timeout ${s.config.ackTimeoutMs} ms)`, { robot: r.id, task: tk.id, order: tk.orderId, corr: tk.corr });
    this._svcCall('fleet-manager', 18 + this.rand() * 10, true);
    this._sendToRobot(r.id, 'assign', { task: tk.id, idem: tk.idem, deliveryNo: 1, session: r.session });
  }
  _sessionChange(r) {
    const s = this.s;
    const a = s.fm.assignments[r.id];
    this.log('INFO', 'fleet-manager', 'ROBOT_SESSION_CHANGED', `${r.id} session changed ${r._fmSession} → ${r.session} (controller restart detected)`, { robot: r.id });
    if (!a) return;
    const tk = s.tasks[a.taskId];
    if (s.faults.staleLease) {
      // SIMULATED BUG: assignment retained and ack timer cleared on session change.
      a.deadline = null;
      this.log('DEBUG', 'fleet-manager', 'ASSIGNMENT_RETAINED', `Assignment ${a.taskId} retained for ${r.id} across session change; ack timer reset`, { robot: r.id, task: a.taskId, order: tk?.orderId, corr: tk?.corr });
    } else {
      delete s.fm.assignments[r.id];
      if (tk && !['completed', 'failed'].includes(tk.state)) {
        if (tk.state === 'to_station' || tk.state === 'at_station') { this._th(tk, 'payload_hold', `robot restarted while carrying tote`); }
        else { tk.robot = null; this._th(tk, 'ready', `requeued after ${r.id} session change`); }
        this.log('INFO', 'fleet-manager', 'ASSIGNMENT_RELEASED', `Released ${a.taskId} from ${r.id} after session change; requeued with same idempotency key`, { robot: r.id, task: a.taskId, order: tk.orderId, corr: tk.corr });
      }
    }
  }

  _sendToRobot(rid, type, data) {
    const r = this.robot(rid);
    const lat = 0.08 + this.rand() * 0.2;
    if (!this.connected(r)) return; // lost on send
    this.schedule(lat, 'to_robot', { robot: rid, type, ...data });
  }
  _sendToFm(r, type, data) {
    if (!this.connected(r)) { r._lostMsgs = (r._lostMsgs || 0) + 1; return; }
    this.schedule(0.08 + this.rand() * 0.15, 'to_fm', { robot: r.id, type, session: r.session, ...data });
  }

  _handle(ev) {
    const s = this.s, d = ev.data;
    if (ev.type === 'reserve_ok' || ev.type === 'reserve_timeout') {
      const tk = s.tasks[d.task]; if (!tk || tk.state !== 'reserving') return;
      const ok = ev.type === 'reserve_ok';
      tk.spans.push({ svc: 'inventory-service', op: 'reserveStock', start: tk._resStart, dur: ok ? d.lat / 1000 : s.config.reserveTimeoutMs / 1000, status: ok ? 'ok' : 'timeout' });
      this._svcCall('inventory-service', ok ? d.lat : s.config.reserveTimeoutMs, ok);
      if (ok) {
        s.inventory[tk.loc].reserved++;
        tk.readyAt = s.t;
        this._th(tk, 'ready', `stock reserved at ${tk.loc} (${Math.round(d.lat)} ms)`);
        this.log('INFO', 'task-scheduler', 'TASK_RESERVED', `${tk.id} stock reserved at ${tk.loc} in ${Math.round(d.lat)} ms`, { task: tk.id, order: tk.orderId, corr: tk.corr });
      } else {
        tk.attempts++;
        const backoff = Math.min(30, 2 ** tk.attempts) + round(this.rand(), 1);
        tk.nextAttemptAt = s.t + backoff; this._th(tk, 'queued', `reserve timeout #${tk.attempts}, backoff ${backoff}s`);
        this.log(tk.attempts >= 4 ? 'ERROR' : 'WARN', 'task-scheduler', 'RESERVE_TIMEOUT', `inventory-service did not respond within ${s.config.reserveTimeoutMs} ms for ${tk.id} (attempt ${tk.attempts}); retrying in ${backoff}s (exponential backoff)`, { task: tk.id, order: tk.orderId, corr: tk.corr });
      }
    } else if (ev.type === 'to_robot') {
      const r = this.robot(d.robot);
      if (!this.connected(r)) return;
      this._robotMsg(r, d);
    } else if (ev.type === 'to_fm') {
      if (this.svcDown('fleet-manager')) return;
      this._fmMsg(d);
    } else if (ev.type === 'robot_ack') {
      const r = this.robot(d.robot);
      if (r.taskId === d.task || d.dup) this._sendToFm(r, 'ack', { task: d.task, deliveryNo: d.deliveryNo });
    } else if (ev.type === 'op') {
      this._opComplete(d);
    }
  }

  _robotMsg(r, d) {
    const s = this.s;
    if (r.rebootUntil > s.t) return;
    if (d.type === 'assign') {
      if (d.session !== r.session) { this.rlog(r, 'WARN', 'ASSIGNMENT_REJECTED', `Assignment ${d.task} rejected: session mismatch (message ${d.session}, robot ${r.session})`, { task: d.task }); return; }
      if (r.taskId === d.task) {
        s.counters.dupIgnored++; this.win('dup_ignored', { robot: r.id });
        this.rlog(r, 'INFO', 'DUPLICATE_TASK_IGNORED', `Duplicate delivery #${d.deliveryNo} of ${d.task} ignored (idempotency key ${d.idem} already active); re-sending ack`, { task: d.task });
        this.schedule(0.4 + this.rand(), 'robot_ack', { robot: r.id, task: d.task, deliveryNo: d.deliveryNo, dup: true });
        return;
      }
      if (r.taskId || r.state !== 'idle' || r.isolated || r.estop) { this.rlog(r, 'WARN', 'ASSIGNMENT_REJECTED', `Assignment ${d.task} rejected: robot ${r.taskId ? 'busy with ' + r.taskId : r.state}`, { task: d.task }); return; }
      const tk = s.tasks[d.task];
      r.taskId = d.task; r.idem = d.idem; r.deliveryNo = d.deliveryNo; r._orphanWarned = false;
      this.rlog(r, 'INFO', 'TASK_ACCEPTED', `Accepted ${d.task} (key ${d.idem}); navigating to ${tk.loc}`);
      this._go(r, locPos(tk.loc), 'to_pick');
      this.schedule(0.4 + this.rand(), 'robot_ack', { robot: r.id, task: d.task, deliveryNo: d.deliveryNo });
    } else if (d.type === 'cancel') {
      if (r.taskId === d.task && r.payload === 'empty') {
        this.rlog(r, 'WARN', 'TASK_CANCELLED_BY_FM', `${d.task} cancelled by fleet manager; stopping and returning to idle`);
        r.taskId = null; r.idem = null; r.path = []; r.state = 'idle'; r.resume = null;
      }
    }
  }
  _fmMsg(d) {
    const s = this.s;
    if (d.type === 'ack') {
      const a = s.fm.assignments[d.robot];
      const tk = s.tasks[d.task];
      if (!a || a.taskId !== d.task) { this.log('DEBUG', 'fleet-manager', 'ACK_UNKNOWN', `Ack from ${d.robot} for ${d.task} has no matching assignment`, { robot: d.robot, task: d.task }); return; }
      if (a.deliveryNo !== d.deliveryNo) { this.log('DEBUG', 'fleet-manager', 'STALE_ACK_IGNORED', `Ack for delivery #${d.deliveryNo} of ${d.task} ignored; awaiting #${a.deliveryNo}`, { robot: d.robot, task: d.task, order: tk?.orderId, corr: tk?.corr }); return; }
      if (a.acked) return;
      a.acked = true; tk.ackAt = s.t;
      tk.spans.push({ svc: 'robot-gateway', op: `deliver+ack(${d.robot})`, start: a.at, dur: Math.max(0.05, s.t - a.at), status: 'ok' });
      if (tk.state === 'assigned') this._th(tk, 'acknowledged', `ack from ${d.robot} (delivery #${d.deliveryNo})`);
      this.log('INFO', 'fleet-manager', 'TASK_ACKNOWLEDGED', `${d.task} acknowledged by ${d.robot} after ${Math.round((s.t - a.at) * 1000)} ms`, { robot: d.robot, task: d.task, order: tk.orderId, corr: tk.corr });
    }
  }

  // ---------------------------------------------------------------- network
  connected(r) { return r.rebootUntil <= this.s.t && this.s.t >= r.dropUntil; }
  _network(dt) {
    const s = this.s;
    for (const ap of Object.values(s.aps)) ap.clients = 0;
    for (const r of s.robots) {
      const z = zoneOf(r.x, r.z);
      const apId = ZONE_AP[z];
      s.aps[apId].clients++;
      let p = 0;
      const f = s.faults.apDegraded;
      if (f && f.ap === apId) p = f.lossProb;
      const fw = s.faults.firmwareWifi;
      if (fw && r.firmware === fw.firmware) p = Math.max(p, fw.lossProb);
      const wasConn = this.connected(r);
      if (p > 0 && wasConn && this.rand() < p * dt) r.dropUntil = s.t + 2.5 + this.rand() * 5;
      const baseRssi = -50 - Math.abs(r.x - APS[apId].x) * 0.6 - Math.abs(r.z - APS[apId].z) * 0.4;
      r.rssi = Math.round(baseRssi - (p > 0 && f && f.ap === apId ? 14 : 0) + (this.rand() - 0.5) * 3);
      const conn = this.connected(r);
      if (conn) {
        s.fm.lastHeard[r.id] = s.t; r.lastConn = s.t;
        if (r.buffer.length) { for (const e of r.buffer) { e.ingest = s.t; s.logs.push(e); } r.buffer = []; }
      }
    }
    for (const ap of Object.values(s.aps)) {
      const f = s.faults.apDegraded;
      ap.status = f && f.ap === ap.id ? 'degraded' : 'up';
      ap.retries = f && f.ap === ap.id ? 28 + Math.round(this.rand() * 10) : 2 + Math.round(this.rand() * 2);
      ap.channelUtil = s.faults.misleadingAlarm && ap.id === s.faults.misleadingAlarm.ap ? 81 + Math.round(this.rand() * 6) : 22 + Math.round(this.rand() * 10) + (f && f.ap === ap.id ? 15 : 0);
    }
  }

  // ---------------------------------------------------------------- robot
  _route(r, to) {
    const pts = [];
    if (Math.abs(r.z - ROAD_Z) > 0.3) pts.push({ x: r.x, z: ROAD_Z });
    pts.push({ x: to.x, z: ROAD_Z });
    pts.push({ x: to.x, z: to.z });
    return pts.filter((p, i) => i === 0 ? (Math.abs(p.x - r.x) + Math.abs(p.z - r.z) > 0.05) : (Math.abs(p.x - pts[i - 1].x) + Math.abs(p.z - pts[i - 1].z) > 0.05));
  }
  _go(r, to, state) { r.path = this._route(r, to); r.state = state; r.dest = { x: to.x, z: to.z }; }

  _robot(r, dt) {
    const s = this.s;
    const moving = ['to_pick', 'to_station', 'to_charger', 'to_maintenance', 'to_home'].includes(r.state);
    // battery
    const drain = moving ? 0.022 : 0.004;
    if (r.state === 'charging') {
      const ch = s.chargers[r.charger];
      const ok = !(s.faults.chargeContacts && s.faults.chargeContacts.robot === r.id) && !(s.faults.chargerFault && s.faults.chargerFault.charger === r.charger);
      r.chargeA = ok ? 24 + this.rand() * 2 : 0;
      ch.outputA = r.chargeA;
      r.battery = clamp(r.battery + (ok ? 0.32 : -0.004) * dt, 0, 100);
      if (!ok && s.t - (r._czLog ?? -999) > 60) { r._czLog = s.t; this.rlog(r, 'WARN', 'CHARGE_CURRENT_ZERO', `Docked at ${r.charger} but charge current is 0.0 A (contact voltage ${s.faults.chargeContacts?.robot === r.id ? '2.1' : '0.0'} V)`); }
      if (r.battery >= 90) { this._undock(r); }
    } else r.battery = clamp(r.battery - drain * dt, 0, 100);

    if (r.rebootUntil > s.t) { r.state = 'rebooting'; return; }
    if (r.state === 'rebooting') { r.state = 'idle'; this.rlog(r, 'INFO', 'CONTROLLER_BOOT', `Controller boot complete; new session ${r.session}; local diagnostic buffer starts empty`); }
    if (r.maint) return this._maintStep(r);
    if (r.state === 'to_maintenance' || r.state === 'in_maintenance') return this._maintStep(r);

    // E-stop
    if (s.faults.estop && s.faults.estop.robot === r.id) r.estop = true;
    if (r.estop) {
      if (r.state !== 'estop') { r.resume = r.state === 'idle' ? null : r.state; r.state = 'estop'; r.stopSince = s.t; this.rlog(r, 'ERROR', 'ESTOP_ACTIVE', 'Emergency stop circuit OPEN; drive power removed (safety state)'); }
      return;
    } else if (r.state === 'estop') { r.state = r.resume || 'idle'; r.resume = null; r.stopSince = null; this.rlog(r, 'INFO', 'ESTOP_RESET', 'Emergency stop circuit closed after site reset (simulated)'); }

    if (r.battery < 8 && r.state !== 'charging') {
      if (r.state !== 'battery_critical') { r.state = 'battery_critical'; r.stopSince = s.t; this.rlog(r, 'ERROR', 'BATTERY_CRITICAL', `Battery ${round(r.battery, 0)}% — robot unavailable`); }
      return;
    }

    // localization
    const md = s.faults.markerDamage;
    const inDamaged = md && aisleAt(r.x) === md.aisle && r.z >= md.zMin && r.z <= md.zMax;
    const lsf = s.faults.locSensor && s.faults.locSensor.robot === r.id;
    const target = inDamaged ? 0.3 : lsf && aisleAt(r.x) && r.z > ROAD_Z + 1.5 ? 0.42 : 0.96;
    r.loc = clamp(r.loc + (target - r.loc) * Math.min(1, 1.2 * dt) + (this.rand() - 0.5) * 0.01, 0, 0.99);

    // comms safe-stop
    const conn = this.connected(r);
    if (!conn && moving) {
      if (s.t - r.lastConn > 2) { r.resume = r.state; r.state = 'comms_stop'; r.stopSince = s.t; r._reconAt = null; this.rlog(r, 'WARN', 'COMMS_LOSS_SAFE_STOP', `Link to fleet manager lost >2 s; controlled stop (zone ${zoneOf(r.x, r.z)})`); }
    }
    if (r.state === 'comms_stop') {
      if (conn) { if (r._reconAt == null) r._reconAt = s.t; if (s.t - r._reconAt >= 1) { r.state = r.resume || 'idle'; r.resume = null; r.stopSince = null; r._reconAt = null; this.rlog(r, 'INFO', 'COMMS_RESTORED', 'Link restored; resuming'); } }
      else r._reconAt = null;
      if (r.state === 'comms_stop') return;
    }

    if (r.state === 'loc_lost') {
      if (!inDamaged && r.loc > 0.8 && !(lsf && aisleAt(r.x))) { r.state = r.resume; r.resume = null; r.stopSince = null; this.rlog(r, 'INFO', 'LOCALIZATION_RECOVERED', `Localization confidence ${round(r.loc, 2)}; resuming`); }
      else if (s.t > r.retryAt) { r.retryAt = s.t + 15; this.rlog(r, 'WARN', 'RELOCALIZE_FAILED', `Automatic relocalization failed: ${inDamaged ? 'only 1 of 4 floor markers matched' : 'confidence still low'} (conf ${round(r.loc, 2)})`); }
      return;
    }
    if (r.state === 'blocked') {
      const ob = this._obstacleAhead(r);
      r.obstacle = ob ?? 6;
      if (ob == null) { r.state = r.resume; r.resume = null; r.stopSince = null; this.rlog(r, 'INFO', 'PATH_CLEAR', 'Obstacle no longer detected; resuming'); }
      else if (s.t > r.retryAt) { r.retryAt = s.t + 8; r._retries = (r._retries || 0) + 1; this.rlog(r, 'WARN', 'OBSTACLE_DETECTED', `Obstacle ${round(ob, 2)} m ahead in aisle ${aisleAt(r.x)} at z=${round(r.z, 1)}; holding (retry ${r._retries})`); }
      return;
    }
    if (r.state === 'fault') return;

    // drive faults
    const enc = s.faults.encoder && s.faults.encoder.robot === r.id ? s.faults.encoder : null;
    const drag = s.faults.motorDrag && s.faults.motorDrag.robot === r.id ? s.faults.motorDrag : null;

    if (moving) {
      if (r.loc < 0.5) { r.resume = r.state; r.state = 'loc_lost'; r.stopSince = s.t; r.retryAt = s.t + 10; this.rlog(r, 'ERROR', 'LOC_CONFIDENCE_LOW', `Localization confidence ${round(r.loc, 2)} below 0.50 near ${aisleAt(r.x) || '-'} z=${round(r.z, 1)}; controlled stop`); return; }
      const ob = this._obstacleAhead(r);
      r.obstacle = ob ?? 6;
      if (ob != null) { r.resume = r.state; r.state = 'blocked'; r.stopSince = s.t; r.retryAt = s.t + 8; r._retries = 0; this.rlog(r, 'WARN', 'OBSTACLE_DETECTED', `Obstacle ${round(ob, 2)} m ahead in aisle ${aisleAt(r.x)} at z=${round(r.z, 1)}; controlled stop`); return; }
      if (s.lockouts[aisleAt(r.x)] > s.t && r.z > ROAD_Z + 0.5) { r._lockWait = true; return; }
      let spd = r.speed * (drag ? 0.55 : 1) * (enc && r.residual > 0.6 ? 0.5 : 1);
      const dist = this._move(r, spd * dt);
      r.odo += dist;
      const wr = dist / dt;
      r.wheelR = round(wr, 2); r.wheelL = round(enc ? wr * enc.ratio : wr, 2); if (wr > 0.2) r.ratio = round(r.wheelL / r.wheelR, 2);
      r.encR += Math.round(dist * 2048); r.encL += Math.round(dist * 2048 * (enc ? enc.ratio : 1));
      r.motorL = round((drag ? 3.9 : 1.2) + this.rand() * 0.2, 2); r.motorR = round(1.2 + this.rand() * 0.2, 2);
      if (enc) {
        r.residual += dist * 0.05;
        if (r.residual > 0.6 && s.t - (r._odoLog ?? -999) > 25) { r._odoLog = s.t; this.rlog(r, 'WARN', 'ODOM_MISMATCH', `Wheel odometry disagrees with localization by ${round(r.residual, 2)} m; left encoder ${round(enc.ratio * 100, 0)}% of right while driving straight; reducing speed`); }
        if (r.residual > 2.2) { r.state = 'fault'; r.stopSince = s.t; r.faultCodes = ['WHEEL_FEEDBACK_FAULT']; this.rlog(r, 'ERROR', 'WHEEL_FEEDBACK_FAULT', `Odometry residual ${round(r.residual, 2)} m exceeds 2.0 m limit; drive disabled`); return; }
      }
      if (drag && s.t - (r._dragLog ?? -999) > 30) { r._dragLog = s.t; this.rlog(r, 'WARN', 'MOTOR_OVERCURRENT', `Left drive motor current ${r.motorL} A (normal ≈1.2 A); speed limited`); r._dragHeat = (r._dragHeat || 0) + 1; if (r._dragHeat > 6) { r.state = 'fault'; r.stopSince = s.t; r.faultCodes = ['DRIVE_OVERCURRENT']; this.rlog(r, 'ERROR', 'DRIVE_OVERCURRENT', 'Left drive motor over-current limit reached; drive disabled'); return; } }
      if (r.path.length === 0) this._arrive(r);
    } else {
      r.wheelL = 0; r.wheelR = 0; r.motorL = round(0.1 + this.rand() * 0.05, 2); r.motorR = r.motorL;
      r.obstacle = this._obstacleAhead(r) ?? 6;
    }

    if (r.state === 'picking' && s.t >= r.waitT) this._finishPick(r);
    if (r.state === 'at_station' && s.t >= r.waitT) this._finishStation(r);
    if (r.state === 'idle' && !r.taskId && !s.fm.assignments[r.id] && !r.isolated && r.battery < 25) this._seekCharger(r);
    if (r.state === 'waiting_charger' && s.t > (r._wcCheck ?? 0)) { r._wcCheck = s.t + 5; this._seekCharger(r); }
  }

  _obstacleAhead(r) {
    const ob = this.s.faults.obstruction;
    if (!ob || aisleAt(r.x) !== ob.aisle) return null;
    const next = r.path[0];
    let dir = 0;
    if (next && Math.abs(next.x - r.x) < 0.1) dir = Math.sign(next.z - r.z);
    if (r.state === 'blocked' && r.resume) dir = r._bdir ?? dir;
    if (!dir) return null;
    const gap = (ob.z - r.z) * dir; // distance ahead along travel direction
    if (gap > 0 && gap < 1.3) { r._bdir = dir; return Math.max(0.15, gap - 0.9); }
    return null;
  }

  _move(r, d) {
    let moved = 0;
    while (d > 1e-6 && r.path.length) {
      const p = r.path[0];
      const dx = p.x - r.x, dz = p.z - r.z, L = Math.hypot(dx, dz);
      if (L < 1e-4) { r.path.shift(); continue; }
      r.heading = Math.atan2(dx, dz);
      const st = Math.min(d, L);
      r.x += (dx / L) * st; r.z += (dz / L) * st; d -= st; moved += st;
      if (st >= L - 1e-6) { r.x = p.x; r.z = p.z; r.path.shift(); }
    }
    return moved;
  }

  _arrive(r) {
    const s = this.s;
    const tk = r.taskId ? s.tasks[r.taskId] : null;
    if (r.state === 'to_pick' && tk) {
      if (!this.connected(r)) return; // wait for link: ownership must be confirmed before an irreversible pick
      const a = s.fm.assignments[r.id];
      if (!a || a.taskId !== tk.id) {
        this.rlog(r, 'WARN', 'PREPICK_CHECK_FAILED', `Pre-pick ownership check: fleet manager no longer assigns ${tk.id} to ${r.id}; aborting without picking (duplicate-work safeguard)`);
        r.taskId = null; r.idem = null; r.state = 'idle'; return;
      }
      if (!a.acked) { a.acked = true; tk.ackAt = s.t; if (tk.state === 'assigned') this._th(tk, 'acknowledged', `confirmed by ${r.id} at pick location`); this.log('INFO', 'fleet-manager', 'TASK_CONFIRMED_AT_PICK', `${tk.id} ownership confirmed by ${r.id} at pick location (counts as ack)`, { robot: r.id, task: tk.id, order: tk.orderId, corr: tk.corr }); }
      r.state = 'picking'; r.waitT = s.t + 8; this._setTask(tk, 'picking', `${r.id} at ${tk.loc}`);
      this.rlog(r, 'INFO', 'AT_PICK_LOCATION', `Arrived at ${tk.loc}; handling mechanism retrieving tote`);
    } else if (r.state === 'to_station' && tk) {
      r.state = 'waiting_station'; r.waitSince = s.t;
      this.rlog(r, 'INFO', 'AT_STATION_QUEUE', `Arrived at ${tk.station} approach; requesting slot`);
    } else if (r.state === 'to_charger') {
      r.state = 'charging'; this.rlog(r, 'INFO', 'DOCKED', `Docked at ${r.charger}; charging requested`);
    } else if (r.state === 'to_home') { r.state = 'idle'; }
    else if (!tk) { r.state = 'idle'; }
  }
  _setTask(tk, state, note) { if (tk.state !== state) this._th(tk, state, note); }

  _finishPick(r) {
    const s = this.s;
    const tk = s.tasks[r.taskId];
    const inv = s.inventory[tk.loc];
    if (s.pickedKeys[tk.idem]) {
      s.counters.dupPickPrevented++;
      this.log('WARN', 'inventory-service', 'DUPLICATE_PICK_PREVENTED', `Pick for idempotency key ${tk.idem} already recorded; second pick refused`, { robot: r.id, task: tk.id, order: tk.orderId, corr: tk.corr });
      const holder = s.robots.find((x) => x.id !== r.id && x.taskId === tk.id);
      if (!holder) this._th(tk, 'needs_review', `second pick refused for ${tk.idem}; item already picked — physical location unknown`);
      r.taskId = null; r.state = 'idle'; delete s.fm.assignments[r.id]; return;
    }
    if (inv.phys <= 0) {
      tk.failCount++; r.tasksFailed++;
      this.rlog(r, 'ERROR', 'ITEM_NOT_FOUND', `No tote/item found at ${tk.loc} for ${tk.sku} (system quantity ${inv.sys})`);
      this.log('ERROR', 'fleet-manager', 'TASK_FAILED', `${tk.id} failed at ${tk.loc}: ITEM_NOT_FOUND (failure ${tk.failCount})`, { robot: r.id, task: tk.id, order: tk.orderId, corr: tk.corr });
      s.counters.failed++; this.win('task_failed', { robot: r.id, zone: zoneOf(r.x, r.z), code: 'ITEM_NOT_FOUND', loc: tk.loc });
      delete s.fm.assignments[r.id]; r.taskId = null; r.state = 'idle';
      inv.reserved = Math.max(0, inv.reserved - 1);
      if (tk.failCount >= 3) {
        tk.doneAt = s.t; this._th(tk, 'failed', 'short pick: 3 failures');
        const o = s.orders[tk.orderId]; o.state = 'exception'; o.doneAt = s.t;
        this.log('ERROR', 'order-service', 'ORDER_EXCEPTION', `Order ${o.id} moved to exception: short pick on ${tk.sku}`, { order: o.id, corr: o.corr, task: tk.id });
      } else {
        tk.robot = null; tk.idem = `${tk.id}-k${tk.failCount + 1}`; tk.nextAttemptAt = s.t + 5; this._th(tk, 'queued', `retry after ITEM_NOT_FOUND (system still shows ${inv.sys})`);
      }
      return;
    }
    inv.phys--; inv.sys--; inv.reserved = Math.max(0, inv.reserved - 1);
    s.pickedKeys[tk.idem] = s.t;
    r.payload = 'tote';
    this._setTask(tk, 'to_station', `${r.id} picked ${tk.sku}`);
    this.rlog(r, 'INFO', 'PICK_COMPLETE', `Tote with ${tk.sku} secured; payload sensor: LOADED`);
    this._go(r, this._stationPoint(tk.station), 'to_station');
  }
  _stationPoint(st) { const p = STATIONS[st]; return { x: p.x, z: p.z + 2.2 }; }

  _stations() {
    const s = this.s;
    for (const st of Object.values(s.stations)) {
      const kindDown = s.faults.stationDown && s.faults.stationDown.station === st.id ? s.faults.stationDown : null;
      st.ready = !kindDown;
      st.reason = kindDown ? (kindDown.kind === 'scanner' ? 'barcode scanner offline' : 'heartbeat stale in station-service') : null;
      st.hmi = kindDown && kindDown.kind === 'scanner' ? 'SCANNER FAULT' : 'READY';
      st.scanner = kindDown && kindDown.kind === 'scanner' ? 'NO RESPONSE' : 'OK';
      if (!kindDown || kindDown.kind === 'scanner') st.lastHeartbeat = s.t;
      if (!st.ready && s.t - (st._log ?? -999) > 60) { st._log = s.t; this.log('WARN', 'station-service', 'STATION_UNAVAILABLE', `${st.id} reports unavailable: ${st.reason}`, {}); }
      if (st.serving && s.t >= st.busyUntil) st.serving = null;
      if (!st.ready || st.serving) continue;
      // serve longest-waiting robot
      const waiting = s.robots.filter((r) => r.state === 'waiting_station' && r.taskId && s.tasks[r.taskId].station === st.id).sort((a, b) => a.waitSince - b.waitSince);
      if (waiting.length) {
        const r = waiting[0]; st.serving = r.id; st.busyUntil = s.t + 10;
        r.state = 'at_station'; r.waitT = s.t + 10; this._setTask(s.tasks[r.taskId], 'at_station', `${r.id} at ${st.id}`);
      }
    }
    // robots waiting at unavailable station log once a minute
    for (const r of s.robots) if (r.state === 'waiting_station' && s.t - (r._wsLog ?? -999) > 60 && s.t - r.waitSince > 20) { r._wsLog = s.t; this.rlog(r, 'INFO', 'WAITING_FOR_STATION', `Waiting ${Math.round(s.t - r.waitSince)} s for ${s.tasks[r.taskId].station} slot; robot healthy`); }
  }

  _finishStation(r) {
    const s = this.s;
    const tk = s.tasks[r.taskId];
    r.payload = 'empty'; r.tasksDone++;
    tk.doneAt = s.t; this._th(tk, 'completed', `delivered at ${tk.station}`);
    s.counters.completed++; this.win('task_completed', { robot: r.id, zone: tk.loc[0], station: tk.station, dur: s.t - tk.createdAt });
    s.stations[tk.station].served++;
    this.rlog(r, 'INFO', 'DELIVERED', `${tk.id} delivered at ${tk.station}; payload sensor: EMPTY`);
    this.log('INFO', 'fleet-manager', 'TASK_COMPLETED', `${tk.id} completed by ${r.id} (${Math.round(s.t - tk.createdAt)} s end-to-end)`, { robot: r.id, task: tk.id, order: tk.orderId, corr: tk.corr });
    delete s.fm.assignments[r.id];
    r.taskId = null; r.idem = null; r.state = 'idle';
    const o = s.orders[tk.orderId];
    if (o && o.state === 'open' && o.tasks.every((id) => s.tasks[id]?.state === 'completed')) {
      o.state = 'completed'; o.doneAt = s.t;
      this.win('order_completed', { latency: s.t - o.createdAt });
      this.log('INFO', 'order-service', 'ORDER_COMPLETED', `Order ${o.id} completed in ${Math.round(s.t - o.createdAt)} s`, { order: o.id, corr: o.corr });
    }
    // step aside to free station slot
    const p = STATIONS[tk.station];
    r.path = [{ x: p.x + (this.rand() - 0.5) * 5, z: ROAD_Z - 1.2 }]; r.state = 'to_home';
  }

  _seekCharger(r) {
    const s = this.s;
    const free = Object.values(s.chargers).find((c) => !c.occupiedBy && c.status === 'available');
    if (!free) { if (r.state !== 'waiting_charger') { r.state = 'waiting_charger'; this.rlog(r, 'INFO', 'WAITING_FOR_CHARGER', `Battery ${round(r.battery, 0)}%; no charger free`); } return; }
    free.occupiedBy = r.id; r.charger = free.id;
    this.rlog(r, 'INFO', 'SEEK_CHARGER', `Battery ${round(r.battery, 0)}%; heading to ${free.id}`);
    this._go(r, { x: free.x - 1.0, z: free.z }, 'to_charger');
  }
  _undock(r) {
    const s = this.s;
    const ch = s.chargers[r.charger]; if (ch) { ch.occupiedBy = null; ch.outputA = 0; }
    this.rlog(r, 'INFO', 'UNDOCKED', `Charging complete at ${round(r.battery, 0)}%`);
    r.charger = null; r.chargeA = 0; r.state = 'idle';
  }

  _replenish() {
    const s = this.s;
    if (s.step % 20) return;
    for (const [l, inv] of Object.entries(s.inventory)) {
      if (inv.sys < 4 && !inv.hold) {
        const add = 30; inv.sys += add;
        if (!(s.faults.inventoryMismatch && s.faults.inventoryMismatch.loc === l)) inv.phys += add;
        this.log('INFO', 'inventory-service', 'REPLENISHED', `${l} replenished +${add} (${inv.sku})`, {});
      }
    }
  }

  _maintStep(r) {
    const s = this.s;
    if (r.state === 'to_maintenance') {
      this._move(r, 0.8 * 0.5);
      if (!r.path.length) { r.state = 'in_maintenance'; this.log('INFO', 'audit', 'IN_MAINTENANCE_BAY', `${r.id} in maintenance bay (simulated technician procedure)`, { robot: r.id }); }
    }
    if (r.maint && s.t >= r.maint.until) {
      const m = r.maint; r.maint = null;
      this._opComplete({ kind: 'repair_done', robot: r.id, part: m.part });
    }
  }

  // ---------------------------------------------------------------- alarms
  _alarms() {
    const s = this.s;
    const want = {};
    for (const r of s.robots) {
      if (STOPPED_STATES.includes(r.state) && r.stopSince != null && s.t - r.stopSince > (r.state === 'comms_stop' ? 20 : 40)) want[`ROBOT_STOPPED:${r.id}`] = { sev: r.state === 'estop' ? 'MAJOR' : 'MINOR', source: r.id, msg: `${r.id} stopped (${r.state}) for >${r.state === 'comms_stop' ? 20 : 40}s` };
      if (r.state === 'charging' && r.chargeA === 0) want[`CHARGE_FAULT:${r.id}`] = { sev: 'MINOR', source: r.id, msg: `${r.id} docked at ${r.charger} with 0 A charge current` };
    }
    const age = this.oldestOpenAge();
    if (age > 300) want['QUEUE_AGE'] = { sev: age > 600 ? 'MAJOR' : 'MINOR', source: 'task-scheduler', msg: `Oldest open task age ${Math.round(age)} s (> 300 s)` };
    for (const name of SERVICES) { const er = this.serviceErrorRate(name, 60); if (er != null && er > 0.05) want[`SVC_ERRORS:${name}`] = { sev: er > 0.3 ? 'MAJOR' : 'MINOR', source: name, msg: `${name} error/timeout rate ${Math.round(er * 100)}% over 60 s` }; }
    for (const z of ['A', 'B', 'C', 'S']) { const n = s.winEv.filter((e) => e.type === 'disconnect' && e.zone === z && e.t > s.t - 300).length; if (n >= 3) want[`AP_DISCONNECTS:${z}`] = { sev: 'MINOR', source: ZONE_AP[z], msg: `${n} robot disconnects in zone ${z} in 5 min` }; }
    for (const st of Object.values(s.stations)) if (!st.ready) want[`STATION_UNAVAILABLE:${st.id}`] = { sev: 'MINOR', source: st.id, msg: `${st.id} unavailable: ${st.reason}` };
    if (s.faults.misleadingAlarm) want[`AP_CHANNEL_UTIL:${s.faults.misleadingAlarm.ap}`] = { sev: 'WARNING', source: s.faults.misleadingAlarm.ap, msg: `${s.faults.misleadingAlarm.ap} channel utilization ${s.aps[s.faults.misleadingAlarm.ap].channelUtil}% (> 75%)` };
    // raise
    for (const [key, a] of Object.entries(want)) {
      const ex = s.alarms.find((x) => x.key === key && !x.clearedAt);
      if (ex) { ex.lastTrue = s.t; ex.msg = a.msg; continue; }
      const al = { id: `AL-${s.ids.alarm++}`, key, ...a, raisedAt: s.t, lastTrue: s.t, clearedAt: null };
      s.alarms.push(al);
      this.log(a.sev === 'MAJOR' ? 'ERROR' : 'WARN', 'alarm-engine', 'ALARM_RAISED', `${al.id} ${a.msg}`, {});
      this.emit('alarm', al);
    }
    for (const al of s.alarms) if (!al.clearedAt && !want[al.key] && s.t - al.lastTrue >= 60) { al.clearedAt = s.t; this.log('INFO', 'alarm-engine', 'ALARM_CLEARED', `${al.id} cleared (${al.key}) after condition false for 60 s`, {}); }
    if (s.alarms.length > 400) s.alarms.splice(0, s.alarms.length - 400);
  }
  activeAlarms() { return this.s.alarms.filter((a) => !a.clearedAt); }

  // ---------------------------------------------------------------- metrics
  openTasks() { return this.s.taskIds.map((id) => this.s.tasks[id]).filter((t) => !['completed', 'failed', 'cancelled'].includes(t.state)); }
  oldestOpenAge() { const o = this.openTasks(); return o.length ? Math.max(...o.map((t) => this.s.t - t.createdAt)) : 0; }
  queueDepth() { return this.openTasks().filter((t) => ['queued', 'reserving', 'ready', 'assigned'].includes(t.state)).length; }
  robotAvailable(r) { return !r.isolated && !STOPPED_STATES.includes(r.state) && !['rebooting', 'in_maintenance', 'to_maintenance'].includes(r.state) && this.s.fm.reachable[r.id] && r.battery >= 10; }
  serviceErrorRate(name, win = 60) {
    const ev = this.s.winEv.filter((e) => e.type === 'svc_call' && e.service === name && e.t > this.s.t - win);
    if (!ev.length) return this.svcDown(name) ? 1 : null;
    return ev.filter((e) => !e.ok).length / ev.length;
  }
  serviceLatency(name) { const l = this.s.services[name].lat.slice().sort((a, b) => a - b); if (!l.length) return { p50: null, p95: null }; return { p50: l[Math.floor(l.length * 0.5)], p95: l[Math.min(l.length - 1, Math.floor(l.length * 0.95))] }; }
  serviceStatus(name) {
    if (this.svcDown(name)) return 'restarting';
    const er = this.serviceErrorRate(name, 60); const lat = this.serviceLatency(name).p95;
    if ((er ?? 0) > 0.3) return 'degraded';
    if ((er ?? 0) > 0.05 || (lat ?? 0) > 2000) return 'warning';
    return 'healthy';
  }
  countWin(type, win, pred = () => true) { const t0 = this.s.t - win; return this.s.winEv.filter((e) => e.type === type && e.t > t0 && pred(e)).length; }
  /** Compute a metric value for a window. Returns null when data is unavailable (not zero!). */
  metric(id, win = 900, opt = {}) {
    const s = this.s;
    const w = Math.min(win, s.t);
    switch (id) {
      case 'availability': return s.robots.filter((r) => this.robotAvailable(r)).length / s.robots.length;
      case 'tasksPerHour': return w < 60 ? null : this.countWin('task_completed', w) * 3600 / w;
      case 'successRate': { const c = this.countWin('task_completed', w), f = this.countWin('task_failed', w), a = this.countWin('task_aborted', w); return c + f + a === 0 ? null : c / (c + f + a); }
      case 'orderLatency': { const ev = s.winEv.filter((e) => e.type === 'order_completed' && e.t > s.t - w); return ev.length ? ev.reduce((x, e) => x + e.latency, 0) / ev.length : null; }
      case 'queueDepth': return this.queueDepth();
      case 'oldestAge': return this.oldestOpenAge();
      case 'batteryAvg': { const rs = s.robots.filter((r) => s.fm.reachable[r.id]); return rs.length ? rs.reduce((x, r) => x + r.battery, 0) / rs.length : null; }
      case 'charging': return s.robots.filter((r) => r.state === 'charging').length;
      case 'chargeFaults': return s.robots.filter((r) => r.state === 'charging' && r.chargeA === 0).length;
      case 'faultCount': return s.robots.filter((r) => STOPPED_STATES.includes(r.state)).length;
      case 'serviceErrorRate': return this.serviceErrorRate(opt.service || 'inventory-service', Math.min(w, 300));
      case 'disconnects': { if (opt.zone === 'D') return null; return this.countWin('disconnect', w, (e) => (opt.zone ? e.zone === opt.zone : e.zone !== 'D')); }
      case 'dupIgnored': return this.countWin('dup_ignored', w);
      case 'incidentAck': { const inc = s.incidents.filter((i) => i.ackAt != null); return inc.length ? inc.reduce((x, i) => x + (i.ackAt - i.reportedAt), 0) / inc.length : null; }
      case 'incidentRecovery': { const inc = s.incidents.filter((i) => i.recoveredAt != null); return inc.length ? inc.reduce((x, i) => x + (i.recoveredAt - i.reportedAt), 0) / inc.length : null; }
      default: return null;
    }
  }
  _sample() {
    const s = this.s;
    const smp = { t: s.t };
    for (const id of ['availability', 'tasksPerHour', 'successRate', 'orderLatency', 'queueDepth', 'oldestAge', 'batteryAvg', 'charging', 'faultCount', 'dupIgnored', 'chargeFaults']) smp[id] = this.metric(id, 900);
    smp.svcErr = {}; for (const n of SERVICES) smp.svcErr[n] = this.serviceErrorRate(n, 120);
    smp.disc = {}; for (const z of ['A', 'B', 'C', 'D', 'S']) smp.disc[z] = this.metric('disconnects', 300, { zone: z });
    s.samples.push(smp);
  }

  // ---------------------------------------------------------------- faults
  inject(kind, params = {}) {
    const s = this.s;
    s.faults[kind] = { ...params, injectedAt: s.t };
    const r = params.robot ? this.robot(params.robot) : null;
    if (kind === 'firmwareWifi') for (const id of params.robots || []) { this.robot(id).firmware = params.firmware; }
    if (kind === 'inventoryMismatch') { const inv = s.inventory[params.loc]; inv.phys = 0; inv.sys = Math.max(inv.sys, 6); }
    if (kind === 'regression') {
      s.config.ackTimeoutMs = 800; s.services['fleet-manager'].version = '5.2.0';
      s.releases.push({ id: 'REL-315', t: s.t - (params.ago ?? 600), service: 'fleet-manager', from: '5.1.0', to: '5.2.0', changes: ['Refactor assignment dispatcher', 'Config: ack_timeout_ms 5000 → 800 (ticket says intended 8000)', 'Log wording for ACK messages'], by: 'deploy pipeline (simulated)' });
    }
    if (kind === 'slowService') {
      s.config.inventoryPoolMax = 5;
      s.releases.push({ id: 'CHG-2291', t: s.t - (params.ago ?? 900), service: 'inventory-service', from: 'db.pool.max=50', to: 'db.pool.max=5', changes: ['Database connection pool max 50 → 5 ("align with staging")'], by: 'config change (simulated)' });
    }
    if (kind === 'chargerFault') s.chargers[params.charger].fault = 'output';
    this.emit('fault', { kind, params });
  }
  clearFault(kind) { delete this.s.faults[kind]; }

  // ---------------------------------------------------------------- learner/state-changing operations
  /** Returns {ok, msg, refused?} — all physical work is performed by fictional staff following a site procedure. */
  operate(op, p = {}) {
    const s = this.s;
    const r = p.robot ? this.robot(p.robot) : null;
    const refuse = (msg) => ({ ok: false, refused: true, msg });
    const req = (dur, kind, msg) => { this.schedule(dur, 'op', { kind, ...p }); s.pendingOps.push({ kind, ...p, due: s.t + dur }); this.audit(msg, { robot: p.robot }); return { ok: true, msg: `${msg} — expected to complete in about ${dur} s (simulated).`, pendingFor: dur }; };
    switch (op) {
      case 'preserve_evidence': {
        const snap = { t: s.t, target: p.robot || p.service || 'system', logs: (r ? r.localLog.concat(r.buffer) : s.logs.filter((e) => !p.service || e.service === p.service).slice(-300)).map((e) => ({ ...e })), fm: deepClone(s.fm.assignments), robot: r ? { state: r.state, task: r.taskId, session: r.session } : null };
        s.preserved.push(snap); this.audit(`Preserved evidence bundle for ${snap.target} (${snap.logs.length} log lines + task/assignment state)`, { robot: p.robot });
        return { ok: true, msg: `Evidence bundle saved for ${snap.target}: ${snap.logs.length} log lines, fleet-manager assignment table, robot state.` };
      }
      case 'isolate_robot': {
        if (!r) return refuse('Select a robot.');
        if (r.isolated) return refuse(`${r.id} is already isolated.`);
        r.isolated = true;
        let note = '';
        const a = s.fm.assignments[r.id];
        if (r.taskId || a) {
          const tk = s.tasks[r.taskId || a.taskId];
          if (r.payload === 'tote') { this._th(tk, 'payload_hold', `${r.id} isolated while carrying tote`); note = ` Task ${tk.id} is now PAYLOAD_HOLD: a tote is on the robot, so it cannot be requeued automatically.`; }
          else if (tk && !['completed', 'failed'].includes(tk.state)) { tk.robot = null; this._th(tk, 'ready', `released by isolation of ${r.id}`); tk.excluded[r.id] = s.t + 9999; note = ` Task ${tk.id} released and requeued with the same idempotency key.`; }
          delete s.fm.assignments[r.id];
          if (r.payload !== 'tote') { r.taskId = null; r.idem = null; }
        }
        if (['to_pick', 'to_station', 'to_charger', 'to_home'].includes(r.state)) { r.path = []; r.state = 'idle'; }
        this.audit(`Isolated ${r.id} from task assignment (controlled stop in place).${note}`, { robot: r.id });
        this.log('INFO', 'fleet-manager', 'ROBOT_ISOLATED', `${r.id} removed from assignment pool`, { robot: r.id });
        return { ok: true, msg: `${r.id} isolated: fleet manager will not assign it work.${note}` };
      }
      case 'return_to_service': {
        if (!r) return refuse('Select a robot.');
        if (['fault', 'loc_lost', 'estop', 'battery_critical'].includes(r.state)) return refuse(`${r.id} is in ${r.state}; resolve that state first.`);
        if (r.state === 'in_maintenance' && r.maint) return refuse('Repair still in progress.');
        if (r.state === 'in_maintenance') { r.x = MAINT.x; r.z = MAINT.z; r.path = [{ x: MAINT.x, z: ROAD_Z }, { x: MAINT.x + 4, z: ROAD_Z }]; r.state = 'to_home'; }
        r.isolated = false;
        this.audit(`Returned ${r.id} to service`, { robot: r.id });
        return { ok: true, msg: `${r.id} returned to the assignment pool. Verify that it completes a full task.` };
      }
      case 'send_to_maintenance': {
        if (!r) return refuse('Select a robot.');
        if (!r.isolated) return refuse(`Isolate ${r.id} first. A robot must be out of the assignment pool before a technician recovers it (simulated site procedure).`);
        if (r.payload === 'tote') return refuse(`${r.id} is carrying a tote; recover the payload first so the task record stays consistent.`);
        r.state = 'to_maintenance'; r.path = this._route(r, MAINT); r.stopSince = null; r.faultCodes = [];
        this.audit(`Requested technician recovery of ${r.id} to maintenance bay (zone lockout, manual mode, simulated)`, { robot: r.id });
        return { ok: true, msg: `Technician (fictional) is recovering ${r.id} under the site's lockout procedure. In a real facility, follow your employer-approved procedure — never enter an active robot area yourself.` };
      }
      case 'repair': {
        if (!r || r.state !== 'in_maintenance') return refuse('Robot must be in the maintenance bay.');
        if (r.maint) return refuse('A repair is already in progress.');
        r.maint = { part: p.part, until: s.t + 90 };
        this.audit(`Requested bench check/repair "${p.part}" on ${r.id} (de-energized, simulated)`, { robot: r.id });
        return { ok: true, msg: `Bench procedure "${p.part}" started on ${r.id} (de-energized, simulated). ~90 s.`, pendingFor: 90 };
      }
      case 'recover_payload': {
        if (!r || r.payload !== 'tote') return refuse('Robot has no payload.');
        if (!r.isolated) return refuse('Isolate the robot first.');
        return req(90, 'payload_recovered', `Requested technician to hand-carry tote from ${r.id} to its station and close the task manually`);
      }
      case 'restart_robot': {
        if (!r) return refuse('Select a robot.');
        const lost = r.localLog.length + r.buffer.length;
        if (!s.preserved.some((x) => x.target === r.id && x.t > s.t - 600)) s.evidenceLost.push({ t: s.t, what: `${r.id} local diagnostic buffer (${lost} lines) erased by restart before evidence was preserved` });
        this._reboot(r);
        this.audit(`Remote controller restart of ${r.id}`, { robot: r.id });
        return { ok: true, msg: `${r.id} controller restarting (~35 s). The command was accepted — that does NOT prove the robot or the workflow recovered.` };
      }
      case 'relocalize': {
        if (!r) return refuse('Select a robot.');
        const md = s.faults.markerDamage;
        const inD = md && aisleAt(r.x) === md.aisle && r.z >= md.zMin && r.z <= md.zMax;
        this.audit(`Remote relocalization request for ${r.id}`, { robot: r.id });
        if (inD) { this.rlog(r, 'WARN', 'RELOCALIZE_FAILED', 'Requested relocalization failed: insufficient floor-marker matches'); return { ok: false, msg: `Relocalization failed: ${r.id} matched too few floor markers at its position.` }; }
        r.loc = 0.95; if (r.state === 'loc_lost') { r.state = r.resume || 'idle'; r.resume = null; r.stopSince = null; }
        return { ok: true, msg: `${r.id} relocalized (confidence 0.95).` };
      }
      case 'release_task_lease': {
        if (!r) return refuse('Select a robot.');
        const a = s.fm.assignments[r.id];
        if (!a) return refuse(`Fleet manager holds no assignment for ${r.id}.`);
        if (r.taskId) return refuse(`Refused: ${r.id} reports it is actively executing ${r.taskId}. Releasing would risk duplicate work.`);
        if (!this.connected(r)) return refuse(`${r.id} unreachable: cannot confirm robot-side task state. Releasing now could create duplicate work.`);
        const tk = s.tasks[a.taskId]; delete s.fm.assignments[r.id];
        tk.robot = null; this._th(tk, 'ready', `stale assignment released by operator; same idempotency key ${tk.idem}`);
        this.audit(`Released stale fleet-manager assignment ${tk.id} from ${r.id}; task requeued with same idempotency key`, { robot: r.id, task: tk.id });
        return { ok: true, msg: `Assignment ${tk.id} released and requeued (idempotency key ${tk.idem} unchanged).` };
      }
      case 'request_aisle_clear': {
        s.lockouts[p.aisle] = s.t + 120;
        return req(120, 'aisle_cleared', `Requested floor team to inspect/clear aisle ${p.aisle} under zone lockout (robots paused in aisle ${p.aisle})`);
      }
      case 'restrict_zone': {
        s.restricted[p.aisle] = true;
        for (const id of s.taskIds) { const tk = s.tasks[id]; if (['queued', 'ready'].includes(tk.state) && tk.loc[0] === p.aisle) { const alt = this._chooseLoc(tk.sku, tk.loc); if (alt[0] !== p.aisle) { tk.loc = alt; this.log('INFO', 'task-scheduler', 'TASK_RELOCATED', `${tk.id} relocated to ${alt} (aisle ${p.aisle} restricted)`, { task: tk.id, order: tk.orderId, corr: tk.corr }); } } }
        this.audit(`Restricted aisle ${p.aisle}: no new robot work dispatched there; alternate locations used where stock exists`);
        return { ok: true, msg: `Aisle ${p.aisle} restricted. Picks re-routed to alternate locations where possible. Tasks with no alternate will wait.` };
      }
      case 'unrestrict_zone': { delete s.restricted[p.aisle]; this.audit(`Removed restriction on aisle ${p.aisle}`); return { ok: true, msg: `Aisle ${p.aisle} open for work.` }; }
      case 'request_marker_repair': return req(240, 'markers_repaired', `Requested facilities to inspect/replace floor localization markers in aisle ${p.aisle}`);
      case 'request_ap_repair': return req(150, 'ap_repaired', `Requested network team to diagnose and restore ${p.ap}`);
      case 'restart_service': {
        const sv = s.services[p.service];
        if (!sv) return refuse('Unknown service');
        if (!s.preserved.some((x) => x.target === p.service && x.t > s.t - 600)) s.evidenceLost.push({ t: s.t, what: `${p.service} in-memory state (connection pool, assignment cache) lost before evidence was preserved` });
        sv.restartingUntil = s.t + 25;
        if (p.service === 'inventory-service' && s.faults.slowService) s.faults.slowService.suppressedUntil = s.t + 25 + 150;
        if (p.service === 'station-service' && s.faults.stationDown?.kind === 'heartbeat') this.schedule(25, 'op', { kind: 'station_connector_reset', station: s.faults.stationDown.station });
        this.audit(`Restarted ${p.service} (≈25 s outage)`);
        this.log('WARN', p.service, 'SERVICE_RESTART', `${p.service} restarting`, {});
        return { ok: true, msg: `${p.service} restarting (≈25 s unavailable). Watch whether the symptom returns.` };
      }
      case 'rollback_release': {
        const rel = s.releases.slice().reverse().find((x) => x.service === p.service && x.t > s.t - 6 * 3600 && !x.rolledBack && x.id.startsWith('REL'));
        if (!rel) return refuse(`No ${p.service} release in the last 6 h to roll back.`);
        rel.rolledBack = true;
        return req(45, 'rollback_done', `Rollback ${p.service} ${rel.to} → ${rel.from} (${rel.id})`);
      }
      case 'revert_config': {
        const ch = s.releases.find((x) => x.id === p.change && !x.rolledBack);
        if (!ch) return refuse('Change not found or already reverted.');
        ch.rolledBack = true;
        return req(30, 'config_reverted', `Revert configuration change ${ch.id} on ${ch.service}`);
      }
      case 'set_concurrency': { const old = s.config.schedulerConcurrency; s.config.schedulerConcurrency = p.value; this.audit(`Scheduler reservation concurrency ${old} → ${p.value}`); return { ok: true, msg: `Concurrency set to ${p.value}. Rollback: set it back to ${old}.` }; }
      case 'reroute_station': {
        s.config.stationRotation[p.station] = false;
        const others = Object.keys(STATIONS).filter((x) => x !== p.station && s.config.stationRotation[x]);
        let n = 0;
        for (const id of s.taskIds) { const tk = s.tasks[id]; if (tk.station === p.station && !['completed', 'failed', 'at_station'].includes(tk.state)) { tk.station = others[n % others.length]; n++; const rr = tk.robot ? this.robot(tk.robot) : null; if (rr && (rr.state === 'waiting_station' || rr.state === 'to_station')) this._go(rr, this._stationPoint(tk.station), 'to_station'); } }
        this.audit(`Removed ${p.station} from rotation; rerouted ${n} task(s) to ${others.join(', ')}`);
        return { ok: true, msg: `${p.station} out of rotation; ${n} task(s) rerouted. Watch load on the remaining stations.` };
      }
      case 'restore_station': { s.config.stationRotation[p.station] = true; this.audit(`${p.station} returned to rotation`); return { ok: true, msg: `${p.station} back in rotation.` }; }
      case 'request_station_repair': return req(200, 'station_repaired', `Requested station technician to inspect ${p.station} (scanner, HMI, network)`);
      case 'inventory_hold': {
        const inv = s.inventory[p.loc]; inv.hold = true;
        this.audit(`Inventory hold on ${p.loc}; picks reallocated to alternate location where possible`);
        return { ok: true, msg: `${p.loc} on hold. Pending picks for ${inv.sku} will use ${s.skuLocs[inv.sku].find((l) => l !== p.loc)}.` };
      }
      case 'request_cycle_count': return req(120, 'cycle_counted', `Requested inventory cycle count at ${p.loc}`);
      case 'release_hold': { s.inventory[p.loc].hold = false; this.audit(`Released hold on ${p.loc}`); return { ok: true, msg: `${p.loc} released.` }; }
      case 'request_estop_inspection': {
        if (!r) return refuse('Select a robot.');
        return req(90, 'estop_inspected', `Requested shift lead to inspect ${r.id} E-stop and surrounding area and reset per site procedure`);
      }
      case 'request_charger_repair': s.chargers[p.charger].status = 'maintenance'; return req(200, 'charger_repaired', `Requested technician to inspect charger ${p.charger}`);
      case 'dispatch_test_task': {
        if (!r) return refuse('Select a robot.');
        if (!this.fmAvailable(r)) return refuse(`${r.id} is not available for a test task (state ${r.state}${r.isolated ? ', isolated' : ''}${r.battery < 25 ? ', battery < 25%' : ''}${!s.fm.reachable[r.id] ? ', unreachable' : ''}).`);
        const locs = Object.entries(s.inventory).filter(([l, v]) => v.sys > 0 && v.phys > 0 && !v.hold && !s.restricted[l[0]]).map(([l]) => l);
        if (!locs.length) return refuse('No eligible pick location.');
        locs.sort((a, b) => { const pa = locPos(a), pb = locPos(b); return (Math.abs(pa.x - r.x) + Math.abs(pa.z - r.z)) - (Math.abs(pb.x - r.x) + Math.abs(pb.z - r.z)); });
        const loc = locs[0]; const st = Object.keys(STATIONS).find((x) => s.config.stationRotation[x] && s.stations[x].ready) || 'P-1';
        const o = this.createOrder([s.inventory[loc].sku], { loc, station: st, priority: 'test' });
        this.forceAssign(o.tasks[0], r.id);
        this.audit(`Dispatched verification test task ${o.tasks[0]} (${loc} → ${st}) to ${r.id}`, { robot: r.id, task: o.tasks[0] });
        return { ok: true, msg: `Test task ${o.tasks[0]} sent to ${r.id}: pick at ${loc}, deliver to ${st}. Watch it complete end-to-end.`, task: o.tasks[0] };
      }
      case 'redock': {
        if (!r) return refuse('Select a robot.');
        const ch = s.chargers[p.charger];
        if (!ch || ch.occupiedBy) return refuse(`${p.charger} is occupied or unknown.`);
        if (r.charger) { const old = s.chargers[r.charger]; old.occupiedBy = null; old.outputA = 0; }
        ch.occupiedBy = r.id; r.charger = ch.id; r.chargeA = 0;
        this._go(r, { x: ch.x - 1, z: ch.z }, 'to_charger');
        this.audit(`Sent ${r.id} to charger ${ch.id} (discriminating test)`, { robot: r.id });
        return { ok: true, msg: `${r.id} heading to ${ch.id}. Watch its charge current after docking.` };
      }
      default: return refuse(`Unknown operation ${op}`);
    }
  }

  _opComplete(d) {
    const s = this.s;
    s.pendingOps = s.pendingOps.filter((o) => !(o.kind === d.kind && o.due <= s.t + 0.01));
    const r = d.robot ? this.robot(d.robot) : null;
    switch (d.kind) {
      case 'aisle_cleared': {
        const ob = s.faults.obstruction;
        if (ob && ob.aisle === d.aisle) { delete s.faults.obstruction; this.log('INFO', 'audit', 'OBSTRUCTION_REMOVED', `Floor team (simulated) removed a fallen tote from aisle ${d.aisle} at z=${ob.z}; aisle reopened`, {}); }
        else this.log('INFO', 'audit', 'AISLE_INSPECTED', `Floor team (simulated) inspected aisle ${d.aisle}: no obstruction found`, {});
        delete s.lockouts[d.aisle];
        break;
      }
      case 'markers_repaired': {
        const md = s.faults.markerDamage;
        if (md && md.aisle === d.aisle) { delete s.faults.markerDamage; this.log('INFO', 'audit', 'MARKERS_REPLACED', `Facilities (simulated) replaced 3 damaged floor markers in aisle ${d.aisle}`, {}); }
        else this.log('INFO', 'audit', 'MARKERS_INSPECTED', `Facilities (simulated) inspected aisle ${d.aisle}: markers intact`, {});
        break;
      }
      case 'ap_repaired': {
        const f = s.faults.apDegraded;
        if (f && f.ap === d.ap) { delete s.faults.apDegraded; this.log('INFO', 'audit', 'AP_RESTORED', f.unknownCause ? `Network team (simulated) rebooted ${d.ap}; radio stable since. AP logs before reboot were not retained — cause not determined` : `Network team (simulated) found ${d.ap} radio on a congested channel with failing antenna cable; replaced cable and moved channel`, {}); }
        else this.log('INFO', 'audit', 'AP_INSPECTED', `Network team (simulated) checked ${d.ap}: healthy, no changes made`, {});
        break;
      }
      case 'rollback_done': {
        if (d.service === 'fleet-manager') { s.config.ackTimeoutMs = 5000; s.services['fleet-manager'].version = '5.1.0'; delete s.faults.regression; }
        this.log('INFO', 'audit', 'ROLLBACK_COMPLETE', `${d.service} rolled back`, {});
        break;
      }
      case 'config_reverted': {
        if (d.change === 'CHG-2291') { s.config.inventoryPoolMax = 50; delete s.faults.slowService; }
        this.log('INFO', 'audit', 'CONFIG_REVERTED', `${d.change} reverted`, {});
        break;
      }
      case 'station_repaired': {
        const f = s.faults.stationDown;
        if (f && f.station === d.station && f.kind === 'scanner') { delete s.faults.stationDown; this.log('INFO', 'audit', 'STATION_REPAIRED', `Technician (simulated) reseated ${d.station} scanner cable; scanner responding`, {}); }
        else this.log('INFO', 'audit', 'STATION_INSPECTED', `Technician (simulated) found ${d.station} hardware healthy; HMI shows READY`, {});
        break;
      }
      case 'station_connector_reset': {
        const f = s.faults.stationDown;
        if (f && f.station === d.station && f.kind === 'heartbeat') { delete s.faults.stationDown; this.log('INFO', 'station-service', 'HEARTBEAT_RESUMED', `${d.station} heartbeat resumed after station-service restart`, {}); }
        break;
      }
      case 'cycle_counted': {
        const inv = s.inventory[d.loc];
        const f = s.faults.inventoryMismatch;
        const was = inv.sys; inv.sys = inv.phys; inv.lastCount = s.t;
        if (f && f.loc === d.loc) { delete s.faults.inventoryMismatch; inv.note = `Count found 0 at ${d.loc}; ${was} units located in adjacent ${d.loc.slice(0, 2)}${String(parseInt(d.loc.slice(2), 10) - 1).padStart(2, '0')} (mis-slotted at putaway)`; }
        this.log('INFO', 'inventory-service', 'CYCLE_COUNT', `Cycle count ${d.loc}: system ${was} → ${inv.sys}${inv.note ? '; ' + inv.note : ''}`, {});
        break;
      }
      case 'estop_inspected': {
        if (r) { r.estop = false; if (s.faults.estop?.robot === r.id) delete s.faults.estop; this.log('INFO', 'audit', 'ESTOP_RESET_BY_SITE', `Shift lead (simulated) confirmed area clear and reset ${r.id} E-stop per site procedure (cleaning crew had pressed it)`, { robot: r.id }); }
        break;
      }
      case 'charger_repaired': {
        const f = s.faults.chargerFault;
        s.chargers[d.charger].status = 'available';
        if (f && f.charger === d.charger) { delete s.faults.chargerFault; s.chargers[d.charger].fault = null; this.log('INFO', 'audit', 'CHARGER_REPAIRED', `Technician (simulated) replaced ${d.charger} output fuse`, {}); }
        else this.log('INFO', 'audit', 'CHARGER_INSPECTED', `Technician (simulated) measured ${d.charger} output: normal`, {});
        break;
      }
      case 'payload_recovered': {
        const tk = Object.values(s.tasks).find((t) => t.state === 'payload_hold' && t.robot === d.robot) || (r?.taskId ? s.tasks[r.taskId] : null);
        if (tk) { tk.doneAt = s.t; this._th(tk, 'completed', 'manual completion: tote hand-carried to station (simulated)'); s.counters.completed++; this.win('task_completed', { robot: d.robot, zone: tk.loc[0], station: tk.station, dur: s.t - tk.createdAt }); const o = s.orders[tk.orderId]; if (o && o.tasks.every((id) => s.tasks[id]?.state === 'completed')) { o.state = 'completed'; o.doneAt = s.t; this.win('order_completed', { latency: s.t - o.createdAt }); } }
        if (r) { r.payload = 'empty'; r.taskId = null; r.idem = null; }
        this.log('INFO', 'audit', 'PAYLOAD_RECOVERED', `Tote recovered from ${d.robot} and delivered manually`, { robot: d.robot });
        break;
      }
      case 'repair_done': {
        const part = d.part; let fixed = false;
        if (part === 'replace_encoder' && s.faults.encoder?.robot === r.id) { delete s.faults.encoder; fixed = true; }
        if (part === 'replace_wheel_module' && s.faults.motorDrag?.robot === r.id) { delete s.faults.motorDrag; fixed = true; }
        if (part === 'replace_charge_contacts' && s.faults.chargeContacts?.robot === r.id) { delete s.faults.chargeContacts; fixed = true; }
        if (part === 'firmware_rollback' && s.faults.firmwareWifi && r.firmware === s.faults.firmwareWifi.firmware) { r.firmware = 'rc-4.2.1'; fixed = true; }
        if (part === 'clean_loc_sensor' && s.faults.locSensor?.robot === r.id) { delete s.faults.locSensor; fixed = true; }
        r.residual = 0; r.faultCodes = []; r._dragHeat = 0; if (r.state === 'fault') r.state = 'in_maintenance';
        r.battery = Math.max(r.battery, 60);
        this.log('INFO', 'audit', 'BENCH_RESULT', `${r.id} bench procedure ${part}: ${fixed ? 'defect found and corrected' : 'no defect found for this component'}`, { robot: r.id });
        r._lastRepair = { part, fixed, t: s.t };
        break;
      }
      default: break;
    }
    this.emit('op', d);
  }

  _reboot(r, dur = 35) {
    const s = this.s;
    r.localLog = []; r.buffer = [];
    r.rebootUntil = s.t + dur; r.bootAt = s.t + dur; r.session = `s-${s.ids.session++}`; r.residual = 0; r.faultCodes = [];
    if (r.state === 'loc_lost') r.loc = 0.4;
    if (['fault', 'loc_lost', 'blocked', 'comms_stop', 'to_pick', 'to_station', 'waiting_station', 'picking'].includes(r.state)) r.state = 'idle';
    if (r.taskId && r.payload === 'empty') { r.taskId = null; r.idem = null; }
    r.path = []; r.resume = null; r.stopSince = null;
  }

  /** Scenario helper: let a robot finish its current work so it can be repositioned cleanly. */
  freeRobot(id, maxWait = 400) {
    const r = this.robot(id);
    for (let i = 0; i < maxWait / 5 && (r.taskId || this.s.fm.assignments[id] || r.payload === 'tote' || !['idle', 'charging', 'waiting_charger'].includes(r.state)); i++) this.run(5);
    if (r.charger) { const c = this.s.chargers[r.charger]; c.occupiedBy = null; c.outputA = 0; r.charger = null; r.chargeA = 0; }
    r.state = 'idle'; r.path = [];
    return !r.taskId;
  }

  /** Force a specific task to a robot (scenario setup). */
  forceAssign(taskId, robotId) {
    const tk = this.s.tasks[taskId]; const r = this.robot(robotId);
    tk.state = 'ready'; tk.readyAt = this.s.t; this.s.inventory[tk.loc].reserved++;
    this.assign(tk, r);
  }
  teleport(robotId, x, z) { const r = this.robot(robotId); r.x = x; r.z = z; r.path = []; }
}
