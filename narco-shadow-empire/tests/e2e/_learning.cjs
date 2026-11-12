// Shared scenario body: the learning core in a real browser. Not a scenario by itself (see learning*.e2e.cjs).
//   1. the live self-test passes;
//   2. the two demo problems are answered through ctx.tutor (one wrong attempt on the AR problem first);
//   3. after a page reload the profile comes back from localStorage with the same progress;
//   4. no console errors and no request leaves the page.
module.exports = async function learningScenario({ page, evalJs, report }) {
  const d = {};
  d.selfTest = await evalJs(() => window.__game.selfTest());
  d.persistent = await evalJs(() => window.__game.storage.persistent);
  d.play = await evalJs(() => {
    const g = window.__game;
    g.profile.reset();
    g.session.start({ missionId: 'ch1_arrival' });
    const ar = g.tutor.begin(g.math.fixed.trucks());
    const wrong = ar.submit({ text: '54' }), right = ar.submit({ text: '40' }), arResult = ar.finish();
    const mk = g.tutor.begin(g.math.fixed.equation());
    const solved = mk.submit({ text: 'x = 9' }), mkResult = mk.finish();
    const rep = g.session.end();
    g.profile.missionDone('ch1_arrival', rep);
    return {
      prompt: g.math.fixed.trucks().prompt.en, hintLevel: wrong.hint.level, tag: wrong.tag, explained: !!(wrong.why && wrong.why.en && wrong.why.es),
      ar: [right.correct, arResult.outcome, arResult.xp], mk: [solved.correct, mkResult.outcome, mkResult.xp],
      reportXp: rep.xp, review: rep.reviewQuestions.length, mistakes: rep.mistakes.length, xp: g.profile.xp,
    };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', null, { timeout: 60000 });
  d.afterReload = await evalJs(() => {
    const p = window.__game.profile;
    return { xp: p.xp, missions: p.missionCount, done: p.missionState('ch1_arrival').completed, arPct: p.section('AR').independentPct, mkPct: p.section('MK').independentPct, due: p.due().map((x) => x.topicId), streak: p.streak().current, answered: p.overall().answered };
  });
  d.externalRequests = report.externalRequests.slice(0, 5);
  d.consoleErrors = report.errors.slice(0, 5);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const checks = {
    selfTest: d.selfTest && d.selfTest.pass === true && d.selfTest.total >= 8,
    storageIsPersistent: d.persistent === true,
    arProblem: d.play.prompt === 'Three trucks carry 18 equipment cases each. Fourteen cases are removed. How many remain?' && same(d.play.ar, [true, 'assisted', 50]),
    wrongAnswerTeaches: d.play.hintLevel === 1 && d.play.tag === 'forgot-subtract' && d.play.explained,
    mkProblem: same(d.play.mk, [true, 'independent', 125]),
    report: d.play.reportXp === 175 && d.play.review >= 3 && d.play.mistakes === 1,
    progressSurvivesReload: same(d.afterReload, { xp: 175, missions: 1, done: true, arPct: 0, mkPct: 100, due: ['ar.ops'], streak: 1, answered: 2 }),
    noNetwork: report.externalRequests.length === 0,
    noConsoleErrors: report.errors.length === 0 && report.pageErrors.length === 0,
  };
  d.checks = checks;
  return { pass: Object.values(checks).every(Boolean), details: d };
};
