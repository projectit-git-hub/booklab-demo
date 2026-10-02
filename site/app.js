/* Book Lab demonstration booking flow.
   Everything runs in the browser: availability is sample data and nothing the
   visitor types is sent anywhere (the CSP sets connect-src 'none' to enforce it).
   No inline handlers or style attributes, so the CSP needs no 'unsafe-inline'. */
(function () {
  'use strict';

  const SERVICES = [
    { id: 'full', name: 'Total body mole map and skin cancer check', flag: 'Most comprehensive', minutes: 40, price: 395,
      desc: 'High-resolution imaging of your whole skin surface, plus a full skin check with dermoscopy by one of our clinicians. Includes a visual report and patient portal access.',
      meta: 'Dermoscopy report included', sub: 'Mole map and dermoscopy · 40 minutes' },
    { id: 'map', name: 'Total body mole map', minutes: 20, price: 295,
      desc: 'A complete photographic record of your skin for you and your referring doctor, so changes can be tracked over time. Imaging only.',
      meta: 'Patient portal access', sub: 'Imaging only · 20 minutes' },
    { id: 'check', name: 'Full body skin check', minutes: 30, price: 165,
      desc: 'A head-to-toe skin examination with dermoscopy, a clear report and recommendations you can share with your GP.',
      meta: 'Dermoscopy report included', sub: 'Skin check with dermoscopy · 30 minutes' }
  ];
  const PLACE = 'Queenstown';
  const REF_PREFIX = 'DEMO';
  const BOOK_AHEAD_DAYS = 60;

  const $ = id => document.getElementById(id);
  const byId = id => SERVICES.find(s => s.id === id);
  const state = { service: null, date: null, time: null, returning: null, name: '', email: '', phone: '' };
  let curStep = 1;

  /* ---------- step 1: services ---------- */
  const CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  SERVICES.forEach(s => {
    const b = el('button', 'svc');
    b.type = 'button'; b.dataset.id = s.id; b.setAttribute('aria-pressed', 'false');
    const body = el('span', 'svc-body');
    if (s.flag) body.appendChild(el('span', 'svc-flag', s.flag));
    body.appendChild(el('span', 'svc-name', s.name));
    body.appendChild(el('span', 'svc-desc', s.desc));
    const meta = el('span', 'svc-meta');
    meta.appendChild(el('span', '', s.minutes + ' minutes'));
    meta.appendChild(el('span', '', s.meta));
    body.appendChild(meta);
    const side = el('span', 'svc-side');
    side.appendChild(el('span', 'svc-price', '$' + s.price));
    side.appendChild(el('span', 'svc-gst', 'incl. GST'));
    const check = el('span', 'svc-check'); check.setAttribute('aria-hidden', 'true'); check.innerHTML = CHECK;
    b.append(body, side, check);
    b.addEventListener('click', () => pickService(s.id));
    $('svcList').appendChild(b);
  });

  function setSum(id, text) { const e = $(id); e.textContent = text; e.classList.remove('empty'); }

  function pickService(id) {
    const s = byId(id);
    state.service = id;
    document.querySelectorAll('.svc').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.id === id)));
    setSum('sService', s.name);
    setSum('sDur', s.minutes + ' minutes');
    $('sPrice').textContent = '$' + s.price;
    $('slotDur').textContent = s.minutes + ' minute';
    $('chipService').textContent = s.name + ' · ' + s.minutes + ' minutes · $' + s.price;
    updateCta();
    updateQR();
  }

  /* ---------- next-step button (summary card on desktop, fixed bar on mobile) ---------- */
  function updateCta() {
    let label = '', go = '', action = '';
    if (curStep === 1) {
      if (!state.service) label = 'Choose a service to continue';
      else { label = 'Continue to date and time'; go = '2'; }
    } else if (curStep === 2) {
      if (!state.date) label = 'Choose a day to continue';
      else if (!state.time) label = 'Choose a time to continue';
      else { label = 'Continue to your details'; go = '3'; }
    } else if (curStep === 3) { label = 'Review booking'; action = 'review'; }
    else { label = 'Confirm my booking'; action = 'confirm'; }
    const enabled = Boolean(go || action);
    document.querySelectorAll('.js-cta').forEach(b => {
      delete b.dataset.go; delete b.dataset.action;
      if (go) b.dataset.go = go;
      if (action) b.dataset.action = action;
      b.disabled = !enabled;
      const short = b.closest('.action-bar');
      b.textContent = short ? (curStep === 3 ? 'Review' : curStep === 4 ? 'Confirm booking' : 'Continue') : label;
    });
    const bar = $('barSummary');
    bar.textContent = '';
    if (!state.service) { bar.textContent = 'Choose a service'; return; }
    const s = byId(state.service);
    bar.appendChild(el('strong', '', s.name + ' · $' + s.price));
    bar.appendChild(document.createTextNode(
      state.date && state.time ? fmtShort(state.date) + ' at ' + state.time
        : state.date ? 'Choose a time' : curStep === 1 ? s.minutes + ' minutes' : 'Choose a day'));
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
    ['progress', 'summaryCard', 'pageHead', 'actionBar'].forEach(id => { $(id).hidden = done; });
    $('cols').classList.toggle('done', done);
    updateCta();
    window.scrollTo({ top: 0 });
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
      b.setAttribute('aria-label', fmtDate(date) + (open ? ', times available' : ', unavailable'));
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

  function pickDate(date) {
    state.date = date; state.time = null;
    setSum('sDate', fmtDate(date));
    $('sTime').textContent = 'Pick a time'; $('sTime').classList.add('empty');
    $('calHint').textContent = 'Now choose a time';
    renderCal(); renderSlots(date); updateCta();
    setTimeout(() => $('slots').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
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
        b.addEventListener('click', () => {
          document.querySelectorAll('.slot').forEach(x => x.setAttribute('aria-pressed', 'false'));
          b.setAttribute('aria-pressed', 'true');
          state.time = t;
          setSum('sTime', t);
          $('chipWhen').textContent = fmtDate(state.date) + ' at ' + t;
          updateCta();
        });
        host.appendChild(b);
      });
      if (!list.length) host.appendChild(el('span', 'slots-empty', emptyText));
    };
    build(s.am, $('slotsAM'), 'No morning times left on this day');
    build(s.pm, $('slotsPM'), date.getDay() === 6 ? 'The clinic closes at midday on Saturdays' : 'No afternoon times left on this day');
  }
  renderCal();

  /* ---------- step 3: details ---------- */
  ['retYes', 'retNo'].forEach(id => $(id).addEventListener('click', () => {
    state.returning = id === 'retYes' ? 'yes' : 'no';
    $('retYes').setAttribute('aria-pressed', String(id === 'retYes'));
    $('retNo').setAttribute('aria-pressed', String(id === 'retNo'));
  }));
  $('dob').addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 8);
    e.target.value = d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4)
      : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  });
  $('notes').addEventListener('input', e => { $('notesCount').textContent = e.target.value.length + ' of 500 characters'; });

  function setErr(box, input, bad) {
    $(box).classList.toggle('err', bad);
    if (bad) $(input).setAttribute('aria-invalid', 'true'); else $(input).removeAttribute('aria-invalid');
    return bad;
  }
  [['firstName', 'f-first'], ['lastName', 'f-last'], ['phone', 'f-phone'], ['email', 'f-email'], ['dob', 'f-dob']]
    .forEach(([input, box]) => $(input).addEventListener('input', () => setErr(box, input, false)));

  function validateDetails() {
    let bad = false;
    bad = setErr('f-first', 'firstName', !$('firstName').value.trim()) || bad;
    bad = setErr('f-last', 'lastName', !$('lastName').value.trim()) || bad;
    const phone = $('phone').value.replace(/[\s()-]/g, '');
    bad = setErr('f-phone', 'phone', !/^(\+?64|0)2\d{7,9}$/.test(phone)) || bad;
    const email = $('email').value.trim();
    bad = setErr('f-email', 'email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || bad;
    /* DD/MM/YYYY (NZ convention): must be a real calendar date, not in the future. */
    const dd = $('dob').value.replace(/\D/g, '');
    const day = +dd.slice(0, 2), mon = +dd.slice(2, 4), yr = +dd.slice(4, 8);
    let dobBad = dd.length !== 8 || yr < 1900;
    if (!dobBad) {
      const d = new Date(Date.UTC(yr, mon - 1, day));
      dobBad = d.getUTCFullYear() !== yr || d.getUTCMonth() !== mon - 1 || d.getUTCDate() !== day || d.getTime() > Date.now();
    }
    bad = setErr('f-dob', 'dob', dobBad) || bad;
    if (bad) { const first = document.querySelector('.field.err input'); if (first) first.focus(); return; }
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

  /* ---------- delegated clicks (data-go / data-action) ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-action]');
    if (!t || t.disabled) return;
    if (t.dataset.go) { go(Number(t.dataset.go)); return; }
    if (t.dataset.action === 'review') { validateDetails(); return; }
    if (t.dataset.action === 'confirm') { confirmBooking(); return; }
    if (t.dataset.action === 'restart') { window.location.href = window.location.pathname; }
  });

  /* resume a scanned booking: ?service=<id> preselects the service */
  const pre = new URLSearchParams(window.location.search).get('service');
  if (pre && byId(pre)) pickService(pre);
  updateCta();
  updateQR();
})();
