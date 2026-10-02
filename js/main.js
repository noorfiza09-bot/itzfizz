/* ITZ FIZZ — scroll-driven hero.
   Vanilla JS + GSAP + ScrollTrigger. Only transform/opacity are animated. */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* If the CDN fails, never leave the user stuck behind the preloader. */
if (!window.gsap || !window.ScrollTrigger) {
  $('.preloader')?.remove();
  root.classList.remove('lock');
} else {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // avoid refresh jank when mobile URL bar hides
  if (!reduceMotion) root.classList.add('motion');
  setupMenu();
  setupSplitHeadline();
  loadCarImage();
  reduceMotion ? startReduced() : startPreloader();

  // Re-measure pins/positions once fonts and images settle.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
}

/* ---------- Headline: split into masked characters (data-w = word index) ---------- */
function setupSplitHeadline() {
  $$('[data-split]').forEach((el) => {
    let word = 0;
    el.innerHTML = [...el.textContent.trim()]
      .map((c) => (c === ' ' ? (word++, '<span class="sp"></span>') : `<span class="ch" data-w="${word}"><i>${c}</i></span>`))
      .join('');
  });
}

/* ---------- Mobile menu: aria state, Esc to close, staggered GSAP entrance ---------- */
function setupMenu() {
  const burger = $('.burger'), menu = $('.menu');
  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    menu.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
    if (open && !reduceMotion) gsap.fromTo('.menu a', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.09, delay: 0.1 });
  };
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  $$('.menu a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
}

/* ---------- Preloader → intro ---------- */
function startPreloader() {
  const pct = $('.pre-pct'), counter = { v: 0 };
  gsap.to('.pre-bar', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' });
  gsap.to(counter, {
    v: 100, duration: 1.3, ease: 'power2.inOut',
    onUpdate: () => (pct.textContent = String(Math.round(counter.v)).padStart(3, '0')),
    onComplete: () =>
      gsap.timeline()
        .to('.pre-inner', { y: -24, opacity: 0, duration: 0.45, ease: 'power2.in' })
        .to('.preloader', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.1')
        .add(() => intro().play(), '-=0.55')
        .add(() => $('.preloader').remove()),
  });
}

function intro() {
  const countUp = () =>
    $$('.num').forEach((el, i) => {
      const o = { v: 0 };
      gsap.to(o, { v: +el.dataset.value, duration: 1.6, delay: i * 0.15, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v) + '%') });
    });

  return gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: initMotion })
    .from('.header > *', { y: -20, opacity: 0, duration: 0.8, stagger: 0.08 })
    .from('.eyebrow', { y: 16, opacity: 0, duration: 0.7 }, '-=0.4')
    .from('.ch i', { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.035 }, '-=0.4')
    .from('.tagline', { y: 12, opacity: 0, duration: 0.8 }, '-=0.7')
    .from('.car-float', { scale: 0.55, opacity: 0, y: 80, duration: 1.5, ease: 'expo.out' }, '-=1.3')
    .from('.glow', { opacity: 0, duration: 1.4 }, '<')
    .from('.stat', { y: 40, opacity: 0, duration: 0.9, stagger: 0.15 }, '-=0.9')
    .from('.progress', { opacity: 0, duration: 0.8 }, '-=0.6')
    .from('.scroll-cue', { opacity: 0, y: 10, duration: 0.7 }, '-=0.2')
    .add(countUp, '-=1.7');
}

/* ---------- Reduced motion: no intro, no pin, no scrub, no mouse. Content stays visible. ---------- */
function startReduced() {
  $('.preloader').remove();
  root.classList.remove('lock');
  initProgressAndNav(null);
}

/* ---------- Everything that runs after the intro ---------- */
function initMotion() {
  root.classList.remove('lock');
  const heroST = initHeroTimeline();
  initProgressAndNav(heroST);
  initOutroReveals();
  if (finePointer) initMouse();
  initIdleFloat();
  gsap.fromTo('.cue-line i', { scaleY: 0 }, { scaleY: 1, duration: 1.4, ease: 'power2.inOut', repeat: -1, repeatDelay: 0.3 }); // small cue only; the car never autoplays
  ScrollTrigger.refresh();
}

/* ============================================================
   SMOOTH PATH HELPER
   Monotone cubic (Fritsch–Carlson) interpolation through keyframes.
   • C1-continuous: velocity never jumps, so the car carries momentum through every stage
   • monotone: never overshoots a keyframe value
   Used instead of chained eased tweens, which slow to a stop at every boundary.
   ============================================================ */
