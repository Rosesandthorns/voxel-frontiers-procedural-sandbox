# Biome account service setup

Configured Supabase project: bbcemiampedeyskxprlx (Free, West US).
Email/password sign-up and email confirmation are enabled. Anonymous sign-in is disabled.
Applied migration: migrations/202610290001_biome_profiles.sql.
Verified row-level security, three policies, and the unique lower(username) index in the hosted database.

Profiles contain only permanent Auth user IDs, public usernames, and server timestamps.
Usernames allow 3–20 ASCII letters, digits, or underscores and are unique ignoring case.
Authenticated players may read public profiles, insert their own profile, and update only their own username.
Clients cannot change account IDs or timestamps, delete profiles, or access private Auth email/password data through this table.
The launcher must claim a username after email verification and handle unique conflicts atomically via the database.

The project URL and public client key are in .env.local; no database password or privileged key was copied.
Desktop Discord PKCE sign-in and username selection are implemented. Discord provider is enabled and the exact local launcher redirect http://127.0.0.1:43821/auth/callback is saved in Supabase. Real sign-in still requires interactive verification.

Remaining external setup:
- No SMTP needed for the selected Discord-only sign-in flow; do not expose email/password registration in the launcher.
- Production sign-up CAPTCHA and final desktop recovery/verification redirect configuration, once the launcher callback is implemented.
- EOS product/deployment and Windows SDK for relay-only multiplayer; Supabase accounts need a separately verified EOS identity integration.
- User-owned GitHub release repository for launcher version management.

Never put service-role keys, SMTP passwords, database passwords, or signing private keys in the launcher.
