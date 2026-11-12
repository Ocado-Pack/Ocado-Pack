# src/math — the offline question engine

Pure JS (no DOM, no three.js): runs in Node, in the browser and inside the single-file build. No AI call is ever
made per question — everything is computed and validated locally.

| File | Role |
|---|---|
| `kit.js` | exact rationals, bilingual formatting, answer types (`ans.*`), `assemble`, `validateQuestion`, `parseAnswer`, `checkAnswer` |
| `engine.js` | `createMath(ctx?)` → `ctx.math` (generate / build / similar / easier / check / validate / coverage / fixed) |
| `registry.js` | static imports of every topic pack → `PACKS`, `TEMPLATE_LIST` |
| `topics.js` | the 20 topic ids and the 5 levels |
| `linear.js` | step model of a linear equation for the balance puzzle |
| `templates/<ar|mk>/<topic>.js` | topic packs |

## Writing a template

```js
defineTemplate({
  id: 'ar.ops.loadout', topic: 'ar.ops', levels: [1, 2], themes: ['warehouse'],
  // plain JSON parameters. Choose numbers so that the answer AND every common mistake are sensible values.
  params(rng, level) { const per = rng.int(6, 20); return { groups: rng.int(2, 5), per, removed: rng.int(3, per - 1) }; },
  build(p) {
    const total = p.groups * p.per, a = total - p.removed, v = { ...p, total, a };
    return {
      prompt: t('{groups} trucks carry {per} cases each. {removed} are removed. How many remain?', '… ¿Cuántas quedan?', v),
      answer: ans.int(a, N('case', 'cases', 'caja', 'cajas')),
      wrong: [                                  // named mistakes, most common first; `null` entries are skipped
        { value: total, tag: 'forgot-subtract', why: L('That is the total before …', 'Ese es el total antes …') },
        { value: p.groups * (p.per - p.removed), tag: 'subtract-first', why: L('…', '…') },
      ],
      hints: [concept, formulaOrOperation, firstStepDemonstrated],     // exactly 3
      steps: steps5(understand, given, choose, solve, check),          // the 5-step worked solution
      beginner: L('…', '…'), formula: L('…', '…'),                     // plus optional trick, visual, rookie, estSeconds
    };
  },
  check(p) { let s = 0; for (let i = 0; i < p.groups; i++) s += p.per; return s - p.removed; },   // a DIFFERENT route
});
```
Then add the pack to `registry.js` (one import, one `PACKS` entry).

Rules the kit and the tests enforce:

- **Bilingual everywhere.** Build text with `L(en, es)` or `t(en, es, vars)` (`{name}` placeholders; values may be
  numbers, strings or LTexts). Spanish must agree with every noun a template can pick — prefer neutral wording.
- **Typography.** Use `MINUS` (−), `TIMES` (×), `DIV` (÷); never an ASCII hyphen in front of a number.
- **Answer types.** `ans.int` (count, optional unit), `ans.signed`, `ans.num`, `ans.money`, `ans.percent`,
  `ans.frac`, `ans.x` (value of a variable), `ans.text` (choice only). The answer must fit its own type.
- **Mistakes.** Every entry of `wrong` is kept in `question.misconceptions`, so a typed wrong answer is explained
  (`math.check(q, {text}) → {tag, why}`) even when it is not one of the four choices. The first three entries that
  fit beside the correct answer (same sign rules; whole numbers for a whole-number answer) become the choices; the
  kit tops up with generic `near` fillers only as a last resort — the sweep fails above 5 % fillers.
  Only list a mistake whose explanation is true for the generated numbers (use `cond ? {...} : null`).
- **No leaks.** The answer must not stand alone as a number in `beginner`, `hints[0]` or `hints[1]` unless that
  number is printed in the problem. Avoid stray numerals such as "Route 1" in those texts.
- **`check(p)`** recomputes the answer by another route (repeated addition, substitution, search).
- **`build(p)`** throws on parameters it cannot present well (`math.build` is used for story-specific numbers).

`tests/unit/math.test.mjs` sweeps every template × level × 300 seeds through the raw path (no retries): validation,
4 distinct choices, text hygiene in both languages, answer checking, the displayed maths evaluated independently,
the balance model, a JSON round trip, and reproducibility from `{templateId, level, seed}`.
