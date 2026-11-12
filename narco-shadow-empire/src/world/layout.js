// PUERTO CENIZA - district layout. THE SPATIAL CONTRACT. Pure data (no three.js) so the world builders,
// the phone map, the mission scripts and Node tests all read the same numbers.
//
// Units: meters. +X = east, +Z = south (north is -Z), +Y = up.
// yaw convention: see src/core/util.js (yaw 0 faces north/-Z, +PI/2 west, PI south, -PI/2 east).
// Rects are {x0, x1, z0, z1} with x0 < x1 and z0 < z1.
//
// World builders MUST build geometry that matches these footprints, door openings and anchors.
// Mission scripts reference places ONLY through ANCHORS / STATIONS ids, never raw coordinates.
import { FACE } from '../core/util.js';

export const Y_ROAD = 0;        // asphalt: roads, warehouse yard + interior, garage forecourt + interior, pier parking
export const Y_WALK = 0.15;     // sidewalks, promenade, pier deck, hotel ground floor
export const Y_ROOF = 18;       // hotel roof deck
export const WATER_Y = -1.2;

/** Playable district bounds. East of x = 80 is open water (seawall), everything else ends in barriers + backdrop. */
export const DISTRICT = Object.freeze({ x0: -105, x1: 105, z0: -95, z1: 115 });

/** The four roadways (12 m wide: one 3.5 m driving lane each way + a 2.5 m parking lane on both sides). */
export const ROADWAYS = Object.freeze([
  { id: 'faro',   name: 'Avenida del Faro',  axis: 'x', x0: -105, x1: 80,  z0: -47, z1: -35, center: -41 },
  { id: 'muelle', name: 'Calle del Muelle',  axis: 'x', x0: -105, x1: 80,  z0: 35,  z1: 47,  center: 41 },
  { id: 'ancla',  name: 'Calle Ancla',       axis: 'z', x0: -57,  x1: -45, z0: -95, z1: 115, center: -51 },
  { id: 'marea',  name: 'Paseo de la Marea', axis: 'z', x0: 45,   x1: 57,  z0: -95, z1: 115, center: 51 },
]);

/** Road ends are closed by barriers (construction / police / port gate) at these coordinates. */
export const ROAD_ENDS = Object.freeze([
  { road: 'faro', x: -100, z: -41, kind: 'construction' }, { road: 'faro', x: 78, z: -41, kind: 'seawall' },
  { road: 'muelle', x: -100, z: 41, kind: 'police' },      { road: 'muelle', x: 78, z: 41, kind: 'portgate' },
  { road: 'ancla', x: -51, z: -90, kind: 'police' },       { road: 'ancla', x: -51, z: 110, kind: 'construction' },
  { road: 'marea', x: 51, z: -90, kind: 'construction' },  { road: 'marea', x: 51, z: 110, kind: 'portgate' },
]);

/** Driving-lane centre lines (right-hand traffic). */
export const LANES = Object.freeze({
  faro:   { eastbound: -39.25, westbound: -42.75 },   // z of lane centres
  muelle: { eastbound: 42.75,  westbound: 39.25 },
  ancla:  { southbound: -52.75, northbound: -49.25 }, // x of lane centres
  marea:  { southbound: 49.25,  northbound: 52.75 },
});

/**
 * The 3x3 grid of cells created by the four roads. `outer` includes the 3 m sidewalk band on every side that
 * faces a road; `lot` is the buildable area inside the sidewalks. Sidewalks are raised to Y_WALK.
 */
