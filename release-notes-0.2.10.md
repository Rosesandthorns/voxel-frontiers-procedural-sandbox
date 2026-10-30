Biome 0.2.10 fixes launcher version persistence and adds downloaded-version removal.

- Playing an installed version records it for the next startup. Fixed launchers forward to that selection instead of reopening their own older build.
- Packaged Windows builds create/update the Biome desktop shortcut to the running or selected executable. After playing 0.2.10 once, use that Biome shortcut instead of an old shortcut or a direct 0.2.7 executable.
- Versions now includes Delete for downloaded versions that are not currently running. Removal is restricted to verified version folders; worlds, backups and accounts are kept. Removing a remembered selection falls back to the running game.

Update through Versions → Check for updates → Download selected → Play this version. Launch 0.2.10 once to refresh the desktop shortcut. Existing 0.2.7 executables cannot acquire new startup behavior themselves; the updated shortcut provides the persistent entry point.

Validation covers persisted startup selection, downgrade selection, removal/fallback, running-version protection, traversal rejection and preservation of world files/backups, plus the rendered download/delete UI.
