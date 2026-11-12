// The deterministic tutor (ctx.tutor, contract 7.5). No AI calls: every hint, diagnosis and worked solution comes
// from the Question itself. Pure module.
//
// Hint ladder - each wrong answer climbs one rung from where the learner already is:
//   rung 1 concept hint -> rung 2 formula / operation -> rung 3 first step demonstrated -> rung 4 full solution,
//   and after the full solution a RELATED problem that the learner must solve to move on.
// A revealed answer is never worth mastery credit (the outcome is 'revealed' whatever happens afterwards).
import { L } from '../core/ltext.js';
import { classifyOutcome, xpFor } from './mastery.js';

export const LADDER = Object.freeze({ concept: 1, formula: 2, firstStep: 3, reveal: 4, maxFollowUps: 2 });
/** request kind -> {aid recorded on the result, rung the learner is moved up to}. Kinds not listed here are free. */
export const AID_COST = Object.freeze({ beginner: 1, visual: 1, formula: 2, similar: 2 });
export const REQUEST_KINDS = Object.freeze(['beginner', 'formula', 'why', 'similar', 'visual', 'retry', 'language']);

const HINT_TITLES = [L('Hint 1: the idea', 'Pista 1: la idea'), L('Hint 2: the operation or formula', 'Pista 2: la operación o fórmula'), L('Hint 3: the first step', 'Pista 3: el primer paso')];
const T = {
  first: L('Correct on the first try. Full credit.', 'Correcto al primer intento. Crédito completo.'),
  solved: L('Correct. You got there.', 'Correcto. Lo lograste.'),
  afterReveal: L('Correct. The solution had been shown, so this one counts as practice, not mastery.', 'Correcto. La solución ya se había mostrado, así que cuenta como práctica, no como dominio.'),
  already: L('This problem is already solved.', 'Este problema ya está resuelto.'),
  wrong: L('Not yet. Read the hint and try again.', 'Todavía no. Lee la pista e inténtalo de nuevo.'),
  wrongExam: L('Answer recorded.', 'Respuesta registrada.'),
  revealed: L('Here is the full solution. Study each step, then solve the related problem to move on.', 'Aquí está la solución completa. Estudia cada paso y luego resuelve el problema relacionado para avanzar.'),
  revealedOpen: L('Here is the full solution. This topic is flagged for review; you can move on.', 'Aquí está la solución completa. Este tema queda marcado para repaso; puedes avanzar.'),
  noEngine: L('The question engine is not available.', 'El motor de preguntas no está disponible.'),
  examTitle: L('Exam mode', 'Modo examen'),
  examBody: L('Hints, the tutor and the calculator are not available in exam mode. Solutions appear after you submit the section.', 'Las pistas, el tutor y la calculadora no están disponibles en modo examen. Las soluciones aparecen al entregar la sección.'),
  beginner: L('Explained from zero', 'Explicado desde cero'),
  formula: L('Formula', 'Fórmula'),
  why: L('Why is my answer wrong?', '¿Por qué mi respuesta es incorrecta?'),
  whyNone: L('You have not entered an answer yet. Commit to an answer first; then I can show you what went wrong.', 'Aún no has dado una respuesta. Primero comprométete con una; después puedo mostrarte qué falló.'),
  whyGeneric: L('That value does not match a common mistake. Re-read what the question asks for, write down the given numbers, and check each operation one at a time.', 'Ese valor no coincide con un error común. Vuelve a leer qué pide la pregunta, anota los datos y revisa cada operación una por una.'),
  similar: L('A similar example, worked out', 'Un ejemplo parecido, resuelto'),
  similarBody: L('Same kind of problem, different numbers. Follow the steps, then return to yours.', 'El mismo tipo de problema con otros números. Sigue los pasos y luego vuelve al tuyo.'),
  visual: L('See it', 'Míralo'),
  visualBody: L('Use the model: move the pieces and watch what changes.', 'Usa el modelo: mueve las piezas y observa qué cambia.'),
  visualNone: L('This problem has no visual model. Try the beginner explanation instead.', 'Este problema no tiene modelo visual. Prueba la explicación desde cero.'),
  retry: L('Try again', 'Inténtalo de nuevo'),
  retryBody: L('Take your time. Read the question once more and decide what it asks for before you calculate.', 'Tómate tu tiempo. Lee la pregunta otra vez y decide qué pide antes de calcular.'),
  lang: L('Language', 'Idioma'),
  langBody: { en: L('Explanations are now in English.', 'Explanations are now in English.'), es: L('Las explicaciones ahora están en español.', 'Las explicaciones ahora están en español.') },
};

