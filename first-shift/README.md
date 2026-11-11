# FIRST SHIFT: Maintenance Interview Bootcamp

A self-contained 3D training application for someone preparing for a hands-on
industrial maintenance interview: schematic symbols, ladder reading, the
three-wire START/STOP circuit, sensors and PLC basics, fluid power recognition,
and a structured troubleshooting method.

It is interview preparation built on a simulated 24 VDC circuit. It is not an
electrical qualification and not a substitute for site training or lockout
procedures.

## Start

Open `index.html` in a current desktop browser (double-click works; no server,
build step, account or network connection is needed). Press
**Start My First Shift**.

## What is inside

| Area | What it does |
| --- | --- |
| Equipment (left) | A procedural 3D training room: control panel enclosure (closed view and simulated inspection view), conveyor with motor and sensor, component workbench with terminal labels and a simplified contactor cutaway. A second tab shows a 2D **panel inspection** view with numbered terminals and wire tracing. Falls back to a labelled 2.5D view if WebGL is unavailable. |
| Schematic (centre) | Vector drawings with zoom, pan, fit and full screen. Three separate display layers: **current path**, **potential relative to 0V**, **device state**. Includes a four-sheet training drawing set (device list, power, control, terminals) with title blocks, revisions and cross-references. |
| Mentor (right) | Instructions, predict-before-reveal questions, three hint levels, the evidence notebook, and the explanation of the selected component. |
| Bottom bar | Simulation controls, a virtual meter (two probes, stated reference; floating points read "Not modeled"; continuity only after isolating and verifying 0 V), progress. |

Core order: schematics → component and symbol matching → START/STOP holding
circuit → drawing set and drawing-to-panel challenge → evidence-based
troubleshooting → mock interview. Fluid power is optional and last.

- **Baseline:** six questions (with "I don't know yet") recommend a starting lesson; nothing is locked.
- **Assistance levels:** Learn, Practice (labels on request), Interview (no highlighting or hints; feedback after submission), all on the same equipment and circuit.
- **Missions:** ten single-fault cases, five of them sharing the symptom "motor will not start". A prediction is asked before every check, evidence goes into a notebook, and a diagnosis is accepted only when the gathered evidence rules out every other listed cause.
- **Review:** errors are tracked by concept; a missed concept returns later as a different question, confident misses first.
- **Readiness:** a capability checklist (independently / with help / needs practice) instead of only a percentage.
- **Graphics:** Low, Balanced, High and Ultra presets change only the 3D render resolution and shadows; Settings shows the real render-buffer size.

## Layout

```
index.html            page shell
css/styles.css        layout and themes (light and dark), rem-based for interface scaling
js/sim.js             single source of truth: circuit state, solver, meter
js/symbols.js         schematic symbol library
js/diagrams.js        lesson drawings
js/drawings.js        four-sheet training drawing set TS-100
js/panel.js           wiring dataset, panel inspection view, drawing-to-panel tasks
js/schematic.js       SVG renderer (layers, zoom, inferred wire nodes)
js/scene3d.js         3D room (three.js, procedural geometry, quality presets)
js/scene2d.js         2.5D fallback
js/app.js             lesson engine, modes, missions, interview, review, progress
js/data/*.js          components, lessons, missions, quiz, baseline and review data
vendor/three.min.js   three.js r159 (MIT), vendored so the app runs offline
tests/sim.test.js     validation of circuit rules and content consistency
```

## Tests

```bash
node tests/sim.test.js
```

Checks the required circuit behaviors (START, seal-in, STOP, overload trip and
reset, control power loss, open holding branch, open coil), the meter rules,
and that every quiz answer, lesson prediction and mission reading agrees with
the simulation.

## Conventions

Drawings use a simplified North American ladder style, and fluid power
drawings a simplified ISO 1219 style. Reference labels (PB1, M1, OL1, …) are
this application's own. Real drawings differ: always read the legend.
