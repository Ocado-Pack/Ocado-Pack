// Template registry: statically imports every topic pack and exports the flat template list. Pure module.
// Importing a pack runs its defineTemplate() calls, which fill the kit's template map that the engine reads.
// To add a topic pack: create src/math/templates/<section>/<topic>.js, then add ONE import and ONE entry below.
// Static imports only (the game ships as a single offline HTML file - no dynamic import()).
import arOps from './templates/ar/ops.js';
import arWord from './templates/ar/word.js';
import mkLinear from './templates/mk/linear.js';
import mkOrder from './templates/mk/order.js';

/** topic id -> the templates of that pack. Topics from topics.js that are missing here simply have no pack yet. */
export const PACKS = Object.freeze({
  'ar.ops': arOps,
  'ar.word': arWord,
  'mk.linear': mkLinear,
  'mk.order': mkOrder,
});

/** Every registered template, in pack order. */
export const TEMPLATE_LIST = Object.freeze(Object.values(PACKS).flat());
