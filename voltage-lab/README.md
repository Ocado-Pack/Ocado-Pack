# Voltage Lab: From Zero to Confident Measurements

An interactive 3D training simulator that teaches a complete beginner how to use a
digital multimeter as a voltmeter: what it measures, how to prepare it, where to put
the probes, how to read the result, and how to recognise mistakes.

**Everything is simulated.** The bench contains batteries and isolated, low-energy
training circuits only. Nothing here is an instruction for wall outlets, breaker
panels, mains wiring or industrial equipment, and completing the simulation does not
qualify anyone to work on energized electrical equipment.

## Launch

No install is needed to *run* it — the built bundle is committed.

- **Simplest:** open `voltage-lab/index.html` in a current browser (Chrome, Edge,
  Firefox, Safari).
- **Local server:** `cd voltage-lab && npm start`, then open <http://localhost:5173>.

To change the code: `npm install`, edit `src/`, then `npm run build` (or `npm run dev`
for rebuild-on-save). `npm test` runs the simulation engine tests.

## Controls

| To do this | Mouse | Touch |
| --- | --- | --- |
| Rotate the bench | drag empty space | one-finger drag |
| Zoom | scroll wheel, or **+ / −** | pinch, or **+ / −** |
| Pan | right-drag | two-finger drag |
| Return to the start view | **Front view** | **Front view** |
| Close-up of display, dial, jacks, probe tips | **Close-up** buttons | same |
| Turn the selector | click a dial label, or drag the knob | tap a label, or drag the knob |
| Plug a lead in | click the plug, then the jack — or drag it | same |
| Move a probe | drag its **handle** onto a test point (it snaps) | same |
| Move a probe without dragging | click the handle (it is now "in hand"), then click the test point | same |
| Put a probe down | click its handle again, or press Esc | tap its handle again |
| Identify a test point | click it with no probe in hand | same |
| Learn what a part is | click it | tap it |

Every action is also available without the 3D view: the **circuit diagram** has
clickable, keyboard-focusable test points, and **Equipment controls** has buttons for
the dial, range, HOLD, jacks, probes, test points and switches.

Lesson buttons: **Show me** demonstrates the step, **Let me try** hands the equipment
back as it was, **Explain again** rephrases and re-highlights, **Reset** restores the
start of the step. A step completes only when the actual equipment state is correct.

Top bar: Dashboard, mode, language (English / Español), Help me diagnose, narration
on/off, captions on/off, Help. The app opens on the **Dashboard**, which lists every
module.

In **Build a Circuit**: click a palette component and then a grid position (or drag
it); click one connection point and then another to add a wire; click a component or
wire to select it, then Rotate or Remove. With the keyboard: Tab to the workspace,
arrow keys move the placement cursor or the selected component, Enter places, R
rotates, Delete removes. On the control station, clicking START or STOP presses it and
clicking again releases it (this stands in for holding a finger on the button).

## What is in it

- **Lessons** (each designed for roughly 10–15 minutes, with a timer):
  0. Meet the meter · 1. Understand voltage · 2. First battery measurement (guided,
  then repeated independently) · 3. Polarity and reference points · 4. Manual ranging
  and units · 5. Measure a working circuit · 6. Introductory AC measurement ·
  7. Connection to industrial controls (virtual 24 V DC panel with an open-wire fault).
- **Modes:** Guided (highlights and step-by-step coaching), Practice (hints and
  explanations on request), Assessment (ten tasks, no hints until each submission,
  safety blocks still active, report at the end).
- **Help me diagnose** (top-bar button): choose what you want to check — battery
  voltage, a lamp that will not turn on, the simulated 24 V control circuit, or the
  12 V AC source. The guide says whether a voltage measurement can help, which jacks,
  AC/DC setting and range to use, and where both probes go; asks for a prediction
  before each measurement; then compares measured and expected values, lists which
  explanations the reading rules out and which still fit, and proposes the next
  measurement that separates them. It names a cause only when the readings leave one
  explanation, never from a single ambiguous reading, and states what voltage
  testing cannot establish. Each scenario cycles through several modelled cases.
- **Build a Circuit**: four exercises that go from a description of behavior to a
  working schematic (switch and lamp; two switches in series; two in parallel; START /
  holding contact / STOP / overload). A snap-to-grid workspace with Undo, Redo, Clear
  and Reset. Before anything runs, the wiring is checked for missing connections,
  incomplete paths, wrong coil/contact association, supply shorts and bypassed
  protective contacts. Behavior tests then run on the simulated circuit, so any
  electrically equivalent layout passes. Hints come in three levels, with a worked
  solution on request. The 3D control station follows the same circuit state.
- **Verify a Repair**: diagnose a fault in the motor-starter teaching circuit from your
  own operations and readings, complete simulated isolation steps, make an abstract
  repair, then demonstrate nine operating checks that are recorded from the simulation.
  One scenario starts with a colleague's incorrect repair. Ends with a repair report.
