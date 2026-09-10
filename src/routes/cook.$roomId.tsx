import { People } from "@/components/cooking/cooking-people";
import { CooksForm } from "@/components/cook-together";
import { ConvexError } from "convex/values";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { CookingSession } from "@/components/cooking/cooking-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CookingHelper } from "@/components/cooking/cooking-helper";
import { helperContextStep } from "@/lib/cooking-helper";
import { useAttachments } from "@/lib/use-attachments";
import { uploadImage } from "@/lib/images";
import {
  createCookingCredential,
  inviteFromHash,
  readCookingCredential,
  saveCookingCredential,
} from "@/lib/cooking-session";
import { isConvexConfigured } from "@/lib/convex";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/cook/$roomId")({
  component: CookingRoomRoute,
});

function CookingRoomRoute() {
  const { roomId } = Route.useParams();
  if (!isConvexConfigured)
    return (
      <RoomNotice
        title="Кухня недоступна"
        body="Не вдалося відкрити спільну сесію. Спробуй пізніше."
      />
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
  const pendingOperations = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [againOpen, setAgainOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopyState, setInviteCopyState] = useState<"copied" | "manual" | null>(null);
  const [helperRequested, setHelperRequested] = useState(false);
  const [helperChatRequest, setHelperChatRequest] = useState(0);
  const [helperPrompt, setHelperPrompt] = useState("");
  const [helperStepKey, setHelperStepKey] = useState<string>();
  const [lastHelperRequest, setLastHelperRequest] = useState<{
    promptMessageId: string;
    prompt: string;
    stepKey?: string;
    attachmentStorageIds: Id<"_storage">[];
  }>();
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
  const toggleChecklist = useMutation(api.cookingSteps.toggleChecklist).withOptimisticUpdate(
    (store, args) => {
      const queryArgs = { roomId: args.roomId, participantToken: args.participantToken };
      const current = store.getQuery(api.cookingRooms.read, queryArgs);
      if (!current) return;
      store.setQuery(api.cookingRooms.read, queryArgs, {
        ...current,
        steps: current.steps.map((step) =>
          step.stepKey === args.stepKey
            ? {
                ...step,
                checkedIds: args.checked
                  ? [...new Set([...step.checkedIds, args.itemId])]
                  : step.checkedIds.filter((id) => id !== args.itemId),
              }
            : step,
        ),
      });
    },
  );
  const toggleIngredient = useMutation(api.cookingSteps.toggleIngredient);
  const startTimer = useMutation(api.cookingTimers.start);
  const pauseTimer = useMutation(api.cookingTimers.pause);
  const resumeTimer = useMutation(api.cookingTimers.resume);
  const cancelTimer = useMutation(api.cookingTimers.cancel);
  const acknowledgeTimer = useMutation(api.cookingTimers.acknowledge);
  const restoreTimer = useMutation(api.cookingTimers.restore);
  const restartTimer = useMutation(api.cookingTimers.restart);
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
  const generateHelperUploadUrl = useMutation(api.cookingAssistance.generateHelperUploadUrl);
  const registerHelperUpload = useMutation(api.cookingAssistance.registerHelperUpload);
  const helperAttachments = useAttachments(
    credential && online
      ? async (blob) => {
          const args = { roomId, participantToken: credential.participantToken };
          const grant = await generateHelperUploadUrl(args);
          if (!grant) throw new Error("Upload unavailable");
          const storageId = await uploadImage(grant.uploadUrl, blob);
          if (
            !(await registerHelperUpload({
              ...args,
              uploadTicket: grant.uploadTicket,
              storageId: storageId as Id<"_storage">,
            }))
          )
            throw new Error("Upload rejected");
          return storageId;
        }
      : null,
  );
  const activeHelperStep =
    read?.steps.find(
      (step) => step.status === "active" && step.slots.some((slot) => read.me.slots.includes(slot)),
    ) ??
    read?.steps.find(
      (step) =>
        step.status === "waiting" && step.slots.some((slot) => read.me.slots.includes(slot)),
    );
  const helperContext = helperContextStep(
    read?.room.plan?.steps ?? [],
    helperStepKey,
    activeHelperStep?.stepKey,
  );

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

  const invoke = async (call: () => Promise<unknown>, key = "room") => {
    if (!online || pending || (key !== "checklist" && pendingOperations.current.has(key))) return;
    setError(null);
    if (key === "room") setPending(true);
    if (key !== "checklist") {
      pendingOperations.current.add(key);
      setPendingKeys([...pendingOperations.current]);
    }
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
      if (key === "room") setPending(false);
      pendingOperations.current.delete(key);
      setPendingKeys([...pendingOperations.current]);
    }
  };
  const rotateInviteLink = async () => {
    if (!credential || !online || pending) return;
    const inviteToken = createCookingCredential().participantToken;
    setError(null);
    setPending(true);
    try {
      if (
        !(await rotateInvite({
          roomId,
          participantToken: credential.participantToken,
          inviteToken,
        }))
      ) {
        setError("Не вдалося створити запрошення. Спробуй ще раз.");
        return;
      }
      const saved = { ...credential, inviteToken };
      saveCookingCredential(roomId, saved);
      setCredential(saved);
      setInviteCopyState(null);
    } catch (failure) {
      setError(
        failure instanceof ConvexError && typeof failure.data === "string"
          ? failure.data
          : "Не вдалося створити запрошення. Спробуй ще раз.",
      );
    } finally {
      setPending(false);
    }
  };
  const inviteUrl = credential?.inviteToken
    ? `${window.location.origin}/cook/${roomId}#invite=${credential.inviteToken}`
    : null;
  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopyState("copied");
    } catch {
      setInviteCopyState("manual");
    }
  };
  const participantToken = credential?.participantToken;
  const actions = {
    online,
    busy: pending,
    pendingKeys,
    start: (stepKey: string) =>
      participantToken && invoke(() => startStep({ roomId, participantToken, stepKey })),
    wait: (stepKey: string) =>
      participantToken && invoke(() => waitStep({ roomId, participantToken, stepKey })),
    ready: (stepKey: string) =>
      participantToken && invoke(() => ready({ roomId, participantToken, stepKey })),
    complete: (stepKey: string, confirmed: boolean, skipChecklist = false) =>
      participantToken &&
      invoke(() => complete({ roomId, participantToken, stepKey, confirmed, skipChecklist })),
    undo: (stepKey: string) =>
      participantToken && invoke(() => undo({ roomId, participantToken, stepKey })),
    toggleChecklist: (stepKey: string, itemId: string, checked: boolean) =>
      participantToken &&
      invoke(
        () => toggleChecklist({ roomId, participantToken, stepKey, itemId, checked }),
        "checklist",
      ),
    toggleIngredient: (ingredientId: string, checked: boolean) =>
      participantToken &&
      invoke(() => toggleIngredient({ roomId, participantToken, ingredientId, checked })),
    timer: (
      timer: { stepKey: string; timerKey: string },
      action: "start" | "pause" | "resume" | "cancel" | "acknowledge" | "restore" | "restart",
    ) =>
      participantToken &&
      invoke(
        () =>
          ({
            start: startTimer,
            pause: pauseTimer,
            resume: resumeTimer,
            cancel: cancelTimer,
            acknowledge: acknowledgeTimer,
            restore: restoreTimer,
            restart: restartTimer,
          })[action]({
            roomId,
            participantToken,
            stepKey: timer.stepKey,
            timerKey: timer.timerKey,
          }),
        `timer:${timer.stepKey}:${timer.timerKey}`,
      ),
    addTime: (timer: { stepKey: string; timerKey: string }) =>
      participantToken &&
      invoke(
        () =>
          addTime({
            roomId,
            participantToken,
            stepKey: timer.stepKey,
            timerKey: timer.timerKey,
            seconds: 60,
          }),
        `timer:${timer.stepKey}:${timer.timerKey}`,
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
    ask: (prompt?: string, stepKey?: string) => {
      if (prompt) setHelperPrompt(prompt);
      setHelperStepKey(stepKey);
      setHelperChatRequest((key) => key + 1);
      setHelperRequested(true);
    },
    startSession: () =>
      participantToken && invoke(() => startSession({ roomId, participantToken })),
    finish: () => participantToken && invoke(() => finish({ roomId, participantToken })),
    retryGeneration: () =>
      participantToken && invoke(() => retryGeneration({ roomId, participantToken })),
    cookAgain: () => setAgainOpen(true),
    invite: () => setInviteOpen(true),
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
      <Drawer
        autoFocus
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setInviteCopyState(null);
        }}
      >
        <DrawerContent className="cooking-drawer" aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>Запросити кухарів</DrawerTitle>
          </DrawerHeader>
          <div className="cooking-drawer-body cooking-invite">
            {error && <p role="alert">{error}</p>}
            {inviteUrl && read.room.inviteOpen && read.room.inviteExpiresAt > read.serverNow ? (
              <>
                <label htmlFor="cooking-invite-link">Посилання на кухню</label>
                <Input
                  id="cooking-invite-link"
                  value={inviteUrl}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button size="xl" disabled={!online || pending} onClick={() => void copyInvite()}>
                  {inviteCopyState === "copied" ? "Посилання скопійовано" : "Скопіювати посилання"}
                </Button>
                {inviteCopyState === "manual" && (
                  <p role="status">Скопіюй посилання з поля вручну.</p>
                )}
                <details>
                  <summary>Замінити посилання</summary>
                  <p>Попереднє посилання перестане працювати. Учасники залишаться в кухні.</p>
                  <Button
                    variant="outline"
                    disabled={!online || pending}
                    onClick={() => void rotateInviteLink()}
                  >
                    Створити нове посилання
                  </Button>
                </details>
              </>
            ) : (
              <>
                <p>
                  {read.room.inviteOpen && read.room.inviteExpiresAt <= read.serverNow
                    ? "Термін запрошення минув. Створи нове посилання."
                    : read.room.inviteOpen
                      ? "Посилання немає на цьому пристрої. Нове запрошення припинить роботу попереднього."
                      : "Запрошення закрите. Створи нове посилання, щоб запросити кухарів."}
                </p>
                <Button
                  size="xl"
                  disabled={!online || pending}
                  onClick={() => void rotateInviteLink()}
                >
                  {read.room.inviteOpen ? "Створити нове посилання" : "Відкрити нове запрошення"}
                </Button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      {read.room.plan && (
        <CookingHelper
          plan={read.room.plan}
          contextStepKey={helperContext}
          chatRequestKey={helperChatRequest}
          onContextChange={setHelperStepKey}
          notes={(notes ?? []).map((note) => ({
            ...note,
            canDelete: read.me.role === "host" || note.authorMemberId === read.me._id,
          }))}
          proposals={proposals ?? []}
          messages={helperMessages ?? []}
          loaded={helperMessages !== undefined && proposals !== undefined}
          helperBusy={read.room.helperBusy === true}
          helperError={read.room.helperError}
          open={helperRequested}
          onOpenChange={(open) => {
            if (open) setHelperStepKey(undefined);
            setHelperRequested(open);
          }}
          prompt={helperPrompt}
          onPromptChange={setHelperPrompt}
          online={online}
          finished={read.room.state === "done" || read.room.state === "error"}
          attachments={helperAttachments}
          onNote={(text) =>
            addNote({ roomId, participantToken: credential.participantToken, text })
          }
          onAsk={async (prompt) => {
            const request = {
              prompt,
              stepKey: helperContext || undefined,
              attachmentStorageIds: helperAttachments.storageIds as Id<"_storage">[],
            };
            const result = await askHelper({
              roomId,
              participantToken: credential.participantToken,
              ...request,
            });
            if (result)
              setLastHelperRequest({ ...request, promptMessageId: result.promptMessageId });
            return result;
          }}
          onRetry={
            lastHelperRequest &&
            lastHelperRequest.promptMessageId === read.room.helperFailedPromptMessageId
              ? async () => {
                  const { promptMessageId: _failedMessageId, ...request } = lastHelperRequest;
                  const result = await askHelper({
                    roomId,
                    participantToken: credential.participantToken,
                    ...request,
                    stepKey: helperContextStep(read.room.plan?.steps ?? [], request.stepKey),
                  });
                  if (result)
                    setLastHelperRequest({ ...request, promptMessageId: result.promptMessageId });
                  return result;
                }
              : undefined
          }
          onDeleteNote={(noteId) =>
            deleteNote({ roomId, participantToken: credential.participantToken, noteId })
          }
          onApprove={(proposalId) =>
            approveProposal({ roomId, participantToken: credential.participantToken, proposalId })
          }
          onReject={(proposalId) =>
            rejectProposal({ roomId, participantToken: credential.participantToken, proposalId })
          }
        />
      )}
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
            setPeopleOpen(false);
            setInviteOpen(true);
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
      <header className="topbar page-frame">
        <a href="/" className="brand">
          <i aria-hidden />
          Multiplayer Cooking
        </a>
      </header>
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

function RoomNotice({ title, body }: { title: string; body: string }) {
  return (
    <main className="cooking-shell">
      <div className="checker-band" aria-hidden />
      <header className="topbar page-frame">
        <a href="/" className="brand">
          <i aria-hidden />
          Multiplayer Cooking
        </a>
      </header>
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
