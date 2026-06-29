# Building & distributing Velq

Velq ships as native installers built with `tauri build`, auto-updates from GitHub
Releases, and registers itself for `.velq` / `.md` / `.html` files. This covers the
release machinery (plan §12, M19).

## Local build

```sh
make build           # → apps/desktop/src-tauri/target/release/bundle/
```

Produces a `.app` + `.dmg` on macOS, `.msi` + NSIS `.exe` on Windows, `.deb` +
`.AppImage` on Linux. Because `bundle.createUpdaterArtifacts` is on, the build also
emits a compressed updater artifact and its `.sig` — these need the signing key:

```sh
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.velq/velq.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
```

## Auto-updates

The updater (`tauri-plugin-updater`) polls the endpoint in
[`tauri.conf.json`](../apps/desktop/src-tauri/tauri.conf.json) →
`plugins.updater.endpoints`:

```
https://github.com/iKora128/velq/releases/latest/download/latest.json
```

Each release publishes a `latest.json` mapping every platform to a signed artifact.
The client verifies the download against the embedded **minisign public key** before
applying it, so a release can only update Velq if it was signed with the matching
private key.

- **Frontend UX** lives in [`update/updater.ts`](../apps/desktop/src/update/updater.ts):
  a silent check ~3 s after launch that only speaks up if something is available, plus
  a **Check for updates…** command. Updates are a single calm toast with an
  *Install & restart* action — never a modal. Install calls `downloadAndInstall()`
  then `relaunch()` (`tauri-plugin-process`).

### One-time signing key

```sh
make keygen          # writes ~/.velq/velq.key (private — keep it secret)
                     # prints the public key → paste into plugins.updater.pubkey
```

Store the private key + password as the `TAURI_SIGNING_PRIVATE_KEY` /
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` repo secrets for CI.

## File associations

`bundle.fileAssociations` registers three types:

| Extension          | Role   | Opens as                          |
| ------------------ | ------ | --------------------------------- |
| `.velq`            | Viewer | isolated zero-capability viewer   |
| `.md`, `.markdown` | Editor | editable document (folder adopted as vault) |
| `.html`, `.htm`    | Editor | editable document                 |

Double-click / "Open with" delivery is platform-specific and handled in
[`lib.rs`](../apps/desktop/src-tauri/src/lib.rs): macOS fires `RunEvent::Opened`
(possibly before the webview exists, so paths are stashed in `OpenedFilesState`);
Windows/Linux pass paths as launch argv. The frontend pulls them on mount via the
`get_opened_files` command and also listens for the runtime `files-opened` event. A
plain document adopts its containing folder as the vault so siblings and Save work; a
`.velq` opens straight into the sandboxed viewer.

## Releasing

```sh
make release         # patch-bump every manifest, commit, tag vX.Y.Z, push
```

The pushed tag triggers [`.github/workflows/release.yml`](../.github/workflows/release.yml),
which builds the matrix (macOS arm64 + x86_64, Windows, Linux) via `tauri-action`,
signs the updater artifacts, and publishes the installers **and** `latest.json` to the
GitHub Release. Provide the Apple secrets (`APPLE_SIGNING_IDENTITY`, `APPLE_ID`,
`APPLE_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_CERTIFICATE*`) for a notarized macOS build;
without them the macOS bundle is ad-hoc-signed (fine for local use, Gatekeeper-warned
elsewhere).
