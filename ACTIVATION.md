# Multiplayer activation status

The game and command-line server are implemented and packaged, and dedicated-server account joins are active. Friends-world identity and private lobby activation are also verified. No server has been publicly exposed.

## 1. Friends worlds: active through Supabase UserInfo

The original JWT/JWKS path rejected EC-signed tokens because Epic's validator required RSA. This was resolved without rotating the signing key: the existing EOS OpenID provider now validates tokens through the same Supabase project's authenticated `GET /auth/v1/user` endpoint.

The endpoint was tested with a real account token and returns its verified UUID. Forged and missing tokens are rejected. EOS maps the response's `id` as the external account identifier. The non-private `role` field is used only for EOS's internal display label; the game always resolves the actual unique Biome username from the verified UUID in `biome_profiles`.

Live native tests passed for EOS Connect login, external-account mapping matching the actual Biome UUID, private lobby creation, forced-relay configuration and lobby leave. The obsolete RSA-only client check has been removed. No RSA key or signing-key rotation is needed. The current Supabase signing key was not changed; the unused ECC standby key created during setup can remain unused.

This verifies the real identity/lobby lifecycle. A two-account Internet P2P session still needs testing; simulated transport and two rendered TLS clients have passed separately.

## 2. Dedicated servers: single-use join tickets

Installed and tested migration: `supabase/migrations/202610290003_server_tickets.sql`.

It creates a private table of SHA-256 ticket hashes with player UUID, destination certificate fingerprint and a 60-second expiry. Authenticated users may issue their own tickets. An anonymous server may redeem a matching one-use ticket for a public username/UUID; it cannot list the table or redeem a ticket for another fingerprint. Server code never receives the user's account bearer/refresh token. Each user has at most 10 outstanding tickets. Redemption deletes the matching ticket atomically.

The user explicitly approved the table and anonymous one-use redemption function. The migration is installed. Transactional database tests passed for the private table, issuer binding, wrong-server denial, valid redemption, replay denial, expiry and the outstanding-ticket limit. All test users and tickets were rolled back.

A real Biome account successfully refreshed its existing isolated sign-in session, obtained a production join ticket, joined a local certificate-pinned TLS server, loaded nine exact chunks and left cleanly. No account access or refresh token was sent to the custom server. The earlier two-client rendered fixture tests cover remote avatars, shared edits and disconnect/menu handling. A two-account Internet session is still not verified.

## Further release work

- Publish GitHub release assets `biome-server.cjs` and `biome-server.cjs.sha256` to activate real server updates. Update selection, checksum rejection and safe staging were tested with fixtures.
- Add authoritative wildlife interactions/server AI and stronger movement/inventory validation before public competitive play.
- The main-menu Versions launcher supports selecting published client versions, checksum-verified installs and world backups before launching another version. Client release assets must be named Biome-VERSION-win-x64.zip and Biome-VERSION-win-x64.zip.sha256. No compatible client release has been published by this task; the install path is tested with release fixtures.

## 0.2.8 continuity fixes

Incoming EOS relay requests are now subscribed before accepting peers. The world handshake retries headers until acknowledgement and reports identity failures. Native lobby activation passes; a real two-account Internet transfer still needs verification. Multiplayer hosts continue simulation under menus and disable Chromium background throttling. Local saves now include live time, the full calendar/weather schedule, mob state and spawn history. Dedicated servers persist their own calendar/weather/clock instead of deriving time from the operating-system clock. Older saves without these fields use defaults; unsaved historical state cannot be recovered.