export const CELLS = Object.freeze({
  center: { name: 'Manzana Central', outer: { x0: -45, x1: 45, z0: -35, z1: 35 },    lot: { x0: -42, x1: 42, z0: -32, z1: 32 } },
  north:  { name: 'Hotel Mirador',   outer: { x0: -45, x1: 45, z0: -95, z1: -47 },   lot: { x0: -42, x1: 42, z0: -95, z1: -50 } },
  south:  { name: 'Bodega 7',        outer: { x0: -45, x1: 45, z0: 47, z1: 115 },    lot: { x0: -42, x1: 42, z0: 50, z1: 115 } },
  west:   { name: 'Taller Rueda',    outer: { x0: -105, x1: -57, z0: -35, z1: 35 },  lot: { x0: -105, x1: -60, z0: -32, z1: 32 } },
  east:   { name: 'El Malecon',      outer: { x0: 57, x1: 105, z0: -35, z1: 35 },    lot: { x0: 60, x1: 105, z0: -32, z1: 32 } },
  nw:     { name: 'Torres del Norte', outer: { x0: -105, x1: -57, z0: -95, z1: -47 }, lot: { x0: -105, x1: -60, z0: -95, z1: -50 } },
  ne:     { name: 'El Faro',         outer: { x0: 57, x1: 105, z0: -95, z1: -47 },   lot: { x0: 60, x1: 105, z0: -95, z1: -50 } },
  sw:     { name: 'Planta Electrica', outer: { x0: -105, x1: -57, z0: 47, z1: 115 },  lot: { x0: -105, x1: -60, z0: 50, z1: 115 } },
  se:     { name: 'Puerto de Contenedores', outer: { x0: 57, x1: 105, z0: 47, z1: 115 }, lot: { x0: 60, x1: 105, z0: 50, z1: 115 } },
});

/** Dropped-curb driveways (sidewalk lowered to road level so vehicles cross smoothly). */
export const DRIVEWAYS = Object.freeze([
  { id: 'warehouse', x0: 14, x1: 22, z0: 47, z1: 51 },
  { id: 'garage',    x0: -60, x1: -57, z0: -1, z1: 17 },
  { id: 'gas',       x0: -60, x1: -57, z0: -27, z1: -15 },
  { id: 'pier',      x0: 57, x1: 60, z0: -5, z1: 5 },
]);

// ---- Central block ---------------------------------------------------------------------------------
// Mid-rise neon district, max building height 14 m (the hotel roof at 18 m must overlook it).
export const CENTRAL = Object.freeze({
  alleyNS: { x0: -3, x1: 3, z0: -32, z1: 32 },       // "Callejon del Gato" - pedestrian only (bollards at both ends)
  alleyEW: { x0: -42, x1: 42, z0: -2.5, z1: 2.5 },   // service alley
  clusters: [
    { id: 'c_nw', x0: -42, x1: -3, z0: -32, z1: -2.5 },
    { id: 'c_ne', x0: 3,   x1: 42, z0: -32, z1: -2.5 },
    { id: 'c_sw', x0: -42, x1: -3, z0: 2.5, z1: 32 },
    { id: 'c_se', x0: 3,   x1: 42, z0: 2.5, z1: 32 },
  ],
  maxHeight: 14,
});

// ---- North lot: Hotel Mirador (task-force safehouse: lobby + ops room + rooftop) ----------------------
export const HOTEL = Object.freeze({
  footprint: { x0: -22, x1: 14, z0: -86, z1: -54 }, wall: 0.5, floors: 5, height: Y_ROOF,
  forecourt: { x0: -22, x1: 14, z0: -54, z1: -50 },                               // paved, Y_WALK
  entrance: { x: -4, z: -54, width: 3, height: 2.6 },                              // double door, south face
  lobby: { x0: -21.5, x1: 13.5, z0: -69.5, z1: -54.5, floorY: Y_WALK, ceilY: 4.2 },
  ops:   { x0: -21.5, x1: 13.5, z0: -85.5, z1: -70.5, floorY: Y_WALK, ceilY: 4.2 },
  opsDoor: { x: 6, z: -70, width: 1.6, height: 2.3 },                              // in the partition (z -70.5..-69.5)
  elevatorLobby: { x: 13.5, z: -62 },                                              // lobby east wall
  roof: { x0: -21.5, x1: 13.5, z0: -85.5, z1: -54.5, y: Y_ROOF, parapet: 1.1 },
  roofHut: { x0: 9, x1: 13.5, z0: -65, z1: -59, height: 3 },                       // elevator bulkhead (door on its west side)
});

// ---- West lot: Taller Mecanico Rueda (garage) + gas station ---------------------------------------------
export const GARAGE = Object.freeze({
  footprint: { x0: -96, x1: -68, z0: -4, z1: 24 }, wall: 0.5, height: 6.5,
  interior: { x0: -95.5, x1: -68.5, z0: -3.5, z1: 23.5, floorY: Y_ROAD, ceilY: 6 },
  bays: [                                                                            // openings in the east wall (x = -68)
    { id: 'bay1', z: 3, width: 5, height: 4.2 },
    { id: 'bay2', z: 13, width: 5, height: 4.2 },
  ],
  office: { x0: -95.5, x1: -88, z0: 16.5, z1: 23.5 },
  forecourt: { x0: -68, x1: -60, z0: -32, z1: 32 },                                // asphalt apron, Y_ROAD
  canopy: { x0: -84, x1: -64, z0: -29, z1: -13, height: 5 },                       // gas station canopy
  pump: { x: -74, z: -21 },
});

