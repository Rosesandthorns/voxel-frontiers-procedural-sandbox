Biome 0.3.1 fixes Windows version switching and deletion, and block edits showing.

- Version handoffs now wait for the previous game and its native helper processes to exit, then start from Biome's stable data folder. Desktop shortcuts also use that working directory.
- An inherited old-version working directory is repaired automatically at startup.
- Deleting a version first moves its complete folder out of service. A busy folder remains intact, with a clear message instead of a raw EBUSY error.
- Files temporarily held by Windows are cleaned up on a later launch. Worlds, backups and account data are not deleted.
- Versions installed by an older launcher are recognised again: a version folder with the game files but no verification marker now lists as installed, plays, and deletes, instead of the launcher refusing to download, play, or delete it.
- Fixed blocks not updating visually when broken or placed: broken blocks could keep looking present and placed blocks could stay invisible, even though the game data was correct (items dropped, and you could walk through where a block had been). Edit remeshes now upload first while the world is loading, and a mesh worker that dies or never answers is replaced and its chunk re-queued instead of stranded.
- Includes the merged animal redo: better creature models, richer textures, livelier AI, streamlined fish and snake, and villagers with job outfits.

Update through Versions → Check for updates → download 0.3.1 → Play this version. This patch retains the Bigger Than Ever gameplay content.
