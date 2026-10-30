Biome 0.3.1 fixes Windows version switching and deletion.

- Version handoffs now wait for the previous game and its native helper processes to exit, then start from Biome's stable data folder. Desktop shortcuts also use that working directory.
- An inherited old-version working directory is repaired automatically at startup.
- Deleting a version first moves its complete folder out of service. A busy folder remains intact, with a clear message instead of a raw EBUSY error.
- Files temporarily held by Windows are cleaned up on a later launch. Worlds, backups and account data are not deleted.

Update through Versions → Check for updates → download 0.3.1 → Play this version. This patch retains the Bigger Than Ever gameplay content.
