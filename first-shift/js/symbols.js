/* FIRST SHIFT — schematic symbol library.
 * Simplified North American (NEMA/JIC ladder style) electrical symbols and
 * simplified ISO 1219-style fluid power symbols. Each symbol is drawn around
 * the origin; two-terminal symbols have leads from x = -30 to x = +30. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};

  function p(d, cls) { return '<path class="' + (cls || 'sy') + '" d="' + d + '"/>'; }
  function c(x, y, r, cls) { return '<circle class="' + (cls || 'sy') + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; }
  function t(x, y, s, cls) { return '<text class="' + (cls || 'syt') + '" x="' + x + '" y="' + y + '">' + s + '</text>'; }
  function zig(x1, x2, y, amp, n) {
    var d = 'M' + x1 + ' ' + y, step = (x2 - x1) / (n * 2), x = x1;
    for (var i = 0; i < n * 2; i++) { x += step; d += ' L' + (Math.round((x - step / 2) * 10) / 10) + ' ' + (y + (i % 2 ? amp : -amp)); }
    return d + ' L' + x2 + ' ' + y;
  }
  var LEADS = 'M-30 0H-13 M13 0H30';
  var TERMS = function () { return c(-10, 0, 3, 'sy syw') + c(10, 0, 3, 'sy syw'); };

  var S = {
    /* ---- conductors ---- */
    wire: function () { return p('M-30 0H30'); },
    junction: function () { return p('M-30 0H30 M0 0V20') + c(0, 0, 3.5, 'syf'); },
    crossing: function () { return p('M-30 0H30 M0 -20V20'); },
    /* ---- sources and protection ---- */
    ps: function (o) {
      return '<rect class="sy syw" x="-26" y="-20" width="52" height="40" rx="2"/>' + t(0, -4, (o && o.t) || 'PS', 'syt') + t(0, 10, '24 VDC', 'syt sm') +
        p('M-26 -10H-36 M-26 10H-36') + t(-41, -6, '+', 'syt') + t(-41, 14, '−', 'syt');
    },
    fuse: function () { return p('M-30 0H-14 q7 -15 14 0 q7 15 14 0 H30'); },
    cb: function () { return p('M-30 0H-13 M13 0H30 M-10 -4 Q0 -19 10 -4') + TERMS(); },
    disc: function () { return p('M-30 0H-13 M13 0H30 M-8 -2 L11 -13') + TERMS(); },
    /* ---- pilot devices ---- */
    pb_no: function () { return p(LEADS + ' M-15 -9H15 M0 -9V-19 M-6 -19H6') + TERMS(); },
    pb_nc: function () { return p(LEADS + ' M-15 4.5H15 M0 4.5V-19 M-6 -19H6') + TERMS(); },
    sw: function () { return p(LEADS + ' M-8 -2 L11 -13') + TERMS(); },
    sel: function () { return p(LEADS + ' M-8 -2 L11 -13 M1.5 -8V-20 M-5 -20H8') + TERMS(); },
    ls_no: function () { return p(LEADS + ' M-8 2 L13 10 M-1 5 l3 -7 l5 9') + TERMS(); },
    /* ---- relay and contactor parts ---- */
    coil: function (o) { return p('M-30 0H-14 M14 0H30') + c(0, 0, 14, 'sy syw') + t(0, 4, (o && o.t) || '', 'syt'); },
    no: function () { return p('M-30 0H-6 M6 0H30 M-6 -11V11 M6 -11V11'); },
    nc: function () { return p('M-30 0H-6 M6 0H30 M-6 -11V11 M6 -11V11 M-13 11 L13 -11'); },
    heater: function () { return p('M-30 0H-10 a5 5 0 0 1 10 0 a5 5 0 0 0 10 0 H30'); },
    main3: function () {
      return [-16, 0, 16].map(function (y) { return p('M-30 ' + y + 'H-5 M5 ' + y + 'H30 M-5 ' + (y - 6) + 'V' + (y + 6) + ' M5 ' + (y - 6) + 'V' + (y + 6)); }).join('');
    },
    ol: function () {
      return p('M-34 -10H-22 a4 4 0 0 1 8 0 a4 4 0 0 0 8 0 H-2') + p('M6 -10H14 M22 -10H34 M14 -19V-1 M22 -19V-1 M9 -1 L27 -19') +
        t(-18, 14, 'element', 'syt sm') + t(18, 14, 'contact', 'syt sm');
    },
    /* ---- loads ---- */
    lamp: function (o) {
      return p('M-30 0H-11 M11 0H30 M9.5 -9.5 l4.5 -4.5 M-9.5 -9.5 l-4.5 -4.5 M9.5 9.5 l4.5 4.5 M-9.5 9.5 l-4.5 4.5') +
        c(0, 0, 11, 'sy syw') + '<g transform="rotate(' + ((o && o.tr) || 0) + ')">' + t(0, 4, (o && o.t) || '', 'syt') + '</g>';
    },
    motor: function (o) {
      return p('M-30 -14H-17 M-30 0H-22 M-30 14H-17') + c(0, 0, 22, 'sy syw') + t(0, 1, (o && o.t) || 'MTR', 'syt') + t(0, 12, '3~', 'syt sm');
    },
    sol: function () { return p(LEADS + ' M-7 0 L-3.5 -9 L3.5 9 L7 0') + TERMS(); },
    /* ---- wiring hardware and references ---- */
    tb: function (o) { return p('M-30 0H-6 M6 0H30') + c(0, 0, 6, 'sy syw') + t(0, 3.5, (o && o.t) || '1', 'syt sm'); },
    pe: function () { return p('M0 -18V0 M-13 0H13 M-8.5 6H8.5 M-4 12H4'); },
    com: function () { return p('M0 -18V-4 M-9 -4H9L0 8Z'); },
    neutral: function () { return p('M-30 0H30') + t(0, -7, 'N', 'syt'); },
    xfmr: function () {
      var top = 'M-24 -5', bot = 'M-24 7', i;
      for (i = 0; i < 4; i++) { top += ' a6 6 0 0 1 12 0'; bot += ' a6 6 0 0 0 12 0'; }
      return p(top + ' ' + bot + ' M-24 -0.5H24 M-24 2.5H24 M-24 -5V-18 M24 -5V-18 M-24 7V20 M24 7V20') +
        t(-33, -12, 'H1', 'syt sm') + t(34, -12, 'H2', 'syt sm') + t(-33, 20, 'X1', 'syt sm') + t(34, 20, 'X2', 'syt sm');
    },
    /* ---- sensors ---- */
    prox: function () {
      return p('M-30 0H-16 M16 0H30 M0 -16 L16 0 L0 16 L-16 0Z M-5 -6V6 M5 -6V6 M-16 0H-5 M5 0H16');
    },
    photo: function () {
      return '<rect class="sy syw" x="-16" y="-12" width="32" height="24" rx="2"/>' + c(8, 0, 5) +
        p('M-30 0H-16 M17 -5 l12 -6 M25 -12.5 l4 1.5 l-1.5 4 M17 5 l12 6 M27.5 7 l1.5 4 l-4 1.5');
    },
    sensor3: function (o) {
      return '<rect class="sy syw" x="-34" y="-26" width="68" height="52" rx="3"/>' + t(0, -8, (o && o.t) || 'PEC', 'syt') +
        t(0, 6, 'photoelectric', 'syt sm') + t(0, 17, 'sensor', 'syt sm');
    },
    /* ---- PLC ---- */
    plc_in: function (o) {
      return p('M-30 0H-12') + c(-9, 0, 3, 'sy syw') + '<rect class="sy syw" x="-6" y="-13" width="38" height="26" rx="2"/>' + t(13, 4, (o && o.t) || 'I0', 'syt');
    },
    plc_out: function (o) {
      return p('M12 0H30') + c(9, 0, 3, 'sy syw') + '<rect class="sy syw" x="-32" y="-13" width="38" height="26" rx="2"/>' + t(-13, 4, (o && o.t) || 'Q0', 'syt');
    },
    /* ---- generic labelled box (wiring, layout and block views) ---- */
    box: function (o) {
      var w = o.w || 80, h = o.h || 44;
      return '<rect class="sy syw" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="3"/>' +
        t(0, o.t2 ? -2 : 4, o.t || '', 'syt') + (o.t2 ? t(0, 12, o.t2, 'syt sm') : '');
    },
    row: function () { return ''; },
    /* ---- optional recognition ---- */
    res: function () { return p('M-30 0H-18 l3 -7 l6 14 l6 -14 l6 14 l6 -14 l6 14 l3 -7 H30'); },
    cap: function () { return p('M-30 0H-4 M-4 -11V11 M30 0H6 M10 -11 Q1 0 10 11'); },
    diode: function () { return p('M-30 0H-8 M8 0H30 M8 -9V9') + p('M-8 -9V9L8 0Z', 'syf'); },
    rect: function () {
      return p('M0 -20 L20 0 L0 20 L-20 0Z M-30 0H-20 M20 0H30 M0 -20V-26 M0 20V26 M5 -5V5') + p('M-5 -5V5L5 0Z', 'syf') +
        t(-26, -6, '+', 'syt sm') + t(27, -6, '−', 'syt sm') + t(8, -23, '~', 'syt sm') + t(8, 28, '~', 'syt sm');
    },
    vfd: function () {
      return '<rect class="sy syw" x="-22" y="-18" width="44" height="36" rx="2"/>' + t(0, 4, 'VFD', 'syt') +
        p('M-34 -10H-22 M-34 0H-22 M-34 10H-22 M22 -10H34 M22 0H34 M22 10H34');
    },
    /* ---- fluid power (simplified ISO 1219 style) ---- */
    air_src: function () { return p('M-10 -8V8L6 0Z M6 0H30', 'sy fl'); },
    hyd_pump: function () { return c(0, 0, 14, 'sy fl syw') + p('M0 -14 l-5 8 h10Z', 'syf flf') + p('M0 -14V-26 M0 14V24 M14 0H26', 'sy fl'); },
    reservoir: function () { return p('M-14 0V12H14V0 M0 -18V6', 'sy fl'); },
    frl: function () {
      return p('M-30 0H-22 M-12 -10 L-2 0 L-12 10 L-22 0Z M-2 0H6 M22 0H30', 'sy fl') + p('M-12 -10V10', 'sy fl dash') +
        '<rect class="sy fl syw" x="6" y="-8" width="16" height="16"/>' + p('M9 0H19 M16 -3 l3 3 l-3 3', 'sy fl') + p('M14 -8 l-3 -3 l6 -3 l-6 -3 l3 -3', 'sy fl');
    },
    gauge: function () { return c(0, -6, 11, 'sy fl syw') + p('M0 5V18 M-5 -1 L6 -12 M6 -12 l-5 1 M6 -12 l-1 5', 'sy fl'); },
    shutoff: function () { return p('M-30 0H-10 M10 0H30 M-10 -7V7L10 -7V7Z M0 0V-12 M-6 -12H6', 'sy fl'); },
    dcv52: function () {
      return '<rect class="sy fl syw" x="-28" y="-12" width="28" height="24"/><rect class="sy fl syw" x="0" y="-12" width="28" height="24"/>' +
        p('M-14 12 L-21 -12 M-21 -12 l0 5 M-21 -12 l4 3 M-7 -12 L-5 12 M-5 12 l-3 -4 M-5 12 l2 -5 M-22 12v-5 M-25 7h6', 'sy fl') +
        p('M14 12 L21 -12 M21 -12 l0 5 M21 -12 l-4 3 M7 -12 L5 12 M5 12 l3 -4 M5 12 l-2 -5 M22 12v-5 M19 7h6', 'sy fl') +
        '<rect class="sy fl syw" x="-40" y="-7" width="12" height="14"/>' + p('M-40 7 L-28 -7', 'sy fl') + p(zig(28, 42, 0, 5, 2), 'sy fl');
    },
    sol_act: function () { return '<rect class="sy fl syw" x="-12" y="-9" width="24" height="18"/>' + p('M-12 9 L12 -9', 'sy fl'); },
    spring: function () { return p(zig(-18, 18, 0, 7, 3), 'sy fl'); },
    cyl_da: function () {
      return '<rect class="sy fl syw" x="-30" y="-10" width="44" height="20"/>' + p('M-14 -10V10 M-14 0H34 M-24 10V18 M8 10V18', 'sy fl');
    },
    cyl_sa: function () {
      return '<rect class="sy fl syw" x="-30" y="-10" width="44" height="20"/>' + p('M-14 -10V10 M-14 0H34 M-24 10V18', 'sy fl') + p(zig(-14, 14, 6, 3, 4), 'sy fl thin');
    },
    flow: function () { return p('M-30 0H30 M-7 -11 Q0 -4 7 -11 M-7 11 Q0 4 7 11 M-11 11 L11 -11 M11 -11 l-6 1 M11 -11 l-1 6', 'sy fl'); },
    check: function () { return p('M-30 0H-5 M5 0H30 M-13 -9 L-4 -3 M-13 9 L-4 3', 'sy fl') + c(0, 0, 5, 'sy fl syw'); },
    relief: function () {
      return '<rect class="sy fl syw" x="-11" y="-11" width="22" height="22"/>' + p('M-5 9V-7 M-5 -7 l-3 4 M-5 -7 l3 4 M0 -11V-22 M0 11V22', 'sy fl') +
        p(zig(11, 27, 0, 5, 2), 'sy fl') + p('M0 -17H-19V0H-11', 'sy fl dash');
    },
    exhaust: function () { return p('M0 0V8 M-6 8H6L0 17Z', 'sy fl'); }
  };

  FS.sym = {
    draw: function (type, opts) { return (S[type] || S.wire)(opts || {}); },
    has: function (type) { return !!S[type]; },
    zig: zig,
    /* Stand-alone card drawing with room for the whole symbol. */
    card: function (type, opts, label) {
      return '<svg class="symcard" viewBox="-48 -32 96 64" role="img" aria-label="' + (label || type) + ' symbol">' + FS.sym.draw(type, opts) + '</svg>';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
