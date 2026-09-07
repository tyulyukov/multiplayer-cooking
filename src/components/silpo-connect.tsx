import Location01Icon from "@hugeicons/core-free-icons/Location01Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import Unlink01Icon from "@hugeicons/core-free-icons/Unlink01Icon";
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon";
import UserSettings02Icon from "@hugeicons/core-free-icons/UserSettings02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";
import * as React from "react";

import type { api } from "../../convex/_generated/api";
import { KitchenIllustration } from "@/components/kitchen-illustration";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SilpoConnection = NonNullable<FunctionReturnType<typeof api.silpo.connection>>;

export function ConnectCard({ busy, onConnect }: { busy: boolean; onConnect: () => void }) {
  return (
    <section className="connect-card" aria-label="Підключення Сільпо">
      <KitchenIllustration name="bag-pot" className="connect-illustration" />
      <div className="sign">
        <h1>Готуємо з Сільпо</h1>
      </div>
      <Button
        type="button"
        size="xl"
        className="generate-button"
        aria-busy={busy}
        disabled={busy}
        onClick={onConnect}
      >
        <HugeiconsIcon icon={Store01Icon} className="size-5" strokeWidth={1.5} aria-hidden />
        {busy ? "Відкриваємо Сільпо…" : "Підключити Сільпо"}
      </Button>
      <p className="connect-note">Вхід за номером телефону на сайті Сільпо.</p>
    </section>
  );
}

export function ProfileMenu({
  connection,
  onReconnect,
  onForgetAddress,
  onDisconnect,
  onOpenSettings,
}: {
  connection: SilpoConnection;
  onReconnect: () => void;
  onForgetAddress: () => void;
  onDisconnect: () => void;
  onOpenSettings?: () => void;
}) {
  const title = connection.name ?? "Профіль";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="chip" className="profile-trigger">
          <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.5} aria-hidden />
          <span>{title}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="profile-menu">
        <div className="profile-label">
          <strong>{connection.name ?? "Акаунт Сільпо"}</strong>
        </div>
        {connection.phone && <RedactedContact value={connection.phone} kind="phone" />}
        {connection.email && <RedactedContact value={connection.email} kind="email" />}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenSettings}>
          <HugeiconsIcon icon={UserSettings02Icon} strokeWidth={1.5} aria-hidden />
          Налаштування
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onReconnect}>
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} aria-hidden />
          Перепідключити
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!connection.hasAddress} onSelect={onForgetAddress}>
          <HugeiconsIcon icon={Location01Icon} strokeWidth={1.5} aria-hidden />
          Забути адресу
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDisconnect}>
          <HugeiconsIcon icon={Unlink01Icon} strokeWidth={1.5} aria-hidden />
          Вийти на цьому пристрої
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const letters = "abcdefghijklmnopqrstuvwxyz";

function randomFrom(pool: string) {
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

// Same length and character classes as the real value, so the blurred row is as wide as the revealed one.
function scramble(value: string) {
  return value
    .replace(/\d/g, () => randomFrom("0123456789"))
    .replace(/\p{L}/gu, () => randomFrom(letters));
}

function RedactedContact({ value, kind }: { value: string; kind: "phone" | "email" }) {
  const label = kind === "phone" ? "телефон" : "пошту";
  const [revealed, setRevealed] = React.useState(false);
  const scrambled = React.useMemo(() => scramble(value), [value]);

  return (
    <DropdownMenuItem
      className="profile-contact"
      aria-label={revealed ? `Сховати ${label}: ${value}` : `Показати ${label}`}
      onSelect={(event) => {
        event.preventDefault();
        setRevealed((current) => !current);
      }}
    >
      <span>{kind === "phone" ? "Телефон" : "Пошта"}:</span>
      <span data-hidden={!revealed}>{revealed ? value : scrambled}</span>
    </DropdownMenuItem>
  );
}
