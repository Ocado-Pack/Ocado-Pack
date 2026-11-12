export const meta = {
  name: 'narco-math-core',
  description: 'NARCO: SHADOW EMPIRE - build the offline question engine core and the learner model',
  phases: [{ title: 'Core', detail: 'math kit + engine + two exemplar topic packs; learner model' }],
}

const SCRATCH_BASE = '<SCRATCH_DIR>'

const PRE = (label) => `You are one of several engineers building a game in parallel.

PROJECT - "NARCO: SHADOW EMPIRE - Operation Numbers": a cinematic third-person 3D investigation game for the browser (three.js r160 vendored, plain ES modules, no build step in dev, ZERO network requests at runtime, everything procedural). Its purpose is to train a learner for the ASVAB Arithmetic Reasoning (AR) and Mathematics Knowledge (MK) subtests: every important gate in the game is a math problem solved through an interactive interface, backed by a tutor with a hint ladder, adaptive difficulty, spaced repetition, a study dashboard and a timed practice exam. The player is an undercover analyst-operative (codename Cifra) auditing a fictional syndicate's logistics fronts in the fictional port city Puerto Ceniza. Fiction only; nothing actionable about real crime.

ROOT: /home/user/Ocado-Pack/narco-shadow-empire   (cd there first; every path below is relative to it)
SCRATCH: ${SCRATCH_BASE}/${label}/   (create it; ALL temporary files and screenshots go here, never in the repo)

READ BEFORE WRITING CODE (short files): docs/ARCHITECTURE.md (THE CONTRACT - implement the names and signatures given there exactly), src/core/context.js, src/core/ltext.js, src/core/rng.js, src/core/storage.js, src/core/util.js, src/core/settings.js, tests/unit/core.test.mjs.

HARD RULES
1. Edit ONLY the files listed under YOUR FILES (create them). Other engineers are creating their own files in this same working tree right now - never touch, move, reformat or delete anything else, even if it looks wrong or unfinished. If another file needs a change, say so under REQUESTS in your final report.
2. No git commands that write (add/commit/stash/checkout/reset/clean/restore). No new npm dependencies. No network access at runtime, no external assets.
3. Plain JavaScript ES modules with JSDoc. Everything under src/math and src/learning is PURE: no DOM, no window, no three.js, importable by Node (node --test).
4. Every learner-facing string is bilingual via L(en, es) from src/core/ltext.js. Spanish must be natural Latin-American Spanish with correct accents and inverted punctuation.
5. A module you depend on may be missing or half-written right now. Import only what is listed as AVAILABLE; reach everything else through ctx (ctx.<system> is always safely callable - see "Null objects" in the contract).
6. No placeholders: everything you expose must really work and be tested. No TODOs.
7. Verify before you finish: run YOUR test file with:  node --test tests/unit/<your file>   (do not run the whole suite; other engineers' tests may be mid-flight). All your tests must pass.

FINAL REPORT - your last message is returned verbatim to the lead engineer and pasted into other engineers' briefs. Keep it precise, under 70 lines:
FILES: what you created. API: the exact public API (signatures), flagging any deviation from docs/ARCHITECTURE.md and why. VERIFIED: what you ran and the results. GAPS: anything not done or weak - be honest. REQUESTS: changes needed in files you do not own.`

