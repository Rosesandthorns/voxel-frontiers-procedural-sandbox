# Biome pre-beta design and implementation order

The user authorized publication as Biome 0.3.0 — Bigger Than Ever, including the later chest, HUD, item-icon and creature-texture changes. Structure previews must be shown before publishing; both have now been captured and shown.

## Current local slice

- Generation 4 mountain terrain adds much greater vertical relief and narrower connected ridges, with normal/snow/desert variants and existing rare summit groves. The preview summit reaches Y381. Visual tuning remains ongoing.
- Chunks retain dense occupied terrain and sparse 16-block vertical sections for distant blocks. Format-2 saves omit trailing empty height and empty sections; absent space is air. Legacy format-1 chunks remain readable. There is no gameplay build-height ceiling; JavaScript coordinate/graphics precision and bounded message sizes still apply.
- Rendering meshes occupied 160-block bands without scanning gaps, and supplies vertical boundary planes to avoid internal faces between bands.
- New version-4 terrain uses matching birch/juniper logs and leaves. Willow log/leaves use consistent display names without changing their saved block IDs.
- Removed the generic any-plank oak-door recipe; oak doors require oak planks.
- Guest generation requests survive host-camera queue pruning/cancellation. Repeat Windows firewall prompts are still under investigation; no firewall rules/settings were changed.
- Mountain ranges now choose their base climate once per range, preventing a snowy range from changing into desert halfway across. Rare summit groves remain possible within normal ranges.
- Fixed disappearing terrain on revisits: unloading no longer empties voxel buffers still referenced by pending saves. Recovered the two missing chunks in the live preview from their intact saved data.

## Implemented locally: survival and workshops

- Hunger grace period/rate, breath and drowning, falls, cacti, starvation, healing and respawning. Saved player state includes hunger/breath. Multiplayer clock messages include their rate so clients use the host/server's day length.
- Blocked vertical sunlight and occluded, budgeted torch light; torch crafting and floor support. Sand-to-glass smelting already existed.
- World-time food freshness, stale nutrition, spoiled food and separate stacking for food with different deadlines/preservation. Food ages in player inventory, furnace input/output and when dropped food is collected.
- Persistent cauldrons: water, flower/leaf dyes, chalk dyeing, one-day vinegar fermentation, and vinegar preservation. Chalk makes thin floor markings; chalk plus flint makes the existing chalk block.
- Persistent drying racks: raw hide becomes leather; raw meat becomes non-spoiling jerky after a quarter day. Racks require a floor; breaking the rack or its floor clears its saved contents and returns its ingredient/output. Dedicated-server and hosted multiplayer route those contents to the breaking player.
- Validated with TypeScript, the regression suite, rendered workshop/survival checks, server restart checks, and two real local TLS clients sharing a cauldron and breaking a loaded rack. Account identity is mocked in the TLS test; live EOS/internet play was not part of these checks.

Still required before beta: survival/inventory are client-reported rather than fully server-authoritative; workshop requests need durable transaction recovery for disconnects during an interaction. Lighting currently has vertical skylight and propagated torch light, with limited horizontal indirect skylight through nearby openings. Workshop models are functional prototypes. Generation-5 villages and mountain fortresses, inhabitants with door interactions, new wildlife/darkness creatures, species meat/cooking/hide drops, 16 wood-specific chests and shared wooden boats are implemented. The 0.3.0 release candidate includes these additions; the already-running older preview is not automatically replaced.

## Next: complete and verify the foundation

Run rendered high-altitude building/save/reload and two-client sparse-chunk transfer tests. Audit remaining fixed-height simulation assumptions, high-altitude snow/fluid initialization, and memory/meshing budgets. Keep old explored terrain unchanged; apply later generation only to new chunks with transition blending.

## 1. Lighting and survival

- Sunlight is blocked by terrain/building blocks, with plants, leaves and glass passing light. Torches emit local light. Actual light values drive darkness-based spawning.
- Hunger does not drain during the first three world days; from day four it drains 45 percentage points per in-game day. At 95% or higher, health regenerates slowly.
- Underwater oxygen/breath, drowning, starvation, fall damage, and damage from touching/breaking cacti. Persist player survival state and make the host/server authoritative.
- Food has freshness that advances with world time, including while held or stored. Vinegar preservation consumes some vinegar and prevents further spoilage. Jerky never spoils and restores less hunger than cooked meat.
- Smelt sand into glass. Add cauldrons with persistent contents, water/ingredient recipes for dyes and vinegar, and consistent interactions in multiplayer.
- Chalk plus one flint crafts the existing chalk block. Chalk places a thin white ground marking; dyed chalk places its matching color. Dye chalk using a dye-filled cauldron.

## 2. Structures and inhabitants

- Deterministic, rare villages with several biome-specific house designs, terrain-fitting foundations and paths connecting houses. Add docks at suitable shorelines.
- Villagers have no economy/jobs yet; they can navigate, open doors and close them after passing. Persist their identity/location and synchronize them to guests.
- Much rarer mountain-only fortresses: large stone/cobblestone castles with their own inhabitants. Use shared structure placement and pathfinding foundations.
- Avoid structures that overwrite existing chunks or player builds; plan whole footprints before stamping across chunk borders.

## 3. Wildlife and hostile creatures

- Passive: arctic penguins; mountain wolves; village pigeons/cats; desert snakes/rats; additional ocean fish/deep-sea squid; cows/pigs/sheep across suitable land biomes; coastal seagulls that can perch on sand and the water surface.
- Slimes in several colors: slow movement toward players, spawning only in complete darkness.
- Shadow Reapers: spawn after day three in complete darkness, very hostile, dark bodies/glowing eyes, cannot be struck, and disappear into smoke in light. Their specified smoke death is the exception to ordinary animal meat drops.
- Ordinary killable animals drop species-appropriate meat; raw/cooked forms support cooking and eating.
- A drying rack converts raw hide into leather and meat into non-spoiling jerky. Leather has no use yet.

## 4. Storage and travel

- Chests for each wood type, crafted from four matching planks. Persistent contents, per-player access synchronization, and safe break/drop behavior.
- Wooden boats with familiar steering, buoyancy, boarding/exiting and multiplayer synchronization.

## Beta acceptance checks

Save/reload continuity for every new state; two-player host/guest behavior and disconnect recovery; dedicated-server parity; no generation overwrites; bounded streaming/meshing work; accessible recipes/items; visual inspection of structures and mountain silhouettes. No public release until the user asks.

## 0.3.0 release candidate

- Hunger replaces the old separate stamina meter and value; health is red and hunger yellow, with breath shown when depleted. Legacy stamina saves migrate when no survival state exists.
- New creatures have deterministic 32×32 procedural pixel textures. Item icons include code-generated pixel silhouettes and fallbacks for missing image assets.
- Chests show storage above the player's backpack and hotbar. Click/drag transfers stacks, right-click transfers one; shared operations are serialized by host/server. Full inventory insertion is atomic and respects stack limits.
- Placing, boarding, moving and dismounting boats do not write water or terrain blocks. Tool durability has visible meters, attack/mining/hoe wear, breakage and strictly increasing lifetime by tier.
- Villages clear natural tree cover without overwriting previously explored terrain. Mountain fortresses select a flatter nearby mountain shoulder. Generation 1–4 chunks remain unchanged; new chunks use generation 5.
- Current limits: basic villager navigation (no economy/jobs), client-reported survival/inventory, and workshop operations do not yet have a durable cross-disconnect transaction ledger. This is an early development update, not completion of all beta acceptance criteria.