// ---- South lot: Almacenes Maritimos Ceniza - Bodega 7 (warehouse compound) --------------------------------
const TRUCK = { length: 9, width: 2.6, height: 3.6, yaw: FACE.N };                  // box trucks backed up to the dock doors (cab north)
export const WAREHOUSE = Object.freeze({
  fence: { x0: -41, x1: 41, z0: 51, z1: 114, height: 2.6 },                         // chain-link
  gate: { x0: 14, x1: 22, z: 51 },                                                  // vehicle gate in the north fence
  yard: { x0: -41, x1: 41, z0: 51, z1: 70 },
  footprint: { x0: -36, x1: 24, z0: 70, z1: 108 }, wall: 0.5, height: 9,
  interior: { x0: -35.5, x1: 23.5, z0: 70.5, z1: 107.5, floorY: Y_ROAD, ceilY: 8.5 },
  dockDoors: [                                                                       // roll-up doors in the north wall (z = 70), grade level
    { id: 'dock1', x: -24, width: 3.6, height: 4.2 },
    { id: 'dock2', x: -12, width: 3.6, height: 4.2 },
    { id: 'dock3', x: 0,   width: 3.6, height: 4.2 },
  ],
  personnelDoor: { x: 16, z: 70, width: 1.4, height: 2.2 },                         // north wall
  sideDoor: { x: 24, z: 86.5, width: 4, height: 4.2 },                              // east wall roll-up (open)
  trucks: [
    { id: 'truck1', x: -24, z: 64.5, ...TRUCK },
    { id: 'truck2', x: -12, z: 64.5, ...TRUCK },
    { id: 'truck3', x: 0,   z: 64.5, ...TRUCK },
  ],
  racks: [                                                                           // pallet racks: 1.2 m deep, 6 m tall, running east-west
    { id: 'rackA', x0: -30, x1: 4, z: 80 },
    { id: 'rackB', x0: -30, x1: 4, z: 86 },
    { id: 'rackC', x0: -30, x1: 4, z: 92 },
  ],
  cage: { x0: -35.5, x1: -24, z0: 97, z1: 107.5, door: { x: -24, z: 101.7, width: 1.4 } },    // chain-link evidence cage (SW corner)
  office: { x0: 10, x1: 23.5, z0: 97, z1: 107.5, door: { x: 10, z: 101.6, width: 1.2 } },     // records office (SE corner), solid walls + windows
});

// ---- East lot: El Malecon (waterfront, ferry pier - the arrival point) --------------------------------------
export const PIER = Object.freeze({
  promenade: { x0: 60, x1: 80, z0: -32, z1: 32 },      // paved, Y_WALK (except the parking apron)
  parking: { x0: 60, x1: 73, z0: -12, z1: 12 },         // asphalt apron, Y_ROAD
  seawallX: 80,                                         // open water east of here
  deck: { x0: 80, x1: 104, z0: -4, z1: 4, y: Y_WALK },  // wooden pier
  kiosk: { x0: 74.5, x1: 79.5, z0: -13, z1: -6, height: 3.4 },   // ferry ticket kiosk (not enterable)
  ferry: { x: 107, z: 10, length: 26, width: 8, yaw: FACE.N },   // moored ferry (prop, not boardable)
});

/** Tall landmarks used by the rooftop observation puzzles (base position + height in meters). */
export const LANDMARKS = Object.freeze({
  lighthouse: { name: 'El Faro',            x: 94,  z: -74, height: 30 },
  crane:      { name: 'Grua del Puerto',    x: 84,  z: 82,  height: 45 },
  stack:      { name: 'Chimenea',           x: -84, z: 84,  height: 40 },
  tower:      { name: 'Torre Norte',        x: -84, z: -74, height: 55 },
});

/** Chapter 1 forces the long way round: Paseo de la Marea is closed south of the pier. */
export const ROADBLOCK_MAREA = Object.freeze({ x0: 45, x1: 57, z: 18 });

