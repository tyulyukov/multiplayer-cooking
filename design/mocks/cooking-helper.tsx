import { useState } from "react";
import { createRoot } from "react-dom/client";
import type { ComponentProps } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { CookingHelper } from "../../src/components/cooking/cooking-helper";
import { CookingSession, type CookingActions, type CookingRoomData } from "../../src/components/cooking/cooking-session";
import { useAttachments } from "../../src/lib/use-attachments";
import "../../src/index.css";

const mode = new URLSearchParams(location.search).get("mode") ?? "reply";
const now = Date.now();
const plan = {
  servings: 2,
  summary: "Паста з томатами та креветками",
  ingredients: [
    { id: "pasta", name: "Паста", amount: "200 г" },
    { id: "tomatoes", name: "Томати", amount: "300 г" },
    { id: "chili", name: "Перець чилі", amount: "½ шт." },
  ],
  equipment: [],
  steps: [
    { id: "prep", title: "Підготувати овочі", body: "Помий помідори та наріж їх кубиками.", kind: "task" as const, slots: [1], dependsOn: [], activeMinutes: 3, equipment: [], checklist: [], timers: [] },
    { id: "sauce", title: "Приготувати томатний соус", body: "Прогрій оливкову олію. Додай томати, часник і чилі, готуй 5 хвилин на середньому вогні.", kind: "task" as const, slots: [1], dependsOn: ["prep"], activeMinutes: 5, equipment: [], checklist: [{ id: "oil", label: "Прогріти олію" }], timers: [] },
    { id: "pasta", title: "Зварити пасту", body: "Відвари пасту в підсоленій воді. Залиш трохи води для соусу.", kind: "task" as const, slots: [2], dependsOn: [], activeMinutes: 2, equipment: [], checklist: [], timers: [] },
  ],
};
const nextPlan = { ...plan, ingredients: plan.ingredients.filter((item) => item.id !== "chili"), steps: plan.steps.map((step) => step.id === "sauce" ? { ...step, body: "Прогрій оливкову олію. Додай томати й часник, готуй 5 хвилин на середньому вогні. Перець чилі не додавай." } : step) };
const me = { _id: "member-host" as Id<"cookingMembers">, name: "Оля", role: "host" as const, status: "active" as const, slots: [1], lastSeenAt: now };
const initialData: CookingRoomData = {
  serverNow: now,
  room: { _id: "room-fixture" as Id<"cookingRooms">, source: { title: "Паста з креветками", summary: plan.summary, body: "Готуємо пасту з томатами.", ingredients: plan.ingredients, servings: 2 }, cookCount: 2, requestedServings: 2, constraints: "", state: "cooking", lobbyCompletedAt: now - 10000, plan, planVersion: 1, inviteOpen: true, inviteExpiresAt: now + 86400000, createdAt: now, checkedIngredientIds: [] },
  me,
  members: [me, { ...me, _id: "member-guest" as Id<"cookingMembers">, name: "Аня", role: "cook", slots: [2] }],
  steps: plan.steps.map((step) => ({ stepKey: step.id, status: step.id === "prep" ? "done" : "active", slots: step.slots, readyMemberIds: [], checkedIds: [], startedAt: now - 10000 })),
  timers: [],
};
type Props = ComponentProps<typeof CookingHelper>;
const initialMessages: Props["messages"] = [
  { _id: "question", role: "user", authorName: "Оля", text: "Не хочу додавати чилі. Можна без нього?", createdAt: now - 2000 },
  { _id: "answer", role: "assistant", text: "Так, готуй без чилі. Соус буде м’якшим, час приготування той самий.\n\nЯкщо перець ще не додала, просто пропусти його.", createdAt: now - 1000 },
];
const initialProposal: Props["proposals"][number] = { _id: "proposal-fixture" as Id<"cookingProposals">, authorMemberId: me._id, status: "open", planVersion: 1, preview: "Приберемо чилі з інгредієнтів і з кроку приготування соусу.", plan: nextPlan, affectedStepKeys: ["sauce"], createdAt: now - 500 };

