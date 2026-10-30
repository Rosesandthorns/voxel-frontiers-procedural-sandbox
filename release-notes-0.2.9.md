Biome 0.2.9 improves multiplayer movement, connection recovery and player locations.

- Remote players use buffered movement interpolation, smooth angle wrapping and short, bounded extrapolation for packet gaps. Movement packets are coalesced and sent ahead of bulk terrain instead of building up behind it.
- Hosts send an explicit goodbye when leaving. Guests also detect missing heartbeats after 15 seconds, even when EOS lobby membership remains stale. Disconnect notices take priority over queued gameplay events.
- Terrain requests retry lost responses. Missing chunks are rescheduled while standing still, with bounded downloads and cooldowns. Small control/movement packets can still decode while fragmented terrain transfers are incomplete.
- First-time visitors spawn at the saved world spawn. Returning visitors resume their own saved position and facing, keyed to their Biome account. Hosts and dedicated servers checkpoint locations during play and on leave/shutdown, independently of inventory saves.

Both players and dedicated-server operators should update. Use Versions → Check for updates, download 0.2.9 and choose Play this version. Automatic downloads use the same release assets and checksum verification.

Validation includes dropped initial handshake packets, dropped chunk response/retry, stale lobby membership, explicit host leave, missing heartbeat, first/returning player positions, server position persistence, interpolation and packet-fragment congestion regressions. A real two-account Internet relay session remains unverified; connection simulations and local TLS sessions cover these fixes.
