import { CooksForm } from "@/components/cook-together";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { CookingSession } from "@/components/cooking/cooking-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CookingMarkdown } from "@/components/cooking/cooking-markdown";
import {
  createCookingCredential,
  inviteFromHash,
  readCookingCredential,
  saveCookingCredential,
} from "@/lib/cooking-session";
import { isConvexConfigured } from "@/lib/convex";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Proposal = FunctionReturnType<typeof api.cookingAssistance.listProposals>[number];

export const Route = createFileRoute("/cook/$roomId")({
  component: CookingRoomRoute,
});

function CookingRoomRoute() {
  const { roomId } = Route.useParams();
  if (!isConvexConfigured)
    return (
      <RoomNotice title="Кухня недоступна" body="Підключи Convex, щоб відкрити спільну сесію." />
    );
  if (!/^[a-zA-Z0-9]{16,}$/.test(roomId))
    return (
      <RoomNotice title="Посилання не працює" body="Перевір запрошення та відкрий його ще раз." />
    );
  return <CookingRoom key={roomId} roomId={roomId as Id<"cookingRooms">} />;
}

function CookingRoom({ roomId }: { roomId: Id<"cookingRooms"> }) {
  const navigate = useNavigate();
  const [sessionId] = useSessionId();
  const [credential, setCredential] = useState(() => readCookingCredential(roomId));
  const connection = useConvexConnectionState();
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [againOpen, setAgainOpen] = useState(false);
  const [helperRequested, setHelperRequested] = useState(false);
  const [helperPrompt, setHelperPrompt] = useState("");
  const online = browserOnline && connection.isWebSocketConnected;
  const read = useQuery(
    api.cookingRooms.read,
    credential ? { roomId, participantToken: credential.participantToken } : "skip",
  );
  const join = useMutation(api.cookingRooms.join);
  const recoverHost = useMutation(api.cookingRooms.recoverHost);
  const heartbeat = useMutation(api.cookingRooms.heartbeat);
  const startStep = useMutation(api.cookingSteps.start);
  const waitStep = useMutation(api.cookingSteps.wait);
  const ready = useMutation(api.cookingSteps.markReady);
  const complete = useMutation(api.cookingSteps.complete);
  const undo = useMutation(api.cookingSteps.undo);
  const toggleChecklist = useMutation(api.cookingSteps.toggleChecklist);
  const toggleIngredient = useMutation(api.cookingSteps.toggleIngredient);
  const startTimer = useMutation(api.cookingTimers.start);
  const pauseTimer = useMutation(api.cookingTimers.pause);
  const resumeTimer = useMutation(api.cookingTimers.resume);
  const cancelTimer = useMutation(api.cookingTimers.cancel);
  const acknowledgeTimer = useMutation(api.cookingTimers.acknowledge);
  const addTime = useMutation(api.cookingTimers.addTime);
  const createManualTimer = useMutation(api.cookingTimers.createManual);
  const startSession = useMutation(api.cookingRooms.startSession);
  const finish = useMutation(api.cookingRooms.finish);
  const retryGeneration = useMutation(api.cookingRooms.retryGeneration);
  const rotateInvite = useMutation(api.cookingRooms.rotateInvite);
  const closeInvite = useMutation(api.cookingRooms.closeInvite);
  const removeMember = useMutation(api.cookingRooms.removeMember);
  const transferHost = useMutation(api.cookingRooms.transferHost);
  const continueAlone = useMutation(api.cookingRooms.continueAlone);
  const leave = useMutation(api.cookingRooms.leave);
  const cookAgain = useMutation(api.cookingRooms.cookAgain);
  const takeover = useMutation(api.cookingSteps.takeover);
  const swapRoles = useMutation(api.cookingSteps.swapRoles);
  const memberArgs =
    credential && read ? { roomId, participantToken: credential.participantToken } : "skip";
  const notes = useQuery(api.cookingAssistance.listNotes, memberArgs);
  const proposals = useQuery(api.cookingAssistance.listProposals, memberArgs);
  const helperMessages = useQuery(api.cookingAssistance.listMessages, memberArgs);
  const addNote = useMutation(api.cookingAssistance.addNote);
  const askHelper = useMutation(api.cookingAssistance.askHelper);
  const approveProposal = useMutation(api.cookingAssistance.approveProposal);
  const rejectProposal = useMutation(api.cookingAssistance.rejectProposal);
  const deleteNote = useMutation(api.cookingAssistance.deleteNote);
  const requestReference = useMutation(api.cookingAssistance.requestReference);

  useEffect(() => {
    const update = () => setBrowserOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!credential || !online) return;
    void heartbeat({ roomId, participantToken: credential.participantToken }).catch(
      () => undefined,
    );
    const id = window.setInterval(
      () =>
        void heartbeat({ roomId, participantToken: credential.participantToken }).catch(
          () => undefined,
        ),
      20_000,
    );
    return () => window.clearInterval(id);
  }, [credential, heartbeat, online, roomId]);

  const invoke = async (call: () => Promise<unknown>) => {
    if (!online || pending) return;
    setError(null);
    setPending(true);
    try {
      const result = await call();
      if (result === false || result === null)
        setError("Стан кухні змінився. Перевір крок і спробуй ще раз.");
    } catch (failure) {
      setError(
        failure instanceof ConvexError && typeof failure.data === "string"
          ? failure.data
          : "Не вдалося синхронізувати зміну. Спробуй ще раз.",
      );
    } finally {
      setPending(false);
    }
  };
  const participantToken = credential?.participantToken;
  const actions = {
    online,
    busy: pending,
    start: (stepKey: string) =>
      participantToken && invoke(() => startStep({ roomId, participantToken, stepKey })),
    wait: (stepKey: string) =>
      participantToken && invoke(() => waitStep({ roomId, participantToken, stepKey })),
    ready: (stepKey: string) =>
      participantToken && invoke(() => ready({ roomId, participantToken, stepKey })),
    complete: (stepKey: string, confirmed: boolean) =>
      participantToken && invoke(() => complete({ roomId, participantToken, stepKey, confirmed })),
    undo: (stepKey: string) =>
      participantToken && invoke(() => undo({ roomId, participantToken, stepKey })),
    toggleChecklist: (stepKey: string, itemId: string, checked: boolean) =>
      participantToken &&
      invoke(() => toggleChecklist({ roomId, participantToken, stepKey, itemId, checked })),
    toggleIngredient: (ingredientId: string, checked: boolean) =>
      participantToken &&
      invoke(() => toggleIngredient({ roomId, participantToken, ingredientId, checked })),
    timer: (
      timer: { stepKey: string; timerKey: string },
      action: "start" | "pause" | "resume" | "cancel" | "acknowledge",
    ) =>
      participantToken &&
      invoke(() =>
        ({
          start: startTimer,
          pause: pauseTimer,
          resume: resumeTimer,
          cancel: cancelTimer,
          acknowledge: acknowledgeTimer,
        })[action]({
          roomId,
          participantToken,
          stepKey: timer.stepKey,
          timerKey: timer.timerKey,
        }),
      ),
    addTime: (timer: { stepKey: string; timerKey: string }) =>
      participantToken &&
      invoke(() =>
        addTime({
          roomId,
          participantToken,
          stepKey: timer.stepKey,
          timerKey: timer.timerKey,
          seconds: 60,
        }),
      ),
    requestReference: (stepKey: string) =>
      participantToken && invoke(() => requestReference({ roomId, participantToken, stepKey })),
    createTimer: (stepKey: string, label: string, seconds: number) =>
      participantToken &&
      invoke(() =>
        createManualTimer({
          roomId,
          participantToken,
          stepKey,
          timerKey: crypto.randomUUID().replaceAll("-", "").slice(0, 40),
          label,
          seconds,
        }),
      ),
    ask: (prompt = "") => {
      setHelperPrompt(prompt);
      setHelperRequested(true);
    },
    startSession: () =>
      participantToken && invoke(() => startSession({ roomId, participantToken })),
    finish: () => participantToken && invoke(() => finish({ roomId, participantToken })),
    retryGeneration: () =>
      participantToken && invoke(() => retryGeneration({ roomId, participantToken })),
    cookAgain: () => setAgainOpen(true),
    invite: () => {
      if (!credential?.inviteToken) return;
      void navigator.clipboard
        .writeText(`${window.location.origin}/cook/${roomId}#invite=${credential.inviteToken}`)
        .catch(() => setError("Не вдалося скопіювати посилання."));
    },
    managePeople: () => setPeopleOpen(true),
  };
  const [peopleOpen, setPeopleOpen] = useState(false);

  if (!credential)
    return (
      <JoinRoom
        roomId={roomId}
        sessionId={sessionId}
        inviteToken={inviteFromHash()}
        onJoined={setCredential}
        recoverHost={recoverHost}
        join={join}
      />
    );
  if (read === undefined)
    return <RoomNotice title="Відкриваємо кухню" body="Перевіряємо твоє місце." />;
  if (read === null)
    return (
      <JoinRoom
        roomId={roomId}
        sessionId={sessionId}
        inviteToken={inviteFromHash()}
        onJoined={setCredential}
        recoverHost={recoverHost}
        join={join}
      />
    );
  return (
    <div>
      <CookingSession data={read} actions={actions} />
      <Drawer autoFocus open={againOpen} onOpenChange={setAgainOpen}>
        <DrawerContent className="cooking-drawer" aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>Приготувати ще раз</DrawerTitle>
          </DrawerHeader>
          <div className="cooking-drawer-body">
            <CooksForm
              disabled={!online || pending}
              initial={read.room.cookCount}
              initialServings={read.room.requestedServings}
              initialName={read.me.name}
              initialConstraints={read.room.constraints}
              onGenerate={async (setup) => {
                if (!online) throw new Error("Немає з’єднання.");
                const next = createCookingCredential(createCookingCredential().participantToken);
                const result = await cookAgain({
                  roomId,
                  participantToken: credential.participantToken,
                  newParticipantToken: next.participantToken,
                  inviteToken: next.inviteToken!,
                  ...setup,
                });
                if (!result) throw new Error("Не вдалося почати заново.");
                saveCookingCredential(result.roomId, next);
                setAgainOpen(false);
                await navigate({ to: "/cook/$roomId", params: { roomId: result.roomId } });
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
      <AssistantPanel
        currentSteps={read.room.plan?.steps ?? []}
        notes={(notes ?? []).map((note) => ({
          ...note,
          canDelete: read.me.role === "host" || note.authorMemberId === read.me._id,
        }))}
        proposals={proposals ?? []}
        messages={helperMessages ?? []}
        helperBusy={read.room.helperBusy === true}
        helperError={error ?? read.room.helperError}
        requested={helperRequested}
        onRequestedChange={setHelperRequested}
        prompt={helperPrompt}
        onPromptChange={setHelperPrompt}
        disabled={!online || pending}
        onNote={(text) =>
          invoke(() => addNote({ roomId, participantToken: credential.participantToken, text }))
        }
        onAsk={(prompt) =>
          invoke(() => askHelper({ roomId, participantToken: credential.participantToken, prompt }))
        }
        onDeleteNote={(noteId) =>
          invoke(() =>
            deleteNote({ roomId, participantToken: credential.participantToken, noteId }),
          )
        }
        onApprove={(proposalId) =>
          invoke(() =>
            approveProposal({ roomId, participantToken: credential.participantToken, proposalId }),
          )
        }
        onReject={(proposalId) =>
          invoke(() =>
            rejectProposal({ roomId, participantToken: credential.participantToken, proposalId }),
          )
        }
      />
      {error && (
        <p className="cooking-action-error" role="alert">
          {error}
        </p>
      )}
      {peopleOpen && (
        <People
          open
          room={read}
          disabled={!online || pending}
          error={error}
          onOpenChange={setPeopleOpen}
          onCloseInvite={() =>
            invoke(() => closeInvite({ roomId, participantToken: credential.participantToken }))
          }
          onRotateInvite={() => {
            const next = createCookingCredential().participantToken;
            invoke(async () => {
              await rotateInvite({
                roomId,
                participantToken: credential.participantToken,
                inviteToken: next,
              });
              const saved = { ...credential, inviteToken: next };
              saveCookingCredential(roomId, saved);
              setCredential(saved);
            });
          }}
          onRemove={(memberId) =>
            invoke(() =>
              removeMember({ roomId, participantToken: credential.participantToken, memberId }),
            )
          }
          onTransfer={(memberId) =>
            invoke(() =>
              transferHost({ roomId, participantToken: credential.participantToken, memberId }),
            )
          }
          onContinueAlone={() =>
            invoke(() => continueAlone({ roomId, participantToken: credential.participantToken }))
          }
          onLeave={() =>
            invoke(() => leave({ roomId, participantToken: credential.participantToken }))
          }
          onTakeover={(slot) =>
            invoke(() => takeover({ roomId, participantToken: credential.participantToken, slot }))
          }
          onSwap={(memberId) =>
            invoke(() =>
              swapRoles({ roomId, participantToken: credential.participantToken, memberId }),
            )
          }
        />
      )}
    </div>
  );
}

function JoinRoom({
  roomId,
  sessionId,
  inviteToken,
  onJoined,
  recoverHost,
  join,
}: {
  roomId: Id<"cookingRooms">;
  sessionId: SessionId | undefined;
  inviteToken?: string;
  onJoined: (credential: ReturnType<typeof createCookingCredential>) => void;
  recoverHost: ReturnType<typeof useMutation<typeof api.cookingRooms.recoverHost>>;
  join: ReturnType<typeof useMutation<typeof api.cookingRooms.join>>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function enter() {
    setBusy(true);
    setError(null);
    const credential = createCookingCredential(inviteToken);
    try {
      if (
        sessionId &&
        (await recoverHost({ sessionId, roomId, newParticipantToken: credential.participantToken }))
      ) {
        saveCookingCredential(roomId, credential);
        onJoined(credential);
        return;
      }
      if (!inviteToken || !name.trim()) {
        setError("Відкрий запрошення та напиши своє ім’я.");
        return;
      }
      const result = await join({
        roomId,
        inviteToken,
        participantToken: credential.participantToken,
        name: name.trim(),
      });
      if (!result) {
        setError("Це запрошення вже не працює.");
        return;
      }
      saveCookingCredential(roomId, credential);
      onJoined(credential);
    } catch {
      setError("Не вдалося приєднатися. Спробуй ще раз.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="cooking-shell cooking-join">
      <div className="checker-band" aria-hidden />
      <div className="sign">
        <h1>Приєднатися до кухні</h1>
      </div>
      <label>
        Твоє ім’я
        <Input
          value={name}
          maxLength={80}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <Button size="xl" disabled={busy} onClick={() => void enter()}>
        {busy ? "Заходимо…" : "Приєднатися"}
      </Button>
    </main>
  );
}

function People({
  disabled,
  error,
  open,
  room,
  onOpenChange,
  onCloseInvite,
  onRotateInvite,
  onRemove,
  onTransfer,
  onContinueAlone,
  onLeave,
  onTakeover,
  onSwap,
}: {
  disabled: boolean;
  error: string | null;
  open: boolean;
  room: NonNullable<ReturnType<typeof useQuery<typeof api.cookingRooms.read>>>;
  onOpenChange: (open: boolean) => void;
  onCloseInvite: () => void;
  onRotateInvite: () => void;
  onRemove: (memberId: Id<"cookingMembers">) => void;
  onTransfer: (memberId: Id<"cookingMembers">) => void;
  onContinueAlone: () => void;
  onLeave: () => void;
  onTakeover: (slot: number) => void;
  onSwap: (memberId: Id<"cookingMembers">) => void;
}) {
  const host = room.me.role === "host";
  return (
    <Drawer autoFocus open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="cooking-people-drawer" aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Кухарі</DrawerTitle>
        </DrawerHeader>
        <section className="cooking-people-content">
          {error && <p role="alert">{error}</p>}
          {room.members.map((member) => (
            <div key={member._id}>
              <strong>{member.name}</strong>
              <span>
                {member.slots.length ? `Місце ${member.slots.join(", ")}` : "Спостерігає"}
              </span>
              {host && member._id !== room.me._id && (
                <>
                  <Button
                    disabled={disabled}
                    size="sm"
                    variant="outline"
                    onClick={() => onRemove(member._id)}
                  >
                    Прибрати
                  </Button>
                  <Button
                    disabled={disabled}
                    size="sm"
                    variant="ghost"
                    onClick={() => onTransfer(member._id)}
                  >
                    Передати кухню
                  </Button>
                </>
              )}
              {member._id !== room.me._id && (
                <Button
                  disabled={disabled}
                  size="sm"
                  variant="ghost"
                  onClick={() => onSwap(member._id)}
                >
                  Помінятися
                </Button>
              )}
            </div>
          ))}
          {Array.from({ length: room.room.cookCount }, (_, index) => index + 1)
            .filter((slot) => !room.members.some((member) => member.slots.includes(slot)))
            .map((slot) => (
              <Button
                disabled={disabled}
                key={slot}
                size="sm"
                variant="outline"
                onClick={() => onTakeover(slot)}
              >
                Взяти місце {slot}
              </Button>
            ))}
          <Button disabled={disabled} variant="outline" size="chip" onClick={onContinueAlone}>
            Продовжити самому
          </Button>
          {!host && (
            <Button disabled={disabled} variant="ghost" size="chip" onClick={onLeave}>
              Вийти з кухні
            </Button>
          )}
          {host && (
            <>
              <Button disabled={disabled} variant="outline" size="chip" onClick={onRotateInvite}>
                Нове запрошення
              </Button>
              <Button disabled={disabled} variant="ghost" size="chip" onClick={onCloseInvite}>
                Закрити запрошення
              </Button>
            </>
          )}
        </section>
      </DrawerContent>
    </Drawer>
  );
}

function AssistantPanel({
  currentSteps,
  notes,
  proposals,
  messages,
  helperBusy,
  helperError,
  requested,
  onRequestedChange,
  prompt,
  onPromptChange,
  disabled,
  onNote,
  onDeleteNote,
  onAsk,
  onApprove,
  onReject,
}: {
  notes: Array<{
    _id: Id<"cookingNotes">;
    authorMemberId: Id<"cookingMembers">;
    text: string;
    canDelete: boolean;
  }>;
  currentSteps: Array<{ id: string; title: string }>;
  proposals: Proposal[];
  messages: Array<{ _id: string; role: "user" | "assistant"; text: string }>;
  helperBusy: boolean;
  helperError?: string;
  requested: boolean;
  onRequestedChange: (open: boolean) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  disabled: boolean;
  onNote: (text: string) => void;
  onDeleteNote: (id: Id<"cookingNotes">) => void;
  onAsk: (text: string) => void;
  onApprove: (id: Id<"cookingProposals">) => void;
  onReject: (id: Id<"cookingProposals">) => void;
}) {
  return (
    <Drawer autoFocus open={requested} onOpenChange={onRequestedChange}>
      <DrawerContent className="cooking-helper-drawer" aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Помічник</DrawerTitle>
        </DrawerHeader>
        <section className="cooking-helper">
          <Textarea
            value={prompt}
            maxLength={1_024}
            rows={3}
            placeholder="Запитай про крок або заміну"
            onChange={(event) => onPromptChange(event.target.value)}
          />
          <div>
            <Button
              size="sm"
              disabled={disabled || helperBusy || !prompt.trim()}
              onClick={() => onAsk(prompt.trim())}
            >
              Запитати
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || prompt.length > 1000 || !prompt.trim()}
              onClick={() => onNote(prompt.trim())}
            >
              Додати нотатку
            </Button>
          </div>
          {helperBusy && <p>Помічник думає…</p>}
          {helperError && <p role="alert">{helperError}</p>}
          {messages.map((message) => (
            <div
              key={message._id}
              className={`cooking-helper-message cooking-helper-message-${message.role}`}
            >
              <CookingMarkdown text={message.text} />
            </div>
          ))}
          {proposals
            .filter((proposal) => proposal.status === "open")
            .map((proposal) => (
              <article key={proposal._id}>
                <strong>Пропозиція зміни</strong>
                <p>{proposal.preview}</p>
                <ProposalDetails proposal={proposal} currentSteps={currentSteps} />
                <Button size="sm" disabled={disabled} onClick={() => onApprove(proposal._id)}>
                  Підтвердити
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => onReject(proposal._id)}
                >
                  Відхилити
                </Button>
              </article>
            ))}
          {notes.length > 0 && (
            <div className="cooking-notes">
              <h3>Нотатки</h3>
              {notes.map((note) => (
                <p key={note._id}>
                  {note.text}
                  {note.canDelete && (
                    <Button
                      size="chip"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => onDeleteNote(note._id)}
                    >
                      Прибрати
                    </Button>
                  )}
                </p>
              ))}
            </div>
          )}
        </section>
      </DrawerContent>
    </Drawer>
  );
}

function ProposalDetails({
  proposal,
  currentSteps,
}: {
  proposal: Proposal;
  currentSteps: Array<{ id: string; title: string }>;
}) {
  const titleFor = (id: string) =>
    proposal.plan.steps.find((step) => step.id === id)?.title ??
    currentSteps.find((step) => step.id === id)?.title ??
    id;
  const removed = currentSteps.filter(
    (step) => !proposal.plan.steps.some((next) => next.id === step.id),
  );
  return (
    <details>
      <summary>Переглянути зміни</summary>
      <p>Порцій: {proposal.plan.servings}</p>
      <p>
        Інгредієнти:{" "}
        {proposal.plan.ingredients.map((item) => `${item.name} ${item.amount}`).join(", ")}
      </p>
      {removed.length > 0 && (
        <p>Прибираємо кроки: {removed.map((step) => step.title).join(", ")}</p>
      )}
      <p>
        Обладнання:{" "}
        {proposal.plan.equipment.map((item) => `${item.name}, ${item.capacity} шт.`).join("; ") ||
          "не потрібне"}
      </p>
      {proposal.plan.steps
        .filter((step) => proposal.affectedStepKeys.includes(step.id))
        .map((step) => (
          <section key={step.id}>
            <strong>{step.title}</strong>
            <CookingMarkdown text={step.body} />
            <p>
              Кухарі: {step.slots.join(", ")}. Після:{" "}
              {step.dependsOn.map(titleFor).join(", ") || "без залежностей"}
            </p>
            {step.checklist.length > 0 && (
              <p>Перевірити: {step.checklist.map((item) => item.label).join(", ")}</p>
            )}
            {step.timers.length > 0 && (
              <p>
                Таймери:{" "}
                {step.timers
                  .map((timer) => `${timer.label} (${timer.durationSeconds} с)`)
                  .join(", ")}
              </p>
            )}
            {step.confirmation && <p>Підтвердження: {step.confirmation}</p>}
            {step.temperature && (
              <p>
                {step.temperature.label}: {step.temperature.value} °{step.temperature.unit}
              </p>
            )}
            {step.kind !== "task" && (
              <p>
                {step.kind === "together"
                  ? "Починаємо разом після готовності всіх."
                  : "Передача з підтвердженням отримання."}
              </p>
            )}
            {step.canWait && <p>Під час очікування можна взяти інше завдання.</p>}
            {step.equipment.length > 0 && (
              <p>
                Використовує:{" "}
                {step.equipment
                  .map((id) => proposal.plan.equipment.find((item) => item.id === id)?.name ?? id)
                  .join(", ")}
              </p>
            )}
            {step.choices?.map((choice) => (
              <p key={choice.id}>Варіант: {choice.label}</p>
            ))}
            {step.reference && <p>Візуальний орієнтир: {step.reference.alt}</p>}
          </section>
        ))}
    </details>
  );
}

function RoomNotice({ title, body }: { title: string; body: string }) {
  return (
    <main className="cooking-shell">
      <div className="checker-band" aria-hidden />
      <CookingStatus title={title} body={body} />
    </main>
  );
}
function CookingStatus({ title, body }: { title: string; body: string }) {
  return (
    <section className="cooking-status">
      <h1>{title}</h1>
      <p>{body}</p>
    </section>
  );
}
