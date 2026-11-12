# Testing on the iOS simulator

Verify every UI change on the simulator: screenshot the state you changed and compare it with `design/MOBILE_DESIGN.md`. Type checks do not show layout, glass, keyboard, or sheet behaviour.

## Run the stack

1. Backend: `bun run dev:backend` from the repo root starts the local Convex deployment on `:3210`, with HTTP actions on `:3211`. AI features need `OPENROUTER_*` set on that deployment. An HTTP 402 from OpenRouter means the key is out of credit, and every reply, helper answer, and image then fails.
2. Metro: `cd apps/mobile && bunx expo start --dev-client`.
3. App: `bunx expo run:ios --device <udid>` the first time and after native changes; afterwards relaunch with `xcrun simctl launch <udid> com.anonymous.multiplayer-cooking`.

The dev client builds its Convex URL from Metro's host. When the Mac's LAN IP changes, the app shows offline; re-point it with `xcrun simctl openurl <udid> "exp+multiplayer-cooking://expo-development-client/?url=http%3A%2F%2F<ip>%3A8081"`.

## Drive the device

- In T3 Code, open the simulator with the `device_open` tool and drive it with the `agent-device` CLI it returns (`snapshot -i`, `click @eN --settle`, `fill`, `press x y` in points, `scroll`, `back`). Refs from `snapshot -i` beat coordinates.
- Screenshots: `xcrun simctl io <udid> screenshot /tmp/<name>.png`. agent-device waits for the UI to go idle, so screens with continuous animation (shimmer, skeletons, the kit gallery) are faster to check with simctl screenshots.
- Larger text: `xcrun simctl ui <udid> content_size extra-extra-large`; reset with `large`.
- The dev client's floating gear sits over the top-right header buttons and steals taps. Turn off "Tools button" in the dev menu (Cmd+D). If the dev menu will not close, run `xcrun simctl terminate <udid> com.anonymous.multiplayer-cooking` and relaunch.
- Sheets dismiss when a swipe starts on their header, and when a `fill` taps outside a fit-to-contents sheet. In those sheets, use `press` and then `type`.

## Deep links

`+native-intent.tsx` maps incoming URLs:

- `multiplayer-cooking://cook/<roomId>#invite=<token>` and `https://<web-origin>/cook/<roomId>#invite=<token>` open the join screen with the invite.
- `multiplayer-cooking://silpo?…` is the Сільпо OAuth return.
- `multiplayer-cooking://kit` opens the dev kit gallery.

Open a link with `xcrun simctl openurl <udid> '<url>'`, then tap "Open" on the iOS prompt.

## A signed-in session without a phone OTP

Сільпо login needs an OTP on the account owner's phone. On a **local** deployment that already has a connected account, attach the simulator's session to that account instead:

1. In the app, tap "Підключити Сільпо", then cancel the browser. `startConnect` has now created a session row for this device.
2. Add a temporary internal mutation `convex/devAdoptSession.ts` that patches the newest `sessions` row: `ctx.db.query("sessions").order("desc").first()`, then `ctx.db.patch(session._id, { userId })`.
3. Push it, run it with `bunx convex run devAdoptSession:adoptLatestSession '{"userId":"<connected user id>"}'`, delete the file, and push again. Find the user id in the `silpoConnections` table; print only ids, never tokens.

Never commit the mutation, and never run it against a cloud deployment.

## Cost guardrails

The backend is real. Every chat send, plan generation (with up to six reference images), and helper message is a paid OpenRouter call, limited to 5 per minute and 40 per day per host. Reuse existing threads and rooms from History, use the `/kit` fake stream to check streaming UI, and use a 25-second manual timer to test timer firing. "Додати в кошик" writes to the real Сільпо cart.
