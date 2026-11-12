The iOS-first Expo client for Multiplayer Cooking. It has full feature parity with the web app's mobile view and talks to the same Convex backend. Android builds but is unpolished.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Run workspace checks from the repository root with `bun run check`; it typechecks this app, and Oxlint and Oxfmt cover it. From `apps/mobile`:

```bash
bunx expo install <package>  # always use this to add packages; it picks SDK-compatible versions
bunx expo start --dev-client # Metro for the development build
bunx expo run:ios            # rebuild the dev client after a native dependency or app.json plugin change
bunx expo-doctor             # diagnose dependency and config issues
```

`expo-doctor` reports duplicate `expo` copies under Bun's isolated installs. They are peer-set variants of one version; check an `expo export --dump-sourcemap` bundle for real duplicates before acting on it.

The app needs a development build; it does not run in Expo Go. In development the Convex URL is `http://<Metro host>:3210`, the local backend from `bun run dev:backend`. Set `EXPO_PUBLIC_CONVEX_URL` for any other deployment and `EXPO_PUBLIC_WEB_ORIGIN` for invite links (default `https://cooking.tyulyukov.com`).

Before testing on the simulator, read [docs/simulator-testing.md](docs/simulator-testing.md). It covers driving the device, linking a test session to a Сільпо account without a phone OTP, deep links, and the dev-client traps.

## Design

Use the `apple-design` skill for every mobile task: screens, components, navigation, and design review.

- `design/MOBILE_DESIGN.md` is the mobile spec: navigation map, component kit, type scale, haptics map, motion tokens, and every screen's states and copy. `apps/web/DESIGN.md` wins for colour and copy; the mobile spec wins for sizing, placement, navigation, and motion.
- `design/options.html` shows the alternatives considered for each screen, with the built option marked.
- Illustrations are one soft-3D family. Generate new ones to match: prompts and Blender scenes are in `design/assets-src/`.
- Glass appears only on the floating layer: native headers, the chat and helper composer, the timer dock, and the scroll-to-bottom button. Content uses outlines and inset shades, never drop shadows.
- Native bars and menus use SF Symbols; content uses Hugeicons Stroke Rounded.

## Architecture

- `src/app/` holds routes only; each file reads params and renders one feature component. The root `_layout.tsx` owns the providers (gesture handler, keyboard controller, Convex, `SessionProvider` backed by SecureStore) and the `Stack.Protected` guards on `api.silpo.connection`. Cooking routes under `cook/[roomId]/` stay outside the guards so guests can join without Сільпо.
- `src/features/<domain>/` holds `api/` (Convex hooks), `model/` (stateful hooks), `ui/` (components), and `lib/` (pure helpers). Domains are `chat`, `silpo`, `ideas`, `history`, `personalization`, and `cooking`.
- `src/shared/` holds the UI kit (`ui/`), hooks (`hooks/`), and libs (`lib/`). The dev-only route `/kit` (`multiplayer-cooking://kit`) renders every kit component in its states, including a fake stream of the paragraph reveal. Add new shared components to it.
- Pure logic that web also needs lives in `packages/core`, imported as `@multiplayer-cooking/core/<domain>/<file>`. Move a helper there with `git mv` instead of copying it. Tests live there too: `bun:test` files under `apps/mobile` break the mobile typecheck.
- The cooking room is one `RoomProvider` in `cook/[roomId]/_layout.tsx`. Every room screen and sheet reads `useCookingRoom()` / `useRoomData()` from `features/cooking/model/room-context` and runs mutations through its `invoke`, which carries the web's offline, locking, and error rules. Room state is never re-queried per sheet.
- Sheets are native `formSheet` routes with detents. Open one sheet at a time: to go from one sheet to another, dismiss with `useDismissThen()(next)` from `features/cooking/model/use-dismiss-then.ts`.

## Shared helpers to reach for

Reuse these instead of writing local equivalents:

