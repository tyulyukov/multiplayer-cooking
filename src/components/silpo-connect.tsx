import Location01Icon from "@hugeicons/core-free-icons/Location01Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import Unlink01Icon from "@hugeicons/core-free-icons/Unlink01Icon";
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FunctionReturnType } from "convex/server";

import type { api } from "../../convex/_generated/api";
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
    <section className="connect-card chrome" aria-label="Підключення Сільпо">
      <p>
        Ідеї страв, продукти з цінами і кошик працюють через твій акаунт Сільпо. Вхід за номером
        телефону на auth.silpo.ua.
      </p>
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
      <p className="connect-note">
        Токени зберігаються лише на сервері. Адресу доставки ми запитаємо окремо, коли знадобиться
        кошик.
      </p>
    </section>
  );
}

export function ProfileMenu({
  connection,
  onReconnect,
  onForgetAddress,
  onDisconnect,
}: {
  connection: SilpoConnection;
  onReconnect: () => void;
  onForgetAddress: () => void;
  onDisconnect: () => void;
}) {
  const title = connection.name ?? connection.phone ?? "Сільпо";

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
          {connection.phone && <span>{connection.phone}</span>}
        </div>
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
          Від'єднати
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
