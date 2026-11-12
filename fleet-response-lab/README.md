# Robotics Fleet Response Lab

A beginner-friendly, 3D, interactive **training simulation** for supporting an order-fulfillment robot fleet:
diagnosing robots, investigating fulfillment software, building observability tools, documenting incidents,
prioritizing improvements from data, and supporting live operations.

> **Everything here is simulated.** The facility, robots, telemetry, logs, services, APIs, console commands,
> procedures and staff are fictional and invented for training. The app does not reproduce any company's
> proprietary robots, software, interfaces, commands, architecture or procedures, and is not affiliated with
> or endorsed by any employer. Employer-specific details are marked **"to verify"** in the app
> (see *Accuracy* inside the app).

## Run it

It is a static web app with no build step and no network dependencies (three.js is vendored).

```bash
cd fleet-response-lab
```

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static file server works. Progress is saved in your browser's
`localStorage` only.

Run the headless validation suites (Node 18+):

```bash
node tests/validate.mjs
```

```bash
node tests/validate-comms.mjs
```

The second suite checks the communication module's acceptance criteria: documents and messages cannot cite evidence that was never collected; characters react to missing or contradicting information; handoffs need the receiving technician's acceptance; closure needs passing recovery checks; assessment mode does not leak model answers or hidden causes (hints, dialogue, document drafts); repeat attempts vary the cause and evidence; a confident but unsupported diagnosis scores low on accuracy; runbooks must survive the simulated technician on two occurrences; and the benchmark needs three different independent passes with no critical failures.

## What's inside

| Area | What you do |
| --- | --- |
| **Onboarding** | Tour the warehouse & controls → follow one healthy order end-to-end → meet the dashboard → launch the first guided incident (*"Robot R-07 stopped completing tasks near Aisle C"*; hidden cause per attempt: obstruction, localization, network, or task-state). |
| **Core loop** | Every incident: Observe → Predict → Inspect → Test → Interpret → Act → Verify → Document → Review. You must predict every result (with a reason) before it is revealed. Every action explains what it does, when to use it, the evidence it produces, its limits and its operational effect. Guided / Assisted / Assessment modes; 3-level hints (where to look → which relationship matters → a demonstrated step). |
| **W1 Hardware & fleet** | Healthy-robot tour with exploded view and live component telemetry (battery & contacts, drive, encoders, obstacle sensors, localization, E-stop, controller, Wi-Fi, payload). Incidents: obstruction, zone localization vs robot sensor, charging (contacts vs charger), wheel feedback (encoder vs drag), network zone (AP vs firmware). "Predict the fleet impact" before isolating/rerouting. |
| **W2 Software** | Read-only console: log filtering by robot/order/task/service/severity/time/correlation ID, source vs ingest vs skew-aligned ordering, fictional CLI, order/task trace with span waterfall, robot comparison, service health & dependencies, release/config diff, sandbox. Incidents: stuck ack (stale assignment), duplicate delivery handled by idempotency, station unavailable (hardware vs software status), inventory mismatch, slow downstream timeouts, release regression. |
| **W3 Observability** | Metrics ↔ logs ↔ traces; dashboard builder (definition, unit, window, source on every widget; "No data" ≠ 0; click-to-drill-down); repeated-failure view builder previewed against labelled historical incidents; alert designer with noisy / missing / tuned examples. |
| **W4 Documentation** | Editable notebook drafted only from collected facts (hypotheses labelled), Markdown/JSON export, runbook builder with revision history and a **simulated technician** that pauses on ambiguous steps, fictional ops/support/engineering collaboration, and a "service restored, cause unknown" exercise. |
| **W5 Prioritization** | 90-day incident dataset with duplicate symptom tickets and a biased/missing data period; Pareto, frequency-vs-impact, editable transparent scoring that prevents double counting, ranking + justification, before/after comparison normalized by workload, and a causation check. |
| **W6 Live ops** | Timed incident ("Orders are backing up, and several robots appear idle") with a misleading alarm, an unrelated E-stop, incomplete information, update requests and a mitigation tradeoff. Editable update templates, commitment tracking, escalation, verification, closure. Technical and communication scored separately; speed is never rewarded on its own. Optional ~40-min capstone. |
| **Reverse-building** | Dependency map from an order failure, failure-pattern dashboard, step ordering, runbook from an incident, telemetry to separate two causes. |
| **Review & progress** | Mistake-driven spaced review (template-generated, no AI), seven tracked skills, transparent deductions, exports, resets. |
| **Communication & interview module** | Four stages unlocked by performance: (1) annotated worked example + comprehension check, (2) partially guided incident, (3) independent incidents (no hints or model answers until submission), (4) mock interview. Loop: Inspect → Ask → Hypotheses → Test → Communicate → Mitigate → Verify → Document → Handoff → Reflect, with a structured pause before important actions. Incidents A–J (vague report, ETA pressure, incomplete escalation, shift transition, recovery without confirmed cause, conflicting explanations, incorrect earlier update, recurring failure/runbook, partial recovery, concurrent incidents), the 06:45 shift-end first exercise and a ~40-min capstone. Fictional operations staff, technicians, engineers and a manager respond to the live simulation over radio and team chat; tickets, escalations, a live shift-handoff board, knowledge-base pages and an interview room. 100-point rubric (accuracy 25, reasoning 20, communication 15, documentation 15, ownership 15, timeliness 10) with quoted deductions and four critical failures; first attempt preserved; required independent revision; transfer incident; configurable 85/100 internal practice benchmark across three different independent incidents. Runbooks are tested by a simulated technician who executes the steps against two occurrences. Exportable portfolio and a requirements map built from the supplied responsibilities, with missing employer requirements marked “to verify”. |
| **Interview practice** | Questions after every incident; honest drafts built only from your attempt data and always labelled as simulation practice; a separate field for real experience you supply yourself. |

## Design notes

- **One shared simulation state** (`js/sim/engine.js`): the 3D scene, labels, logs, metrics, alarms, task records and checks all read from it, so injected faults produce consistent symptoms everywhere. Faults are injected into the engine; all evidence is computed from engine state, never from scenario text.
- **Recovery requires a real fix or a valid mitigation.** Verification checks (component healthy, a full task completes, records consistent, no stranded/duplicate work, safety states valid, queue/throughput recovered, alarms clear for 5 min, neighbours healthy) evaluate engine state. `tests/validate.mjs` asserts that wrong actions (e.g. restarts) do not pass and correct ones do.
- **Safety**: physical work is always performed by fictional staff; there is no remote E-stop reset; isolation is required before technician recovery; restarts without preserved evidence are recorded as evidence loss.
- **Accessibility**: status is icon + text (never color alone, Okabe–Ito palette), HTML labels stay crisp at any resolution, keyboard and touch controls, a Focus list as an alternative to clicking in 3D, captions, optional narration, reduced motion, text scaling, high contrast.
- **Rendering**: quality presets from Low to Ultra (up to 3× pixel ratio for 4K displays, larger shadow maps).
- Free-text evaluation uses **transparent keyword/structure rules**, and the app states their limits.

## Layout

```
fleet-response-lab/
  index.html, css/app.css
  vendor/            three.js r160 + OrbitControls (MIT)
  js/sim/            engine, catalog (components, diagnostics, operations, checks, metrics), scenarios, history, visual
  js/scene/          procedural 3D warehouse
  js/ui/             walkthrough pages, investigation runner, live ops, exercises, review, progress, interview
  js/comms/          communication module: scenarios A–J, personas, rules, documents, scoring
  tests/validate.mjs headless consistency & recovery validation
  tests/validate-comms.mjs communication-module acceptance tests
```
