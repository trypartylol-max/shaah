'use strict';
/* Lee frases como "dentista mañana 18:30", "cena con Lior viernes 21h por 2 horas",
   "vuelo 3/12 todo el día" y devuelve título, inicio, fin y si es de día completo. */
(function (root) {
  const ACC = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n', 'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u' };
  const low = s => Array.from(s.toLowerCase()).map(c => ACC[c] || c).join('');
  const DOW = { domingo: 0, dom: 0, lunes: 1, lun: 1, martes: 2, miercoles: 3, mie: 3, jueves: 4, jue: 4, viernes: 5, vie: 5, sabado: 6, sab: 6 };
  const MON = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11 };
  const FILL = /^(a|al|el|la|las|los|de|del|para|en|y|el dia|,|-|·)$/;

  function parse(text, now) {
    now = now || new Date();
    const src = String(text || ''), s = low(src), used = [];
    const take = (re, type, fn) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(s))) {
        const a = m.index, b = a + m[0].length;
        if (used.some(u => a < u.b && b > u.a)) { if (!re.global) break; re.lastIndex = a + 1; continue; }
        if (fn(m) === false) { if (!re.global) break; re.lastIndex = a + 1; continue; }
        used.push({ a, b, type });
        if (!re.global) break;
      }
    };
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let date = null, hh = null, mm = 0, endH = null, endM = 0, dur = null, all = false, ampm = null;

    take(/\btodo el dia\b/g, 'all', () => { all = true; });
    take(/\b(por|en|de) la (manana)\b/g, 'ampm', () => { ampm = 'am'; });
    take(/\b(por|en|de) la (tarde|noche)\b/g, 'ampm', () => { ampm = 'pm'; });
    take(/\b(a )?mediodia\b/g, 'time', () => { hh = 12; mm = 0; });
    take(/\bpasado manana\b/g, 'date', () => { date = add(t0, 2); });
    take(/\bmanana\b/g, 'date', () => { if (date) return false; date = add(t0, 1); });
    take(/\bhoy\b/g, 'date', () => { if (date) return false; date = t0; });
    take(/\b(el )?(proximo )?(domingo|lunes|martes|miercoles|jueves|viernes|sabado|dom|lun|mie|jue|vie|sab)\b/g, 'date', m => {
      if (date) return false;
      let d = (DOW[m[3]] - t0.getDay() + 7) % 7; if (d === 0) d = 7;
      date = add(t0, d);
    });
    take(/\b(el )?(\d{1,2})\/(\d{1,2})(\/(\d{2,4}))?\b/g, 'date', m => {
      if (date) return false;
      const d = +m[2], mo = +m[3] - 1; if (d < 1 || d > 31 || mo < 0 || mo > 11) return false;
      let y = m[5] ? +m[5] : t0.getFullYear(); if (y < 100) y += 2000;
      date = new Date(y, mo, d); if (!m[5] && date < t0) date = new Date(y + 1, mo, d);
    });
    take(/\b(el )?(\d{1,2}) (de )?(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\b/g, 'date', m => {
      if (date) return false;
      const d = +m[2]; if (d < 1 || d > 31) return false;
      date = new Date(t0.getFullYear(), MON[m[4]], d); if (date < t0) date = new Date(t0.getFullYear() + 1, MON[m[4]], d);
    });
    // duración: "por 2 horas", "2 horas", "90 min", "por 1h"
    take(/\b(por |durante )?(\d+(?:[.,]\d+)?) ?(horas?|hrs?)\b/g, 'dur', m => { if (!m[1] && /hrs?/.test(m[3]) && +m[2] > 6) return false; dur = parseFloat(m[2].replace(',', '.')) * 60; });
    take(/\bpor (\d+(?:[.,]\d+)?) ?h\b/g, 'dur', m => { dur = parseFloat(m[1].replace(',', '.')) * 60; });
    take(/\b(por |durante )?(\d+) ?(min|mins|minutos)\b/g, 'dur', m => { dur = +m[2]; });
    // hora con rango: "18:30", "18-20", "6pm", "21h", "18:30 a 20:00"
    take(/\b(a las? |las |desde las? )?(\d{1,2})(?::(\d{2}))? ?(am|pm|h|hs)?(?: ?(-|a|hasta) ?(?:las )?(\d{1,2})(?::(\d{2}))? ?(am|pm|h|hs)?)?\b/g, 'time', m => {
      if (hh !== null) return false;
      const strong = m[1] || m[3] || m[4];
      if (!strong && !(m[5] === '-' || m[5] === 'hasta')) return false;
      let h = +m[2], mi = m[3] ? +m[3] : 0;
      if (h > 23 || mi > 59) return false;
      if (m[4] === 'pm' && h < 12) h += 12; if (m[4] === 'am' && h === 12) h = 0;
      if (m[6] !== undefined) {
        let e = +m[6], em = m[7] ? +m[7] : 0;
        if (e > 23 || em > 59) return false;
        if ((m[8] === 'pm' || m[4] === 'pm') && e < 12) e += 12;
        if (!m[4] && !m[8] && e < h && e + 12 <= 23 && e + 12 > h) e += 12;
        endH = e; endM = em;
      }
      hh = h; mm = mi;
    });
    take(/\bel (\d{1,2})\b/g, 'date', m => {
      if (date) return false;
      const d = +m[1]; if (d < 1 || d > 31) return false;
      date = new Date(t0.getFullYear(), t0.getMonth(), d); if (date < t0) date = new Date(t0.getFullYear(), t0.getMonth() + 1, d);
    });

    take(/\b(\d{1,2})\b/g, 'time', m => {
      if (hh !== null || !date) return false;
      const h = +m[1]; if (h > 23) return false;
      const prev = used.filter(u => u.type === 'date').some(u => s.slice(u.b, m.index).trim() === '');
      if (!prev) return false;
      hh = h; mm = 0;
    });

    if (hh !== null && !ampm && hh >= 1 && hh <= 7 && endH === null && !/(am|:)/.test(spanText('time'))) hh += 12;
    if (hh !== null && ampm === 'pm' && hh < 12) hh += 12;
    if (hh !== null && !ampm && hh >= 8 && hh <= 11 && endH === null && !/am/.test(spanText('time')) && /\b(cena|fiesta|bar|birras?|copas?|show|concierto|party|after|boliche|disco|noche)\b/.test(s)) hh += 12;
    if (hh !== null && ampm === 'am' && hh === 12) hh = 0;

    function spanText(type) { return used.filter(u => u.type === type).map(u => s.slice(u.a, u.b)).join(' '); }

    // título = lo que no se usó
    let title = '', last = 0;
    used.slice().sort((a, b) => a.a - b.a).forEach(u => { title += src.slice(last, u.a) + ' '; last = u.b; });
    title += src.slice(last);
    let words = title.split(/\s+/).filter(Boolean);
    while (words.length && FILL.test(low(words[words.length - 1]))) words.pop();
    while (words.length && FILL.test(low(words[0]))) words.shift();
    title = words.join(' ').replace(/\s+([,.])/g, '$1');
    title = title ? title[0].toUpperCase() + title.slice(1) : '';

    const hasDate = !!date, hasTime = hh !== null;
    if (!date) {
      date = t0;
      if (hasTime && (hh * 60 + mm) < now.getHours() * 60 + now.getMinutes()) date = add(t0, 1);
    }
    if (!hasTime) all = true;
    let start, end;
    if (all) { start = date; end = add(date, 1); }
    else {
      start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm);
      if (endH !== null) { end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endH, endM); if (end <= start) end = new Date(end.getTime() + 864e5); }
      else end = new Date(start.getTime() + (dur || 60) * 60000);
    }
    return { title, start, end, all, hasDate, hasTime, dur, spans: used.map(u => ({ a: u.a, b: u.b, type: u.type })) };
  }
  function add(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  /* Texto sin los fragmentos de un tipo (para que los atajos reemplacen en vez de duplicar). */
  function strip(text, types) {
    const r = parse(text), src = String(text || '');
    let out = '', last = 0;
    r.spans.filter(u => types.indexOf(u.type) >= 0).sort((a, b) => a.a - b.a).forEach(u => { out += src.slice(last, u.a); last = u.b; });
    return (out + src.slice(last)).replace(/\s+/g, ' ').trim();
  }
  root.EscEvento = { parse, strip };
})(typeof window !== 'undefined' ? window : globalThis);