// ---- Anchors -------------------------------------------------------------------------------------------
// Named positions: where the player stands to use a station, where vehicles park, where NPCs stand.
// pos = [x, y, z] of the FEET (or the vehicle origin on the ground). yaw per the project convention.
const A = (x, y, z, yaw = 0) => Object.freeze({ pos: Object.freeze([x, y, z]), yaw });
export const ANCHORS = Object.freeze({
  // arrival / pier
  'pier.spawn':        A(88, Y_WALK, 0, FACE.W),
  'pier.parking':      A(66, Y_ROAD, 4, FACE.W),          // vehicle spot (Chapter 1 start)
  'pier.board':        A(77, Y_WALK, -4.6, FACE.N),
  // hotel / safehouse
  'hotel.parking':     A(-12, Y_ROAD, -45.75, FACE.W),    // curb parking lane in front of the hotel (vehicle spot)
  'hotel.entrance':    A(-4, Y_WALK, -51.5, FACE.N),      // on the forecourt, facing the door
  'hotel.lobby':       A(-4, Y_WALK, -58, FACE.N),        // just inside
  'hotel.reception':   A(-12.5, Y_WALK, -62, FACE.W),
  'hotel.receptionist': A(-15.5, Y_WALK, -62, FACE.E),    // NPC
  'hotel.elevator':    A(12.2, Y_WALK, -62, FACE.E),
  'ops.entry':         A(6, Y_WALK, -72.5, FACE.N),       // just inside the ops room door
  'ops.terminal':      A(-6, Y_WALK, -82.8, FACE.N),      // intel terminal in front of the monitor wall
  'ops.table':         A(-6, Y_WALK, -75.6, FACE.N),      // map table
  'ops.board':         A(9, Y_WALK, -83.5, FACE.N),       // evidence board (investigation corner)
  'ops.analyst':       A(-15, Y_WALK, -79, FACE.E),       // NPC: analyst Ibarra
  'ops.drills':        A(-19.5, Y_WALK, -74, FACE.W),     // training console (Field Drills)
  'ops.exam':          A(11, Y_WALK, -73, FACE.E),        // exam booth (ASVAB Practice Mode)
  'roof.elevator':     A(8, Y_ROOF, -62, FACE.E),
  'roof.scope':        A(-4, Y_ROOF, -56.6, FACE.S),      // spotting scope on the south parapet
  'roof.rangefinder':  A(11.4, Y_ROOF, -75, FACE.E),      // rangefinder on the east parapet
  // garage
  'garage.forecourt':  A(-63, Y_ROAD, 8, FACE.W),
  'garage.bay1':       A(-80, Y_ROAD, 3, FACE.W),         // vehicle spot inside bay 1
  'garage.lift':       A(-80, Y_ROAD, 13, FACE.W),        // car on the lift (prop) in bay 2
  'garage.log':        A(-80, Y_ROAD, 21.6, FACE.S),      // maintenance log on the south workbench
  'garage.diag':       A(-88.6, Y_ROAD, 6, FACE.W),       // diagnostic cart
  'garage.chart':      A(-84, Y_ROAD, -2, FACE.N),        // conversion chart on the north wall
  'garage.mechanic':   A(-85, Y_ROAD, 10, FACE.E),        // NPC: Lupe
  'garage.pump':       A(-74, Y_ROAD, -19.4, FACE.N),     // fuel pump (on foot)
  'garage.pumpSpot':   A(-71.2, Y_ROAD, -21, FACE.N),     // vehicle spot beside the pump
  // warehouse
  'warehouse.gate':    A(18, Y_ROAD, 49, FACE.S),         // on the driveway, facing the gate
  'warehouse.park':    A(31, Y_ROAD, 60, FACE.S),         // vehicle spot in the yard
  'warehouse.truck1.tag': A(-21.7, Y_ROAD, 63, FACE.W),
  'warehouse.truck2.tag': A(-9.7, Y_ROAD, 63, FACE.W),
  'warehouse.truck3.tag': A(2.3, Y_ROAD, 63, FACE.W),
  'warehouse.slip':    A(19, Y_ROAD, 68.7, FACE.S),       // removal slip on the notice board (outside, east of the personnel door)
  'warehouse.door':    A(16, Y_ROAD, 68.6, FACE.S),       // outside the personnel door
  'warehouse.clipboard': A(12, Y_ROAD, 74.3, FACE.S),     // dock manifest podium, just inside
  'warehouse.rackA':   A(-13, Y_ROAD, 82, FACE.N),
  'warehouse.rackB':   A(-13, Y_ROAD, 88, FACE.N),
  'warehouse.rackC':   A(-13, Y_ROAD, 94, FACE.N),
  'warehouse.drums':   A(-6, Y_ROAD, 103.5, FACE.S),      // row of translucent liquid totes on the south wall
  'warehouse.cageDoor': A(-22.8, Y_ROAD, 101.7, FACE.W),
  'warehouse.terminal': A(-33.2, Y_ROAD, 102, FACE.W),    // evidence terminal inside the cage
  'warehouse.officeDoor': A(8.8, Y_ROAD, 101.6, FACE.E),
  'warehouse.ledger':  A(17, Y_ROAD, 105.3, FACE.S),      // ledger desk in the records office
  'warehouse.cabinet': A(21.4, Y_ROAD, 100, FACE.E),      // filing cabinet in the records office
  'warehouse.clerk':   A(6, Y_ROAD, 99, FACE.N),          // NPC: Tomas, the night clerk
});