- **Equipment Packs**: general (default), conveyor, motor starters, sensors and PLC
  I/O, pneumatic actuators. Each has a glossary, bench models, a drawing legend, three
  scenarios, five interview questions, expected behavior and verification checks.
  Optional packs are separate files under `packs/` and are fetched when selected.
  Includes a local Interview Equipment Notes field and a closest-pack recommendation.
- **Review Due**: a local practice queue over eight concepts, with confidence ratings,
  hints, a visible and editable schedule, "Practice for 5 Minutes" and "Review Before
  My Interview", and copy/paste export and import of progress.
- **Reduced graphics** and **reduced motion** switches on the Dashboard (reduced motion
  follows the system setting by default).
- **Pre-measurement check** that gates every probe contact: inspect, jacks, function,
  range, intended test points, fingers behind guards, no bridging.
- **Error coaching** with what happened / why it matters / how to fix it / Retry for:
  wrong jack, wrong AC/DC setting, range too low, probe not making contact, reversed
  polarity, same node, stale HOLD, changing function while connected, bridging.

## How the simulation works

`src/sim.js` is a small, dependency-free engine with no randomness:

- Each circuit is a list of sources, wires, switches and resistors. Node potentials
  come from modified nodal analysis; closed switches and intact wires merge nodes; an
  open-wire fault removes a wire. The meter's 10 MΩ input is part of the solve.
- The diagnose guide (`src/diagnose.js`) treats each candidate cause as a set of
  circuit faults, solves the circuit for each one, and keeps only the causes that
  agree with every reading actually taken. Nothing in it is a scripted answer.
- DC reading = potential at the lead in V/Ω − potential at the lead in COM. The AC
  source reads its RMS value in V~.
- The display depends on dial position, jacks, range (AUTO, 2 V, 20 V, 200 V), probe
  contacts, switch positions, faults and HOLD, with a short settling time.
- With a probe open, the status line reports "No valid two-point measurement" and the
  digits show a small deterministic drift standing in for stray pickup — never a
  reliable zero.

## Adding a pack

A pack is one file, `packs/<id>.js`, that calls `window.VoltageLabPacks.register({...})`.
The schema is documented at the top of `src/packs.js`. To add one: create the file, add
its `id` and `name` to `PACK_LIST` in `src/packs.js`, and rebuild. Verified
manufacturer-specific content uses the same shape with
`source: { kind: 'verified', by, reference, date }`; the app then shows that source
instead of the "representative" notice. Nothing else in the application has to change.

## Placeholders, simplifications and unsupported features

- **Build a Circuit is not a general circuit editor.** Each exercise offers exactly its
  own components, one of each, as two-terminal parts on a fixed grid between a +24 V
  and a 0 V rail. The motor power circuit is pre-wired and not drawn by the learner.
  Momentary pushbuttons are operated by click-to-press and click-to-release.
- **Verify a Repair** has two scenarios on one teaching circuit, with five modelled
  causes (each an open contact or coil). Isolation is a simplified training sequence,
  not a site procedure, and the repair itself is a single button.
- **Equipment packs are representative, not manufacturer-specific.** They change
  vocabulary, legend, scenarios and questions; the sensors pack does not simulate a
  PLC program and the pneumatic pack does not simulate air. Packs without a motor
  starter use the general labels for the starter exercises. Interview notes are stored
  as plain text and are never interpreted.
- **Review Due** uses a fixed bank of 27 questions. Scheduling runs only while the page
  is open; there are no notifications. Progress lives in this browser's local storage
  and is lost if browser data is cleared — use export to keep a copy.

- **Narration** uses the browser's built-in speech synthesis. Voice quality and
  Spanish availability depend on the device; some browsers have no voices at all.
  Captions and on-screen text are always complete.
- **Resistance (Ω) and current (A)** positions and the **A / mA jacks** are identified
  and explained but deliberately not simulated; contact with a circuit is blocked.
- **The meter is fictional.** Its ranges, the `OL` overrange display, its autorange
  behaviour and its response in the wrong AC/DC mode (about zero) are specific to this
  simulator. Real meters differ — read the manual for your own meter.
- **AC** is a single ideal 12 V RMS sine source. There is no true-RMS versus
  averaging distinction, no frequency measurement and no distorted waveforms.
- **Circuits are idealized:** perfect wires and switches, ideal batteries with no
  internal resistance, no contact resistance.
- **Probe contact is snap-based.** Bridging is modelled only at two defined gaps (the
  9 V battery snaps and the 24 V panel's supply terminals); a "near miss" is a probe
  released close to, but not on, a terminal. There is no free-form contact physics.
- **Help me diagnose** covers only the simulator's own scenarios and a fixed list of
  modelled causes (one fault at a time). It cannot guide measurements on real
  equipment and says so. Its cases come round in a fixed order rather than at random.
- **Lead inspection** is a simple model: one lead in Lesson 5 has a visible nick that
  must be found and replaced.
- **Lesson length** is a design target shown as an estimate, not an enforced limit.
- **Progress** (language, mode, completed lessons) is stored only in this browser's
  local storage. Assessment reports are not saved or exported.
- The 3D view needs WebGL. Without it the diagram and panel controls still work.
