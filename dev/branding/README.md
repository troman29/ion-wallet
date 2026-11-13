# ION Wallet visual assets

The wallet app icon is **PRISM**: eight identical beveled crystal rays, spaced at
45 degrees around a centered aperture, with ice and amethyst reflections.
`dev/branding/prism.mjs` contains the shared geometry and export variants.
This artwork is separate from the ION coin and chain icons.

- `dev/branding/ion-prism.svg` / `public/icon.svg`: complete rounded app icon.
- `dev/branding/ion-mark.svg`: crystal mark on a transparent background.
- `dev/branding/ion-mark-mono.svg`: white silhouette for monochrome surfaces.
- `public/logo.svg`: circular in-app/QR version.

All SVGs contain vector paths and gradients, with no embedded bitmap or font.
The complete icon also uses a soft SVG shadow. Transparent native foregrounds
omit the glow and blur filters. The native background base is `#100C1F`.
At 16–32 px, two broader facets per ray replace subpixel bevel details while
preserving the same silhouette. The 28 px settings badge uses this variant too.

## Rebuild

```sh
npm ci
npm run build:branding
npm run check:branding
```

To rebuild only the app icons and inactive-tab artwork, without regenerating
cards or animations, run `npm run build:branding -- --icons-only`.

`sharp` is a pinned development dependency. The generator exports SVG, PNG, WebP,
ICO and ICNS for the web app, extension, QR codes, Electron and Capacitor shells.
It also exports matching Lottie/static illustrations, the inactive-tab artwork,
and card backgrounds without the inherited MyTonWallet monogram. Existing card
palette names and image dimensions are preserved.

The default balance card and account thumbnail use an accent-based ION Violet
gradient (`#8057D2` to `#6941C6`), including their SCSS fallback. Interface colors live in
`src/styles/variables.scss`: the light theme uses `#6941C6`, and the dark theme
uses `#B69AF6` with dark button labels. Theme-picker previews are SVGs in
`src/assets/theme` so both appearances reflect the same palette.

Action and navigation icons have their own colors inside TGS vector sources.
`node dev/branding/actionIcons.mjs .` updates all 20 light/dark variants from
the CSS palette and renders matching PNG previews with RLottie. This also runs
as part of `build:branding`, covering loading and reduced-motion states.

- Android adaptive foregrounds keep the mark inside the safe zone. Notification
  images are white on transparent; splash includes a dark disk for contrast.
- iOS app icons are opaque 1024 × 1024. The Icon Composer bundle contains one
  vector wallet layer.
- ICO contains 16–256 px PNG frames; ICNS contains 16–1024 px PNG representations.
- The previously referenced but missing Electron `icon-256x256.png` is exported.
- Animations and matching PNG previews use `ion_*` filenames describing their
  purpose (for example `ion_welcome`, `ion_guard`, and `ion_success`).
- `check:branding` loads all 13 generated animations in the application's actual
  RLottie WASM renderer, renders a frame, and checks the opaque iOS icon. Its
  contact sheet goes to `work/ion-animation-check.png` (or the CLI output path).

Mobile web bundles are derived outputs: build with `IS_CAPACITOR=1` and use
Capacitor copy/sync; do not edit their copied assets manually.

## Scope and review

This is the in-app rebranding pass. Store screenshots, listings, certificates,
published legal/help pages and production wallet registries remain external
release work. Replacing images does not establish those resources as ready.
The package/storage/protocol identifiers and dependency forks remain compatible.

Visual review covered the onboarding and About screens on desktop and 390 px
mobile layouts, in light/dark themes, plus generated icon/illustration sheets.
Live send/staking/bridge flows and native-device builds are separate checks.

## Technical naming compatibility

New launches use `ION_HEADLESS_BUNDLE_PAYLOAD_DIR` and `ION_GTK_VERSION`;
the corresponding `MTW_*` variables remain fallbacks when the new variable is unset.
`__ionStorageGlobals` and the legacy global name alias the same object, including
when an older bundle initializes it first. Active tabs write both `ion-active-tab`
and the legacy marker and check both, so mixed app versions still deactivate old
tabs. Neither marker is restored from Electron storage snapshots.
The legacy strings are compatibility aliases, not current branding. Dependency
names and wallet data formats are unchanged.
