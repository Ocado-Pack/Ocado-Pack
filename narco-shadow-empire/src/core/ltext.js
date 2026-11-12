// Bilingual text (English / Spanish). Pure module - safe to import from Node tests.
/** @typedef {{en:string, es:string}} LText */

/** Create a bilingual text. If `es` is omitted the English text is used for both. */
export function L(en, es) {
  return { en: String(en), es: es === undefined || es === null ? String(en) : String(es) };
}

export function isLText(v) {
  return !!v && typeof v === 'object' && typeof v.en === 'string';
}

/** Resolve an LText (or plain string) to a string in `lang` ('en' | 'es'), falling back to English. */
export function pickLang(v, lang = 'en') {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  const s = v[lang];
  return s === undefined || s === null || s === '' ? (v.en ?? '') : s;
}

/** Replace {name} placeholders in a string. */
export function fill(str, vars) {
  if (!vars) return str;
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Replace {name} placeholders in both languages. Values may themselves be LText (resolved per language). */
export function fillL(lt, vars) {
  const one = (lang) => String(pickLang(lt, lang)).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? pickLang(vars[k], lang) : m));
  return { en: one('en'), es: one('es') };
}

/** Join several LTexts (or strings) with a separator into one LText. */
export function joinL(parts, sep = ' ') {
  return { en: parts.map((p) => pickLang(p, 'en')).join(sep), es: parts.map((p) => pickLang(p, 'es')).join(sep) };
}