function smoothCurve(xs, ys) {
  const n = xs.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], k = a * a + b * b;
    if (k > 9) { const t = 3 / Math.sqrt(k); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/* ============================================================
   CORE: one pinned timeline of normalized length 1, scrubbed by scroll.
   Positions are fractions of scroll progress. Everything uses ease:'none' (scroll is
   the source of truth); smoothness comes from scrub:1.2 and the continuous car curve.

     0–15%   hold
     15–35%  car starts moving; headline begins to separate
     35–55%  car keeps moving; headline → BUILT/FOR/MOTION cross-fade
     55–75%  BUILT / FOR / MOTION dominant
     75–90%  car continues its path
     90–100% settle below the message, hero unpins
   ============================================================ */
function initHeroTimeline() {
  const vh = (p) => () => innerHeight * p;
  const live = $('.coord.live');
  let lastReadout = -1;

  // viewport numbers cached on refresh (no layout reads while scrolling)
  const view = { w: innerWidth, h: innerHeight, k: 1 };
  const measure = () => { view.w = innerWidth; view.h = innerHeight; view.k = innerWidth < 760 ? 0.35 : 1; };
  ScrollTrigger.addEventListener('refresh', measure); measure();

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero', start: 'top top',
      end: () => '+=' + innerHeight * 5,       // 5 viewports: enough distance to perceive each movement
      pin: true, scrub: 1.2, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const n = Math.round(self.progress * 100);
        if (n !== lastReadout) { lastReadout = n; live.textContent = 'SCROLL ' + String(n).padStart(3, '0'); }
      },
    },
  });

  /* ---- CAR: one continuous path through keyframes (values blend, nothing stops at a stage boundary) ---- */
  const P = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1];
  const path = {
    x:     smoothCurve(P, [0, 0, 0.16, -0.02, -0.18, 0.06, 0]),   // × viewport width: right → across → left → settle
    y:     smoothCurve(P, [0, 0, 0.02, 0.05, 0.07, 0.075, 0.075]), // × viewport height: eases down toward the camera
    scale: smoothCurve(P, [1, 1, 1.05, 1.14, 1.16, 1.06, 1]),
    rotY:  smoothCurve(P, [0, 0, -5, 2, 7, -3, 0]),                // gradual: 0 → −5 → 2 → 7 → −3 → 0
    rotX:  smoothCurve(P, [0, 0, 2, 6, 5, 2, 0]),
    rotZ:  smoothCurve(P, [0, 0, -1.2, 0, 1.4, -0.4, 0]),
    persp: smoothCurve(P, [1000, 1000, 900, 700, 650, 850, 1000]), // perspective tightens, then relaxes
  };
  const car = $('.car-scroll');
  const pos = { p: 0 };
  tl.to(pos, {
    p: 1, duration: 1,
    onUpdate: () => {
      const p = pos.p;
      gsap.set(car, {
        x: path.x(p) * view.w * view.k, y: path.y(p) * view.h, scale: path.scale(p),
        rotationX: path.rotX(p), rotationY: path.rotY(p), rotationZ: path.rotZ(p), transformPerspective: path.persp(p),
      });
    },
  }, 0);

  tl
    /* ---- PARALLAX: all continuous, full-length, linear. grid 0.08 < decoration 0.2 < text < car ---- */
    .to('.layer-bg', { y: vh(-0.08), duration: 1 }, 0)
    .to('.layer-deco', { y: vh(-0.2), duration: 1 }, 0)
    .to('.rings', { rotation: 90, scale: 1.5, duration: 1 }, 0)
    .to('.coord, .mark', { y: (i) => -innerHeight * (0.1 + i * 0.015), duration: 1 }, 0)
    .to('.wheel', { rotation: 1080, duration: 1 }, 0)
    .to('.scroll-cue', { opacity: 0, duration: 0.1 }, 0)

    /* ---- TEXT: overlapping cross-fade (old and new are both partly visible at ~38–50%) ---- */
    .to(['.eyebrow', '.tagline'], { opacity: 0, y: -10, duration: 0.18 }, 0.12)
    .to('.line-1', { xPercent: -8, duration: 0.4 }, 0.15)
    .to('.line-2', { xPercent: 8, duration: 0.4 }, 0.15)
    .to('.headline', { opacity: 0, y: -34, duration: 0.24 }, 0.26)               // 26–50%
    .to('.stat', { y: -22, scale: 0.97, opacity: 0, stagger: 0.04, duration: 0.16 }, 0.25)  // carried away with the scroll
    .fromTo('.reveal', { opacity: 0 }, { opacity: 1, duration: 0.16 }, 0.38)     // 38–54%
    .fromTo('.rl > span', { yPercent: 70 }, { yPercent: 0, ease: 'power1.out', duration: 0.22, stagger: 0.05 }, 0.38)
    .to('.reveal', { y: vh(-0.02), duration: 0.62 }, 0.38)                       // slow continuous drift

    /* ---- LIGHT & ENVIRONMENT: gradual, long ranges ---- */
    .to('.glow', { scale: 1.6, duration: 0.6 }, 0.2)
    .to('.car-beam', { opacity: 1, duration: 0.45 }, 0.3)
    .to('.layer-deco', { opacity: 0.25, duration: 0.4 }, 0.6)
    .to('.layer-bg', { opacity: 0, duration: 0.3 }, 0.7);

  return tl.scrollTrigger;
}

