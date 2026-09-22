# ONE MORE

Hold. Release. One more.

A one-button timing game — web, TypeScript, Canvas 2D.

## Play

```bash
npm install
npm run dev
```

Controls: **Space** / **click** / **touch** — hold to move, release on the target.

## Modes

| Mode | Rule |
|------|------|
| Classic | One miss ends the run |
| Zen | Misses don't kill; 30 hits → complete |
| Perfect | Only PERFECT / ULTRA continue |
| Speed | Hard ramp from the start |
| Chaos | All pattern types, seeded |
| Endless | Chase highest score |
| Daily | Shared UTC seed |

## Scripts

```bash
npm test        # Vitest
npm run build   # Typecheck + production bundle
npm run preview # Serve dist/
```

## Deploy

Static site — drop `dist/` anywhere, or:

```bash
npm run build
# Vercel / Netlify: connect this folder (configs included)
# GitHub Pages: upload dist/ (base is ./)
```

Offline shell via service worker in production builds.

## Accessibility (Settings)

- Reduced motion
- Vibration toggle
- Timing ghost (visual release aid)
- Colorblind shapes (hatch / X on fakes)
- No audio cues (mutes SFX, forces timing ghost)

## Cosmetics

Unlock themes and sound packs (DEFAULT / CRYSTAL / SOFT / PUNCH) via achievements — no pay-to-win.

## Controls

| Device | PRIMARY_ACTION |
|--------|----------------|
| Keyboard | Space · Enter · Z |
| Mouse / Touch | Hold |
| Gamepad | A / Cross · X · RT |

## Stack

Vite · TypeScript · Canvas 2D · Web Audio · localStorage · Vitest

No gameplay power-ups. Cosmetics only (themes / achievements).

## Philosophy

> One button. One decision. One more.
