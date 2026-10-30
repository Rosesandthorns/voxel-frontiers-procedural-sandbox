# Biome — 0.3.2

A local Windows voxel sandbox based on [Rosesandthorns/voxel-frontiers-procedural-sandbox](https://github.com/Rosesandthorns/voxel-frontiers-procedural-sandbox), originally downloaded at commit `a8f712bf5671e704e3ed709919fb4f810ab0e6e6`.

The [0.3.1 launcher hotfix](release-notes-0.3.1.md) corrects Windows version switching and deletion while retaining the Bigger Than Ever gameplay content.

## Play

Download `Biome-0.3.2-win-x64.zip` from GitHub Releases, extract the entire folder and run `Biome.exe`. Keep the executable with its resources. The in-game **Versions** screen downloads, installs and switches versions, and backs up worlds before switching. **Open saves folder** opens local world files. The Windows build is unsigned.

See [0.3.0 release notes](release-notes-0.3.0.md) for mountains, villages/fortresses, textured wildlife, survival, workshops, storage, boats, durability and item icons. Existing explored chunks retain their generation; unexplored chunks use generation 6 and blend at older terrain boundaries.

## Development

```sh
npm install
npm run desktop
npm run lint
npm test
npm run package:win
```

The optional browser preview uses `npm run dev`. The desktop app uses local Electron resources and saves; GitHub hosts version downloads. Player accounts use the configured Supabase project and private friend worlds use the EOS relay.

## Servers and accounts

[SERVER.md](SERVER.md) covers dedicated hosting, access lists and updates. The Windows distribution includes **Start server.cmd**, so hosting does not require a separate Node installation. [ACTIVATION.md](ACTIVATION.md) describes account setup; [EOS-CREDENTIALS.md](EOS-CREDENTIALS.md) describes the restricted, extractable EOS player-client credential approved for distribution. Administrative credentials and player sign-in tokens do not belong in builds or source control.

## Development status

This is an early development update. Villager navigation is basic; there are no jobs or trading. Survival and inventories remain client-reported, and interrupted online workshop operations need durable transaction recovery. See [PRE-BETA-DESIGN.md](PRE-BETA-DESIGN.md) for acceptance checks and remaining hardening work.