/* ---------- Progress rail (01 / 03), section index, active nav ---------- */
function initProgressAndNav(heroST) {
  const bar = $('.progress'), idx = $('.p-idx');
  let current = 0;
  const setSection = (n) => { if (n !== current) { current = n; idx.textContent = '0' + n; } };
  setSection(1);

  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (s) => {
      bar.style.setProperty('--p', s.progress.toFixed(3));             // scoped to the rail, not :root
      if (heroST && heroST.isActive) setSection(heroST.progress < 0.58 ? 1 : 2);
    },
  });
  ScrollTrigger.create({ trigger: '.outro', start: 'top 60%', onEnter: () => setSection(3), onLeaveBack: () => setSection(2) });

  // active link follows the section in view
  $$('.nav a').forEach((link) => {
    const target = $(link.getAttribute('href'));
    ScrollTrigger.create({
      trigger: target, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => link.setAttribute('aria-current', self.isActive),
    });
  });
}

/* ---------- Second section: scroll-triggered reveals ---------- */
function initOutroReveals() {
  gsap.from('.outro-head > *', {
    y: 50, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '.outro-head', start: 'top 80%', toggleActions: 'play none none reverse' },
  });
  gsap.set('.feature', { y: 50, opacity: 0 });
  ScrollTrigger.batch('.feature', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12 }),
    onLeaveBack: (els) => gsap.to(els, { y: 50, opacity: 0, duration: 0.5 }),
  });
  gsap.from('.outro-foot', { opacity: 0, y: 30, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.outro-foot', start: 'top 92%' } });
}

/* ---------- Mouse: subtle, on separate wrappers so it never fights the scroll transforms ---------- */
function initMouse() {
  gsap.set('.car-mouse', { transformPerspective: 900 });
  const setters = [
    ['.car-mouse', 'rotationX', -5], ['.car-mouse', 'rotationY', 7],
    ['.glow-mouse', 'x', 20], ['.glow-mouse', 'y', 20],
    ['.deco-mouse', 'x', -8], ['.deco-mouse', 'y', -8],
  ].map(([sel, prop, amt]) => ({ amt, prop, to: gsap.quickTo(sel, prop, { duration: 1.3, ease: 'power3.out' }) }));

  addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    setters.forEach(({ amt, prop, to }) => to((prop.endsWith('X') || prop === 'y' ? ny : nx) * amt));
  }, { passive: true });
}

/* ---------- Car asset: use assets/car.webp or assets/car.png when present, else keep the SVG ---------- */
function loadCarImage() {
  const art = $('.car-art');
  const sources = ['assets/car.webp', 'assets/car.png'];
  const tryNext = () => {
    const src = sources.shift();
    if (!src) return;
    const img = new Image();
    img.onload = () => { img.className = 'car-art'; img.alt = 'Premium sports car in side profile'; art.replaceWith(img); ScrollTrigger.refresh(); };
    img.onerror = tryNext;
    img.src = src;
  };
  tryNext();
}

/* ---------- Idle float: drives only .car (its own wrapper). Amplitude fades to 0 while scrolling, so scroll always wins. ---------- */
function initIdleFloat() {
  if (reduceMotion) return;
  const car = $('.car');
  const amp = { v: 1 }, wave = { t: 0 };
  gsap.to(wave, { t: 1, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1,
    onUpdate: () => gsap.set(car, { y: -9 * amp.v * wave.t }) });
  ScrollTrigger.addEventListener('scrollStart', () => gsap.to(amp, { v: 0, duration: 0.35, overwrite: true }));
  ScrollTrigger.addEventListener('scrollEnd', () => gsap.to(amp, { v: 1, duration: 1.4, delay: 0.5, ease: 'power1.inOut', overwrite: true }));
}