const A1 = `YOUR JOB: the core of the offline procedural question engine (ARCHITECTURE sections 7.1 - 7.3), plus two complete exemplar topic packs that six other engineers will copy the style of.

AVAILABLE to import: src/core/ltext.js, src/core/rng.js, src/core/util.js.

YOUR FILES
  src/math/rational.js    exact rational arithmetic on safe integers with gcd reduction: frac(n, d), add, sub, mul, div, neg, cmp, eq, isInt, toNumber, toMixed, fromDecimalString, fromNumber (for clean decimals), lcm, gcd
  src/math/format.js      bilingual formatting: integers with thousands separators, decimals (fixed places, trimmed), fractions and mixed numbers ("3/4", "1 1/2"), money ("$1,250.50"), percents, durations ("2 hours 30 minutes" / "2 horas 30 minutos", "h:mm"), quantities with a unit that pluralizes correctly in EN and ES (1 case / 2 cases, 1 caja / 2 cajas), small numbers as words in EN and ES (three/tres, fourteen/catorce; capitalized variant), math glyph helpers (multiplication sign, division sign, true minus sign, superscripts, square root)
  src/math/kit.js         everything a template author needs: defineTemplate, bilingual text builders, answer builders (integer, decimal with places, fraction, money, percent, text/expression), the misconception/distractor builder, steps5(understand, given, choose, solve, check) with the five fixed bilingual labels (Understand the problem / Identify the given info / Choose the operation or formula / Solve / Check), vocab tables for story contexts (bilingual nouns with singular/plural: trucks, cases, crates, pallets, drums, liters, gallons, miles, kilometers, hours, minutes, dollars, agents, shipments, containers...), number pickers that produce hand-workable values
  src/math/validate.js    validateQuestion(q) -> {ok, errors[]}
  src/math/answer.js      parseAnswer(text) and checkAnswer(question, input)  (this is math.check in the contract)
  src/math/linear.js      createLinear(...) : step model of a one-variable linear equation for the balance puzzle (contract 7.3)
  src/math/topics.js      TOPICS (the 20 fixed ids of contract 7.2 with bilingual name, short name, one-line blurb, section, order) and LEVELS (5 bilingual names: Recruit/Recluta, Specialist/Especialista, Operator/Operador, Advanced Operator/Operador Avanzado, ASVAB Readiness/Preparacion ASVAB (write it with the accent))
  src/math/registry.js    statically imports all 20 topic pack files and exports the flat template list
  src/math/engine.js      createMath(ctx) -> the ctx.math API of contract 7.3. When ctx is given it registers itself with ctx.register('math', api). It must also work standalone in Node: createMath() with no ctx.
  src/math/templates/ar/ops.js      COMPLETE pack for topic ar.ops (at least 5 templates; every level 1-5 served by at least 2 templates). Must include template id ar.ops.loadout
  src/math/templates/mk/linear.js   COMPLETE pack for topic mk.linear (at least 6 templates; every level 1-5 served by at least 2 templates). Must include template id mk.linear.distribute
  src/math/templates/ar/word.js, fracdec.js, percent.js, ratio.js, drt.js, avg.js, work.js, units.js, multi.js  and  src/math/templates/mk/order.js, expr.js, exp.js, ineq.js, geom.js, pav.js, angles.js, factor.js, props.js
                          create each of these 18 as a STUB containing only a header comment naming the topic and:  export default [];   Six other engineers will replace them with full packs right after you finish. Your engine must tolerate empty packs.
  src/math/README.md      one page: "How to write a template" - the kit API with one fully worked example - written for those six engineers
  tests/unit/math-core.test.mjs    your tests

THE QUESTION OBJECT is specified in contract 7.1 - produce exactly that shape (plain JSON-serializable data).

TEMPLATE SHAPE (keep it this simple; document it in src/math/README.md):
  defineTemplate({
    id: 'ar.ops.loadout', topic: 'ar.ops', levels: [1, 2],        // section is derived from the topic id prefix
    themes: ['warehouse', 'everyday'],                             // optional flavour tags; generate({theme}) prefers a matching context
    params(rng, level, opts) { ... return { groups, per, removed, context } },   // plain JSON. Scale size and number of steps by level. Loop/reject inside until the numbers are clean.
    build(p, kit) { ... return { prompt, ask, expr, answer, entry, wrong: [{ value or text, tag, why }], hints: [concept, formula, firstStep], steps, final, beginner, formula, trick, visual, rookie, estSeconds } },
    check(p) { return the answer recomputed by a DIFFERENT route }   // e.g. substitute x back into the equation; repeated addition instead of multiplication
  })
The kit turns the correct answer plus the misconception list (at least 3 wrong answers, each with a tag and a bilingual explanation of the mistake that produces it) into exactly 4 shuffled choices - deterministic from the question seed - repairing collisions (a wrong value equal to the correct one or to another wrong one, or a nonsensical value such as a negative count) by substituting plausible near-miss fillers tagged 'near' with a generic explanation. Choices are formatted exactly like the correct answer. The kit assembles the full Question (id = templateId + '#' + seed in hex, signature = templateId + '|' + canonical JSON of params, section, topic, level ...).

LEVEL SEMANTICS (no calculator is allowed on the ASVAB, so every number must be workable by hand; answers are integers, fractions in lowest terms, or decimals with at most 2 places):
  1 Recruit: one step, small whole numbers.  2 Specialist: two steps.  3 Operator: three steps, or friendly fractions/decimals/percents.  4 Advanced Operator: multi-step with less friendly numbers and/or one piece of irrelevant information.  5 ASVAB Readiness: the hardest style on the real test - extra information that must be ignored, close distractors, time pressure.

THE TWO VALIDATED DEMO PROBLEMS (must be reproducible exactly through the engine):
  math.fixed.trucks()   = math.build('ar.ops.loadout', { groups: 3, per: 18, removed: 14, context: 'trucks' })
       prompt.en must be exactly:  Three trucks carry 18 equipment cases each. Fourteen cases are removed. How many remain?
       prompt.es:  Tres camiones llevan 18 cajas de equipo cada uno. Se retiran catorce cajas. (inverted question mark)Cuantas quedan?  - write it with proper accents and the inverted question mark
       answer 40 (display "40 cases" / "40 cajas"); entry 'number'; misconceptions such as: forgot to subtract (54), subtracted before multiplying 3 x (18 - 14) = 12, added instead (68), added 3 + 18 - 14 (7) ...; visual {type:'bars' or a grouped-crates spec}; a rookie flawed solution.
  math.fixed.equation() = math.build('mk.linear.distribute', { a: 3, b: -2, c: 21 })  (choose your own param names)
       prompt.en: Solve 3(x - 2) = 21.  (use the true minus sign in expr) ; expr '3(x − 2) = 21' ; answer x = 9 (value 9, display "x = 9", accept ['9', 'x=9', 'x = 9']); misconceptions such as: distributed only to x (3x - 2 = 21 -> 23/3), subtracted 2 instead of adding (5), forgot to divide (27), sign error (-9 or 7) ...; visual {type:'balance', params:{display, lhs:{x:3, c:-6, mult:3, inner:{x:1,c:-2}}, rhs:{x:0, c:21}, solution:9}} ; a rookie flawed solution.

ENGINE BEHAVIOUR
  generate({templateId, topic, section, level, seed, avoid, theme}): pick a template (by id, else by topic, else by section, else any) that supports the level (fallback: nearest supported level), build from a seeded RNG (createRng), validate, and retry with a new derived seed until valid and not in avoid / the engine's own recent-signature ring (size ~200); throw a descriptive Error only if a template is fundamentally broken (after ~50 tries) - never return an invalid question. Same (templateId, level, seed) -> identical question.
  similar(q): same template and level, different signature.  easier(q): one level down (min 1), same template if it supports that level else same topic.
  build(templateId, params): deterministic from explicit params (still validated).
  check(q, input) per contract: input {choice: index} or {text}. Text parsing accepts: 40, 40.0, +40, -3, 1/2, 1 1/2, .5, 25%, $1,200.50, 1,200, trailing or leading unit words (40 cases), x = 9, comma decimals are NOT required. Compare exactly with rationals; fraction answers accept an equal decimal and vice versa; honour answer.tolerance and answer.accept. When the (wrong) value equals a known wrong choice, return that choice and its why so the tutor can explain the mistake. Unparseable text -> {correct:false, parseError: L(...)} (not counted as an attempt by callers).
  validate(q): 4 distinct choices (by normalized value AND display text in both languages), exactly one correct and it equals answer, EN and ES non-empty everywhere, exactly 3 hints, at least 3 solution steps, finite numbers, the template's independent check(params) agrees with answer, and a leak check: the formatted final answer must not appear in beginner, hints[0] or hints[1] unless that same number also appears in the prompt.
  coverage(): per topic and level, how many templates serve it (used by tests and the self-test).
  topics, templates (Map), fixed.

LINEAR MODEL (src/math/linear.js) - used by the balance puzzle so a learner can solve step by step:
  createLinear({ lhs: {x, c, mult, inner}, rhs: {x, c} }) where each side is x-coefficient + constant (rationals), and the left side may be shown factored as mult(inner.x * x + inner.c).
  apply(op, value) with op in 'add' | 'sub' | 'mul' | 'div' | 'expand'; value is a number, a fraction string, or {x: k} to add/subtract k times x. Dividing or multiplying by zero and other illegal moves return {ok:false, error: LText} without changing state. With a factored left side, dividing by the multiplier unwraps the parentheses (3(x − 2) = 21 -> x − 2 = 7); add/sub auto-expands first.
  text() -> pretty equation string, history -> [{op, value, text}], undo(), isSolved() (x = k or k = x), solution() -> number or fraction, reset().
  Both solution paths for 3(x − 2) = 21 must reach x = 9: [div 3, add 2] and [expand, add 6, div 3].

TESTS (tests/unit/math-core.test.mjs) - at minimum: rational arithmetic and reduction; formatting in EN and ES (plural units, money, mixed numbers, number words); parseAnswer table (20+ cases incl. garbage); the two fixed problems (exact prompt text, answer, 4 valid choices, check accepts '40', '40 cases', ' 9 ', 'x = 9' and rejects wrong values with a why); validateQuestion rejects hand-broken questions (duplicate choice, two correct, empty Spanish, answer disagreeing with check); determinism; similar/easier/avoid; a SWEEP: every template in ar.ops and mk.linear x every supported level x 300 seeds -> validate ok, and choices never repeat; coverage() shows ar.ops and mk.linear fully covered at all 5 levels and tolerates the 18 empty packs; linear.js paths, illegal moves and undo.

QUALITY BAR for the two packs (they are the model for 38+ more templates): problems read like real ASVAB items (plain English word problems for AR; clean notation for MK), varied story contexts (the game's world: trucks, cases, pallets, fuel, shifts, deliveries - and everyday ASVAB contexts: shopping, travel, construction, military supply), hints that teach without giving the answer away, a 5-step worked solution that shows every arithmetic step, a beginner explanation that uses an analogy or a smaller example and never states the final answer, a formula line, optional memory trick, a visual spec, and for at least 2 templates per pack a rookie flawed solution (3-5 lines, exactly one wrong, with wrongIndex and why). mk.linear must span: one-step, two-step, variables on both sides, distribution, fractional coefficients, and word-to-equation items.`

