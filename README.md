# ITZ FIZZ — Motion / Redefined
Scroll-driven automotive hero built with **HTML, CSS, vanilla JavaScript, GSAP + ScrollTrigger**. No build step, no backend.

> **Demo content:** the statistics (85% Performance, 92% Efficiency, 78% Experience), coordinates and copy are fictional and for presentation only.

## Run locally
Open `index.html`, or serve the folder: `npx serve .`

## Deploy to GitHub Pages
1. Push this folder to a GitHub repo (branch `main`).
2. Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`.
3. Live at `https://<username>.github.io/<repo>/`.

## Car asset
The car is an inline SVG by default. To use a photo, add a **transparent** `assets/car.webp` (or `car.png`), side profile facing right, ~1600px wide. `main.js → loadCarImage()` swaps it in automatically; the animation logic is unchanged.

## How the scroll animation works
`js/main.js → initHeroTimeline()` builds one GSAP timeline (length 1) bound to a pinned ScrollTrigger (`end: +4 viewports`, `scrub: 1`). Tweens sit at fractions of scroll progress, so scroll position — not time — drives everything and scrolling up reverses it.

| Progress | Car | Type / UI |
|---|---|---|
| 0–15% | centered, lower band | WELCOME / ITZ FIZZ + stats, no overlap |
| 15–40% | drifts right, slight rotateY/Z | eyebrow + tagline leave, headline spreads |
| 40–65% | crosses left, larger, perspective 1000→600 | stats gone, headline fading, **BUILT / FOR / MOTION** rises (top band) |
| 65–87% | swings back right | message dominant, headlights + glow brighten |
| 87–100% | settles centered below the message | grid recedes, hero unpins into section 2 |

Layering: background/grid/decor (0) → large type (1) → car (2) → stats/cue (4) → nav/progress (40+). Type sits in the top band and the car in the lower band, so the car only grazes the type for depth.

Wheels rotate with scroll distance. Parallax: grid ≈ 0.2x, rings/labels ≈ 0.5x, car ≈ 1x.
Transform separation: `.car-mouse` (pointer, `gsap.quickTo`) › `.car-scroll` (scrub) › `.car-float` (intro) › `.car` (idle float).

## Structure
`index.html` · `css/style.css` · `js/main.js` (preloader → intro → ScrollTrigger → parallax → nav/progress → mobile → reduced motion) · `assets/`

## Performance & accessibility
Only `transform`/`opacity` animate; ScrollTrigger only (no scroll listeners); refresh after fonts, load, intro and asset swap; mouse effects only on fine pointers; `prefers-reduced-motion` disables preloader, intro, pin, scrub, float and mouse while keeping all content visible.
