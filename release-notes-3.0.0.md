Biome 3.0.0 — Block edits show again

Download Biome-3.0.0-win-x64.zip, extract it, and run Biome.exe. Existing players can use Versions → Check for updates → Download selected → Play this version. Worlds stay in the local Biome saves folder, and the launcher backs them up before switching versions.

- Fixed blocks not updating visually when broken or placed: broken blocks could keep looking present and placed blocks could stay invisible, even though the game data was correct (items dropped, and you could walk through where a block had been). Two holes in the chunk-mesh pipeline caused it. First, finished edit remeshes waited behind every first-time terrain mesh while the world was still loading, so an edit's new mesh could sit unshown for a long time; edit remeshes now upload first, matching the priority they already had when being computed. Second, a mesh worker that died or never answered could leave its chunk stuck with its old mesh for the rest of the session; mesh requests now time out, the worker is replaced, and the chunk is re-queued instead of stranded.
- Includes the merged animal redo: better creature models, richer textures, livelier AI, streamlined fish and snake, and villagers with job outfits.

Validation: TypeScript/build, full test suite including a new regression test (an urgent edit remesh must upload before a first-time terrain mesh), and rendered break/place checks in the desktop app confirming broken and placed blocks update on screen.
