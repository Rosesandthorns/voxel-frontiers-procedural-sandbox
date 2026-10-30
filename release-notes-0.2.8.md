Biome 0.2.8 fixes world continuity and online joins.

- Online worlds keep simulating while the host or a guest opens a menu. Host windows no longer use Chromium background throttling.
- Local worlds now save their live time, calendar, season, weather transition/schedule, mob health/taming/AI state and wildlife spawn history. Dedicated servers save their own clock/calendar/weather across restarts.
- EOS now listens for incoming relay connection requests. World headers retry until acknowledged, and identity/transport failures produce clearer join errors.
- Automatic version checks continue while the launcher is open, and downloaded updates show an Update ready label.

In Biome 0.2.7, open Versions and choose Check for updates, or restart the launcher with automatic downloads enabled. Select 0.2.8, download it, then choose Play this version. Both multiplayer participants should update.

For a manual install, extract the complete Windows ZIP and run Biome.exe. Do not move only the executable. Existing saves stay in the Biome application-data folder; switching versions through the launcher backs them up first.

Server operators can use Start server.cmd. The separate biome-server.cjs and checksum are compatible with the server's update staging mechanism.

Validation: automated regression suite; rendered leave/rejoin with night/weather/calendar/tamed-mob persistence; rendered online pause simulation using a transport fixture; real-account EOS private relay-lobby lifecycle; local certificate-pinned dedicated-server joins. A real two-account Internet relay session remains unverified. Earlier versions never recorded some runtime state, so historical missing values cannot be recovered. Dedicated-server wildlife AI remains future work.
