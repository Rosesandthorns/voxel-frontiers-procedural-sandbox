# Desktop EOS configuration

The distributable contains the EOS SDK game-client ID and client secret. These are extractable by players and are not an authorization boundary. No Supabase service-role key, Discord application secret, player login token, or trusted-server credential belongs in a build.

Audited in the Epic developer portal on 2026-10-29: Biome Desktop client `xyza7891wwZFLc1zJO59rxGfGJNUZ5uP` uses the custom **Biome multiplayer** policy with **User required** enabled. Only `lobbies:connect`, `lobbies:readLobby`, `lobbies:findLobbies`, `lobbies:findLobbiesByUserId`, and `lobbies:findInvitesByUserId` are enabled. All other feature permissions are disabled. Player identity is separately verified through Supabase and EOS account mapping.

Epic distinguishes player clients from trusted servers and warns never to ship trusted-server client credentials in public game builds: https://dev.epicgames.com/docs/epic-online-services/eos-fundamentals/client-and-client-policy/client-policy-guide

`scripts/validate-eos-client.mjs` rejects a different client ID or unexpected configuration fields before packaging. It cannot inspect the remote policy; re-audit the portal after policy changes. Do not expand this client's permissions for administrative or trusted-server work.
