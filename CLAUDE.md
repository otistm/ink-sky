# Ink Sky: notes for Claude Code

Ink Sky is a No Man's Sky-like exploration game drawn like a paper-and-ink cartoon. It's a sister game to Ink Nine (`../ink-nine`), Ink Rally (`../ink-rally`) and Ink of Arms (`../ink-of-arms`) and shares their look, fonts and way of working. You land on planets nobody has seen, mine them, name the creatures, and warp star to star to the galaxy's core.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Google Fonts.
- `index.html`: the front page (a ringed ink planet turning, a moon, a ship crossing, and a Play button).
- `play/index.html`: the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope (`"use strict"` at the top of each). Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on tap, per frame) can use anything.
- `manifest.webmanifest`, `sw.js`, `icons/`: home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.
- `tools/check.js`: tests the universe without a browser. Run `node tools/check.js`.

| File | What's in it |
|---|---|
| config.js | `VERSION` |
| core.js | Maths helpers and seeded randomness (`RNG`, `ri`, `pick`). No page, so Node can load it |
| gen.js | The universe with no drawing: journeys, weather, watchers, upgrades, story lines, monolith lines, names, star systems (planets, moons, the trading station and its deals), plants, creatures, and where everything stands on a planet (`planetLayout`: zones, blocks, places to find, ground marks). Tuning numbers live at the top |
| art.js | Ink drawings on canvas: the explorer, the ship, rocks, sodium bulbs, shard spires, the five plant kinds, creatures (built from their generated shape), watcher drones, planets from space, boulders, cliffs, big trees (one per weather), pools, wrecks, pods, monoliths, caves, ground marks, birds, the station; thumbnails for cards; SVG icons and the trophy |
| ui.js | The canvas, scene state `S`, screens, overlay cards (`sheet`), `anim`/`squash`/`nope`, floating numbers, callouts and hints |
| state.js | The journey in progress `G`, the save, rebuilt star systems (`sysOf`), upgrade helpers, one-time tips (`tipOnce`) |
| surface.js | On a planet: input (drag to walk, tap to go), walking round things (`walkBy`), mining, scanning, places to find (`usePoi`), creatures, birds, watchers, weather and the suit, the ship landing and taking off, the HUD, and all the drawing |
| space.js | In orbit: the system chart (planets on their own orbits, moons round their planet, the station on its own orbit), flying to a planet or docking, warping, the core, and the home screen's sky |
| screens.js | Home, journey intro, arriving at a star, how to play, pause, catalog, your ship, the trading station, upgrade picks, a failed suit, reaching the core, the new-species card, and the button wiring |
| main.js | The paper wipe between scenes, the main loop, startup (always last) |

