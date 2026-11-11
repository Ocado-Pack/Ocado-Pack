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
| Equipment (left) | A procedural 3D training room: control panel, conveyor with motor, component workbench, pneumatic station, wall schematic display. Falls back to a labelled 2.5D view if WebGL is unavailable (or choose it in Settings). |
| Schematic (centre) | The drawing for the current lesson, with a legend, test points, live state tags and full-screen mode. Selecting a symbol highlights the hardware and the other way round. |
| Mentor (right) | Alex's instructions, questions with specific feedback, six built-in help buttons with three hint levels, and the full explanation of the selected component. |
| Bottom bar | Simulation controls, a virtual meter (DC volts; continuity only after isolating and verifying 0 V), step progress. |

Nine lessons, eight fault missions, a 20-question mock interview, three study
paths (30 minutes, 2 hours, 4 hours) and a printable "Before the Interview"
sheet. Progress is saved in the browser's local storage.

## Layout

```
index.html            page shell
css/styles.css        layout and themes (light and dark)
js/sim.js             single source of truth: circuit state, solver, meter
js/symbols.js         schematic symbol library
js/diagrams.js        drawing definitions
js/schematic.js       SVG renderer
js/scene3d.js         3D room (three.js, procedural geometry)
js/scene2d.js         2.5D fallback
js/app.js             lesson engine, missions, interview, help, progress
js/data/*.js          components, lessons, missions, quiz (all teaching content)
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
