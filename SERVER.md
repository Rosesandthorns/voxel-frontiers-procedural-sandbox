# Hosting a Biome server

From Command Prompt in the game folder:

```cmd
"Start server.cmd" --name "Our mountain world" --max-players 8 --port 25570 --auto-update false
```

No Node installation is needed with the Windows game distribution. Source users can run `npm run build` then `npm run server -- --data ./server-data --name "Our world"`. A standalone bundle is built at `server-dist/biome-server.cjs` and can run with Node 22 or later.

The console prints local network addresses, the TCP port, and a SHA-256 certificate fingerprint. Clients use **Servers → Add server**, enter `host:port`, then compare and trust the fingerprint. Whitelisted players still need a Biome account. Connections use TLS 1.3 and one-use username tickets; the server never receives account access/refresh tokens.

**Account verification active:** the single-use server-ticket migration is installed and passed privacy, replay, expiry and destination-fingerprint tests. A real Biome account joined the local TLS server through the production ticket service, loaded exact world chunks and left successfully. There is no insecure offline-account mode.

Data lives beside the launcher in `server-data`, separate from single-player saves:

- `server.json`: name, bind address, port, maximum players, seed, update switch and access lists.
- `world/world.json`: generation history, player positions/inventories.
- `world/chunks/`: exact explored chunks, saved immediately when generated or edited.
- `server-key.pem` and `server-cert.pem`: private transport identity. Keep the key private and retain these files when updating.
- `updates/`: verified release bundle staged for the next launch.

Console commands:

```text
help
list
name Our mountain world
limit 12
whitelist on
whitelist add Rosesandthorns
whitelist remove ExampleName
blacklist add ExampleName
blacklist remove ExampleName
kick ExampleName
save
reload
autoupdate true
stop
```

Lists accept Biome usernames (case-insensitive) or account UUIDs. UUIDs keep the same access if a player changes their name. The blacklist takes precedence. Access changes remove connected players who are no longer allowed. `reload` rereads the configuration; bind address and port require restart. Use `stop` or Ctrl+C for a clean shutdown. Player inventory is checkpointed by the client during autosave and before leaving; block edits are saved on the server immediately. This is an early cooperative sandbox, not a competitive anti-cheat server.

Automatic updates check the latest non-prerelease GitHub release at startup. They require `biome-server.cjs` and `biome-server.cjs.sha256` assets in the source repository's release. The download is checked against the SHA-256 asset and applied by the launcher on the next restart. Failed checks keep the installed server running. No compatible release has been published as part of this work. Configuration, certificates and worlds stay outside the executable bundle. Set `autoUpdate` false to pin your server; keep a copy of the previous bundle for rollback.

For LAN play, use the printed LAN address. Internet play needs a public address/DNS name and a reachable TCP port (25570 by default). This tool does not change your router, firewall, or create a public server. Direct-IP servers expose the server machine's address; use a dedicated host with DDoS protection for public hosting. Friends-world play uses forced EOS relays instead and does not require sharing a home-server address.

Current limits: client movement/inventory is trusted, no PvP moderation/anti-cheat, server-side wildlife simulation is not implemented, and a real two-account Internet test remains outstanding.

Each running server exclusively locks its data folder to prevent two processes writing the same world. For multiple servers, pass a separate `--data` folder and `--port` to each launcher. Stale locks from exited processes are recovered automatically; failed startup releases its worker and lock.
