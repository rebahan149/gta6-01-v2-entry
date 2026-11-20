[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/rebahan149/gta6-01-v2-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/rebahan149/gta6-01-v2-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# CORAL KEY: HIGH TIDE

An original open-world driving-and-mayhem game set on **Coral Key**, a
tropical island city at golden hour — the sequel chapter: the tide has come
in, the districts have hardened, and this time you do not run alone.

You are Jules, a driver-for-hire with a borrowed name and a real crew now:
**Mico**, the mechanic who keeps the cars alive, and **Paloma**, the
wheelwoman who keeps *you* alive. Work eight story jobs, win street races,
and raise your **standing in every district** until the whole island —
all five districts of it — knows the crew's names.

**New in this chapter:** the crew system, per-district standing, street
races against named rivals, CKPD roadblocks at four stars, and AIR ONE —
the police helicopter whose searchlight owns the night sky at five.

## The island — five districts, five standings

- **Neon Strip** — pastel art-deco hotels and waking neon along the south waterfront.
- **Marina Del Sol** — boardwalk, moored yachts and the lighthouse point in the east.
- **Old Town** — a stone plaza, market stalls, the Iglesia del Mar and the old port in the west.
- **Downtown** — glass towers and the CKPD impound lot at the island's heart.
- **Ember Hills** — a basalt volcanic rim in the north: Mount Ember smoking
  over its lava cracks, rim villas, and the observatory watching the bay.

Every district keeps its own **standing meter** (HATED → LOVED) on the HUD and
the minimap: jobs and race wins there raise it, chaos and crimes lower it.

## Features

- **CREW system** — Mico and Paloma follow on foot with name tags and HUD
  health portraits; Paloma rides shotgun in your car, and Mico drives the
  crew's own pink Brisa GT in formation behind or alongside you.
- **8 story jobs** with dialogue, objective markers, timers, escapes and
  respect gating — from a first crew run to a four-star gold-car finale.
- **Street races** — three chequered-flag courses (Strip Sprint, Marina
  Loop, Ember Descent), 3-2-1 countdowns, checkpoint pillars, live position,
  and three rival drivers with rubber-band AI.
- **CKPD escalation theatre** — a 0–5 star wanted system with pursuit
  interceptors and officers on foot, a live dispatch radio ticker,
  **roadblocks with spike strips at 4★**, and at **5★ AIR ONE**, a helicopter
  whose searchlight cone never loses you. Bust and wasted states included.
- Free-roam on foot or in any car: traffic AI, carjacking, arcade drift handling.
- **Weapon wheel** — fists, pistol, SMG — with tracers, reloads and consequences.
- **Garage** — paint, engine and armour upgrades bought with job money.
- **Respect ranks** from NOBODY to ISLAND LEGEND, three synthesised radio
  stations, a district-tinted minimap, and localStorage saves.

## Controls

WASD walk/drive · Shift sprint · Space jump / drift · F enter or steal a car ·
E talk / enter race · Q weapon wheel (1/2/3 direct) · R reload · G garage ·
R (in car) radio · P pause · H help. Click the game to lock the mouse camera.

## Layout

- `game/index.html` — the page and every HUD element.
- `game/js/util.js` — namespace, seeded RNG, island layout, districts, standing, saves.
- `game/js/world.js` — the island: five districts, landmarks, palms, peds, dusk preset.
- `game/js/vehicles.js` — car factory, traffic, driving, carjacking, garage parts.
- `game/js/player.js` — the driver: movement, camera, entering cars.
- `game/js/crew.js` — Mico & Paloma: following, riding, the crew car.
- `game/js/police.js` — heat, pursuit, roadblocks, AIR ONE, dispatch.
- `game/js/combat.js` — weapons and shooting. `game/js/races.js` — street races.
- `game/js/missions.js` — the eight story jobs. `game/js/hud.js` — HUD, minimap, garage UI.
- `game/js/audio.js` — synthesised radio and effects. `game/js/main.js` — boot, loop, photo mode.
- `game/vendor/three.min.js` — the vendored three.js build (not our source).

Serve it locally with `node serve.ts`, then open http://localhost:8080.
Staged screenshot scenes live behind `?shot=cover|roadblock|race|crew`.

## License

MIT — see `LICENSE`.