## How it plays
- A journey is a line of stars to the core: The Near Arm (4 stars), The Long Dark (6), The Core (8). Each is harsher (`harsh`: shields wear faster) and watched more closely (`watch`) than the last. Reaching the core wins that journey's trophy and opens the next. The home screen only shows the next locked journey.
- You start crashed on the first planet with an empty tank. Taking off costs 25 fuel; ferrite gives 2 fuel each. Landing is free. Warping takes a warp cell, built from 40 warp shards.
- Every star has 3 or 4 planets, and each planet (except the one you crash on) has a 40% chance of a moon. A planet has weather (calm, scorched, frozen, toxic, stormy), a watcher level (none, few, watchful, hostile), 1 to 4 species, 1 or 2 kinds of plant, and a few black shard spires. You can walk 78 m from your ship.
- Moons are `airless`: a slow shield drain, no life, no plants, few watchers, rich rock and 5 to 8 spires. They sit in `planets` like any other world, with `moonOf` set to their planet's index.
- The land: each planet has 5 to 8 zones (groves, rocky fields, water, open ground). Groves get big trees and most of the plants, rocky fields get boulders and more rocks, water zones get pools (ice pools can be walked on; water, acid and tar can't). Every planet also has 2 to 4 flat-topped cliffs. Nothing blocks within 12 m of the ship. `walkBy` slides you and the creatures round them, and a tap you can't walk to gives up.
- Places to find: usually a monolith (10 warp shards and a line of story), 1 or 2 wrecks (ferrite and shards), 1 or 2 supply pods (carbon and sodium), and caves on harsh or stormy worlds. Caves shelter you like the ship. Used places are remembered by id (1000 and up) in `G.dep`, alongside mined things.
- Every star has a trading station with 3 deals from `TRADES` (each can be made 3 times) and one suit upgrade for 60 warp shards. Trades used are kept in `G.trade`, keyed by star and deal; `G.dock` says the ship is parked at the station.
- Input: drag to walk, tap a thing to go to it, press and hold still to fire the jetpack (drag while holding to fly). A press becomes the jetpack after `JET_HOLD` (0.28 s); releasing sooner is a tap. In the air you move 1.7× faster and fly straight over blocks; you can't mine or scan until you land. The tank (`SF.jet`) empties in about 2.5 s and refills on the ground; once empty it waits until it's a quarter full. Landing on a block steps you off to its edge. Shift or J on a keyboard.
- Mining: plants give carbon (refills life), spiky bulbs give sodium (recharges the shield), rocks give ferrite (fuel), black spires give warp shards. Tap the carbon or sodium chip to use it.
- Weather wears the shield down; when it's empty, life drains. Standing by your ship shelters you and recharges both. Stormy planets are quiet until a storm hits. A failed suit wakes you by your ship with half of what you carried gone. Taking off refills the shield.
- Scanning a creature for about 2 s names the species and pays 5 warp shards. Naming every species on a planet offers a pick of 3 upgrades that last the journey (`UPGRADES`).
- Mining raises the watchers' alert. When it's full, drones come, zap your shield, and follow you. Tap one to shoot it down (6 warp shards), or outrun them.
- Everything about a planet comes from the journey's seed, so it's the same every time you land. Mined things are remembered by id in `G.dep`.
- The check: `node tools/check.js` makes 150 journeys of each kind and fails if any star can't pay for the next warp cell, any planet has too few rocks to take off, anything stands outside the map or inside a boulder, cliff, tree or pool, or anything blocks the landing pad. `makeSystem` tops up spires so every star has at least 52 shards in easy reach. Re-run it after changing numbers and tell Otis what moved.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. Run `node tools/check.js`.
4. Test locally: run `python -m http.server 8020` in the repo folder and open http://localhost:8020/play/ at a phone size (390 × 844). Arrow keys or WASD walk on a computer, Space scans, E boards. Also check a tall, wide screen (a foldable, about 640 × 860).

## Protect players' saved progress
Progress is kept in the browser's localStorage. An update must never wipe or break it.
- `inksky-save`: `{ trophies: [bool, bool, bool], species, planets, tips: {} }`, one trophy per journey by position. Add new journeys at the end.
- `inksky-run`: the journey in progress, `G` as-is (`v: 1`). New fields get defaults in `loadRun()` (0.2.0 added `trade` and `dock`). If you change the shape in a way a default can't cover, bump `v` and make `loadRun()` convert or ignore older ones. It's saved every few seconds on a planet, on every landing, take-off and warp, and whenever the page is hidden.
- Never rename a key or remove a field; add new fields with defaults.
- Never rename an upgrade `id` or a weather key; saved journeys store them.
- **Changing anything in gen.js that uses the random numbers changes planets for journeys in progress** (names, layouts, and which ids `G.dep` points at). Tell Otis when that happens.

## Look and feel (same as Ink Nine, Ink Rally and Ink of Arms; keep it consistent)
- Paper and ink only: white `#fff` and black `#000`, with grey `#5c5c5c` only for secondary text. Never color. Things are told apart by ink: warp shards are the only solid-black thing you mine, the shield bar is hatched and the life bar solid, locked journeys are dashed, shadows on the ground are hatched.
- Outlines are clean 2–2.5px black lines with hard offset shadows (7px 8px on panels, 4px 5px on event cards and hints, 3px 4px on chips and buttons). On the canvas, `inked()` in art.js does the same for every drawing. No blur, no soft gradients.
- Fonts: Fraunces (display, italic 900 for titles and names, upright 800/900 for numbers) and Figtree (UI, 600–800).
- Shared components copied from the sister games: `.panel`, `.btn` and `.btn.ghost`, `.event`, `.board`, `.srow`, `.how`, `.prog`, `.award` and the trophy, the round pause button.
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out. The ship crouches before take-off and squashes on landing; the explorer hops out.
- Mobile first, portrait, one thumb. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, numbers as digits, no jargon.

## Smoke test
- The front page shows the ringed planet turning and a Play button. Play opens the home screen with Journey I open and II locked (dashed).
- Journey I shows its intro card with the star pips and the core. Step out: the explorer hops out beside a crashed, smoking ship, and the planet's name is called out.
- Dragging walks, with a dashed ring under your thumb. Tapping a rock walks there and mines it: the beam, a progress ring, "+8 ferrite", and the Ferrite chip bumps.
- Tapping a creature scans it: a dashed cone, "Scanning", then the new-species card slides down with its drawing and +5 warp shards.
- The scan button pulses a ring and tags shard spires, and puts a "?" over unnamed creatures.
- Walk away: a "Ship · 34 m" tag at the screen edge points home. Board your ship: its card shows fuel, ferrite, shards and cells. Take off: it crouches, lifts off in a puff of dust, and a paper wipe opens on the star chart.
- On the chart, tap a planet for its card; Fly there and land brings the ship down on a new world with its own ground and weather.
- Build a warp cell, then Warp: ink streaks fly past and the next star's card shows the story line.
- On a watched planet, mine spires until the eye fills: watchers arrive and zap you. Tap one to shoot it down.
- Press and hold: a ring fills under your thumb, then the explorer lifts off with a flame under the pack and a gauge beside them. Drag while holding to fly over a boulder; let go and they land clear of it. The gauge refills and disappears.
- Walk into a boulder or cliff: you slide round it. Tap a wreck: you walk there and salvage it. Tap a monolith: its card opens with a line of story. Stand in a cave's mouth on a harsh world: the dashed ring shows and the shield recharges.
- On the chart, a planet with a moon says "1 moon" under its name; land on the moon and it's dusty and lifeless. Tap the station: the ship docks and the trading card opens; a deal takes the resources, gives the shards, and loses a dot.
- Pause, then Save and go to the home screen: the journey card says where you stopped. Refreshing comes straight back.
- No errors in the browser console.
