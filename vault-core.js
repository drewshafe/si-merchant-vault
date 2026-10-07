// vault-core.js — Merchant Vault shared core: room template, renderer, viewers,
// modals and the Supabase data layer. Used by index.html (rep studio, edit mode)
// and v.html (merchant view, live mode).
(function () {
  'use strict';

  const BASE = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*([?#].*)?$/, '');
  const ASSET = n => BASE + 'assets/' + n;
  const SB_URL = 'https://oiljklutlmtztascnkpm.supabase.co';
  const SB_KEY = 'sb_publishable_DTbJR5CxMe6wFYKKhogEtQ_XJyp4nMs';
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // ── Helpers ─────────────────────────────────────────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const uid = p => (p || '') + Math.random().toString(36).slice(2, 9);
  const clone = o => JSON.parse(JSON.stringify(o));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parseISO = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const fmtShort = iso => { const d = parseISO(iso); return d ? MONTHS[d.getMonth()] + ' ' + d.getDate() : ''; };
  const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; };
  const fmtMeeting = iso => { const d = parseISO(iso); return d ? MONTHS[d.getMonth()] + ' ' + d.getDate() + '<sup>' + ordinal(d.getDate()) + '</sup>, ' + d.getFullYear() : ''; };
  const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const initials = s => String(s || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const set = (o, path, val) => { const ks = path.split('.'); let a = o; ks.slice(0, -1).forEach(k => { if (a[k] == null) a[k] = {}; a = a[k]; }); a[ks[ks.length - 1]] = val; };
  // contenteditable="plaintext-only" where supported (Chrome/Safari/Firefox 136+), else plain "true" + paste-as-text.
  const CE = (() => { try { const d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true'; } catch (e) { return 'true'; } })();
  const photoSrc = p => !p ? DEFAULT_AVATAR : (p[0] === '@' ? ASSET(p.slice(1) + '.jpg') : p);

  // Sky-and-hills placeholder avatar (matches the mockup's empty people)
  const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3fb"/><stop offset="1" stop-color="#eaf6ff"/></linearGradient></defs>' +
    '<rect width="100" height="100" fill="url(#s)"/><g fill="#fff"><circle cx="38" cy="30" r="9"/><circle cx="49" cy="25" r="11"/><circle cx="60" cy="31" r="8"/><rect x="30" y="29" width="38" height="10" rx="5"/></g>' +
    '<path d="M0 72 Q30 56 58 66 T100 62 V100 H0Z" fill="#8cc63f"/><path d="M0 84 Q40 70 100 80 V100 H0Z" fill="#5aa832"/></svg>');

  // ── Icons (24×24 stroke) ────────────────────────────────────────────────
  const P = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IC = {
    eye: P('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>'),
    down: P('<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>'),
    phone: P('<path d="M21 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 4.2 2 2 0 0 1 3.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L7.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.8 2z"/>'),
    mail: P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/><path d="M3 19l7-6M21 19l-7-6"/>'),
    flag: P('<path d="M5.5 21V3.5"/><path d="M5.5 4.5c2.2-1.3 4.4-1.3 6.6 0s4.4 1.3 6.4 0v8.2c-2 1.3-4.2 1.3-6.4 0s-4.4-1.3-6.6 0"/>'),
    clip: P('<path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/>'),
    left: P('<path d="M15 5l-7 7 7 7"/>'), right: P('<path d="M9 5l7 7-7 7"/>'),
    chev: P('<path d="M6 9l6 6 6-6"/>'),
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    pencil: P('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
    trash: P('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    ext: P('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
    image: P('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
    dots: P('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'),
    up: P('<path d="M6 15l6-6 6 6"/>'), dn: P('<path d="M6 9l6 6 6-6"/>')
  };

  // ── People ──────────────────────────────────────────────────────────────
  // Emails follow the shipinsure.io first-name pattern (Mosie's roster) — reps can edit per vault.
  const REPS = [
    { key: 'drew',   name: 'Drew Shafer',    title: 'eCommerce Partnerships',          email: 'drew@shipinsure.io',   photo: '@drew' },
    { key: 'morgan', name: 'Morgan Hirschi', title: 'Senior Merchant Success Manager', email: 'morgan@shipinsure.io', photo: '' },
    { key: 'jason',  name: 'Jason Kizerian', title: 'Merchant Partnerships',           email: 'jason@shipinsure.io',  photo: '' },
    { key: 'wyatt',  name: 'Wyatt Branch',   title: 'Merchant Partnerships',           email: 'wyatt@shipinsure.io',  photo: '' },
    { key: 'corbin', name: 'Corbin Ekblad',  title: 'Merchant Partnerships',           email: 'corbin@shipinsure.io', photo: '' },
    { key: 'noah',   name: 'Noah Bump',      title: 'Customer Success',                email: 'noah@shipinsure.io',   photo: '' }
  ];
  const person = (p) => Object.assign({ id: uid('p'), name: '', title: '', email: '', phone: '', photo: '' }, p || {});
  const repPerson = key => { const r = REPS.find(x => x.key === key); return r ? person({ name: r.name, title: r.title, email: r.email, photo: r.photo }) : person(); };

  // ── Action-plan templates (from Mosie's import of the Aligned rooms) ─────
  const step = (text, owner, extra) => Object.assign({ id: uid('s'), text: text, owner: owner || 'si', done: false, doneAt: '', doneBy: '', due: '', flag: false, link: '' }, extra || {});
  const stage = (name, steps, open) => ({ id: uid('g'), name: name, open: open !== false, steps: steps });
  const PARTNERS = ['DigitalGenius — $200 (AI chat)', 'Faver — $200 (wishlists)', 'Fuego — $200 (mobile app)', 'Gorgias — $100 (help desk)', 'iDrive — $100 (logistics)', 'Passport (Global-e) — $200 (logistics)', 'Richpanel — $100 (help desk)', 'ShipBob — $100 (logistics)', 'Skio — $100 (subscriptions)', 'Stay AI — $100 (subscriptions)', 'Tapcart — $100 (mobile app)', 'Treet — $100 (resell)', 'Hawke Media — $200 for demo session (agency)'];
  const LIB = () => window.MV_LIB || { install: [], billing: [], examples: [], reviews: [] };
  const installUrl = platform => { const i = LIB().install; const x = i.find(p => p.key === platform) || i[0]; return x ? x.url : ''; };
  const PLANS = {
    sales: { label: 'Sales — Discovery → Install', build: o => ({ title: 'Our ShipInsure Action Plan', stages: [
      stage('Discovery', [step('See product demo & share metrics', 'merchant', { flag: true }), step('Schedule next session', 'si'), step('Review Content: File Share Section', 'merchant')]),
      stage('Testing / Moving Forward', [step('Install ShipInsure app', 'merchant', { flag: true, link: installUrl(o.platform) }), step('Reviewed staging & onboarding completed', 'merchant'), step('Kickoff call with CSM', 'si', { flag: true }), step('Go-Live Date', 'si', { flag: true })]),
      stage('See Paid Partner Demos - LET ' + (o.repFirst || 'US').toUpperCase() + " KNOW IF YOU'D LIKE AN INTRO!", PARTNERS.map(p => step(p, 'merchant')), false)
    ] }) },
    vet: { label: 'Vet competitors → Install', build: o => ({ title: 'Next Steps', stages: [
      stage('Vet Competitors', [step('See demos with ShipInsure and others', 'merchant'), step('Compare ROI and features', 'merchant'), step('Make a decision', 'merchant')]),
      stage('Install', [step('Install ShipInsure app', 'merchant', { link: installUrl(o.platform) }), step('Staging review', 'si'), step('Go live with ShipInsure', 'si')])
    ] }) },
    onboarding: { label: 'Customer onboarding', build: o => ({ title: 'Onboarding Plan', stages: [
      stage('Welcome & tech call', [step('Customer journey walkthrough', 'si'), step('Claim process and policies', 'si'), step('Billing / reimbursement process', 'merchant')]),
      stage('Go live', [step('Portal overview', 'si'), step('3PL / ERP and fulfillment flow', 'merchant'), step('Test order', 'merchant')])
    ] }) },
    blank: { label: 'Blank plan', build: o => ({ title: 'Our ShipInsure Action Plan', stages: [stage('Next steps', [])] }) }
  };

  // Next Steps buttons. action 'panel' swaps the right-hand panel (the selected one turns gradient);
  // 'link' opens a URL, 'question' opens the ask box, 'deck' opens the deck full screen.
  const PANELS = { plan: 'Action plan', roi: 'ROI calculator', install: 'Install ShipInsure', examples: 'Live examples & case studies', billing: 'Billing explained + How a claim works', reviews: 'Merchant reviews' };
  const DARK_PANELS = { install: 1, examples: 1, billing: 1, reviews: 1 };
  const DEFAULT_BUTTONS = () => [
    { id: uid('b'), label: 'See Action Plan', action: 'panel', panel: 'plan', url: '', style: 'solid' },
    { id: uid('b'), label: 'ROI', action: 'panel', panel: 'roi', url: '', style: 'roi' },
    { id: uid('b'), label: 'Install ShipInsure', action: 'panel', panel: 'install', url: '', style: 'solid' },
    { id: uid('b'), label: 'Examples / Case Studies', action: 'panel', panel: 'examples', url: '', style: 'outline' },
    { id: uid('b'), label: 'Billing & Backend Flows', action: 'panel', panel: 'billing', url: '', style: 'outline' },
    { id: uid('b'), label: 'Merchant Reviews', action: 'panel', panel: 'reviews', url: '', style: 'outline' },
    { id: uid('b'), label: 'I have a question', action: 'question', url: '', style: 'outline' }
  ];

  // Bring older vault data up to the current shape (safe to run repeatedly).
  function normalize(v) {
    if (!v) return v;
    if (!v.install) v.install = { platform: 'shopify', image: '' };
    (v.buttons || []).forEach(b => {
      if (b.action === 'panel') return;
      const L = String(b.label || '').toLowerCase();
      let p = null;
      if (b.action === 'plan') p = 'plan';
      else if (b.action === 'link' && b.style === 'roi') p = 'roi';
      else if (b.action === 'link' && !(b.url && b.url.trim())) {
        if (/install/.test(L)) p = 'install'; else if (/example|case stud/.test(L)) p = 'examples';
        else if (/billing|backend/.test(L)) p = 'billing'; else if (/review/.test(L)) p = 'reviews';
      }
      if (p) { b.action = 'panel'; b.panel = p; if (p === 'plan' && b.style === 'gradient') b.style = 'solid'; }
    });
    return v;
  }
  const roiButton = v => (v.buttons || []).find(b => b.action === 'panel' && b.panel === 'roi');
  const buttonAvailable = (b, v) => {
    if (b.action === 'link') return !!(b.url && b.url.trim());
    if (b.action === 'panel' && b.panel === 'roi') return !!(b.url && b.url.trim());
    if (b.action === 'deck') return classify(v.deck || {}).kind !== 'empty';
    return true;
  };

  function template(o) {
    o = o || {};
    const me = o.rep || 'drew';
    const rep = REPS.find(r => r.key === me);
    const platform = o.platform || 'shopify';
    return {
      v: 1,
      merchant: { name: o.merchant || '', logo: o.logo || '', domain: o.domain || '' },
      cover: '',
      meeting: o.meeting || '',
      welcome: {
        heading: "Welcome, let's deliver something great together 📦",
        body: 'This is your fast lane to happier customers and zero extra work.\n\nShoppers opt into ShipInsure at checkout, get protected, and resolve claims in ~60 seconds — choosing a reorder or refund. We respond in under an hour and close most cases in under 24 hours.'
      },
      team: { si: [repPerson(me), repPerson(me === 'morgan' ? 'drew' : 'morgan')], merchant: [person(), person()] },
      deck: { label: 'Demo Deck', src: '', kind: '', name: '', download: true },
      designs: { label: 'Designs & Flows', items: [
        { id: uid('d'), label: 'Cart & Checkout', tag: 'Mockups', src: '', kind: '', name: '', download: true },
        { id: uid('d'), label: 'Customer Email → Claim', tag: 'Experience', src: '', kind: '', name: '', download: false }
      ] },
      buttons: DEFAULT_BUTTONS(),
      plan: (PLANS[o.plan] || PLANS.sales).build({ repFirst: rep ? rep.name.split(' ')[0] : '', platform: platform }),
      install: { platform: platform, image: '' },
      settings: { access: 'link' }
    };
  }

  // Apply a rep's saved defaults (team, buttons, welcome copy) to a fresh template.
  function withDefaults(v, d) {
    if (!d) return v;
    if (d.welcome) v.welcome = clone(d.welcome);
    if (d.teamSi && d.teamSi.length) v.team.si = d.teamSi.map(p => person(Object.assign({}, p, { id: uid('p') })));
    if (d.buttons && d.buttons.length) v.buttons = d.buttons.map(b => Object.assign({}, b, { id: uid('b') }));
    if (d.cover) v.cover = d.cover;
    return v;
  }

  // ── Plan maths + ops (ops are replayed on the latest server copy before a merchant save) ──
  function planStats(plan) {
    let n = 0, d = 0;
    (plan && plan.stages || []).forEach(g => g.steps.forEach(s => { n++; if (s.done) d++; }));
    return { n: n, d: d, pct: n ? Math.round(d / n * 100) : 0 };
  }
  function findStep(plan, id) {
    for (const g of (plan && plan.stages) || []) { const s = g.steps.find(x => x.id === id); if (s) return { g: g, s: s }; }
    return null;
  }
  function applyPlanOp(plan, op) {
    if (!plan || !op) return false;
    if (op.op === 'add') {
      const g = plan.stages.find(x => x.id === op.stage) || plan.stages[plan.stages.length - 1];
      if (!g || findStep(plan, op.step.id)) return false;
      g.steps.push(op.step); return true;
    }
    if (op.op === 'stage') { const g = plan.stages.find(x => x.id === op.stage); if (g) g.open = op.open; return !!g; }
    const f = findStep(plan, op.id); if (!f) return false;
    if (op.op === 'check') { f.s.done = op.done; f.s.doneAt = op.done ? (op.at || todayISO()) : ''; f.s.doneBy = op.done ? (op.by || '') : ''; }
    else if (op.op === 'date') f.s.due = op.due || '';
    else if (op.op === 'flag') f.s.flag = !!op.flag;
    return true;
  }

  // ── Media classification (deck + designs) ───────────────────────────────
  function embedUrl(u) {
    let m;
    if ((m = /canva\.com\/design\/([^/]+)\/([^/?#]+)/i.exec(u))) return 'https://www.canva.com/design/' + m[1] + '/' + m[2] + '/view?embed';
    if ((m = /docs\.google\.com\/presentation\/d\/([^/?#]+)/i.exec(u))) return 'https://docs.google.com/presentation/d/' + m[1] + '/embed?start=false&loop=false';
    if ((m = /docs\.google\.com\/(document|spreadsheets)\/d\/([^/?#]+)/i.exec(u))) return 'https://docs.google.com/' + m[1] + '/d/' + m[2] + '/preview';
    if ((m = /drive\.google\.com\/file\/d\/([^/?#]+)/i.exec(u))) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
    if ((m = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i.exec(u))) return 'https://www.youtube.com/embed/' + m[1];
    if ((m = /loom\.com\/share\/([\w]+)/i.exec(u))) return 'https://www.loom.com/embed/' + m[1];
    if ((m = /vimeo\.com\/(\d+)/i.exec(u))) return 'https://player.vimeo.com/video/' + m[1];
    if (/figma\.com\/(file|design|proto)\//i.test(u)) return 'https://www.figma.com/embed?embed_host=share&url=' + encodeURIComponent(u);
    return u;
  }
  function classify(item) {
    const src = String(item && item.src || '').trim();
    if (!src) return { kind: 'empty' };
    if (item.kind === 'pdf' || item.kind === 'image') return { kind: item.kind, src: src };
    const path = src.split(/[?#]/)[0];
    if (/^data:application\/pdf/i.test(src) || /\.pdf$/i.test(path)) return { kind: 'pdf', src: src };
    if (/^data:image\//i.test(src) || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(path)) return { kind: 'image', src: src };
    return { kind: 'embed', src: embedUrl(src), raw: src };
  }
  function downloadHref(item) {
    const c = classify(item);
    if (c.kind !== 'pdf' && c.kind !== 'image') return '';
    if (c.src.indexOf(SB_URL + '/storage/') === 0) return c.src + (c.src.indexOf('?') < 0 ? '?' : '&') + 'download=' + encodeURIComponent(item.name || 'file');
    return c.src;
  }

  // ── PDF.js viewer ───────────────────────────────────────────────────────
  let _pdfjs = null;
  function pdfjs() {
    if (!_pdfjs) _pdfjs = new Promise((res, rej) => {
      if (window.pdfjsLib) return res(window.pdfjsLib);
      const s = document.createElement('script'); s.src = PDFJS;
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; res(window.pdfjsLib); };
      s.onerror = () => rej(new Error('PDF viewer failed to load'));
      document.head.appendChild(s);
    });
    return _pdfjs;
  }
  const _docs = {}, _page = {};
  function loadPdf(src) { if (!_docs[src]) _docs[src] = pdfjs().then(lib => lib.getDocument({ url: src }).promise); _docs[src].catch(() => { delete _docs[src]; }); return _docs[src]; }

  // Mount a viewer for a deck/design item into `el` (an .mv-viewer). Returns a cleanup fn.
  function mountViewer(el, item, opts) {
    opts = opts || {};
    const c = classify(item);
    el.className = 'mv-viewer' + (c.kind === 'empty' ? ' is-empty' : '');
    if (c.kind === 'empty') { el.innerHTML = opts.emptyHtml || ''; return () => {}; }
    if (c.kind === 'image') { el.innerHTML = '<img alt="' + esc(item.name || item.label || '') + '" src="' + esc(c.src) + '">'; return () => {}; }
    if (c.kind === 'embed') {
      el.innerHTML = '<iframe src="' + esc(c.src) + '" allow="autoplay; fullscreen; clipboard-write" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
        '<a class="mv-open-ext" href="' + esc(c.raw || c.src) + '" target="_blank" rel="noopener">Open ↗</a>';
      return () => {};
    }
    // PDF
    el.innerHTML = '<div class="mv-loading">Loading…</div>';
    let doc = null, task = null, alive = true, ro = null, t = 0;
    const key = c.src;
    const draw = () => {
      if (!alive || !doc) return;
      const n = Math.min(Math.max(1, _page[key] || 1), doc.numPages);
      _page[key] = n;
      doc.getPage(n).then(pg => {
        if (!alive) return;
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        const base = pg.getViewport({ scale: 1 });
        const fit = Math.min(w / base.width, h / base.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const vp = pg.getViewport({ scale: fit * dpr });
        let cv = el.querySelector('canvas');
        if (!cv) {
          el.innerHTML = '<canvas></canvas>' +
            '<button class="mv-nav prev" aria-label="Previous page">' + IC.left + '</button>' +
            '<button class="mv-nav next" aria-label="Next page">' + IC.right + '</button>' +
            '<span class="mv-pageno"></span>';
          cv = el.querySelector('canvas');
          el.querySelector('.prev').onclick = e => { e.stopPropagation(); go(-1); };
          el.querySelector('.next').onclick = e => { e.stopPropagation(); go(1); };
        }
        cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
        cv.style.width = Math.floor(vp.width / dpr) + 'px'; cv.style.height = Math.floor(vp.height / dpr) + 'px';
        if (task) { try { task.cancel(); } catch (e) {} }
        task = pg.render({ canvasContext: cv.getContext('2d'), viewport: vp });
        task.promise.catch(() => {});
        const pn = el.querySelector('.mv-pageno'); if (pn) pn.textContent = n + ' / ' + doc.numPages;
        el.querySelector('.prev').style.visibility = n > 1 ? '' : 'hidden';
        el.querySelector('.next').style.visibility = n < doc.numPages ? '' : 'hidden';
      });
    };
    const go = d => {
      if (!doc) return;
      const n = Math.min(Math.max(1, (_page[key] || 1) + d), doc.numPages);
      if (n === _page[key]) return;
      _page[key] = n; draw();
      if (opts.onPage) opts.onPage(n, doc.numPages);
    };
    el.tabIndex = 0;
    el.onkeydown = e => { if (e.key === 'ArrowRight') { go(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); } };
    loadPdf(c.src).then(d => { doc = d; draw(); })
      .catch(() => {
        if (!alive) return;
        // Cross-origin PDFs without CORS: fall back to the browser's own viewer.
        el.innerHTML = '<iframe src="' + esc(c.src) + '#view=FitH" loading="lazy"></iframe><a class="mv-open-ext" href="' + esc(c.src) + '" target="_blank" rel="noopener">Open ↗</a>';
      });
    if (window.ResizeObserver) { ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(draw, 120); }); ro.observe(el); }
    return () => { alive = false; if (ro) ro.disconnect(); if (task) { try { task.cancel(); } catch (e) {} } };
  }

  // ── Modal form, lightbox, toast ─────────────────────────────────────────
  function toast(msg, ms) {
    let t = document.querySelector('.mv-toast');
    if (!t) { t = document.createElement('div'); t.className = 'mv-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }

  // form({title, text, fields:[{key,label,type,options,placeholder,accept,upload}], values, submit, danger}) → Promise<values|'__delete'|null>
  function form(o) {
    // Blur the trigger so Enter can't re-click it and stack a second dialog.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (document.querySelector('.mv-modal-back')) return Promise.resolve(null);   // never stack dialogs
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'mv-modal-back';
      const vals = Object.assign({}, o.values || {});
      const fieldHtml = f => {
        const v = vals[f.key] == null ? '' : vals[f.key];
        const id = 'mvf-' + f.key;
        if (f.type === 'note') return '<p style="margin:8px 0 0;font-size:13px;">' + f.html + '</p>';
        let input;
        if (f.type === 'textarea') input = '<textarea id="' + id + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(v) + '</textarea>';
        else if (f.type === 'select') input = '<select id="' + id + '">' + f.options.map(op => '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(v) ? ' selected' : '') + '>' + esc(op[1]) + '</option>').join('') + '</select>';
        else if (f.type === 'checkbox') return '<label style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:14px;color:inherit;font-weight:600;margin-top:12px;"><input type="checkbox" id="' + id + '" style="width:auto"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
        else if (f.type === 'file') input = '<div style="display:flex;gap:6px;"><input id="' + id + '" value="' + esc(v) + '" placeholder="' + esc(f.placeholder || 'Paste a link, or upload →') + '"><button type="button" class="mv-mbtn" data-up="' + f.key + '" style="flex-shrink:0;">Upload</button><input type="file" data-file="' + f.key + '" accept="' + esc(f.accept || '') + '" hidden></div><div class="mv-up-status" data-st="' + f.key + '" style="font-size:12px;color:#6b7090;margin-top:4px;"></div>';
        else input = '<input id="' + id + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(f.placeholder || '') + '">';
        return '<label for="' + id + '">' + esc(f.label) + '</label>' + input;
      };
      back.innerHTML = '<form class="mv-modal" novalidate>' +
        '<h4>' + esc(o.title || '') + '</h4>' + (o.text ? '<p>' + o.text + '</p>' : '') +
        (o.fields || []).map(fieldHtml).join('') +
        '<div class="mv-modal-actions">' +
        (o.danger ? '<button type="button" class="mv-mbtn" data-del style="margin-right:auto;color:#c0392b;border-color:#f1c6c0;">' + esc(o.danger) + '</button>' : '') +
        (o.noCancel ? '' : '<button type="button" class="mv-mbtn" data-cancel>Cancel</button>') +
        '<button type="submit" class="mv-mbtn is-primary">' + esc(o.submit || 'Save') + '</button></div></form>';
      document.body.appendChild(back);
      const fm = back.querySelector('form');
      const close = r => { back.remove(); document.removeEventListener('keydown', onKey); resolve(r); };
      const onKey = e => { if (e.key === 'Escape' && !o.noCancel) close(null); };
      document.addEventListener('keydown', onKey);
      back.addEventListener('mousedown', e => { if (e.target === back && !o.noCancel) close(null); });
      const cancel = back.querySelector('[data-cancel]'); if (cancel) cancel.onclick = () => close(null);
      const del = back.querySelector('[data-del]'); if (del) del.onclick = () => { if (confirm('Remove this?')) close('__delete'); };
      back.querySelectorAll('[data-up]').forEach(b => {
        const key = b.dataset.up, f = o.fields.find(x => x.key === key);
        const fileIn = back.querySelector('[data-file="' + key + '"]');
        const st = back.querySelector('[data-st="' + key + '"]');
        b.onclick = () => fileIn.click();
        fileIn.onchange = async () => {
          const file = fileIn.files && fileIn.files[0]; if (!file || !f.upload) return;
          st.textContent = 'Uploading ' + file.name + '…'; b.disabled = true;
          try {
            const url = await f.upload(file);
            back.querySelector('#mvf-' + key).value = url;
            vals['__name_' + key] = file.name;
            vals['__kind_' + key] = /pdf/i.test(file.type) ? 'pdf' : (/^image\//.test(file.type) ? 'image' : '');
            st.textContent = '✓ ' + file.name;
          } catch (e) { st.textContent = '⚠ ' + (e && e.message || e); }
          b.disabled = false;
        };
      });
      (o.fields || []).forEach(f => {
        if (f.type !== 'select' || !f.fill) return;
        const sel = back.querySelector('#mvf-' + f.key);
        sel.addEventListener('change', () => {
          const vals2 = f.fill(sel.value) || {};
          Object.keys(vals2).forEach(k => { const el = back.querySelector('#mvf-' + k); if (el) el.value = vals2[k]; });
        });
      });
      fm.onsubmit = e => {
        e.preventDefault();
        const out = Object.assign({}, vals);
        for (const f of (o.fields || [])) {
          if (f.type === 'note') continue;
          const el = back.querySelector('#mvf-' + f.key);
          out[f.key] = f.type === 'checkbox' ? el.checked : el.value.trim();
          if (f.required && !out[f.key]) { el.focus(); el.style.borderColor = '#e2574c'; return; }
          if (f.type === 'email' && out[f.key] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out[f.key])) { el.focus(); el.style.borderColor = '#e2574c'; return; }
        }
        close(out);
      };
      const first = back.querySelector('input:not([type=hidden]):not([type=file]), textarea, select');
      if (first) { first.focus(); setTimeout(() => { if (back.isConnected && !back.contains(document.activeElement)) first.focus(); }, 30); }
    });
  }

  function lightbox(item, opts) {
    opts = opts || {};
    const back = document.createElement('div');
    back.className = 'mv-lightbox';
    const dl = item.download !== false ? downloadHref(item) : '';
    const c = classify(item);
    back.innerHTML = '<div class="mv-lightbox-bar"><span>' + esc(item.label || item.name || '') + '</span>' +
      (dl ? '<a href="' + esc(dl) + '" download target="_blank" rel="noopener" data-dl>Download</a>' : '') +
      (c.kind !== 'empty' ? '<a href="' + esc(c.raw || c.src) + '" target="_blank" rel="noopener">Open in new tab ↗</a>' : '') +
      '<button type="button" data-close>Close ✕</button></div><div class="mv-lightbox-stage"><div class="mv-viewer"></div></div>';
    document.body.appendChild(back);
    let cleanup = () => {};
    if (opts.tall) back.querySelector('.mv-lightbox-stage').innerHTML = '<div class="mv-tallimg"><img alt="" src="' + esc(item.src) + '"></div>';
    else cleanup = mountViewer(back.querySelector('.mv-viewer'), item, opts);
    const onKey = e => { if (e.key === 'Escape') close(); };
    const close = () => { cleanup(); back.remove(); document.removeEventListener('keydown', onKey); };
    back.querySelector('[data-close]').onclick = close;
    const dlA = back.querySelector('[data-dl]'); if (dlA && opts.onDownload) dlA.addEventListener('click', opts.onDownload);
    document.addEventListener('keydown', onKey);
    setTimeout(() => { const v = back.querySelector('.mv-viewer'); if (v) v.focus(); }, 50);
  }

  // ── Renderer ────────────────────────────────────────────────────────────
  // ctx: { mode:'edit'|'live', canPlan, canTeam, onChange(kind, info), upload(file), track(kind, detail),
  //        who(): {name,email}, editLinks? }
  function render(root, vault, ctx) {
    const st = root._mv || (root._mv = { design: 0, panel: (ctx.panel && PANELS[ctx.panel]) ? ctx.panel : 'plan', cleanups: {}, seen: {} });
    st.vault = normalize(vault); st.ctx = ctx;
    const edit = ctx.mode === 'edit';
    root.innerHTML = '<div class="mv-host"><div class="mv' + (edit ? ' is-edit' : '') + '">' +
      '<header data-part="head"></header>' +
      '<section class="mv-hero"><div data-part="welcome"></div><div data-part="team" class="mv-team-wrap"></div><div data-part="deck" class="mv-sec is-deck"></div><div data-part="designs" class="mv-sec is-designs"></div></section>' +
      '<section class="mv-bottom"><div data-part="steps"></div><div data-part="plan"></div></section>' +
      '</div></div>';
    ['head', 'welcome', 'team', 'deck', 'designs', 'steps', 'plan'].forEach(p => part(root, p));
    if (!root._mvBound) { bind(root); root._mvBound = true; }
    if (!edit) observeSections(root);
  }

  const v_ = root => root._mv.vault;
  const merchantName = v => (v.merchant && v.merchant.name) || '';

  function part(root, name) {
    const st = root._mv, v = st.vault, ctx = st.ctx, edit = ctx.mode === 'edit';
    const el = root.querySelector('[data-part="' + name + '"]');
    if (!el) return;
    if (st.cleanups[name]) { st.cleanups[name](); delete st.cleanups[name]; }
    const ce = (path, cls, text, ph) => edit
      ? '<span class="' + cls + '" contenteditable="' + CE + '" spellcheck="false" data-edit="' + path + '" data-ph="' + esc(ph || '') + '">' + esc(text) + '</span>'
      : '<span class="' + cls + '">' + esc(text) + '</span>';
    const chip = (act, label, extra) => edit ? '<button type="button" class="mv-chip" data-act="' + act + '"' + (extra || '') + '>' + IC.pencil + '<span>' + esc(label) + '</span></button>' : '';

    if (name === 'head') {
      const cover = v.cover || ASSET('vault-cover.jpg');
      const m = v.merchant || {};
      const mLogo = m.logo
        ? '<div class="mv-circle mv-merchant-logo"' + (edit ? ' data-act="merchant-edit" title="Merchant logo"' : '') + '><img alt="' + esc(m.name) + '" src="' + esc(m.logo) + '"></div>'
        : '<div class="mv-circle mv-merchant-logo is-mono"' + (edit ? ' data-act="merchant-edit" title="Add merchant logo"' : '') + '><span class="mv-monogram">' + esc(m.name ? initials(m.name) : '+') + '</span></div>';
      const meet = v.meeting
        ? '<span class="mv-meet-val">' + fmtMeeting(v.meeting) + '</span>'
        : '<span class="mv-meet-val is-empty">Set a date</span>';
      el.innerHTML =
        '<div class="mv-cover" style="background-image:url(\'' + esc(cover).replace(/'/g, '%27') + '\')">' + chip('cover-edit', 'Cover') + '</div>' +
        '<div class="mv-band"><h1 class="mv-title">ShipInsure<span class="mv-sep">&lt;&gt;</span>' +
        (edit ? '<span class="mv-mname' + (m.name ? '' : ' is-empty') + '" contenteditable="' + CE + '" spellcheck="false" data-edit="merchant.name" data-ph="[merchant_name]">' + esc(m.name || '') + '</span>'
              : '<span class="mv-mname">' + esc(m.name || '') + '</span>') +
        '</h1><div class="mv-logos"><div class="mv-circle"><img alt="ShipInsure" src="' + ASSET('si-mark.png') + '"></div><span class="mv-plus">+</span>' + mLogo + '</div></div>' +
        ((v.meeting || edit) ? '<div class="mv-meet">NEXT MEETING: ' + meet + (edit ? '<input type="date" class="mv-meet-input" data-act="meeting" value="' + esc(v.meeting || '') + '" title="Next meeting date">' + (v.meeting ? '<button type="button" class="mv-chip mv-chip-inline" data-act="meeting-clear">Clear</button>' : '') : '') + '</div>' : '');
    }

    else if (name === 'welcome') {
      const w = v.welcome || {};
      el.className = 'mv-welcome';
      el.innerHTML = '<h2>' + ce('welcome.heading', 'mv-ce-block', w.heading || '', 'Welcome heading') + '</h2>' +
        '<div class="mv-welcome-body">' + ce('welcome.body', 'mv-ce-block', w.body || '', 'A short welcome note for the merchant') + '</div><div class="mv-chain"></div>';
    }

    else if (name === 'team') {
      const t = v.team || { si: [], merchant: [] };
      const col = side => {
        const list = (t[side] || []).filter(p => edit || (p.name && p.name.trim()));
        let h = list.map(p => personHtml(p, side, v, ctx)).join('');
        if (edit) h += '<button type="button" class="mv-add" data-act="person-add" data-side="' + side + '">' + IC.plus + 'Add ' + (side === 'si' ? 'ShipInsure teammate' : merchantName(v) ? merchantName(v) + ' teammate' : 'merchant teammate') + '</button>';
        else if (side === 'merchant' && ctx.canTeam) h += '<button type="button" class="mv-add is-live" data-act="person-add" data-side="merchant">' + IC.plus + 'Add your team</button>';
        if (!h) h = '<div class="mv-team-empty">—</div>';
        return '<div class="mv-team-col" data-side="' + side + '">' + h + '</div>';
      };
      el.innerHTML = '<div class="mv-team"><div class="mv-team-head">Our Team</div><div class="mv-team-body">' + col('si') + col('merchant') + '</div></div>';
    }

    else if (name === 'deck') {
      const d = v.deck || {};
      const dl = d.download !== false ? downloadHref(d) : '';
      const has = classify(d).kind !== 'empty';
      if (!has && !edit) { el.innerHTML = ''; el.style.display = 'none'; return; }
      el.style.display = '';
      el.innerHTML = '<div class="mv-sec-head"><h3>' + ce('deck.label', '', d.label || 'Demo Deck', 'Demo Deck') + '</h3>' +
        '<span class="mv-icn-row">' + (has ? '<button type="button" class="mv-icn" data-act="view" data-which="deck" title="View full screen">' + IC.eye + '</button>' : '') +
        (dl ? '<a class="mv-icn" data-act="download" data-which="deck" href="' + esc(dl) + '" download target="_blank" rel="noopener" title="Download">' + IC.down + '</a>' : '') + '</span>' +
        chip('deck-edit', has ? 'Replace deck' : 'Add deck') + '</div>' +
        '<div class="mv-frame"><div class="mv-viewer" data-viewer="deck"></div></div>';
      st.cleanups.deck = mountViewer(el.querySelector('[data-viewer]'), d, {
        emptyHtml: edit ? emptyPrompt('deck-edit', 'Upload the demo deck (PDF) or paste a Canva / Google Slides link') : '<div class="mv-empty-msg">Your deck will appear here.</div>',
        onPage: (n, total) => track(root, 'page', { what: 'deck', page: n, pages: total, label: d.label || 'Demo Deck' })
      });
    }

    else if (name === 'designs') {
      const D = v.designs || { items: [] };
      const items = (D.items || []).filter(it => edit || classify(it).kind !== 'empty');
      if (st.design >= items.length) st.design = 0;
      const cur = items[st.design];
      const pills = items.map((it, i) => {
        const dl = it.download !== false ? downloadHref(it) : '';
        const has = classify(it).kind !== 'empty';
        return '<button type="button" class="mv-pill' + (i === st.design ? ' is-on' : '') + '" data-act="design-pick" data-i="' + i + '">' +
          '<span class="mv-pill-label">' + esc(it.label || 'Untitled') + '</span>' +
          (it.tag ? '<span class="mv-pill-tag">' + esc(it.tag) + '</span>' : '') +
          '<span class="mv-icn-row">' + (has ? '<span class="mv-icn is-dark" data-act="view" data-which="design" data-i="' + i + '" title="View full screen">' + IC.eye + '</span>' : '') +
          (dl ? '<a class="mv-icn is-dark" data-act="download" data-which="design" data-i="' + i + '" href="' + esc(dl) + '" download target="_blank" rel="noopener" title="Download">' + IC.down + '</a>' : '') +
          (edit ? '<span class="mv-icn is-dark is-edit" data-act="design-edit" data-i="' + i + '" title="Edit">' + IC.pencil + '</span>' : '') + '</span></button>';
      }).join('');
      if (!items.length && !edit) { el.innerHTML = ''; el.style.display = 'none'; return; }
      el.style.display = '';
      el.innerHTML = '<div class="mv-sec-head is-designs"><h3>' + ce('designs.label', '', D.label || 'Designs & Flows', 'Designs & Flows') + '</h3><div class="mv-pills">' + pills +
        (edit ? '<button type="button" class="mv-add mv-add-pill" data-act="design-add">' + IC.plus + 'Add</button>' : '') + '</div></div>' +
        '<div class="mv-frame"><div class="mv-viewer" data-viewer="design"></div></div>';
      st.cleanups.designs = mountViewer(el.querySelector('[data-viewer]'), cur || {}, {
        emptyHtml: edit ? emptyPrompt('design-edit', 'Upload a mockup (PDF / image) or paste a Widget Designer, Email, Claim Wizard or Figma link', st.design) : '',
        onPage: (n, total) => cur && track(root, 'page', { what: 'design', page: n, pages: total, label: cur.label })
      });
    }

    else if (name === 'steps') {
      const btns = (v.buttons || []).filter(b => edit || buttonAvailable(b, v));
      if (!btns.some(b => b.action === 'panel' && b.panel === st.panel)) st.panel = 'plan';
      el.className = 'mv-steps';
      el.innerHTML = '<div class="mv-steps-head">Next Steps</div><div class="mv-btns">' +
        btns.map((b, i) => {
          const wide = (i === btns.length - 1 && btns.length % 2 === 1) ? ' is-wide' : '';
          const unset = edit && !buttonAvailable(b, v) ? ' is-unset' : '';
          const on = b.action === 'panel' && b.panel === st.panel ? ' is-on' : '';
          const inner = b.style === 'roi' ? '<img alt="ROI" src="' + ASSET('roi-logo.png') + '">' : esc(b.label);
          const cls = 'mv-btn s-' + (b.style || 'outline') + wide + unset + on;
          const ed = edit ? '<span class="mv-btn-edit" data-act="button-edit" data-id="' + b.id + '" title="Edit button">' + IC.pencil + '</span>' : '';
          if (b.action === 'link' && !edit) return '<a class="' + cls + '" href="' + esc(b.url) + '" target="_blank" rel="noopener" data-act="button" data-id="' + b.id + '">' + inner + '</a>';
          return '<button type="button" class="' + cls + '" data-act="button" data-id="' + b.id + '"' + (on ? ' aria-pressed="true"' : '') + (unset ? ' title="Needs a link — click ✎"' : '') + '>' + inner + ed + '</button>';
        }).join('') + '</div>' +
        (edit ? '<div class="mv-btns-add"><button type="button" class="mv-add is-light" data-act="button-add">' + IC.plus + 'Add button</button></div>' : '');
    }

    else if (name === 'plan') {
      // The right-hand Next Steps panel (action plan by default).
      const P = st.panel || 'plan';
      el.id = 'mv-panel';
      el.className = 'mv-panel is-' + P + (DARK_PANELS[P] ? ' is-dark' : '') + (P === 'plan' ? ' mv-plan' : '');
      el.innerHTML = panelHtml(P, v, ctx, st);
      const offs = [];
      el.querySelectorAll('[data-sframe]').forEach(f => offs.push(mountScaled(f)));
      st.cleanups.plan = () => offs.forEach(f => f());
    }
  }

  function planHtml(v, ctx) {
    const edit = ctx.mode === 'edit';
    const plan = v.plan || { title: '', stages: [] };
    const s = planStats(plan);
    const title = edit ? '<span contenteditable="' + CE + '" spellcheck="false" data-edit="plan.title" data-ph="Action plan title">' + esc(plan.title || 'Our ShipInsure Action Plan') + '</span>' : esc(plan.title || 'Our ShipInsure Action Plan');
    return '<div class="mv-plan-top"><h3>' + title + '</h3>' +
      '<div class="mv-prog"><span>' + s.pct + '%</span><div class="mv-prog-track"><div class="mv-prog-fill" style="width:' + s.pct + '%"></div></div></div></div>' +
      plan.stages.map((g, gi) => stageHtml(g, gi, plan, v, ctx)).join('') +
      (edit ? '<button type="button" class="mv-add" data-act="stage-add">' + IC.plus + 'Add stage</button>' : '');
  }

  // Scaled live preview of a full web page (renders at desktop width, shrinks to fit).
  function sframe(url, dw, vh, interactive) {
    return '<div class="mv-sframe' + (interactive ? ' is-live' : '') + '" data-sframe data-dw="' + dw + '" data-vh="' + (vh || 0) + '">' +
      '<iframe src="' + esc(url) + '" loading="lazy"' + (interactive ? '' : ' tabindex="-1" aria-hidden="true"') + ' title=""></iframe></div>';
  }
  function mountScaled(box) {
    const fr = box.querySelector('iframe'), dw = +box.dataset.dw || 1200, fixed = +box.dataset.vh || 0;
    let contentH = 0, alive = true, ro = null, inner = null;
    const fit = () => {
      if (!alive) return;
      const w = box.clientWidth; if (!w) return;
      // Interactive frames (ROI) use their own phone layout on narrow screens instead of a shrunken desktop.
      const dwEff = box.classList.contains('is-live') && w < 760 ? w : dw;
      const k = w / dwEff;
      const h = fixed || Math.max(420, (contentH || (dwEff < dw ? 1100 : dw * 0.72)) * k);
      box.style.height = h + 'px';
      fr.style.width = dwEff + 'px'; fr.style.height = (h / k) + 'px';
      fr.style.transform = 'scale(' + k + ')';
    };
    fr.addEventListener('load', () => {
      if (fixed) return;
      try {   // same origin on GitHub Pages → size the frame to the calculator's real height
        const d = fr.contentDocument; if (!d) return;
        const measure = () => { const nh = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0); if (Math.abs(nh - contentH) > 4) { contentH = nh; fit(); } };
        measure();
        if (fr.contentWindow.ResizeObserver && d.body) { inner = new fr.contentWindow.ResizeObserver(measure); inner.observe(d.body); }
      } catch (e) {}
    });
    fit();
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(box); }
    return () => { alive = false; if (ro) ro.disconnect(); if (inner) inner.disconnect(); };
  }

  const libImg = n => ASSET('lib/' + n);

  function panelHtml(P, v, ctx, st) {
    const edit = ctx.mode === 'edit';
    const L = LIB();
    const libNote = edit ? '<p class="mv-pnl-note">Shared library — the same in every vault (vault-library.js).</p>' : '';
    if (P === 'roi') {
      const b = roiButton(v);
      const url = b && b.url && b.url.trim();
      if (!url) return '<div class="mv-pnl-empty"><img alt="ROI" src="' + ASSET('roi-logo.png') + '"><p>' + (edit ? 'Link this merchant’s ROI calculator — paste their proposal link, or pick their calculator folder in ⋯ → Merchant.' : 'Your ROI breakdown is on its way.') + '</p>' +
        (edit ? '<button type="button" class="mv-mbtn is-primary" data-act="roi-link">Link ROI calculator</button>' : '') + '</div>';
      return '<div class="mv-pnl-bar">' + (edit ? '<button type="button" class="mv-chip" data-act="roi-link">' + IC.pencil + '<span>Change ROI link</span></button>' : '') +
        '<a class="mv-pnl-open" href="' + esc(url) + '" target="_blank" rel="noopener" data-act="panel-open" data-label="ROI calculator">Open full screen ↗</a></div>' +
        sframe(url, 1180, 0, true);
    }
    if (P === 'install') {
      const plat = (v.install && v.install.platform) || 'shopify';
      const list = L.install.slice().sort((a, b) => (b.key === plat) - (a.key === plat));
      const mine = L.install.find(p => p.key === plat) || L.install[0] || {};
      const own = v.install && v.install.image;
      const img = own || (mine.shot ? libImg(mine.shot) : '');
      return '<h3 class="mv-pnl-title">Install ShipInsure</h3>' +
        '<div class="mv-inst-grid">' + list.map(p =>
          '<div class="mv-inst' + (p.key === plat ? ' is-mine' : '') + '" style="--pc:' + p.color + '">' +
          (p.key === plat ? '<span class="mv-inst-tag">' + esc(merchantName(v) ? merchantName(v) + '’s platform' : 'Your platform') + '</span>' : '') +
          '<b>' + esc(p.label) + '</b><a class="mv-inst-go" href="' + esc(p.url) + '" target="_blank" rel="noopener" data-act="panel-open" data-label="Install on ' + esc(p.label) + '">Install on ' + esc(p.label) + ' →</a></div>').join('') + '</div>' +
        (edit ? '<div class="mv-pnl-tools"><label>Merchant platform <select data-act="install-platform">' + L.install.map(p => '<option value="' + p.key + '"' + (p.key === plat ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') + '</select></label>' +
          '<button type="button" class="mv-chip" data-act="install-image">' + IC.image + '<span>' + (own ? 'Replace screenshot' : img ? 'Use a different screenshot' : 'Add app screenshot') + '</span></button></div>' : '') +
        (img ? '<a class="mv-inst-shot" href="' + esc(mine.url || '#') + '" target="_blank" rel="noopener" data-act="panel-open" data-label="' + esc(mine.shotLabel || ('Install on ' + (mine.label || ''))) + '">' +
          '<img alt="ShipInsure on ' + esc(mine.label || 'your platform') + '" src="' + esc(img) + '"><span class="mv-teaser-cta">' + esc(mine.shotLabel || ('Install on ' + (mine.label || ''))) + ' ↗</span></a>' : '') +
        '<ol class="mv-inst-steps"><li><b>Install the app</b><span>Takes a couple of minutes — nothing goes live yet.</span></li><li><b>Kickoff with your CSM</b><span>We set up protection, branding and claims on staging with you.</span></li><li><b>Review staging, then go live</b><span>You approve everything before shoppers see it.</span></li></ol>';
    }
    if (P === 'examples') {
      return '<h3 class="mv-pnl-title">Live Examples &amp; Case Studies</h3>' + libNote + '<div class="mv-ex-list">' + L.examples.map((x, i) =>
        '<div class="mv-ex"><div class="mv-ex-main">' +
        '<div class="mv-ex-logo">' + (x.logo ? '<img alt="' + esc(x.name) + '" title="' + esc(x.name) + '" src="' + esc(libImg(x.logo)) + '">' : '<span>' + esc(x.name) + '</span>') + '</div>' +
        '<div class="mv-ex-setup"><b>' + esc(x.setup) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</div>' +
        '<a class="mv-ex-store" href="' + esc(x.url) + '" target="_blank" rel="noopener" data-act="panel-open" data-label="Live store: ' + esc(x.name) + '">View Live Store</a></div>' +
        (x.cs ? '<button type="button" class="mv-ex-cs" data-act="cs-view" data-i="' + i + '" title="' + esc(x.csText || '') + '" style="background-image:url(\'' + esc(libImg(x.cs)) + '\')"><span class="mv-ex-cs-btn">View Case Study</span></button>' : '') +
        '</div>').join('') + '</div>';
    }
    if (P === 'billing') {
      return L.billing.map(x => '<h3 class="mv-pnl-title">' + esc(x.label) + '</h3>' +
        '<a class="mv-teaser" href="' + esc(x.url) + '" target="_blank" rel="noopener" data-act="panel-open" data-label="' + esc(x.label) + '">' + sframe(x.url, 1280, 300, false) +
        '<span class="mv-teaser-cta">Open ' + esc(x.label) + ' ↗</span></a>').join('');
    }
    if (P === 'reviews') {
      const all = L.reviews, n = st.reviewsAll ? all.length : Math.min(6, all.length);
      return '<h3 class="mv-pnl-title">Merchant Reviews</h3>' + libNote + '<div class="mv-rev-list">' + all.slice(0, n).map(r =>
        '<div class="mv-rev"><div class="mv-rev-logo">' + (r.logo ? '<img alt="' + esc(r.name) + '" src="' + esc(libImg(r.logo)) + '">' : '<span>' + esc(r.name) + '</span>') + '</div>' +
        '<div class="mv-rev-body"><b>' + esc(r.name) + '</b><p>' + esc(r.quote) + '</p><span class="mv-rev-rate">―5/5 <i>★★★★★</i> rating from ' + esc(r.name) + '</span></div></div>').join('') +
        (n < all.length ? '<button type="button" class="mv-rev-more" data-act="reviews-more">Show all ' + all.length + ' reviews</button>' : '') + '</div>';
    }
    return planHtml(v, ctx);
  }

  function emptyPrompt(act, text, i) {
    return '<button type="button" class="mv-empty-cta" data-act="' + act + '"' + (i != null ? ' data-i="' + i + '"' : '') + '>' + IC.image + '<span>' + esc(text) + '</span></button>';
  }

  function badgeHtml(side, v) {
    if (side === 'si') return '<span class="mv-badge"><img alt="" src="' + ASSET('si-mark.png') + '"></span>';
    const m = v.merchant || {};
    return m.logo ? '<span class="mv-badge"><img alt="" src="' + esc(m.logo) + '"></span>'
      : '<span class="mv-badge is-mono"><span class="mv-monogram">' + esc(m.name ? initials(m.name).slice(0, 1) : '?') + '</span></span>';
  }

  function personHtml(p, side, v, ctx) {
    const edit = ctx.mode === 'edit';
    const ph = !(p.name && p.name.trim());
    const tel = (p.phone || '').replace(/[^\d+]/g, '');
    const canEdit = edit || (side === 'merchant' && ctx.canTeam);
    return '<div class="mv-person' + (ph ? ' is-placeholder' : '') + (canEdit ? ' is-editable' : '') + '" data-side="' + side + '" data-id="' + esc(p.id) + '"' + (canEdit ? ' data-act="person-edit"' : '') + '>' +
      '<div class="mv-avatar"><img class="mv-face" alt="" src="' + esc(photoSrc(p.photo)) + '">' + badgeHtml(side, v) + '</div>' +
      '<div style="min-width:0"><div class="mv-pname">' + esc(ph ? 'First Name' : p.name) + '</div><div class="mv-ptitle">' + esc(p.title || (ph ? 'Title' : '')) + '</div></div>' +
      '<div class="mv-pacts">' +
      '<a class="mv-pact' + (tel ? '' : ' is-off') + '" href="' + (tel ? 'tel:' + esc(tel) : '#') + '" title="' + esc(p.phone || 'No phone') + '" data-act="contact">' + IC.phone + '</a>' +
      '<a class="mv-pact' + (p.email ? '' : ' is-off') + '" href="' + (p.email ? 'mailto:' + esc(p.email) : '#') + '" title="' + esc(p.email || 'No email') + '" data-act="contact">' + IC.mail + '</a>' +
      '</div></div>';
  }

  function ownerAvatar(side, v) {
    const t = (v.team && v.team[side]) || [];
    const p = t.find(x => x.name && x.name.trim());
    return '<div class="mv-avatar" title="' + esc(side === 'si' ? 'ShipInsure' + (p ? ' · ' + p.name : '') : (merchantName(v) || 'Merchant') + (p ? ' · ' + p.name : '')) + '"><img class="mv-face" alt="" src="' + esc(photoSrc(p && p.photo)) + '">' + badgeHtml(side, v) + '</div>';
  }

  function stageHtml(g, gi, plan, v, ctx) {
    const edit = ctx.mode === 'edit';
    const done = g.steps.filter(s => s.done).length;
    return '<div class="mv-stage' + (g.open ? '' : ' is-closed') + '" data-stage="' + esc(g.id) + '">' +
      '<div class="mv-stage-head" data-act="stage-toggle">' + '<span class="mv-chev">' + IC.chev + '</span>' +
      (edit ? '<span class="mv-stage-name" contenteditable="' + CE + '" spellcheck="false" data-edit="stage" data-ph="Stage name">' + esc(g.name) + '</span>' : '<span class="mv-stage-name">' + esc(g.name) + '</span>') +
      '<span class="mv-stage-count">' + done + ' / ' + g.steps.length + '</span>' +
      (edit ? '<span class="mv-row-tools"><button type="button" data-act="stage-up" title="Move up">' + IC.up + '</button><button type="button" data-act="stage-down" title="Move down">' + IC.dn + '</button><button type="button" data-act="stage-del" title="Delete stage">' + IC.trash + '</button></span>' : '') +
      '</div><div class="mv-stage-body">' +
      g.steps.map(s => stepHtml(s, v, ctx)).join('') +
      ((edit || ctx.canPlan) ? '<button type="button" class="mv-add-step" data-act="step-add">' + IC.plus + 'Add Step</button>' : '') +
      '</div></div>';
  }

  function stepHtml(s, v, ctx) {
    const edit = ctx.mode === 'edit';
    const canCheck = edit || ctx.canPlan;
    const att = s.link ? '<a class="mv-step-att" href="' + esc(s.link) + '" target="_blank" rel="noopener" title="Open attachment" data-act="step-link">' + IC.clip + '</a>' : '';
    const who = s.done && (s.doneBy || s.doneAt) ? ' title="Done' + (s.doneBy ? ' by ' + esc(s.doneBy) : '') + (s.doneAt ? ' · ' + esc(fmtShort(s.doneAt)) : '') + '"' : '';
    const date = s.due ? fmtShort(s.due) : (s.done && s.doneAt ? fmtShort(s.doneAt) : '');
    return '<div class="mv-step' + (s.done ? ' is-done' : '') + '" data-step="' + esc(s.id) + '">' +
      '<button type="button" class="mv-check" data-act="step-check"' + (canCheck ? '' : ' disabled') + who + ' aria-label="' + (s.done ? 'Mark not done' : 'Mark done') + '">' + IC.check + '</button>' +
      '<div class="mv-step-text">' + (edit ? '<span contenteditable="' + CE + '" spellcheck="false" data-edit="step" data-ph="Describe the step">' + esc(s.text) + '</span>' : esc(s.text)) + att + '</div>' +
      ((edit || ctx.canPlan) ? '<button type="button" class="mv-flag' + (s.flag ? '' : ' is-off') + '" data-act="step-flag" title="' + (s.flag ? 'Flagged' : 'Flag') + '">' + IC.flag + '</button>'
                             : '<span class="mv-flag' + (s.flag ? '' : ' is-off') + '">' + IC.flag + '</span>') +
      ((edit || ctx.canPlan)
        ? '<label class="mv-date' + (date ? '' : ' is-unset') + '">' + (date || 'Date') + '<input type="date" data-act="step-date" value="' + esc(s.due || '') + '"></label>'
        : '<span class="mv-date">' + esc(date) + '</span>') +
      '<div class="mv-owner"' + (edit ? ' data-act="step-owner" title="Click to switch owner"' : '') + '>' + ownerAvatar(s.owner === 'merchant' ? 'merchant' : 'si', v) + '</div>' +
      (edit ? '<span class="mv-row-tools"><button type="button" data-act="step-more" title="Step details">' + IC.dots + '</button></span>' : '') +
      '</div>';
  }

  // ── Tracking helpers (live mode) ────────────────────────────────────────
  function track(root, kind, detail) {
    const st = root._mv; if (!st || !st.ctx.track || st.ctx.mode === 'edit') return;
    if (kind === 'page') {
      const k = detail.what + ':' + detail.label + ':' + detail.page;
      if (st.seen[k]) return; st.seen[k] = 1;
    }
    st.ctx.track(kind, detail || {});
  }
  function observeSections(root) {
    if (!window.IntersectionObserver) return;
    const st = root._mv;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const p = e.target.dataset.part;
      if (st.seen['sec:' + p]) return; st.seen['sec:' + p] = 1;
      track(root, 'view', { section: p });
      io.unobserve(e.target);
    }), { threshold: 0.45 });
    root.querySelectorAll('[data-part="team"],[data-part="deck"],[data-part="designs"],[data-part="plan"]').forEach(el => io.observe(el));
  }

  // ── Events (delegated, bound once per root) ─────────────────────────────
  function bind(root) {
    const changed = (kind, info, parts) => {
      const st = root._mv;
      (parts || []).forEach(p => part(root, p));
      if (st.ctx.onChange) st.ctx.onChange(kind, info || {});
    };

    // Inline text edits (edit mode)
    root.addEventListener('input', e => {
      const el = e.target.closest('[data-edit]'); if (!el) return;
      const st = root._mv, v = st.vault, path = el.dataset.edit;
      const val = el.innerText.replace(/ /g, ' ').replace(/\n$/, '');
      el.classList.toggle('is-empty', !val.trim());
      if (path === 'stage') { const g = findStage(v, el); if (g) g.name = val; }
      else if (path === 'step') { const f = findStep(v.plan, el.closest('[data-step]').dataset.step); if (f) { f.s.text = val; markDirty(st, f.s.id); } }
      else set(v, path, path === 'welcome.body' ? val : val.replace(/\n/g, ' '));
      if (path === 'merchant.name') {
        const mono = root.querySelector('.mv-merchant-logo .mv-monogram'); if (mono) mono.textContent = val.trim() ? initials(val) : '+';
        part(root, 'team'); if (st.panel === 'plan' || st.panel === 'install') part(root, 'plan');
      }
      if (st.ctx.onChange) st.ctx.onChange('text', { path: path });
    });
    root.addEventListener('keydown', e => {
      const el = e.target.closest && e.target.closest('[data-edit]'); if (!el) return;
      if (e.key === 'Enter' && el.dataset.edit !== 'welcome.body') { e.preventDefault(); el.blur(); }
    });
    root.addEventListener('paste', e => {
      const el = e.target.closest && e.target.closest('[data-edit]'); if (!el) return;
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    root.addEventListener('change', e => {
      const st = root._mv, v = st.vault, edit = st.ctx.mode === 'edit';
      const t = e.target;
      if (t.dataset.act === 'meeting') { v.meeting = t.value; changed('meeting', {}, ['head']); }
      else if (t.dataset.act === 'install-platform') { v.install.platform = t.value; changed('install', {}, ['plan']); }
      else if (t.dataset.act === 'step-date') {
        const id = t.closest('[data-step]').dataset.step;
        const op = { op: 'date', id: id, due: t.value };
        applyPlanOp(v.plan, op); markDirty(st, id);
        changed('plan', { op: op, label: 'Set a date on "' + stepText(v, id) + '"' }, ['plan']);
      }
    });

    root.addEventListener('click', async e => {
      // Date fields are invisible overlays — open the native picker on any click.
      const di = e.target.closest('input[type=date]');
      if (di && di.showPicker) { try { di.showPicker(); } catch (err) {} }
      const a = e.target.closest('[data-act]'); if (!a || !root.contains(a)) return;
      if (a.tagName === 'INPUT') return;
      const st = root._mv, v = st.vault, ctx = st.ctx, edit = ctx.mode === 'edit';
      const act = a.dataset.act;

      if (act === 'contact') {
        if (edit) { e.preventDefault(); e.stopPropagation(); const pe = a.closest('[data-act="person-edit"]'); if (pe) pe.click(); return; }
        if (a.classList.contains('is-off')) { e.preventDefault(); return; }
        e.stopPropagation();
        track(root, 'click', { label: a.title, kind: 'contact' });
        return;
      }

      // ── header ──
      if (act === 'cover-edit') {
        const r = await form({ title: 'Cover banner', text: 'Wide image (about 4:1). Leave empty for the ShipInsure default.', fields: [{ key: 'cover', label: 'Image', type: 'file', accept: 'image/*', upload: ctx.upload }], values: { cover: v.cover || '' } });
        if (r) { v.cover = r.cover; changed('cover', {}, ['head']); }
      }
      else if (act === 'merchant-edit') {
        if (ctx.pickMerchant) { await ctx.pickMerchant(); return; }
      }
      else if (act === 'meeting-clear') { v.meeting = ''; changed('meeting', {}, ['head']); }

      // ── team ──
      else if (act === 'person-add' || act === 'person-edit') {
        if (act === 'person-edit' && e.target.closest('.mv-pact')) return;
        const side = a.dataset.side || a.closest('[data-side]').dataset.side;
        if (!edit && !(side === 'merchant' && ctx.canTeam)) return;
        const list = v.team[side] = v.team[side] || [];
        const p = act === 'person-edit' ? list.find(x => x.id === a.dataset.id) : null;
        const fields = [];
        if (edit && side === 'si') fields.push({ key: 'rep', label: 'Quick pick', type: 'select', options: [['', '— ShipInsure teammate —']].concat(REPS.map(r => [r.key, r.name + ' · ' + r.title])),
          fill: key => { const r = REPS.find(x => x.key === key); return r ? { name: r.name, title: r.title, email: r.email } : null; } });
        fields.push({ key: 'name', label: 'Name', placeholder: 'First and last name', required: true },
          { key: 'title', label: 'Title', placeholder: side === 'si' ? 'eCommerce Partnerships' : 'Head of eCommerce' },
          { key: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' },
          { key: 'phone', label: 'Phone', type: 'tel', placeholder: '(555) 555-5555' });
        if (edit) fields.push({ key: 'photo', label: 'Photo', type: 'file', accept: 'image/*', upload: ctx.upload, placeholder: 'Image link, or upload →' });
        const prevPhoto = p ? (p.photo || '') : '';
        const r = await form({
          title: p ? (side === 'si' ? 'Edit teammate' : 'Edit team member') : (side === 'si' ? 'Add a ShipInsure teammate' : 'Add a team member'),
          fields: fields, values: p ? Object.assign({}, p, { photo: prevPhoto[0] === '@' ? '' : prevPhoto }) : {},
          danger: p ? 'Remove' : null, submit: p ? 'Save' : 'Add'
        });
        if (!r) return;
        let label;
        if (r === '__delete') { list.splice(list.indexOf(p), 1); label = 'Removed ' + (p.name || 'a teammate') + ' from the team'; }
        else {
          let photo = prevPhoto;
          if (edit) {
            if (r.photo) photo = r.photo;                                   // uploaded / pasted
            else if (r.rep) photo = repPerson(r.rep).photo;                 // quick pick
            else if (prevPhoto[0] !== '@') photo = '';                      // cleared
          }
          const vals = { name: r.name, title: r.title, email: r.email, phone: r.phone, photo: photo };
          const empty = !p && list.find(x => !(x.name && x.name.trim()));   // fill a "First Name" placeholder first
          if (p) Object.assign(p, vals); else if (empty) Object.assign(empty, vals); else list.push(person(vals));
          label = (p ? 'Updated ' : 'Added ') + r.name + (side === 'merchant' ? ' on the team' : '');
        }
        if (edit && side === 'merchant') markDirty(st, '__teamMerchant');
        changed(side === 'merchant' ? 'team' : 'team-si', { label: label, team: v.team.merchant }, ['team', 'plan']);
      }

      // ── deck / designs ──
      else if (act === 'deck-edit') {
        const d = v.deck;
        const r = await form({ title: 'Demo deck', text: 'Upload the PDF (best — page-by-page viewer) or paste a Canva, Google Slides, Drive, Loom or YouTube link.', fields: [
          { key: 'src', label: 'Deck', type: 'file', accept: 'application/pdf,image/*', upload: ctx.upload },
          { key: 'download', label: 'Let the merchant download it', type: 'checkbox' }], values: { src: d.src, download: d.download !== false }, danger: d.src ? 'Remove deck' : null });
        if (!r) return;
        if (r === '__delete') { d.src = ''; d.kind = ''; d.name = ''; }
        else { if (r.src !== d.src) { d.kind = r.__kind_src || ''; d.name = r.__name_src || ''; } d.src = r.src; d.download = r.download; }
        changed('deck', {}, ['deck']);
      }
      else if (act === 'design-add' || act === 'design-edit') {
        e.stopPropagation();
        const items = v.designs.items;
        const i = act === 'design-edit' ? +a.dataset.i : -1;
        const it = i >= 0 ? items[i] : null;
        const r = await form({ title: it ? 'Edit design' : 'Add a design', text: 'Upload a mockup PDF or image, or paste a link — Checkout Experience (Widget Designer), Email Automation, Claim Wizard, Figma or Canva.', fields: [
          { key: 'label', label: 'Label', placeholder: 'Cart & Checkout', required: true },
          { key: 'tag', label: 'Tag', placeholder: 'Mockups' },
          { key: 'src', label: 'File or link', type: 'file', accept: 'application/pdf,image/*', upload: ctx.upload },
          { key: 'download', label: 'Let the merchant download it', type: 'checkbox' }],
          values: it ? Object.assign({}, it) : { download: true }, danger: it ? 'Remove' : null, submit: it ? 'Save' : 'Add' });
        if (!r) return;
        if (r === '__delete') { items.splice(i, 1); st.design = 0; }
        else {
          const tgt = it || { id: uid('d') };
          if (r.src !== tgt.src) { tgt.kind = r.__kind_src || ''; tgt.name = r.__name_src || ''; }
          Object.assign(tgt, { label: r.label, tag: r.tag, src: r.src, download: r.download });
          if (!it) { items.push(tgt); st.design = items.length - 1; }
        }
        changed('designs', {}, ['designs']);
      }
      else if (act === 'design-pick') {
        const i = +a.dataset.i; if (i === st.design) return;
        st.design = i; part(root, 'designs');
        const it = visibleDesigns(v, edit)[i];
        if (it) track(root, 'open', { what: 'design', label: it.label });
      }
      else if (act === 'view') {
        e.stopPropagation();
        const item = a.dataset.which === 'deck' ? v.deck : visibleDesigns(v, edit)[+a.dataset.i];
        if (!item) return;
        track(root, 'open', { what: a.dataset.which, label: item.label || 'Demo Deck', fullscreen: true });
        lightbox(Object.assign({}, item, { label: item.label || (a.dataset.which === 'deck' ? 'Demo Deck' : '') }), {
          onPage: (n, total) => track(root, 'page', { what: a.dataset.which, page: n, pages: total, label: item.label || 'Demo Deck' }),
          onDownload: () => track(root, 'download', { what: a.dataset.which, label: item.label || 'Demo Deck' })
        });
      }
      else if (act === 'download') {
        e.stopPropagation();
        const item = a.dataset.which === 'deck' ? v.deck : visibleDesigns(v, edit)[+a.dataset.i];
        track(root, 'download', { what: a.dataset.which, label: (item && item.label) || 'Demo Deck' });
      }

      // ── next-step buttons ──
      else if (act === 'button-edit' || act === 'button-add') {
        e.stopPropagation(); e.preventDefault();
        const list = v.buttons;
        const b = act === 'button-edit' ? list.find(x => x.id === a.dataset.id) : null;
        const r = await form({ title: b ? 'Edit button' : 'Add a button', fields: [
          { key: 'label', label: 'Label', required: true, placeholder: 'Install ShipInsure' },
          { key: 'action', label: 'When clicked', type: 'select', options: Object.keys(PANELS).map(k => ['panel:' + k, 'Show panel — ' + PANELS[k]]).concat([['link', 'Open a link (new tab)'], ['question', 'Open “I have a question”'], ['deck', 'Open the demo deck full screen']]) },
          { key: 'url', label: 'Link (for “Open a link” and the ROI panel)', type: 'url', placeholder: 'https://…' },
          { key: 'style', label: 'Style (the selected panel button always turns gradient)', type: 'select', options: [['outline', 'Outline (white)'], ['solid', 'Solid (periwinkle)'], ['gradient', 'Gradient'], ['roi', 'ROI logo']] },
          { key: 'pos', label: 'Position', type: 'select', options: list.map((x, i) => [String(i), (i + 1) + '. ' + x.label]).concat(b ? [] : [[String(list.length), (list.length + 1) + '. (end)']]) }
        ], values: b ? Object.assign({}, b, { pos: String(list.indexOf(b)), action: b.action === 'panel' ? 'panel:' + b.panel : b.action }) : { action: 'link', style: 'outline', pos: String(list.length) }, danger: b ? 'Remove' : null, submit: b ? 'Save' : 'Add' });
        if (!r) return;
        if (r === '__delete') list.splice(list.indexOf(b), 1);
        else {
          const tgt = b || { id: uid('b') };
          const isPanel = r.action.indexOf('panel:') === 0;
          Object.assign(tgt, { label: r.label, action: isPanel ? 'panel' : r.action, url: r.url, style: r.style });
          if (isPanel) tgt.panel = r.action.slice(6); else delete tgt.panel;
          if (b) list.splice(list.indexOf(b), 1);
          list.splice(Math.min(+r.pos, list.length), 0, tgt);
        }
        changed('buttons', {}, ['steps', 'plan']);
      }
      else if (act === 'button') {
        const b = v.buttons.find(x => x.id === a.dataset.id); if (!b) return;
        if (edit && e.target.closest('[data-act="button-edit"]')) return;
        if (b.action === 'link') {
          if (edit) { if (b.url) window.open(b.url, '_blank', 'noopener'); else a.querySelector('.mv-btn-edit').click(); return; }
          track(root, 'click', { label: b.label, url: b.url });
          return; // anchor navigates
        }
        track(root, 'click', { label: b.label });
        if (b.action === 'panel') {
          st.panel = b.panel; part(root, 'steps'); part(root, 'plan');
          const host = root.querySelector('.mv-host');
          if (host && host.clientWidth < 900) { const p = root.querySelector('#mv-panel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }
        else if (b.action === 'deck') { const d = root.querySelector('[data-act="view"][data-which="deck"]'); if (d) d.click(); }
        else if (b.action === 'question') ask(root);
      }
      else if (act === 'panel-open') { track(root, 'click', { label: a.dataset.label || 'Link' }); }
      else if (act === 'reviews-more') { st.reviewsAll = true; part(root, 'plan'); track(root, 'click', { label: 'Show all reviews' }); }
      else if (act === 'cs-view') {
        const x = LIB().examples[+a.dataset.i]; if (!x) return;
        track(root, 'open', { what: 'case study', label: 'Case study: ' + x.name });
        lightbox({ label: x.name + ' — case study', src: libImg(x.cs), kind: 'image', download: false }, { tall: true });
      }
      else if (act === 'roi-link' && edit) {
        const b = roiButton(v); if (!b) return;
        const r = await form({ title: 'ROI calculator', text: 'Paste the merchant’s proposal link from the ROI calculator (☁ Cloud Save → merchant link). It shows inside the ROI panel.', fields: [{ key: 'url', label: 'Proposal link', type: 'url', placeholder: 'https://drewshafe.github.io/si-roi-calculator/proposal.html?id=…' }], values: { url: b.url || '' }, danger: b.url ? 'Unlink' : null });
        if (!r) return;
        b.url = r === '__delete' ? '' : r.url;
        changed('buttons', {}, ['steps', 'plan']);
      }
      else if (act === 'install-image' && edit) {
        const r = await form({ title: 'App screenshot', text: 'Screenshot of ShipInsure inside the store admin — shows under the install buttons.', fields: [{ key: 'image', label: 'Image', type: 'file', accept: 'image/*', upload: ctx.upload }], values: { image: v.install.image || '' }, danger: v.install.image ? 'Remove' : null });
        if (!r) return;
        v.install.image = r === '__delete' ? '' : r.image;
        changed('install', {}, ['plan']);
      }

      // ── plan ──
      else if (act === 'stage-toggle') {
        if (e.target.closest('[contenteditable], .mv-row-tools')) return;
        const g = findStage(v, a); if (!g) return;
        g.open = !g.open;
        a.closest('.mv-stage').classList.toggle('is-closed', !g.open);
        if (edit && ctx.onChange) ctx.onChange('stage', {});
      }
      else if (act === 'stage-add') {
        v.plan.stages.push(stage('New stage', []));
        changed('plan', {}, ['plan']);
        focusLast(root, '.mv-stage:last-of-type .mv-stage-name');
      }
      else if (act === 'stage-del' || act === 'stage-up' || act === 'stage-down') {
        e.stopPropagation();
        const g = findStage(v, a), arr = v.plan.stages, i = arr.indexOf(g);
        if (act === 'stage-del') { if (g.steps.length && !confirm('Delete "' + g.name + '" and its ' + g.steps.length + ' steps?')) return; arr.splice(i, 1); }
        else { const j = i + (act === 'stage-up' ? -1 : 1); if (j < 0 || j >= arr.length) return; arr.splice(j, 0, arr.splice(i, 1)[0]); }
        changed('plan', {}, ['plan']);
      }
      else if (act === 'step-check') {
        const id = a.closest('[data-step]').dataset.step;
        const f = findStep(v.plan, id); if (!f) return;
        const who = edit ? 'ShipInsure' : ((ctx.who && ctx.who().name) || merchantName(v) || 'Merchant');
        const op = { op: 'check', id: id, done: !f.s.done, by: who, at: todayISO() };
        applyPlanOp(v.plan, op); markDirty(st, id);
        changed('plan', { op: op, label: (op.done ? 'Checked off "' : 'Reopened "') + f.s.text + '"' }, ['plan']);
        if (!edit && op.done) toast('Saved ✓ — your ShipInsure team will see it.');
      }
      else if (act === 'step-flag') {
        const id = a.closest('[data-step]').dataset.step;
        const f = findStep(v.plan, id); if (!f) return;
        const op = { op: 'flag', id: id, flag: !f.s.flag };
        applyPlanOp(v.plan, op); markDirty(st, id);
        changed('plan', { op: op, label: (op.flag ? 'Flagged "' : 'Unflagged "') + f.s.text + '"' }, ['plan']);
      }
      else if (act === 'step-owner' && edit) {
        const f = findStep(v.plan, a.closest('[data-step]').dataset.step); if (!f) return;
        f.s.owner = f.s.owner === 'merchant' ? 'si' : 'merchant'; markDirty(st, f.s.id);
        changed('plan', {}, ['plan']);
      }
      else if (act === 'step-add') {
        const g = findStage(v, a); if (!g) return;
        if (edit) {
          const s = step('', 'si'); g.steps.push(s); markDirty(st, s.id);
          changed('plan', {}, ['plan']);
          focusLast(root, '[data-step="' + s.id + '"] [data-edit="step"]');
        } else {
          const r = await form({ title: 'Add a step', fields: [{ key: 'text', label: 'Step', required: true, placeholder: 'e.g. Loop in our 3PL' }, { key: 'due', label: 'Due date (optional)', type: 'date' }], submit: 'Add step' });
          if (!r) return;
          const who = (ctx.who && ctx.who().name) || merchantName(v) || 'Merchant';
          const s = step(r.text, 'merchant', { due: r.due || '', by: who });
          const op = { op: 'add', stage: g.id, step: s };
          applyPlanOp(v.plan, op);
          changed('plan', { op: op, label: 'Added a step: "' + r.text + '"' }, ['plan']);
          toast('Step added ✓');
        }
      }
      else if (act === 'step-more' && edit) {
        const f = findStep(v.plan, a.closest('[data-step]').dataset.step); if (!f) return;
        const r = await form({ title: 'Step details', fields: [
          { key: 'text', label: 'Step', required: true },
          { key: 'owner', label: 'Owner', type: 'select', options: [['si', 'ShipInsure'], ['merchant', merchantName(v) || 'Merchant']] },
          { key: 'due', label: 'Due date', type: 'date' },
          { key: 'link', label: 'Attachment / link (📎)', type: 'file', accept: 'application/pdf,image/*', upload: ctx.upload, placeholder: 'https://…' },
          { key: 'stage', label: 'Stage', type: 'select', options: v.plan.stages.map(g => [g.id, g.name]) },
          { key: 'flag', label: 'Flagged', type: 'checkbox' }
        ], values: Object.assign({}, f.s, { stage: f.g.id }), danger: 'Delete step' });
        if (!r) return;
        if (r === '__delete') f.g.steps.splice(f.g.steps.indexOf(f.s), 1);
        else {
          Object.assign(f.s, { text: r.text, owner: r.owner, due: r.due, link: r.link, flag: r.flag });
          if (r.stage !== f.g.id) { const ng = v.plan.stages.find(g => g.id === r.stage); if (ng) { f.g.steps.splice(f.g.steps.indexOf(f.s), 1); ng.steps.push(f.s); } }
        }
        markDirty(st, f.s.id);
        changed('plan', {}, ['plan']);
      }
      else if (act === 'step-link') { track(root, 'click', { label: 'Attachment: ' + stepText(v, a.closest('[data-step]').dataset.step) }); }
    });
  }

  function visibleDesigns(v, edit) { return ((v.designs && v.designs.items) || []).filter(it => edit || classify(it).kind !== 'empty'); }
  function findStage(v, el) { const s = el.closest('[data-stage]'); return s ? v.plan.stages.find(g => g.id === s.dataset.stage) : null; }
  function stepText(v, id) { const f = findStep(v.plan, id); return f ? f.s.text : ''; }
  function markDirty(st, id) { (st.dirty || (st.dirty = {}))[id] = 1; }
  function focusLast(root, sel) {
    setTimeout(() => {
      const el = root.querySelector(sel); if (!el) return;
      el.focus();
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }, 30);
  }

  async function ask(root) {
    const st = root._mv, ctx = st.ctx, v = st.vault;
    if (ctx.mode === 'edit') { toast('Merchants see a question box here.'); return; }
    const who = (ctx.who && ctx.who()) || {};
    const rep = (v.team.si || []).find(p => p.name);
    const r = await form({ title: 'Ask your ShipInsure team', text: rep ? esc(rep.name) + ' will get back to you — usually within the hour.' : '', fields: [
      { key: 'text', label: 'Your question', type: 'textarea', required: true, placeholder: 'Ask anything — pricing, install, how claims work…' },
      { key: 'name', label: 'Your name', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }
    ], values: { name: who.name || '', email: who.email || '' }, submit: 'Send question' });
    if (!r) return;
    if (ctx.setWho) ctx.setWho({ name: r.name, email: r.email });
    if (ctx.track) ctx.track('question', { label: r.text.slice(0, 80), text: r.text, name: r.name, email: r.email });
    toast('Sent ✓ — we’ll reply to ' + r.email);
  }

  // ── Studio merge: keep merchant-side changes made while a rep was editing ──
  function mergeMerchant(local, server, dirty) {
    if (!server || !server.plan || !local.plan) return local;
    dirty = dirty || {};
    const localIds = {};
    local.plan.stages.forEach(g => g.steps.forEach(s => { localIds[s.id] = s; }));
    server.plan.stages.forEach(sg => sg.steps.forEach(ss => {
      const ls = localIds[ss.id];
      if (ls) { if (!dirty[ss.id]) { ls.done = ss.done; ls.doneAt = ss.doneAt; ls.doneBy = ss.doneBy; ls.due = ss.due; ls.flag = ss.flag; } }
      else if (ss.by && ss.owner === 'merchant') {
        const g = local.plan.stages.find(x => x.id === sg.id) || local.plan.stages[local.plan.stages.length - 1];
        if (g) g.steps.push(ss);
      }
    }));
    if (server.team && server.team.merchant && !dirty.__teamMerchant) local.team.merchant = server.team.merchant;
    return local;
  }

  // ── Data layer (Supabase via SIsb's client) ──────────────────────────────
  async function sb() {
    if (!window.SIsb) throw new Error('Cloud module (sb.js) not loaded');
    return window.SIsb.client();
  }
  const API = {
    async list() {
      const c = await sb();
      const { data, error } = await c.from('vaults')
        .select('id, rep_id, merchant, merchant_ref, title, status, visit_count, last_visit_at, last_action, last_action_at, updated_by, updated_at, created_at, plan:data->plan, logo:data->merchant->>logo')
        .neq('status', 'archived').order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async listArchived() {
      const c = await sb();
      const { data, error } = await c.from('vaults').select('id, merchant, status, updated_at').eq('status', 'archived').order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async get(id) {
      const c = await sb();
      const { data, error } = await c.from('vaults').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    async create(row) {
      const c = await sb();
      const { data, error } = await c.from('vaults').insert(row).select('*').single();
      if (error) throw error;
      return data;
    },
    async update(id, patch) {
      const c = await sb();
      const { data, error } = await c.from('vaults').update(Object.assign({ updated_at: new Date().toISOString(), updated_by: 'rep' }, patch)).eq('id', id).select('id, updated_at, edit_token').single();
      if (error) throw error;
      return data;
    },
    async remove(id) { const c = await sb(); const { error } = await c.from('vaults').delete().eq('id', id); if (error) throw error; },
    async events(id, limit) {
      const c = await sb();
      const { data, error } = await c.from('vault_events').select('*').eq('vault_id', id).order('at', { ascending: false }).limit(limit || 500);
      if (error) throw error;
      return data || [];
    },
    async upload(file, vaultId) {
      const c = await sb();
      const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '-').slice(-80);
      const path = 'v/' + (vaultId || 'draft') + '/' + Date.now().toString(36) + '-' + safe;
      const { error } = await c.storage.from('vault-files').upload(path, file, { contentType: file.type || undefined, upsert: false, cacheControl: '31536000' });
      if (error) throw error;
      return c.storage.from('vault-files').getPublicUrl(path).data.publicUrl;
    },
    // merchant side (anon)
    async publicGet(id, key) {
      const c = await sb();
      const { data, error } = await c.rpc('vault_get', { p_id: id, p_key: key || null });
      if (error) throw error;
      return data;
    },
    async merchantSave(id, key, patch, action) {
      const c = await sb();
      const { error } = await c.rpc('vault_merchant_save', { p_id: id, p_key: key, p_patch: patch, p_action: action || null });
      if (error) throw error;
    },
    async track(id, kind, detail, visitor, who) {
      const c = await sb();
      const { error } = await c.rpc('vault_track', { p_id: id, p_kind: kind, p_detail: detail || {}, p_visitor: visitor || null, p_who: who || null });
      if (error) throw error;
    },
    // Fire-and-forget on page hide (supabase-js may not finish) — keepalive REST call.
    beacon(id, kind, detail, visitor, who) {
      try {
        fetch(SB_URL + '/rest/v1/rpc/vault_track', {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
          body: JSON.stringify({ p_id: id, p_kind: kind, p_detail: detail || {}, p_visitor: visitor || null, p_who: who || null })
        });
      } catch (e) {}
    }
  };

  // ── Engagement roll-up (studio activity panel + list) ───────────────────
  function engagement(row, now) {
    now = now || Date.now();
    if (!row.visit_count) return { key: 'none', label: 'Not opened' };
    const days = row.last_visit_at ? (now - new Date(row.last_visit_at).getTime()) / 864e5 : 99;
    if (days >= 6) return { key: 'cold', label: 'Cold' };
    if (days < 2 && row.visit_count >= 3) return { key: 'hot', label: 'Heating' };
    return { key: 'active', label: 'Active' };
  }
  function summarize(events) {
    const visits = events.filter(e => e.kind === 'visit');
    const visitors = {};
    let secs = 0;
    events.forEach(e => {
      if (e.visitor) { const k = e.visitor; visitors[k] = visitors[k] || { visitor: k, who: '', visits: 0, secs: 0, last: e.at }; if (e.who) visitors[k].who = e.who; if (e.kind === 'visit') visitors[k].visits++; }
      if (e.kind === 'time') { const s = +(e.detail && e.detail.secs) || 0; secs += s; if (e.visitor && visitors[e.visitor]) visitors[e.visitor].secs += s; }
    });
    return { visits: visits.length, visitors: Object.values(visitors), secs: secs, questions: events.filter(e => e.kind === 'question') };
  }
  function describe(e) {
    const d = e.detail || {};
    switch (e.kind) {
      case 'visit': return 'Opened the vault' + (d.ref ? ' (from ' + d.ref + ')' : '');
      case 'view': return 'Viewed ' + ({ team: 'Our Team', deck: 'the demo deck', designs: 'Designs & Flows', plan: 'the action plan' }[d.section] || d.section);
      case 'page': return 'Read ' + (d.label || d.what) + ' — page ' + d.page + (d.pages ? ' of ' + d.pages : '');
      case 'open': return 'Opened ' + (d.label || d.what) + (d.fullscreen ? ' full screen' : '');
      case 'download': return 'Downloaded ' + (d.label || d.what);
      case 'click': return 'Clicked “' + (d.label || '') + '”';
      case 'plan': return d.label || 'Updated the action plan';
      case 'team': return d.label || 'Updated their team';
      case 'question': return 'Asked: “' + (d.text || d.label || '') + '”';
      case 'time': return 'Spent ' + Math.round((d.secs || 0) / 60) + ' min';
      default: return e.kind;
    }
  }

  window.MV = {
    BASE, ASSET, SB_URL, SB_KEY, IC, REPS, PLANS, DEFAULT_AVATAR,
    esc, uid, clone, fmtShort, fmtMeeting, todayISO, initials, photoSrc,
    template, withDefaults, normalize, person, repPerson, planStats, applyPlanOp, findStep, mergeMerchant, PANELS,
    classify, embedUrl, downloadHref, mountViewer, render, part, form, lightbox, toast,
    API, engagement, summarize, describe
  };
})();
