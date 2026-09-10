# Interactive cooking

This document records the agreed product behaviour for the multiplayer cooking PR. Visual rules remain in [DESIGN.md](../DESIGN.md). The user selected the simplified mobile timeline in `design/mocks/cooking-timeline.html`. Recipe references use soft 3D for preparation and realistic photography for texture and doneness.

## Session and participants

One session coordinates one shared meal in one kitchen. Each cook may use a separate phone. Setup accepts 1–12 cooks, servings, and optional equipment or experience constraints. Cook count and portions are separate values.

The host starts from a saved idea. A guest opens an invite link, supplies a display name, and joins without an account. Guests can access the cooking session but cannot access the original conversation, memories, address, shopping account, or cart. The host can remove participants and close invitations.

The plan assigns balanced work automatically. Cooks can explicitly swap or take over work. Disconnecting a phone does not reassign its work. Continuing alone preserves completed work and active timers while making remaining work available to the remaining cook.

The host’s sessions remain in history. Existing guests can return from the same browser. Finishing a session closes new joins. “Cook again” creates a new session with fresh progress.

If a guest loses browser storage, the host removes the old place and invites them again. The host can explicitly transfer ownership before leaving. A host disconnect does not stop cooking or transfer authority automatically.

## What a cook sees

The personal view answers what to do now, who else is working, and what blocks the next task. The complete plan remains available throughout cooking. It includes all instructions, assignments, completed work, dependencies, shared steps, and upcoming work.

Solo plans follow a sequential flow. Timers remain visible while the cook reads upcoming instructions. Parallel plans separate active attention from elapsed time. One cook cannot be assigned two simultaneous tasks that both require attention.

Waiting names the actual dependency and its owner. A blocked cook can see other available work. The app does not invent progress estimates or mark food ready because a timer expires.

Shared steps require readiness from each assigned cook before starting. Either assigned cook can confirm completion. Handoffs require the receiving cook to confirm receipt. These confirmations update everyone’s view immediately.

The cook who completed a step or the host can undo it while no dependent step has started. Otherwise, the helper can propose a correction that preserves work already underway.

## Cooking controls

The agent selects validated controls from a supported set and writes Markdown guidance. Generated content cannot execute code or create arbitrary interface elements.

| Need | Control and behaviour | Example workflows |
| --- | --- | --- |
| Gather ingredients and equipment | Shared checklist with named items and amounts | Salad, soup, baking mise en place |
| Perform a task | Start and complete controls, assigned cook, optional sub-checklist | Chopping, kneading, assembling |
| Track elapsed time | Several named shared timers, start, pause, resume, add time, cancel, acknowledge | Pasta, roasting, chilling, proofing |
| Check a result | Explicit sensory or measurement confirmation with written criteria | Translucent onions, dough rise, sauce coating a spoon |
| See a technique | Recipe-specific reference image with text fallback | Cut size, texture, arrangement, finished dish |
| Coordinate | Named prerequisite, readiness, shared step, confirmed handoff | Drain pasta while another cook finishes sauce |
| Share equipment | Named equipment requirements and availability | One oven, limited burners, shared mixer |
| Change quantities | Serving adjustment before starting, reviewed future-work proposal afterwards | Larger batch, smaller pan |
| Convert units | Mass-to-mass, volume-to-volume, Celsius and Fahrenheit | Grams to ounces, millilitres to cups |
| Make a recipe decision | Explicit choice or substitution proposal that updates affected future instructions | Missing cream, oven versus stovetop |
| Remember something | Shared notes and checklists | Reserve pasta water, ingredient already salted |
| Get help | In-session AI explanation or preview of a proposed change | Sauce split, missing ingredient, uncertain texture |
| Stay oriented | Overall progress, participant activity, next task, persistent timer access | Multi-course meal or several parallel preparations |

Mass-to-volume conversion requires an ingredient-specific value. Heat settings and cooking times do not scale automatically with servings. A temperature reference displays a target, not a connection to a stove or thermometer.

Warnings and doneness criteria stay in the instructions beside the affected action. Images illustrate appearance and cannot certify food safety. Timers remind cooks to check food, not declare it safe.

## Recipe cases

| Workflow | Orchestration requirement |
| --- | --- |
| No-cook meal | Ingredient preparation can run in parallel before assembly |
| One-pot meal | Respect ingredient order and attention at the stove |
| Pasta and sauce | Coordinate separate components and a time-sensitive handoff |
| Roast with sides | Share oven space and temperature, overlap unattended cooking with prep |
| Bread and pastry | Separate mixing, resting, repeated folds, proof checks, and oven batches |
| Frying or pancakes | Track repeated batches without treating all batches as simultaneous |
| Chilled dessert | Keep chilling timers visible after active preparation ends |
| Several dishes | Track component prerequisites and shared equipment before final assembly |
| Missing ingredient | Explain alternatives and preview affected work before applying a change |
| Participant leaves | Preserve work and timers, offer explicit takeover or solo continuation |
| Network interruption | Retain the last received plan and countdowns, disable shared edits until reconnection |

Specialised preservation or other safety-sensitive methods need specific, reliable instructions. The helper must not invent a safe process from a generic timing or appearance control.

## AI changes and images

Every cook can ask the helper and approve a proposed change. The helper can explain without changing the plan. Recipe changes require a visible preview and explicit approval. The selected active step can receive revised cooking instructions while completed work, checked actions, assignments, and timers remain intact.

Approval refers to the previewed plan revision. If another action makes the proposal stale, the app requests an updated proposal. Concurrent approvals cannot apply the same proposal twice.

Up to six useful step references generate automatically with the plan. A cook can request additional references for steps that have a reference brief. The readable plan is available independently of image generation. Image failures have inline retry controls. Decorative artwork uses the established soft 3D kitchen family and remains distinct from recipe references.

All cooks can request additional images and AI help within shared session limits. The host-level AI budget bounds aggregate usage across guests.

## Mobile behaviour

Layouts must work at 390px and narrower, with large controls, visible keyboard focus, normal scrolling, and reduced motion. Active timers remain reachable while reading another step. The app offers optional sound and screen wake lock where supported.

This PR uses in-app reminders. It does not require closed-app push notifications. The last received plan and countdowns remain readable during a network interruption. Shared actions are disabled until connected, and the app reconciles with server state on return.

Browser wake locks can be released when the document becomes hidden or the device declines the request. See [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

## Design selection and delivery

The user compared three layouts, rejected the dense personal dashboard and kitchen board, and selected a simplified recipe timeline. The accepted direction keeps one task expanded and opens tools in a mobile drawer. Reference style selection is complete: soft 3D for prep and arrangement, photography for texture and doneness.

Delivery ends at a reviewed, verified GitHub PR. Merging and production deployment are outside this request’s endpoint.

Verification combines Convex integration tests with a local host-and-guest browser session. It covers plan validation, solo ordering, dependency release, readiness, handoff receipt, role changes, timer state transitions, stale AI proposals, removed guests, closed invitations, and reconnecting. Live provider generation requires configured OpenRouter credentials and is not part of the local browser evidence. Mobile and laptop screenshots use real components and clearly identified sample data where live generation is unavailable.
