import type { SessionId } from "convex-helpers/server/sessions";
import { useState } from "react";

import type { Id } from "@multiplayer-cooking/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCookingCredential,
  saveCookingCredential,
  type CookingCredential,
} from "@/lib/cooking-session";

export function JoinRoom({
  roomId,
  sessionId,
  inviteToken,
  onJoined,
  onRecoverHost,
  onJoin,
}: {
  roomId: Id<"cookingRooms">;
  sessionId: SessionId | undefined;
  inviteToken?: string;
  onJoined: (credential: CookingCredential) => void;
  onRecoverHost: (sessionId: SessionId, participantToken: string) => Promise<unknown>;
  onJoin: (inviteToken: string, participantToken: string, name: string) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enter() {
    setBusy(true);
    setError(null);
    const credential = createCookingCredential(inviteToken);
    try {
      if (sessionId && (await onRecoverHost(sessionId, credential.participantToken))) {
        saveCookingCredential(roomId, credential);
        onJoined(credential);
        return;
      }
      if (!inviteToken || !name.trim()) {
        setError("Відкрий запрошення та напиши своє ім’я.");
        return;
      }
      if (!(await onJoin(inviteToken, credential.participantToken, name.trim()))) {
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
