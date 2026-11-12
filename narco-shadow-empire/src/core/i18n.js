// UI string tables + bilingual text resolution. Pure module.
//   ctx.i18n.addStrings({ en: {'hud.objective': 'Objective'}, es: {'hud.objective': 'Objetivo'} })
//   ctx.i18n.t('hud.objective')                 -> UI language
//   ctx.i18n.t('hud.items', {n: 3})             -> "{n}" placeholders
//   ctx.i18n.tl(L('Open','Abrir'))              -> resolve an LText in the UI language
//   ctx.i18n.learn(L('Multiply','Multiplica'))  -> resolve an LText in the *learning* language (tutor text)
import { pickLang, fill } from './ltext.js';

export function createI18n({ settings, events }) {
  const tables = { en: {}, es: {} };
  const api = {
    get lang() { return settings.get('lang') === 'es' ? 'es' : 'en'; },
    get learnLang() { return settings.get('learnLang') === 'es' ? 'es' : 'en'; },
    addStrings(byLang) {
      for (const lang of ['en', 'es']) if (byLang[lang]) Object.assign(tables[lang], byLang[lang]);
    },
    has(key) { return key in tables.en || key in tables.es; },
    /** Translate a string-table key in the UI language (falls back to English, then to the key itself). */
    t(key, vars) {
      const s = tables[api.lang][key] ?? tables.en[key] ?? key;
      return fill(s, vars);
    },
    /** Resolve an LText/string in the UI language. */
    tl(v, vars) { return fill(pickLang(v, api.lang), vars); },
    /** Resolve an LText/string in the learning-explanation language. */
    learn(v, vars) { return fill(pickLang(v, api.learnLang), vars); },
    setLang(lang) { settings.set('lang', lang === 'es' ? 'es' : 'en'); },
    setLearnLang(lang) { settings.set('learnLang', lang === 'es' ? 'es' : 'en'); },
    /** fn() is called whenever the UI or learning language changes. Returns unsubscribe. */
    onLangChange(fn) {
      const a = settings.onChange('lang', () => fn());
      const b = settings.onChange('learnLang', () => fn());
      return () => { a(); b(); };
    },
  };
  if (events) settings.onChange('lang', (v) => events.emit('i18n:lang', { lang: v }));
  return api;
}