/**
 * Stations = interactables the missions drive. World builders create a visible prop at/near the anchor and call
 * ctx.interact.add({ id, anchor, ... }) with a default "look at it" handler; missions swap the handler.
 * kind: how the default prompt/icon reads.  npc: built by the NPC system at that anchor.
 */
export const STATIONS = Object.freeze({
  'pier.board':          { anchor: 'pier.board',          kind: 'read',     owner: 'pier' },
  'hotel.reception':     { anchor: 'hotel.reception',     kind: 'talk',     owner: 'hotel' },
  'hotel.elevator':      { anchor: 'hotel.elevator',      kind: 'door',     owner: 'hotel' },
  'roof.elevator':       { anchor: 'roof.elevator',       kind: 'door',     owner: 'hotel' },
  'roof.scope':          { anchor: 'roof.scope',          kind: 'use',      owner: 'hotel' },
  'roof.rangefinder':    { anchor: 'roof.rangefinder',    kind: 'use',      owner: 'hotel' },
  'ops.terminal':        { anchor: 'ops.terminal',        kind: 'terminal', owner: 'hotel' },
  'ops.table':           { anchor: 'ops.table',           kind: 'use',      owner: 'hotel' },
  'ops.board':           { anchor: 'ops.board',           kind: 'read',     owner: 'hotel' },
  'ops.analyst':         { anchor: 'ops.analyst',         kind: 'talk',     owner: 'hotel', npc: true },
  'ops.drills':          { anchor: 'ops.drills',          kind: 'terminal', owner: 'hotel' },
  'ops.exam':            { anchor: 'ops.exam',            kind: 'terminal', owner: 'hotel' },
  'garage.log':          { anchor: 'garage.log',          kind: 'read',     owner: 'garage' },
  'garage.diag':         { anchor: 'garage.diag',         kind: 'terminal', owner: 'garage' },
  'garage.chart':        { anchor: 'garage.chart',        kind: 'read',     owner: 'garage' },
  'garage.mechanic':     { anchor: 'garage.mechanic',     kind: 'talk',     owner: 'garage', npc: true },
  'garage.pump':         { anchor: 'garage.pump',         kind: 'use',      owner: 'garage' },
  'warehouse.truck1.tag': { anchor: 'warehouse.truck1.tag', kind: 'read',   owner: 'warehouse' },
  'warehouse.truck2.tag': { anchor: 'warehouse.truck2.tag', kind: 'read',   owner: 'warehouse' },
  'warehouse.truck3.tag': { anchor: 'warehouse.truck3.tag', kind: 'read',   owner: 'warehouse' },
  'warehouse.slip':      { anchor: 'warehouse.slip',      kind: 'read',     owner: 'warehouse' },
  'warehouse.clipboard': { anchor: 'warehouse.clipboard', kind: 'terminal', owner: 'warehouse' },
  'warehouse.rackA':     { anchor: 'warehouse.rackA',     kind: 'read',     owner: 'warehouse' },
  'warehouse.rackB':     { anchor: 'warehouse.rackB',     kind: 'read',     owner: 'warehouse' },
  'warehouse.rackC':     { anchor: 'warehouse.rackC',     kind: 'read',     owner: 'warehouse' },
  'warehouse.drums':     { anchor: 'warehouse.drums',     kind: 'use',      owner: 'warehouse' },
  'warehouse.cageDoor':  { anchor: 'warehouse.cageDoor',  kind: 'door',     owner: 'warehouse' },
  'warehouse.terminal':  { anchor: 'warehouse.terminal',  kind: 'terminal', owner: 'warehouse' },
  'warehouse.ledger':    { anchor: 'warehouse.ledger',    kind: 'read',     owner: 'warehouse' },
  'warehouse.cabinet':   { anchor: 'warehouse.cabinet',   kind: 'read',     owner: 'warehouse' },
  'warehouse.clerk':     { anchor: 'warehouse.clerk',     kind: 'talk',     owner: 'warehouse', npc: true },
});

