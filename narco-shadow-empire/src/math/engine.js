// The offline procedural question engine (ctx.math). Pure module; works standalone in Node: createMath().
// No AI calls: every question, hint, distractor and solution is computed locally and validated.
import { createRng, hashString, randomSeed } from '../core/rng.js';
import { allTemplates, assemble, validateQuestion, checkAnswer } from './kit.js';
import { TOPICS, LEVELS } from './topics.js';
import './registry.js';   // side effect: every topic pack registers its templates with the kit

export function createMath(ctx) {
  const templates = allTemplates();
  const recent = [];                      // ring of recent signatures (duplicate avoidance)
  const remember = (s) => { recent.push(s); if (recent.length > 200) recent.shift(); };
  const has = (avoid, s) => (avoid ? (avoid.has ? avoid.has(s) : avoid.includes(s)) : false);

  function candidates({ templateId, topic, section }) {
    if (templateId) { const t = templates.get(templateId); if (!t) throw new Error('math: unknown template ' + templateId); return [t]; }
    const all = [...templates.values()];
    const c = topic ? all.filter((t) => t.topic === topic) : section ? all.filter((t) => t.section === section) : all;
    if (!c.length) throw new Error('math: no templates for ' + (topic || section || 'any'));
    return c;
  }
  const nearestLevel = (tpl, level) => tpl.levels.reduce((b, l) => (Math.abs(l - level) < Math.abs(b - level) ? l : b), tpl.levels[0]);

  function generate(opts = {}) {
    const level = Math.min(5, Math.max(1, Math.round(opts.level || 1)));
    const cands = candidates(opts);
    const seed0 = opts.seed === undefined ? randomSeed() : (typeof opts.seed === 'string' ? hashString(opts.seed) : opts.seed >>> 0);
    const pickRng = createRng(seed0);
    const useRing = opts.seed === undefined;   // an explicit seed asks for a reproducible question: only `avoid` can change it
    let lastErr = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const exact = cands.filter((t) => t.levels.includes(level));
      let pool = exact.length ? exact : cands;
      if (opts.theme) { const themed = pool.filter((t) => (t.themes || []).includes(opts.theme)); if (themed.length) pool = themed; }
      const tpl = pickRng.pick(pool);
      const lv = tpl.levels.includes(level) ? level : nearestLevel(tpl, level);
      const seed = (seed0 + attempt * 0x9e3779b1) >>> 0;
      let qn;
      try {
        const params = tpl.params(createRng(seed), lv, { theme: opts.theme });
        qn = assemble(tpl, params, seed, lv);
      } catch (e) { lastErr = e; continue; }
      const v = validateQuestion(qn, tpl);
      if (!v.ok) { lastErr = new Error(tpl.id + ': ' + v.errors.join('; ')); continue; }
      if ((has(opts.avoid, qn.signature) || (useRing && recent.includes(qn.signature))) && attempt < 40) continue;
      remember(qn.signature);
      return qn;
    }
    throw new Error('math.generate failed: ' + (lastErr ? lastErr.message : 'no valid question'));
  }

  function build(templateId, params, level) {
    const tpl = templates.get(templateId);
    if (!tpl) throw new Error('math: unknown template ' + templateId);
    const qn = assemble(tpl, params, hashString(templateId + JSON.stringify(params)), level || tpl.levels[0]);
    const v = validateQuestion(qn, tpl);
    if (!v.ok) throw new Error('math.build ' + templateId + ': ' + v.errors.join('; '));
    return qn;
  }

  const api = {
    topics: TOPICS, levels: LEVELS, templates,
    generate, build,
    /** same template + level, different numbers */
    similar(qn) { return generate({ templateId: qn.templateId, level: qn.level, avoid: [qn.signature] }); },
    /** one level down (same template when it supports it, else same topic) */
    easier(qn) {
      const level = Math.max(1, qn.level - 1);
      const tpl = templates.get(qn.templateId);
      return tpl && tpl.levels.includes(level) ? generate({ templateId: qn.templateId, level, avoid: [qn.signature] }) : generate({ topic: qn.topic, level, avoid: [qn.signature] });
    },
    check: checkAnswer,
    validate(qn) { return validateQuestion(qn, templates.get(qn.templateId)); },
    /** {topicId: {1: n, ..., 5: n}} - how many templates serve each topic at each level */
    coverage() {
      const out = {};
      for (const tp of TOPICS) out[tp.id] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const t of templates.values()) for (const l of t.levels) if (out[t.topic]) out[t.topic][l]++;
      return out;
    },
    /** topics that have at least one template */
    populated() { const s = new Set(); for (const t of templates.values()) s.add(t.topic); return TOPICS.filter((tp) => s.has(tp.id)); },
    fixed: {
      /** "Three trucks carry 18 equipment cases each. Fourteen cases are removed. How many remain?" -> 40 */
      trucks: () => build('ar.ops.loadout', { groups: 3, per: 18, removed: 14, context: 'trucks', words: true }, 1),
      /** "Solve 3(x − 2) = 21." -> x = 9 */
      equation: () => build('mk.linear.distribute', { a: 3, b: -2, c: 21 }, 2),
    },
  };
  if (ctx && ctx.register) ctx.register('math', api);
  return api;
}