const A6 = `YOUR JOB: the learner model (ARCHITECTURE sections 7.4 - 7.7): persistent profile, credit rules, adaptive difficulty, spaced repetition, the deterministic tutor hint ladder, the 15-minute session director, the practice-exam logic, recommendations, and the explain-it coach.

AVAILABLE to import: src/core/ltext.js, src/core/rng.js, src/core/util.js, src/core/storage.js. The question engine (ctx.math, contract 7.3) is being written by another engineer RIGHT NOW in src/math/ - do not import it statically from your modules; always reach it through ctx.math. For your tests write a small fake engine in tests/unit/helpers/fake-math.mjs that implements the contract (topics, generate, similar, easier, check, build) with simple arithmetic questions of the exact Question shape in contract 7.1. At the very end, if src/math/engine.js exists and createMath() works in Node, add one extra test that runs your tutor/exam/session against the real engine (skip it gracefully if the engine is not ready).

YOUR FILES
  src/learning/index.js      createLearning(ctx, {now}) -> creates and registers ctx.profile, ctx.tutor, ctx.session, ctx.exam (ctx.register for each). now is an injectable clock (() => ms) defaulting to Date.now so tests can travel in time.
  src/learning/profile.js    persisted learner profile (storage key 'profile', versioned schema with migration, debounced save plus save() flush, memory fallback comes from ctx.storage), all the query methods of contract 7.4
  src/learning/mastery.js    credit rules, XP, mastery score and states
  src/learning/adaptive.js   per-topic difficulty level 1-5 (promotion/demotion)
  src/learning/srs.js        spaced repetition boxes and the due queue
  src/learning/tutor.js      tutor.begin(question, {mode}) -> TutorSession (contract 7.5)
  src/learning/session.js    the 15-minute session director and the SessionReport (contract 7.6)
  src/learning/exam.js       practice-exam logic (contract 7.7)
  src/learning/recommend.js  profile.recommend()
  src/learning/explain.js    checkExplanation(text, question, lang) -> {score 0-1, parts: [{id:'operation'|'numbers'|'reasoning', ok, tip: LText}]}  (a gentle keyword coach for the debrief's "explain how you solved it" line; bilingual keyword lists for operations: add/plus/sum/sumar/mas, subtract/minus/restar/menos, multiply/times/por/veces, divide/per/entre, percent/por ciento, ratio/proportion/razon/proporcion, equation/solve/isolate/despejar, area/perimeter/volume ... ; 'numbers' = mentions at least one number from the problem; 'reasoning' = at least ~6 words and a connective such as because/so/then/porque/entonces/luego). It coaches, it never blocks.
  tests/unit/learning.test.mjs and tests/unit/helpers/fake-math.mjs

RULES OF THE MODEL (implement exactly; expose the constants so the UI can explain them)
  Outcomes: independent = correct on the first attempt with no hint and no aid; assisted = correct after at least one wrong attempt or after any hint/aid; revealed = the full solution was shown (hint level 4); exam mode uses independent (correct), incorrect, skipped.
  XP ("intel points"): independent 100 x (1 + 0.25 x (level - 1)); assisted 50 (hint level 0-1), 30 (level 2), 15 (level 3); revealed 0; exam correct 60; debrief recall-quiz correct 40.
  Mastery credit: ONLY independent results raise mastery. Revealed results give zero credit and schedule the topic for early review. Never award full credit for a revealed answer.
  Per-topic stats: attempts, independent, assisted, revealed, incorrect, total and count of response time (independent and assisted only), last 12 outcomes, level, promotion streak, demotion streak, lastSeen, mistakes by misconception tag (with the why text of the latest occurrence).
  mastery (0-1) = recency-weighted independent rate over the last 12 outcomes, scaled by level (level 1 caps at 0.45, 2 at 0.6, 3 at 0.75, 4 at 0.9, 5 at 1.0). state: new (0 attempts) / learning / proficient (>= 0.6) / mastered (>= 0.85); 'due' overrides when the SRS says so.
  Adaptive difficulty per topic: +1 level (max 5) after 3 consecutive independent results at the current level (a result slower than 2.5 x question.estSeconds does not add to the streak but does not reset it); -1 level (min 1) after 2 consecutive results that are revealed or assisted with hint level >= 2. Emit learning:level. profile.tier() = the rounded mean level of practised topics (1 when none), with its bilingual name from this table: 1 Recruit/Recluta, 2 Specialist/Especialista, 3 Operator/Operador, 4 Advanced Operator/Operador Avanzado, 5 ASVAB Readiness/Preparación ASVAB.
  Spaced repetition (per topic, remembering the last missed templateId): a non-independent result puts the topic in box 0: due after the NEXT completed mission (dueMission = missionCount + 1) and at now + 1 day, whichever comes first. An independent result while due moves it up a box; intervals by box: 1, 3, 7, 14, 30 days. profile.due(now) lists due topics, most overdue first, with reason 'missed' (box 0) or 'spaced'.
  Daily streak: consecutive local calendar days with at least one recorded answer (use dayKey/daysBetween from src/core/util.js with the injected clock).
  Repeated mistakes: profile.mistakes() = misconception tags seen 2+ times, most frequent first, with topic and the why text.
  recommend(): 3+ due topics -> review; else the first unlocked, not yet completed mission (ask ctx.campaign.next() if ctx.has('campaign'), else fall back to kind 'drill'); else the weakest practised topic -> drill; else exam when 30+ questions answered and no exam in the last 3 days. Always returns a bilingual reason.
  Missions: profile.missionDone(id, report) stores {completed, completedAt, bestXp, attempts} and increments missionCount (this is what makes "due after the next mission" tick); missionState(id).
  History: keep the last 500 QuestionResults (compact) and the last 300 signatures (recentSignatures() -> Set) for duplicate avoidance; exams: last 30 reports (compact).
  export() -> JSON string; import(json) validates shape/version and returns false on garbage without touching the current profile; reset().
  record(result) is the single entry point: updates totals/topic/history/streak/xp/adaptive/srs, saves (debounced), emits learning:recorded {result, xp, levelChange} and returns {xp, levelChange, srs}.

TUTOR (deterministic; no AI calls)
  begin(question, {mode}) -> session with submit(input), request(kind), outcome(), finish(), plus state fields attempts, hintLevel, revealed, startedAt, wrong[].
  submit uses ctx.math.check. A parse error is returned to the caller and does NOT count as an attempt. Correct -> {correct:true, feedback}. Wrong answers climb the ladder: 1st wrong -> hint level 1 (question.hints[0], concept); 2nd -> level 2 (hints[1], formula/operation); 3rd -> level 3 (hints[2], first step demonstrated); 4th -> reveal the complete solution (question.solution) and return followUp = ctx.math.similar(question) - the related problem the learner must now solve independently. When the wrong value matches a misconception choice include its why ("why is my answer incorrect").
  request(kind): 'beginner' -> question.beginner (counts as aid, hint level at least 1); 'formula' -> question.formula plus trick (aid, level at least 2); 'why' -> diagnosis of the last wrong answer (no penalty; a helpful generic message when there is none); 'similar' -> a worked example: {question: ctx.math.similar(q), solution} (aid, level at least 2); 'visual' -> question.visual (aid, level at least 1); 'retry' -> a neutral encouragement, no penalty; 'language' -> toggles settings learnLang between en and es, no penalty. Listen for the event learning:aid {aid:'calculator'} while a session is active and mark aids.calculator (assisted).
  finish() builds the QuestionResult (contract 7.4), calls ctx.profile.record exactly once (idempotent), adds it to ctx.session if a session is running, and returns it.
  Follow-up policy helper: tutor.nextAfterReveal(session) -> first time: similar(question); second time: easier(question); third time: null (the gate opens flagged needs-review). Never a dead end.

SESSION (the 15-minute structure)
  Phases story 0-2 min, ar 2-5, mk 5-8, combined 8-12, debrief 12-15, scaled proportionally for 30 and 45 minute sessions (settings.sessionMinutes). start({missionId, minutes}), setPhase(id), phase, plan [{id, name: LText, fromMs, toMs}], elapsedMs (driven by an injectable clock; pause/resume), add(result), results, end() -> SessionReport {missionId, durationMs, results, byTopic, strengths, weaknesses, xp, counts {independent, assisted, revealed}, mistakes: [{question summary, yourAnswers, why, solution}], reviewQuestions}. reviewQuestions = 3 to 5 FRESH questions for the cold recall quiz: first the topics missed in this session (ctx.math.similar/generate), then due topics, then the session's topics; never a duplicate signature of something already seen in the session. extend(minutes) for longer sessions. Keep the full Question of each result inside the session (not persisted) so the debrief can show solutions.

EXAM (ASVAB Practice Mode logic; UI is someone else's)
  exam.presets: quick (5 AR in 6 min, 5 MK in 5 min), cat (15 AR in 55 min, 15 MK in 31 min), paper (30 AR in 36 min, 25 MK in 24 min), custom (count 5-30, minutes 3-60) each with bilingual name and a note saying timings follow commonly published ASVAB section formats and may change, and that this is not an official test or score.
  exam.create({ar:{count, minutes}, mk:{count, minutes}, seed}) -> run: questions drawn across all topics of the section as evenly as possible, levels mixed around exam standard (about 20% level 2, 40% level 3, 30% level 4, 10% level 5), no duplicate signatures, avoiding profile.recentSignatures() when possible; only multiple choice. run.sections[i] {section, questions, timeLimitMs, answers, flagged, startedAt, submitted}; run.start(i, now), run.answer(i, qIndex, choiceIndex), run.flag(i, qIndex, on), run.remainingMs(i, now), run.expired(i, now), run.submitSection(i, now) -> SectionReport {section, correct, total, pct, timeUsedMs, byTopic, items: [{question, chosen, correctIndex, correct, timeMs}]} (unanswered count as skipped); run.finish() -> ExamReport {sections, overallPct, band: {id, label: LText}, ts} and records every item into the profile (mode 'exam') plus profile.addExam. Per-question time is tracked from when it was first shown (run.view(i, qIndex, now)).
  Readiness band (plainly a practice estimate): under 50% Build foundations / Construye las bases; 50-69% Developing / En desarrollo; 70-84% On track / En buen camino; 85%+ Strong / Sólido. Never compute or mention AFQT, percentile, line scores or anything "official".
  No hints, no tutor, no calculator anywhere in this module.

TESTS (tests/unit/learning.test.mjs) - cover every rule above with an injected clock and an in-memory or throwing storage backend: credit and XP table; revealed gives zero mastery; adaptive promotion and demotion sequences incl. the slow-answer rule; SRS at +1 day, after the next mission, and the 1/3/7/14/30 progression; due ordering; streak across days and a broken streak; mistakes aggregation; the full tutor ladder (4 wrongs -> hints 1,2,3 -> reveal + followUp), each request kind and its effect on outcome, parse errors not counting, finish() idempotent; nextAfterReveal sequence; session phases/plan scaling/report/reviewQuestions uniqueness; exam creation counts, no duplicates, timing, expiry, scoring, bands, records into profile, and that the report contains no field or text with "AFQT" or "official score"; export/import round trip and rejection of garbage; profile survives a storage backend that throws.`

async function run(label, body) {
  const prompt = PRE(label) + '\n\n' + body
  let r = await agent(prompt, { label, phase: 'Core' })
  if (!r) {
    log(label + ': no report, retrying once')
    r = await agent(prompt + '\n\nNOTE: a previous attempt at this job stopped early. Inspect which of YOUR FILES already exist, keep what is good, and finish the job.', { label: label + '-retry', phase: 'Core' })
  }
  return r || '(' + label + ' produced no report)'
}

phase('Core')
const [mathCore, learning] = await parallel([
  () => run('math-core', A1),
  () => run('learning-model', A6),
])
return { mathCore, learning }