/** Toggleable world features (ctx.world.setFeature(id, on)). `default` is the state after the world is built. */
export const FEATURES = Object.freeze({
  'roadblock.marea':    { default: false, owner: 'city' },       // barricade + flashing lights across Paseo de la Marea at z = 18
  'warehouse.cageOpen': { default: false, owner: 'warehouse' },  // evidence cage door: closed (blocks) until a mission opens it
  'warehouse.gateOpen': { default: true,  owner: 'warehouse' },  // yard gate
  'hotel.opsOpen':      { default: true,  owner: 'hotel' },      // ops room door
});

/** Indoor / ambience zones (ctx.zones). Builders register these exact ids. */
export const ZONES = Object.freeze({
  'hotel.lobby':     { rect: HOTEL.lobby,          y0: 0, y1: 4.4,  indoor: true,  ambience: 'lobby' },
  'hotel.ops':       { rect: HOTEL.ops,            y0: 0, y1: 4.4,  indoor: true,  ambience: 'ops' },
  'hotel.roof':      { rect: HOTEL.roof,           y0: 17.5, y1: 24, indoor: false, ambience: 'roof' },
  'garage.interior': { rect: GARAGE.interior,      y0: 0, y1: 6.5,  indoor: true,  ambience: 'garage' },
  'warehouse.yard':  { rect: WAREHOUSE.yard,       y0: 0, y1: 12,   indoor: false, ambience: 'yard' },
  'warehouse.interior': { rect: WAREHOUSE.interior, y0: 0, y1: 9,   indoor: true,  ambience: 'warehouse' },
  'pier':            { rect: { x0: 60, x1: 105, z0: -32, z1: 32 }, y0: -2, y1: 12, indoor: false, ambience: 'pier' },
});

/** Labels for the phone map. */
export const MAP_LABELS = Object.freeze([
  { id: 'hotel',     text: { en: 'Hotel Mirador (safehouse)', es: 'Hotel Mirador (casa segura)' }, x: -4,  z: -70 },
  { id: 'warehouse', text: { en: 'Bodega 7 (warehouse)',      es: 'Bodega 7 (almacen)' },          x: -6,  z: 89 },
  { id: 'garage',    text: { en: 'Taller Rueda (garage)',     es: 'Taller Rueda (taller)' },       x: -82, z: 10 },
  { id: 'gas',       text: { en: 'Fuel',                      es: 'Gasolina' },                    x: -74, z: -21 },
  { id: 'pier',      text: { en: 'Ferry pier',                es: 'Muelle del ferry' },            x: 90,  z: 0 },
  { id: 'center',    text: { en: 'Manzana Central',           es: 'Manzana Central' },             x: 0,   z: 0 },
]);

/** Suggested driving route for Chapter 1 (pier -> warehouse the long way round), as lane-centre waypoints. */
export const ROUTE_CH1 = Object.freeze([
  [57, 4], [52.75, 0], [52.75, -36], [49, -42.75], [-46, -42.75], [-52.75, -38], [-52.75, 38], [-48, 42.75], [14, 42.75], [18, 47], [18, 56], [31, 60],
]);

/** Convenience: anchor lookup that throws on unknown ids (catches typos in mission scripts early). */
export function anchor(id) {
  const a = ANCHORS[id];
  if (!a) throw new Error(`layout: unknown anchor "${id}"`);
  return a;
}
