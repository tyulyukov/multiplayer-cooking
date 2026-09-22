import { CooksForm } from "@/features/cooking/ui/cook-together";
import { ConvexError } from "convex/values";
import { useNavigate } from "@tanstack/react-router";
import { useSessionId } from "convex-helpers/react/sessions";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useCookingAssistance } from "@/features/cooking/api/use-cooking-assistance";
import { useCookingRoom } from "@/features/cooking/api/use-cooking-room";
import { useCookingSteps } from "@/features/cooking/api/use-cooking-steps";
import { useCookingTimers } from "@/features/cooking/api/use-cooking-timers";
import { CookingHelper } from "@/features/cooking/ui/cooking-helper";
import { People } from "@/features/cooking/ui/cooking-people";
import { CookingSession } from "@/features/cooking/ui/cooking-session";
import { JoinRoom } from "@/features/cooking/ui/join-room";
import { RoomNotice } from "@/features/cooking/ui/room-notice";
import { helperContextStep } from "@/features/cooking/lib/cooking-helper";
import {
  createCookingCredential,
  inviteFromHash,
  readCookingCredential,
  saveCookingCredential,
} from "@/features/cooking/lib/cooking-session";
import { isConvexConfigured } from "@/app/providers/convex-provider";
import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";

export function CookingRoomPage({ roomId }: { roomId: string }) {
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
  const roomApi = useCookingRoom(roomId, credential);
  const steps = useCookingSteps();
  const timers = useCookingTimers();
  const assistance = useCookingAssistance({
    roomId,
    participantToken: credential?.participantToken,
    enabled: Boolean(credential && roomApi.room && roomApi.online),
  });
  const read = roomApi.room;
  const online = roomApi.online;
  const helperAttachments = assistance.attachments;
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
        !(await roomApi.rotateInvite({
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
      participantToken && invoke(() => steps.start({ roomId, participantToken, stepKey })),
    wait: (stepKey: string) =>
      participantToken && invoke(() => steps.wait({ roomId, participantToken, stepKey })),
    ready: (stepKey: string) =>
      participantToken && invoke(() => steps.ready({ roomId, participantToken, stepKey })),
    complete: (stepKey: string, confirmed: boolean, skipChecklist = false) =>
      participantToken &&
      invoke(() => steps.complete({ roomId, participantToken, stepKey, confirmed, skipChecklist })),
    undo: (stepKey: string) =>
      participantToken && invoke(() => steps.undo({ roomId, participantToken, stepKey })),
    toggleChecklist: (stepKey: string, itemId: string, checked: boolean) =>
      participantToken &&
      invoke(
        () => steps.toggleChecklist({ roomId, participantToken, stepKey, itemId, checked }),
        "checklist",
      ),
    toggleIngredient: (ingredientId: string, checked: boolean) =>
      participantToken &&
      invoke(() => steps.toggleIngredient({ roomId, participantToken, ingredientId, checked })),
    timer: (
      timer: { stepKey: string; timerKey: string },
      action: "start" | "pause" | "resume" | "cancel" | "acknowledge" | "restore" | "restart",
    ) =>
      participantToken &&
      invoke(
        () =>
          ({
            start: timers.start,
            pause: timers.pause,
            resume: timers.resume,
            cancel: timers.cancel,
            acknowledge: timers.acknowledge,
            restore: timers.restore,
            restart: timers.restart,
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
          timers.addTime({
            roomId,
            participantToken,
            stepKey: timer.stepKey,
            timerKey: timer.timerKey,
            seconds: 60,
          }),
        `timer:${timer.stepKey}:${timer.timerKey}`,
      ),
    requestReference: (stepKey: string) =>
      participantToken &&
      invoke(() => assistance.requestReference({ roomId, participantToken, stepKey })),
    createTimer: (stepKey: string, label: string, seconds: number) =>
      participantToken &&
      invoke(() =>
        timers.create({
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
      participantToken && invoke(() => roomApi.startSession({ roomId, participantToken })),
    finish: () => participantToken && invoke(() => roomApi.finish({ roomId, participantToken })),
    retryGeneration: () =>
      participantToken && invoke(() => roomApi.retryGeneration({ roomId, participantToken })),
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
        onRecoverHost={(targetSessionId, newParticipantToken) =>
          roomApi.recoverHost({ sessionId: targetSessionId, roomId, newParticipantToken })
        }
        onJoin={(inviteToken, participantToken, name) =>
          roomApi.join({ roomId, inviteToken, participantToken, name })
        }
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
        onRecoverHost={(targetSessionId, newParticipantToken) =>
          roomApi.recoverHost({ sessionId: targetSessionId, roomId, newParticipantToken })
        }
        onJoin={(inviteToken, participantToken, name) =>
          roomApi.join({ roomId, inviteToken, participantToken, name })
        }
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
              onGenerate={async (setup) => {
                if (!online) throw new Error("Немає з’єднання.");
                const next = createCookingCredential(createCookingCredential().participantToken);
                const result = await roomApi.cookAgain({
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
          notes={(assistance.notes ?? []).map((note) => ({
            ...note,
            canDelete: read.me.role === "host" || note.authorMemberId === read.me._id,
          }))}
          proposals={assistance.proposals ?? []}
          messages={assistance.messages ?? []}
          loaded={assistance.messages !== undefined && assistance.proposals !== undefined}
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
            assistance.addNote({ roomId, participantToken: credential.participantToken, text })
          }
          onAsk={async (prompt) => {
            const request = {
              prompt,
              stepKey: helperContext || undefined,
              attachmentStorageIds: helperAttachments.storageIds as Id<"_storage">[],
            };
            const result = await assistance.ask({
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
                  const result = await assistance.ask({
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
            assistance.deleteNote({ roomId, participantToken: credential.participantToken, noteId })
          }
          onApprove={(proposalId) =>
            assistance.approve({
              roomId,
              participantToken: credential.participantToken,
              proposalId,
            })
          }
          onReject={(proposalId) =>
            assistance.reject({ roomId, participantToken: credential.participantToken, proposalId })
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
            invoke(() =>
              roomApi.closeInvite({ roomId, participantToken: credential.participantToken }),
            )
          }
          onRotateInvite={() => {
            setPeopleOpen(false);
            setInviteOpen(true);
          }}
          onRemove={(memberId) =>
            invoke(() =>
              roomApi.removeMember({
                roomId,
                participantToken: credential.participantToken,
                memberId,
              }),
            )
          }
          onTransfer={(memberId) =>
            invoke(() =>
              roomApi.transferHost({
                roomId,
                participantToken: credential.participantToken,
                memberId,
              }),
            )
          }
          onContinueAlone={() =>
            invoke(() =>
              roomApi.continueAlone({ roomId, participantToken: credential.participantToken }),
            )
          }
          onLeave={() =>
            invoke(() => roomApi.leave({ roomId, participantToken: credential.participantToken }))
          }
          onTakeover={(slot) =>
            invoke(() =>
              steps.takeover({ roomId, participantToken: credential.participantToken, slot }),
            )
          }
          onSwap={(memberId) =>
            invoke(() =>
              steps.swapRoles({
                roomId,
                participantToken: credential.participantToken,
                memberId,
              }),
            )
          }
        />
      )}
    </div>
  );
}
