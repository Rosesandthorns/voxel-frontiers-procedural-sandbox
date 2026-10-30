Biome 0.3.2 — Slime rework and world polish

- Reworked all four slime colors with a beveled jelly silhouette, translucent gel, matched inner-core colors, pixel highlights, and the approved open O-mouth expression. Added subtle idle motion and grounded squash/stretch for jumps and landings; colors and vertical movement synchronize to guests.
- Improved creature facial features, leg/hoof pivots, species details, pixel-texture filtering and idle/walk motion. Animals flee after hits. Shared host/server movement now uses smoother turning, idle pauses, home ranges, obstacle probes, cliff avoidance and swept vertical collision. Hostile attacks cannot pass through walls; villagers avoid closing doors onto players.
- Structures reserve space before trees and surface vegetation, with a small clearing and canopy margin. No more placing trees inside villages and cutting them afterward.
- Houses gain sealed roof ends, timber framing, simple furnishings and planted entrances. Fortresses gain wall walks, courtyard stairs, tower doorways, arrow windows, crenellations and approach steps.
- Unexplored terrain uses generation 6. Existing chunk files remain unchanged. Generation-5 code/blueprints remain available, including continuation of partially explored generation-5 structures across new chunk borders.

Download Biome-0.3.2-win-x64.zip, extract it and run Biome.exe, or use Versions → Check for updates → download 0.3.2 → Play this version. The Windows launcher fix from 0.3.1 is included. Worlds are backed up when switching versions.

Validation includes TypeScript/build, regression tests, slime model/material/animation checks, creature collision and door safety, tree exclusion, old-blueprint continuation and rendered previews. Creature navigation remains local steering rather than global pathfinding. Older fantasy mobs with no spawn rule have not been added to natural spawning in this update.
