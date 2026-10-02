/* Book Lab demonstration booking flow.
   Everything runs in the browser: availability is sample data and nothing the
   visitor types is sent anywhere (the CSP sets connect-src 'none' to enforce it).
   No inline handlers or style attributes, so the CSP needs no 'unsafe-inline'. */
(function () {
  'use strict';

  const SERVICES = [
    { id: 'full', name: 'Total body mole map and skin cancer check', flag: 'Most comprehensive', minutes: 40, price: 395,
      desc: 'High-resolution imaging of your whole skin surface, followed by a full head-to-toe skin check with dermoscopy by one of our clinicians. Your images are kept as a baseline, so any change can be spotted early at future visits.',
      best: 'You have a lot of moles, fair skin, past sun damage or a family history of skin cancer.',
      inc: ['Dermoscopy report', 'Patient portal access', 'Summary sent to your GP'], sub: 'Mole map and dermoscopy · 40 minutes' },
    { id: 'consult', name: 'Specialist consultation', minutes: 45, price: 285,
      desc: 'An unhurried first appointment with one of our specialists. We take a full history, examine the area of concern and talk through your options, then send a written plan to you and your GP.',
      best: 'You have a referral, a specific concern, or want a specialist opinion before deciding on treatment.',
      inc: ['Written care plan', 'Letter to your GP', 'No referral needed'], sub: 'First specialist appointment · 45 minutes' },
    { id: 'procedure', name: 'Minor skin procedure', minutes: 30, price: 460,
      desc: 'Removal of a single mole or skin lesion under local anaesthetic in our procedure room. The sample is sent for laboratory testing and we call you with the results, usually within a week.',
      best: 'A lesion has already been assessed and removal has been recommended.',
      inc: ['Local anaesthetic', 'Laboratory testing', 'Results call and wound check'], sub: 'Lesion removal under local anaesthetic · 30 minutes' }
  ];
  const PLACE = 'Queenstown';
  const REF_PREFIX = 'DEMO';
  const BOOK_AHEAD_DAYS = 60;

  const $ = id => document.getElementById(id);
  const byId = id => SERVICES.find(s => s.id === id);
  const state = { service: null, date: null, time: null, returning: null, name: '', email: '', phone: '' };
  let curStep = 1;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ---------- step 1: services ---------- */
  /* Each card has a labelled Select button (the whole card is also clickable)
     and keeps the long description behind "More details" so the three choices
     fit on one screen. */
  SERVICES.forEach(s => {
    const card = el('div', 'svc'); card.dataset.id = s.id;
    const top = el('div', 'svc-top');
    const body = el('div', 'svc-body');
    if (s.flag) body.appendChild(el('span', 'svc-flag', s.flag));
    body.appendChild(el('h3', 'svc-name', s.name));
    body.appendChild(el('p', 'svc-mins', s.minutes + ' minutes'));
    const best = el('p', 'svc-best');
    best.append(el('strong', '', 'Best if '), s.best.charAt(0).toLowerCase() + s.best.slice(1));
    body.appendChild(best);
    const side = el('div', 'svc-side');
    side.appendChild(el('span', 'svc-price', '$' + s.price));
    side.appendChild(el('span', 'svc-gst', 'incl. GST'));
    top.append(body, side);

    const more = el('div', 'svc-more'); more.id = 'more-' + s.id; more.hidden = true;
    more.appendChild(el('p', 'svc-desc', s.desc));
    const inc = el('ul', 'svc-inc');
    s.inc.forEach(i => inc.appendChild(el('li', '', i)));
    more.appendChild(inc);

    const actions = el('div', 'svc-actions');
    const toggle = el('button', 'link-btn svc-toggle', 'More details');
    toggle.type = 'button'; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', more.id);
    toggle.addEventListener('click', () => {
      more.hidden = !more.hidden;
      toggle.setAttribute('aria-expanded', String(!more.hidden));
      toggle.textContent = more.hidden ? 'More details' : 'Hide details';
    });
    const select = el('button', 'btn btn-ghost svc-select', 'Select');
    select.type = 'button'; select.setAttribute('aria-pressed', 'false'); select.setAttribute('aria-label', 'Select ' + s.name);
    actions.append(toggle, select);

    card.append(top, more, actions);
    card.addEventListener('click', e => { if (!e.target.closest('.svc-toggle')) pickService(s.id); });
    $('svcList').appendChild(card);
  });

  function setSum(id, text) { const e = $(id); e.textContent = text; e.classList.remove('empty'); }

  function pickService(id, quiet) {
    const s = byId(id);
    state.service = id;
    document.querySelectorAll('.svc').forEach(c => {
      const on = c.dataset.id === id;
      c.classList.toggle('sel', on);
      const b = c.querySelector('.svc-select');
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? 'Selected' : 'Select';
    });
    setSum('sService', s.name);
    setSum('sDur', s.minutes + ' minutes');
    $('sPrice').textContent = '$' + s.price;
    $('slotDur').textContent = s.minutes + ' minute';
    $('chipService').textContent = s.name + ' · ' + s.minutes + ' minutes · $' + s.price;
    clearNotice(); updateCta(); updateQR();
    if (!quiet) revealCta();
  }

  /* ---------- next-step buttons ----------
     Under each step, in the summary card, and in the fixed bar on small screens.
     They are never disabled: pressing one too early says what is missing and
     scrolls to it, instead of a dead grey button. */
  function ctaState() {
    if (curStep === 1) {
      return state.service ? { label: 'Continue to date and time', go: 2 }
        : { label: 'Continue to date and time', need: 'Please choose a service first.', target: 'svcList' };
    }
    if (curStep === 2) {
      if (!state.date) return { label: 'Continue to your details', need: 'Please choose a day first.', target: 'calCard' };
      if (!state.time) return { label: 'Continue to your details', need: 'Please choose a time for your appointment.', target: 'slots' };
      return { label: 'Continue to your details', go: 3 };
    }
    if (curStep === 3) return { label: 'Review my booking', action: 'review' };
    return { label: 'Confirm my booking', action: 'confirm' };
  }
  function updateCta() {
    const c = ctaState();
    document.querySelectorAll('.js-cta').forEach(b => {
      b.textContent = b.closest('.action-bar') ? (curStep === 3 ? 'Review' : curStep === 4 ? 'Confirm' : 'Continue') : c.label;
    });
    const bar = $('barSummary');
    bar.classList.remove('warn');
    bar.textContent = '';
    if (!state.service) { bar.textContent = 'Choose a service'; return; }
    const s = byId(state.service);
    bar.appendChild(el('strong', '', s.name + ' · $' + s.price));
    bar.appendChild(document.createTextNode(
      state.date && state.time ? fmtShort(state.date) + ' at ' + state.time
        : state.date ? 'Choose a time' : curStep === 1 ? s.minutes + ' minutes' : 'Choose a day'));
  }
  /* After a choice, make sure the next-step button under the step is on screen
     (wide layouts; on small screens the fixed bar is always visible). */
  function revealCta() {
    const b = $('step' + curStep).querySelector('.step-cta');
    if (!b || !b.offsetParent) return;
    const r = b.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 16) b.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  function clearNotice() { document.querySelectorAll('[data-notice]').forEach(n => { n.hidden = true; n.textContent = ''; }); }
  function runCta() {
    const c = ctaState();
    if (c.need) {
      const n = $('step' + curStep).querySelector('[data-notice]');
      n.textContent = c.need; n.hidden = false;
      const bar = $('barSummary'); bar.textContent = c.need; bar.classList.add('warn');
      $(c.target).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (c.go) go(c.go);
    else if (c.action === 'review') validateDetails();
    else confirmBooking();
  }

  /* ---------- step navigation, kept in sync with browser history ---------- */
  function render(n, focus) {
    curStep = n;
    for (let i = 1; i <= 5; i++) $('step' + i).classList.toggle('on', i === n);
    document.querySelectorAll('.pstep').forEach(e => {
      const p = +e.dataset.p;
      e.classList.toggle('active', p === n);
      e.classList.toggle('done', p < n);
      if (p === n) e.setAttribute('aria-current', 'step'); else e.removeAttribute('aria-current');
      if (p < n) { e.setAttribute('role', 'button'); e.setAttribute('tabindex', '0'); e.setAttribute('aria-label', 'Go back to step ' + p); }
      else { e.removeAttribute('role'); e.removeAttribute('tabindex'); e.removeAttribute('aria-label'); }
    });
    if (n === 4) fillReview();
    const done = n === 5;
    ['progress', 'summaryCard', 'actionBar'].forEach(id => { $(id).hidden = done; });
    $('pageHead').hidden = n > 1;
    $('cols').classList.toggle('done', done);
    clearNotice(); updateCta();
    if (n === 1 || done) window.scrollTo({ top: 0 });
    else $('progress').scrollIntoView({ block: 'start' });
    if (focus) $('h-step' + n).focus({ preventScroll: true });
  }
  function go(n) {
    if (n === curStep) return;
    if (n > curStep) { history.pushState({ step: n }, ''); render(n, true); }
    else history.go(n - curStep);
  }
  history.replaceState({ step: 1 }, '');
  window.addEventListener('popstate', e => {
    if (curStep === 5) { history.pushState({ step: 5 }, ''); return; } /* confirmation is terminal */
    render((e.state && e.state.step) || 1, true);
  });
  document.querySelectorAll('.pstep').forEach(e => {
    const back = () => { const p = +e.dataset.p; if (p < curStep && curStep < 5) go(p); };
    e.addEventListener('click', back);
    e.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); back(); } });
  });

  /* ---------- step 2: calendar and sample availability ---------- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + BOOK_AHEAD_DAYS);
  let viewYear = today.getFullYear(), viewMonth = today.getMonth();
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const AM = ['8:30 am', '9:15 am', '10:00 am', '10:45 am', '11:30 am'];
  const PM = ['1:00 pm', '1:45 pm', '2:30 pm', '3:15 pm', '4:00 pm', '4:45 pm'];

  const fmtDate = d => d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = d => d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });

  /* Deterministic sample diary: the same day always shows the same free times.
     Closed Sundays, mornings only on Saturdays. A live page reads the clinic's
     real availability from Elixir instead. */
  function seedRand(n) { const x = Math.sin(n) * 10000; return x - Math.floor(x); }
  function slotsFor(date) {
    if (date <= today || date > maxDate || date.getDay() === 0) return { am: [], pm: [] };
    const seed = date.getFullYear() * 400 + date.getMonth() * 31 + date.getDate();
    const free = (list, off) => list.filter((t, i) => seedRand(seed + i + off) >= 0.42);
    return { am: free(AM, 0), pm: date.getDay() === 6 ? [] : free(PM, 10) };
  }

  function renderMonth(y, mo, titleEl, gridEl) {
    titleEl.textContent = MONTHS[mo] + ' ' + y;
    gridEl.textContent = '';
    DOWS.forEach(d => gridEl.appendChild(el('div', 'dow', d)));
    const lead = (new Date(y, mo, 1).getDay() + 6) % 7; /* Monday first */
    for (let i = 0; i < lead; i++) gridEl.appendChild(document.createElement('div'));
    const dim = new Date(y, mo + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const date = new Date(y, mo, d);
      const s = slotsFor(date);
      const open = s.am.length + s.pm.length > 0;
      const b = el('button', 'day', String(d));
      b.type = 'button'; b.disabled = !open;
      if (date.getTime() === today.getTime()) b.classList.add('today');
      if (state.date && date.getTime() === state.date.getTime()) { b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); }
      b.setAttribute('aria-label', fmtDate(date) + (open ? ', times available' : ', not available'));
      if (open) b.addEventListener('click', () => pickDate(date));
      gridEl.appendChild(b);
    }
  }
  function renderCal() {
    let y2 = viewYear, m2 = viewMonth + 1;
    if (m2 > 11) { m2 = 0; y2++; }
    renderMonth(viewYear, viewMonth, $('calMonth0'), $('calGrid0'));
    renderMonth(y2, m2, $('calMonth1'), $('calGrid1'));
    $('calPrev').disabled = !(new Date(viewYear, viewMonth, 1) > new Date(today.getFullYear(), today.getMonth(), 1));
    $('calNext').disabled = new Date(viewYear, viewMonth + 1, 1) > maxDate;
  }
  $('calPrev').addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderCal(); });
  $('calNext').addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderCal(); });

  function pickTime(t) {
    state.time = t;
    document.querySelectorAll('.slot').forEach(x => x.setAttribute('aria-pressed', String(x.textContent === t)));
    setSum('sTime', t);
    $('chipWhen').textContent = fmtDate(state.date) + ' at ' + t;
    clearNotice(); updateCta(); revealCta();
  }
  function pickDate(date, quiet) {
    state.date = date; state.time = null;
    setSum('sDate', fmtDate(date));
    $('sTime').textContent = 'Pick a time'; $('sTime').classList.add('empty');
    $('calHint').textContent = 'Now choose a time below';
    clearNotice(); renderCal(); renderSlots(date); updateCta();
    if (!quiet) setTimeout(() => $('slots').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }
  function renderSlots(date) {
    const s = slotsFor(date);
    $('slots').hidden = false;
    $('slotDay').textContent = fmtDate(date);
    const build = (list, host, emptyText) => {
      host.textContent = '';
      list.forEach(t => {
        const b = el('button', 'slot', t);
        b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => pickTime(t));
        host.appendChild(b);
      });
      if (!list.length) host.appendChild(el('span', 'slots-empty', emptyText));
    };
    build(s.am, $('slotsAM'), 'No morning times left on this day');
    build(s.pm, $('slotsPM'), date.getDay() === 6 ? 'The clinic closes at midday on Saturdays' : 'No afternoon times left on this day');
  }

  /* "Next available" shortcut: one press picks the earliest free day and time. */
  const next = (() => {
    const d = new Date(today);
    for (let i = 0; i < BOOK_AHEAD_DAYS; i++) {
      d.setDate(d.getDate() + 1);
      const s = slotsFor(d);
      const t = s.am[0] || s.pm[0];
      if (t) return { date: new Date(d), time: t };
    }
    return null;
  })();
  if (next) {
    $('nextAvailVal').textContent = fmtDate(next.date) + ' at ' + next.time;
    $('nextAvail').addEventListener('click', () => {
      viewYear = next.date.getFullYear(); viewMonth = next.date.getMonth();
      pickDate(next.date, true); pickTime(next.time);
    });
  } else $('nextAvail').hidden = true;
  renderCal();

  /* ---------- step 3: details ---------- */
  ['retYes', 'retNo'].forEach(id => $(id).addEventListener('click', () => {
    state.returning = id === 'retYes' ? 'yes' : 'no';
    $('retYes').setAttribute('aria-pressed', String(id === 'retYes'));
    $('retNo').setAttribute('aria-pressed', String(id === 'retNo'));
  }));
  $('notes').addEventListener('input', e => { $('notesCount').textContent = e.target.value.length + ' of 500 characters'; });

  function setErr(box, input, bad) {
    $(box).classList.toggle('err', bad);
    if (bad) $(input).setAttribute('aria-invalid', 'true'); else $(input).removeAttribute('aria-invalid');
    return bad;
  }
  [['firstName', 'f-first'], ['lastName', 'f-last'], ['phone', 'f-phone'], ['email', 'f-email']]
    .forEach(([input, box]) => $(input).addEventListener('input', () => setErr(box, input, false)));
  /* Date of birth: three plain boxes to type into (focus moves on once a box is
     full), plus an optional pop-up that asks decade, year, month and day with
     large buttons and fills the same boxes. Future dates cannot be chosen. */
  const DOB = ['dobD', 'dobM', 'dobY'];
  DOB.forEach((id, i) => $(id).addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '');
    setErr('f-dob', 'dobD', false);
    if (i < 2 && e.target.value.length === 2) $(DOB[i + 1]).focus();
  }));
  const dobDlg = $('dobDialog');
  const dob = { stage: 'decade', decade: null, y: null, m: null };
  function dobRender() {
    const now = new Date(), grid = $('dobGrid');
    grid.textContent = '';
    grid.className = 'dd-grid dd-' + dob.stage;
    const add = (label, pick, off, aria) => {
      const b = el('button', 'dd-opt', label);
      b.type = 'button'; b.disabled = Boolean(off);
      if (aria) b.setAttribute('aria-label', aria);
      b.addEventListener('click', pick);
      grid.appendChild(b);
    };
    const to = stage => { dob.stage = stage; dobRender(); const f = grid.querySelector('.dd-opt:not(:disabled)'); if (f) f.focus(); };
    if (dob.stage === 'decade') {
      $('dobStep').textContent = 'Which decade were you born in?';
      for (let d = 1920; d <= now.getFullYear(); d += 10) add(d + 's', () => { dob.decade = d; to('year'); });
    } else if (dob.stage === 'year') {
      $('dobStep').textContent = 'Which year?';
      for (let y = dob.decade; y < dob.decade + 10; y++) add(String(y), () => { dob.y = y; to('month'); }, y > now.getFullYear());
    } else if (dob.stage === 'month') {
      $('dobStep').textContent = 'Which month?';
      MONTHS.forEach((name, m) => add(name, () => { dob.m = m; to('day'); }, dob.y === now.getFullYear() && m > now.getMonth()));
    } else {
      $('dobStep').textContent = 'Which day?';
      const dim = new Date(dob.y, dob.m + 1, 0).getDate();
      for (let d = 1; d <= dim; d++) {
        add(String(d), () => {
          $('dobD').value = String(d).padStart(2, '0');
          $('dobM').value = String(dob.m + 1).padStart(2, '0');
          $('dobY').value = String(dob.y);
          setErr('f-dob', 'dobD', false);
          dobDlg.close();
        }, new Date(dob.y, dob.m, d) > now, d + ' ' + MONTHS[dob.m] + ' ' + dob.y);
      }
    }
    $('dobCrumb').textContent = dob.stage === 'decade' ? '' : dob.stage === 'year' ? dob.decade + 's'
      : dob.stage === 'month' ? String(dob.y) : MONTHS[dob.m] + ' ' + dob.y;
    $('dobBack').hidden = dob.stage === 'decade';
  }
  $('dobBtn').addEventListener('click', () => { dob.stage = 'decade'; dobRender(); dobDlg.showModal(); });
  $('dobClose').addEventListener('click', () => dobDlg.close());
  $('dobBack').addEventListener('click', () => {
    dob.stage = dob.stage === 'day' ? 'month' : dob.stage === 'month' ? 'year' : 'decade';
    dobRender();
  });
  dobDlg.addEventListener('click', e => { if (e.target === dobDlg) dobDlg.close(); }); /* press outside to close */

  function validateDetails() {
    let bad = false;
    bad = setErr('f-first', 'firstName', !$('firstName').value.trim()) || bad;
    bad = setErr('f-last', 'lastName', !$('lastName').value.trim()) || bad;
    const phone = $('phone').value.replace(/[\s()-]/g, '');
    bad = setErr('f-phone', 'phone', !/^(\+?64|0)2\d{7,9}$/.test(phone)) || bad;
    const email = $('email').value.trim();
    bad = setErr('f-email', 'email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || bad;
    /* Must be a real calendar date, not in the future. */
    const day = +$('dobD').value, mon = +$('dobM').value, yr = +$('dobY').value;
    let dobBad = !day || !mon || $('dobY').value.length !== 4 || yr < 1900;
    if (!dobBad) {
      const d = new Date(Date.UTC(yr, mon - 1, day));
      dobBad = d.getUTCFullYear() !== yr || d.getUTCMonth() !== mon - 1 || d.getUTCDate() !== day || d.getTime() > Date.now();
    }
    bad = setErr('f-dob', 'dobD', dobBad) || bad;
    if (bad) {
      const n = $('step3').querySelector('[data-notice]');
      n.textContent = 'Please check the boxes marked in red above.'; n.hidden = false;
      const first = document.querySelector('.field.err input');
      if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }
    state.name = $('firstName').value.trim() + ' ' + $('lastName').value.trim();
    state.email = email;
    state.phone = $('phone').value.trim();
    go(4);
  }
  $('detailsForm').addEventListener('submit', e => { e.preventDefault(); validateDetails(); });

  /* ---------- step 4 and 5 ---------- */
  function fillReview() {
    const s = byId(state.service);
    $('rvService').textContent = s.name + ', $' + s.price;
    $('rvServiceSub').textContent = s.sub;
    $('rvWhen').textContent = fmtDate(state.date) + ' at ' + state.time;
    $('rvName').textContent = state.name;
    let contact = state.phone + ' · ' + state.email;
    if (state.returning === 'yes') contact += ' · Returning patient';
    if (state.returning === 'no') contact += ' · New patient';
    $('rvContact').textContent = contact;
  }
  function confirmBooking() {
    const s = byId(state.service);
    $('cfLine').textContent = s.name + ' on ' + fmtDate(state.date) + ' at ' + state.time + ', ' + PLACE + '.';
    $('cfRef').textContent = 'Booking reference ' + REF_PREFIX + '-' + Math.floor(1000 + Math.random() * 9000);
    go(5);
  }

  /* ---------- QR handoff: carry the chosen service to a phone ---------- */
  function updateQR() {
    const box = $('qrBox');
    if (typeof QRCode === 'undefined') { $('qrCard').hidden = true; return; }
    const url = new URL(window.location.href.split('#')[0]);
    url.search = '';
    if (state.service) url.searchParams.set('service', state.service);
    box.textContent = '';
    new QRCode(box, { text: url.toString(), width: 160, height: 160, colorDark: '#111111', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  }

  /* ---------- delegated clicks ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('.js-cta')) { runCta(); return; }
    const t = e.target.closest('[data-go],[data-action]');
    if (!t) return;
    if (t.dataset.go) { go(Number(t.dataset.go)); return; }
    if (t.dataset.action === 'restart') window.location.href = window.location.pathname;
  });

  /* resume a scanned booking: ?service=<id> preselects the service */
  const pre = new URLSearchParams(window.location.search).get('service');
  if (pre && byId(pre)) pickService(pre, true);
  updateCta();
  updateQR();
})();