export function Fixture() {
  const [data, setData] = useState(initialData);
  const [open, setOpen] = useState(mode !== "closed");
  const [prompt, setPrompt] = useState("");
  const [chatRequestKey, setChatRequestKey] = useState(0);
  const [stepKey, setStepKey] = useState("sauce");
  const [busy, setBusy] = useState(mode === "busy");
  const [messages, setMessages] = useState<Props["messages"]>(mode === "empty" || mode === "closed" ? [] : mode === "long" ? Array.from({ length: 20 }, (_, index) => ({ ...initialMessages[index % 2]!, _id: `message-${index}`, createdAt: now - 30000 + index * 1000 })) : initialMessages);
  const [proposals, setProposals] = useState<Props["proposals"]>(["empty", "closed", "busy", "error"].includes(mode) ? [] : [initialProposal]);
  const [notes, setNotes] = useState<Props["notes"]>([]);
  const attachments = useAttachments(async () => { if (mode === "upload-error") throw new Error("Fixture upload failed"); return "fixture-photo"; });
  const ask: CookingActions["ask"] = (text, key) => { if (text) setPrompt(text); setStepKey(key ?? "sauce"); setChatRequestKey((key) => key + 1); setOpen(true); };
  const actions: CookingActions = {
    online: true, busy: false, start: () => {}, wait: () => {}, ready: () => {}, complete: (key) => setData((current) => ({ ...current, steps: current.steps.map((step) => step.stepKey === key ? { ...step, status: "done" } : step) })), undo: () => {}, toggleChecklist: (key, id, checked) => setData((current) => ({ ...current, steps: current.steps.map((step) => step.stepKey === key ? { ...step, checkedIds: checked ? [...step.checkedIds, id] : step.checkedIds.filter((item) => item !== id) } : step) })), toggleIngredient: () => {}, timer: () => {}, addTime: () => {}, createTimer: () => {}, requestReference: () => {}, startSession: () => {}, finish: () => {}, retryGeneration: () => {}, invite: () => {}, managePeople: () => {}, ask, cookAgain: () => {},
  };
  return <>
    <CookingSession data={data} actions={actions} />
    <CookingHelper chatRequestKey={chatRequestKey} plan={data.room.plan!} contextStepKey={stepKey} onContextChange={setStepKey} messages={messages} proposals={proposals} notes={notes} loaded helperBusy={busy} helperError={mode === "error" ? "Fixture failure" : undefined} open={open} onOpenChange={setOpen} prompt={prompt} onPromptChange={setPrompt} online={mode !== "offline"} finished={mode === "done"} attachments={attachments}
      onAsk={async (text) => {
        if (mode === "send-error") throw new Error("Fixture send failure");
        setMessages((current) => [...current, { _id: crypto.randomUUID(), role: "user", authorName: "Оля", text, createdAt: Date.now(), attachmentUrls: attachments.items.map(() => "/images/cooking-prep-photo.webp") }]);
        setBusy(true);
        window.setTimeout(() => {
          setMessages((current) => [...current, { _id: crypto.randomUUID(), role: "assistant", text: "Так, можна без чилі. Продовжуй готувати соус із томатами та часником.", createdAt: Date.now() }]);
          setBusy(false);
        }, 2500);
        return true;
      }}
      onApprove={async (id) => { setData((current) => ({ ...current, room: { ...current.room, plan: nextPlan } })); setProposals((current) => current.map((item) => item._id === id ? { ...item, status: "approved" } : item)); return true; }}
      onReject={async (id) => { setProposals((current) => current.map((item) => item._id === id ? { ...item, status: "rejected" } : item)); return true; }}
      onNote={async (text) => { setNotes((current) => [...current, { _id: crypto.randomUUID() as Id<"cookingNotes">, authorMemberId: me._id, text, createdAt: Date.now(), canDelete: true }]); return true; }}
      onDeleteNote={async (id) => { setNotes((current) => current.filter((item) => item._id !== id)); return true; }}
    />
  </>;
}

createRoot(document.getElementById("root")!).render(<Fixture />);