- **Kit components:** `Text` (type roles), `Button`, `InkTag`, `Card`, `SignPlate`, `ChromeFrame`, `BlackBox`, `InlineAlert`, `EmptyState`, `Skeleton`, `ShimmerText`, `SheetHeader`, `Markdown`, `PhotoStrip`, `Stepper`, `Collapsible`, `SegmentedControl`, and `Composer` + `ComposerDock`.
- **Feedback and motion:** `haptics.*` (`shared/lib/haptics.ts`) follows the design haptics map and never throws. `entering`, `exiting`, `layout`, and `timing` from `shared/lib/motion.ts` all respect Reduce Motion.
- **Photos:** `useAttachments(upload)` picks, resizes to the backend limits, and uploads photos. `uploadImage` posts a local file to a Convex upload URL.
- **Connectivity and app state:** `useOnline()`, `useOffline()` (debounced), `useAppActive()`, and `useReducedMotion()`.
- **Storage:** SecureStore keys and readers live in `shared/lib/storage.ts`. Room credentials go through `features/cooking/lib/credential.ts`.
- **Streaming text:** `splitBufferedText` and `markdownBlocks` (`@multiplayer-cooking/core/chat/split-buffered-text`) give the paragraph-at-a-time reveal used by `features/chat/ui/assistant-text.tsx`.
- **Plurals:** `pluralize()` (`features/cooking/lib/session-view.ts`) and the formatters in `@multiplayer-cooking/core/ideas/idea-format`.

## Conventions

- Files are kebab-case with named exports. Styles go in `StyleSheet.create` at the bottom of the file, with tokens from `@multiplayer-cooking/theme`; hex values live only in the theme and the kit.
- Every pressable has a Ukrainian `accessibilityLabel`, a 44pt target, and a `maxFontSizeMultiplier` taken from the kit `Text` roles.
- Pass `{ sessionId }` explicitly to Convex calls, as the web does, and use `"skip"` while it is missing.
- Files under `ui/` export components only; constants go in `lib/`. This keeps fast refresh working.

## Gotchas

- Hermes has neither `Intl.RelativeTimeFormat` nor `Intl.PluralRules`, so write plurals by hand. `NumberFormat` and `DateTimeFormat("uk-UA")` work. RN has no `crypto.randomUUID`; use expo-crypto.
- Reanimated shared values use `sv.get()` / `sv.set()`; the React Compiler lint flags `.value`. A worklet that captures an object holding a ref crashes, so destructure first.
- Lint blocks `Date.now()` during render and `setState` inside effects. Keep clocks in refs (see `useRoomNow()`) and use `useEffectEvent`.
- Inside a `formSheet`, the `SheetHeader` and the `ScrollView` must be direct siblings (return a fragment). For a sticky footer, wrap both in `<View collapsable={false} style={{ flex: 1 }}>`.
- A text-size change while a screen is covered (pushed over, under a sheet) leaves that screen's text laid out at the old size: truncated or clipped. The kit `Text` and `Markdown` remount on `fontScale` to fix it, so render text through them, not RN `Text`. Reproduce by changing `content_size` while another screen is on top, then going back.
- A `TextInput` must keep its child index when its layout changes, or it loses focus and the keyboard.
- Uploading with RN `fetch` and a Blob gets a 400 from Convex; `uploadImage` uses `expo/fetch` with an expo-file-system `File`.
- `react-native-enriched-markdown` draws a blank frame for an image that fails to load; pass `noImages` where images are not wanted.
- `features/cooking/lib/timer-notifications.ts` installs the app-wide notification handler. Merge into it rather than adding a second one.

## Rules

- `expo-build-properties` `ios.enableSceneSupport` makes Xcode 27 builds adopt the UIScene lifecycle; without it the app crashes at launch on iOS 27. It is a no-op from SDK 58, so remove it on that upgrade.
- `ios/` and `android/` are generated (Continuous Native Generation) and gitignored. Configure native behaviour in `app.json` and config plugins; never edit those folders by hand.
- A new native module needs a dev-client rebuild (`bunx expo run:ios`) or `eas build --profile development`. Prefer recommended Expo modules over third-party libraries, and check the installed ones first. Docs: https://docs.expo.dev/versions/latest/index.md
- Build and ship with EAS: run `bunx eas-cli <command>`. Docs: https://docs.expo.dev/eas/index.md