/** @param {object} ctx  @param {{now?: () => number}} [opts] */
export function createTutor(ctx, { now = Date.now } = {}) {
  const has = (name) => !!ctx && typeof ctx.has === 'function' && ctx.has(name);
  const emit = (type, payload) => { if (ctx && ctx.events) ctx.events.emit(type, payload); };
  let active = null;

  /** The related problem after a reveal: first a similar one, then an easier one, then none (the gate opens, flagged). */
  function nextAfterReveal(session) {
    const c = session.chain;
    if (has('math') && c.followUps < LADDER.maxFollowUps) {
      c.followUps += 1;
      try { return c.followUps === 1 ? ctx.math.similar(c.root) : ctx.math.easier(c.root); } catch { /* fall through: never a dead end */ }
    }
    c.cleared = true; c.needsReview = true;
    return null;
  }

  /**
   * Start tutoring one question.
   * @param {object} question  a Question (contract 7.1)
   * @param {{mode?: string, chain?: object}} [opts]  mode 'exam' disables every hint and aid
   */
  function begin(question, { mode = 'mission', chain = null } = {}) {
    if (!question || !Array.isArray(question.hints) || !question.solution) throw new Error('tutor.begin: not a Question');
    const exam = mode === 'exam';
    const s = {
      question, mode, attempts: 0, hintLevel: 0, revealed: false, solved: false, startedAt: now(), solvedAt: 0,
      /** @type {{value:any, tag?:string, why?:object}[]} */ wrong: [],
      /** @type {Record<string, boolean>} */ aids: {},
      /** shared by a problem and its follow-ups: {root, followUps, cleared, needsReview} */
      chain: chain || { root: question, followUps: 0, cleared: false, needsReview: false },
      followUp: null, result: null,
      /** true once the learner may move on: solved without a reveal somewhere in the chain, or the chain ran out */
      get canAdvance() { return s.chain.cleared; },
      get needsReview() { return s.chain.needsReview || s.revealed; },
      outcome: () => classifyOutcome({ solved: s.solved, wrongCount: s.wrong.length, hintLevel: s.hintLevel, aids: s.aids, revealed: s.revealed }),

      /** Check an answer: {choice: index} | {text}. A parse error is not an attempt. */
      submit(input) {
        if (s.solved) return { correct: true, feedback: T.already };
        if (!has('math')) return { correct: false, parseError: T.noEngine, feedback: T.noEngine };
        const r = ctx.math.check(question, input);
        if (r.parseError) return { correct: false, parseError: r.parseError, feedback: r.parseError };
        if (s.result) return { correct: !!r.correct, feedback: r.correct ? T.solved : T.wrong };   // already recorded: practice only
        s.attempts += 1;
        if (r.correct) {
          s.solved = true; s.solvedAt = now();
          if (!s.revealed) s.chain.cleared = true;
          return { correct: true, outcome: s.outcome(), feedback: s.revealed ? T.afterReveal : s.attempts === 1 && s.outcome() === 'independent' ? T.first : T.solved };
        }
        s.wrong.push({ value: r.value !== undefined ? r.value : r.normalized, tag: r.tag, why: r.why });
        if (exam) return { correct: false, feedback: T.wrongExam };
        s.hintLevel = Math.min(LADDER.reveal, s.hintLevel + 1);
        const out = { correct: false, feedback: T.wrong, why: r.why, tag: r.tag };
        if (s.hintLevel < LADDER.reveal) out.hint = { level: s.hintLevel, title: HINT_TITLES[s.hintLevel - 1], body: question.hints[s.hintLevel - 1] };
        else {
          if (!s.revealed) { s.revealed = true; s.followUp = nextAfterReveal(s); }
          out.reveal = question.solution; out.answer = question.answer.display;
          if (s.followUp) out.followUp = s.followUp;
          out.feedback = s.followUp ? T.revealed : T.revealedOpen;
        }
        emit('tutor:hint', { questionId: question.id, level: s.hintLevel, kind: 'ladder' });
        return out;
      },

      /** On-demand help. Costs independent credit except 'why', 'retry' and 'language'. Help taken after solving is free. */
      request(kind) {
        if (!REQUEST_KINDS.includes(kind)) return null;
        if (exam) return { kind, denied: true, title: T.examTitle, body: T.examBody };
        const charge = (aid) => { if (!s.solved && !s.result) { s.aids[aid] = true; s.hintLevel = Math.max(s.hintLevel, AID_COST[aid]); } };
        let out;
        if (kind === 'beginner') { charge('beginner'); out = { title: T.beginner, body: question.beginner }; }
        else if (kind === 'formula') { charge('formula'); out = { title: T.formula, body: question.formula, ...(question.trick ? { trick: question.trick } : {}) }; }
        else if (kind === 'why') {
          const last = s.wrong[s.wrong.length - 1];
          if (last && !s.result) s.aids.why = true;
          out = { title: T.why, body: !last ? T.whyNone : last.why || T.whyGeneric, ...(last ? { value: last.value, tag: last.tag } : {}) };
        } else if (kind === 'similar') {
          let ex = null;
          try { ex = has('math') ? ctx.math.similar(question) : null; } catch { ex = null; }
          if (ex) charge('similar');
          out = ex ? { title: T.similar, body: T.similarBody, example: { question: ex, solution: ex.solution } } : { title: T.similar, body: T.noEngine };
        } else if (kind === 'visual') {
          const v = question.visual && question.visual.type !== 'none' ? question.visual : null;
          if (v) charge('visual');
          out = v ? { title: T.visual, body: T.visualBody, visual: v } : { title: T.visual, body: T.visualNone };
        } else if (kind === 'retry') out = { title: T.retry, body: T.retryBody };
        else {
          const next = ctx && ctx.settings && ctx.settings.get('learnLang') === 'es' ? 'en' : 'es';
          if (ctx && ctx.settings) ctx.settings.set('learnLang', next);
          out = { title: T.lang, body: T.langBody[next], lang: next };
        }
        out.kind = kind;
        emit('tutor:hint', { questionId: question.id, level: s.hintLevel, kind });
        return out;
      },

      /** Build the QuestionResult and record it into the profile (and the running session) exactly once. */
      finish() {
        if (s.result) return s.result;
        const end = s.solved ? s.solvedAt : now();
        const result = {
          questionId: question.id, templateId: question.templateId, topic: question.topic, section: question.section, level: question.level, signature: question.signature,
          mode, outcome: s.outcome(), attempts: s.attempts, hintLevel: s.hintLevel, aids: { ...s.aids }, timeMs: Math.max(0, end - s.startedAt),
          wrong: s.wrong.map((w) => ({ ...w })), ts: now(), estSeconds: question.estSeconds,
        };
        s.result = result;
        const rec = has('profile') ? ctx.profile.record(result) : null;
        if (rec) { result.outcome = rec.result.outcome; result.xp = rec.xp; if (rec.levelChange) result.levelChange = rec.levelChange; }
        else result.xp = xpFor(result);
        result.needsReview = result.outcome === 'revealed' || result.outcome === 'incorrect';
        if (has('session') && ctx.session.active) ctx.session.add(result, question);
        offAid();
        if (active === s) active = null;
        return result;
      },
      /** Start the related problem that followed a reveal (same chain), or null when there is none. */
      beginFollowUp: () => (s.followUp ? begin(s.followUp, { mode, chain: s.chain }) : null),
    };
    // the phone calculator announces itself; using it while the problem is open costs independent credit
    const offAid = ctx && ctx.events ? ctx.events.on('learning:aid', (e) => { if (e && e.aid === 'calculator' && !exam && !s.solved && !s.result) s.aids.calculator = true; }) : () => {};
    active = s;
    return s;
  }

  return {
    begin, nextAfterReveal,
    /** the tutor session that was begun last and is not finished yet, or null */
    get active() { return active; },
  };
}
