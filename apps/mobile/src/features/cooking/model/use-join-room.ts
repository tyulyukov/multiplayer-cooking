import { useSessionId } from "convex-helpers/react/sessions";
import { useState } from "react";

import { haptics } from "@/shared/lib/haptics";
import { readSavedCookName } from "@/shared/lib/storage";

import { useCookingRoom } from "./room-context";

// Port of the web JoinRoom flow: reclaim the host seat for this device's session first, then
// join through the invite token from the link.
export const useJoinRoom = (inviteToken: string | undefined) => {
  const { roomId, api, saveCredential, newCredential, online } = useCookingRoom();
  const [sessionId] = useSessionId();
  const [name, setName] = useState(readSavedCookName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (message: string) => {
    setError(message);
    haptics.error();
  };

  const enter = async () => {
    if (busy || !online) return;
    setBusy(true);
    setError(null);
    const credential = newCredential(inviteToken);

    try {
      if (
        sessionId &&
        (await api.recoverHost({
          sessionId,
          roomId,
          newParticipantToken: credential.participantToken,
        }))
      ) {
        saveCredential(credential);

        return;
      }

      if (!inviteToken || !name.trim()) {
        fail("Відкрий запрошення та напиши своє ім’я.");

        return;
      }

      if (
        !(await api.join({
          roomId,
          inviteToken,
          participantToken: credential.participantToken,
          name: name.trim(),
        }))
      ) {
        fail("Це запрошення вже не працює.");

        return;
      }

      saveCredential(credential);
    } catch {
      fail("Не вдалося приєднатися. Спробуй ще раз.");
    } finally {
      setBusy(false);
    }
  };

  return { name, setName, error, busy, enter };
};
