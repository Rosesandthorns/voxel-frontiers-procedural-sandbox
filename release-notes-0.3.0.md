Biome 0.3.0 — Bigger Than Ever

Download Biome-0.3.0-win-x64.zip, extract it, and run Biome.exe. Existing players can use Versions → Check for updates → Download selected → Play this version. Worlds stay in the local Biome saves folder, and the launcher backs them up before switching versions.

- Taller, connected mountain ranges with stable normal, snowy and desert climates, rare summit groves, and sparse vertical chunk storage. Explored chunks retain their original terrain; new generation blends at older boundaries.
- Rare villages with biome-specific materials, several house layouts, connecting paths, shoreline docks and villagers that open and close doors. Mountain-only fortresses have towers, battlements, a central keep and inhabitants. Structures avoid terrain explored before generation 5.
- New wildlife: penguins, wolves, pigeons, cats, snakes, rats, cod, tropical fish, deep-sea squid, cows, pigs, sheep and coastal seagulls. Models use procedural pixel textures. Animals drop species meat; cooking improves nutrition. Suitable animals also drop hide.
- Slimes appear in complete darkness. After the third world day, Shadow Reapers can appear in darkness; they cannot be struck and dissolve into smoke when exposed to light.
- Red health and yellow hunger meters. Hunger replaces the separate stamina value: no drain for the first three world days, then 45 percentage points per day. Added breath/drowning, falls, cacti, starvation and slow healing at high hunger.
- Blocked sunlight, local torch light and limited indirect skylight through openings. Craft torches from charcoal and a plank; sand already smelts into glass.
- Food freshness, stale nutrition and spoilage. Ferment vinegar in a water-filled cauldron to preserve food. Cauldrons also mix dyes and color chalk; chalk draws thin ground markings, and chalk plus flint crafts a chalk block.
- Drying racks turn raw hide into leather and raw meat into non-spoiling jerky. Workshop contents and deadlines persist.
- Sixteen matching wood chest types, each crafted from four matching planks. The chest UI shows storage above your backpack and hotbar. Click/drag transfers a stack; right-click transfers one. Contents persist and are shared in multiplayer; breaking storage returns its contents once.
- Wooden boats: place on existing water, right-click to board, W/S to paddle, A/D to steer, Shift to dismount. Boats never create water. Shared boarding ownership prevents two players from controlling the same boat.
- Tool durability bars, attack/mining/hoe wear and breakage. Higher-tier tools last longer. Added pixel-art item icons and generated fallbacks for missing image assets.
- Fixed empty chunks after revisiting an unloading chunk, retained generation requests around guests, synchronized day rates, and added dedicated-server support for the new workshops, creatures, chests and boats.
- Consolidates every 0.3.x improvement into this definitive 0.3.0 build, including the corrected version label, fixed oxygen HUD layout, polished slime expression and full seagull flight.
- New players and respawning players now search nearby dry ground instead of appearing underwater or in rivers. Dedicated servers use the same dry-land rule.
- Block edits invalidate both in-flight and completed-but-not-yet-shown chunk meshes, so broken blocks disappear and placed blocks appear reliably, including at chunk borders.
- Torch lighting keeps the last complete light map while recalculating, propagates across loaded chunk boundaries, and remeshes only after the replacement map is ready.

This is an early development update. Villager navigation is basic and has no jobs or trading. Survival and inventories are still client-reported; a durable transaction ledger for interrupted online workshop transfers remains future work. Use matching game versions for multiplayer. The Windows distribution includes the previously approved restricted EOS player-client credential, SDK library and license; account sign-in tokens and administrative credentials are not included.

Validation: TypeScript/build, dry-land spawn selection, stale-mesh rejection, cross-chunk lighting, save/terrain/performance/network regressions, rendered chest and boat controls, creature rendering, legacy-world continuity and dedicated-server tests. Public internet/EOS play is not covered by the automated local TLS tests.
