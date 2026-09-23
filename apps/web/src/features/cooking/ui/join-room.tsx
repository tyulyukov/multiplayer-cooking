import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  createCookingCredential,
  saveCookingCredential,
} from "@/features/cooking/lib/cooking-session";
import type { JoinRoomProps } from "@/features/cooking/model/component-props";

export const JoinRoom: FC<JoinRoomProps> = ({
  roomId,
  sessionId,
  inviteToken,
  onJoined,
  onRecoverHost,
  onJoin,
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enter = async () => {
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
  };

  return (
    <main className={cn(cookingStyles["cooking-shell"], cookingStyles["cooking-join"])}>
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
};
