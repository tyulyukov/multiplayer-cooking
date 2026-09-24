import type { FC } from "react";
import styles from "@/features/silpo/ui/silpo-connect.module.scss";
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon";
import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import Unlink01Icon from "@hugeicons/core-free-icons/Unlink01Icon";
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon";
import UserSettings02Icon from "@hugeicons/core-free-icons/UserSettings02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { KitchenIllustration } from "@/shared/ui/kitchen-illustration";
import { Button } from "@/shared/ui/button";
import type { SilpoConnection } from "@/features/silpo/model/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

type ConnectCardProps = { busy: boolean; onConnect: () => void };

export const ConnectCard: FC<ConnectCardProps> = ({ busy, onConnect }) => {
  return (
    <section className={styles["connect-card"]} aria-label="Підключення Сільпо">
      <KitchenIllustration name="starter-sign" className={styles["connect-illustration"]} />
      <h1>Що приготуємо сьогодні?</h1>
      <Button type="button" size="xl" aria-busy={busy} disabled={busy} onClick={onConnect}>
        <HugeiconsIcon icon={Store01Icon} className="size-5" strokeWidth={1.5} aria-hidden />
        {busy ? "Відкриваємо Сільпо…" : "Підключити Сільпо"}
      </Button>
      <p className={styles["connect-note"]}>Вхід за номером телефону на сайті Сільпо.</p>
    </section>
  );
};

type ProfileMenuProps = {
  connection: SilpoConnection;
  onForgetAddress: () => void;
  onDisconnect: () => void;
  onOpenSettings?: () => void;
};

export const ProfileMenu: FC<ProfileMenuProps> = ({
  connection,
  onForgetAddress,
  onDisconnect,
  onOpenSettings,
}) => {
  const title = connection.name ?? "Профіль";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="chip" className={styles["profile-trigger"]}>
          <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.5} aria-hidden />
          <span>{title}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={styles["profile-menu"]}>
        <div className={styles["profile-label"]}>
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
        <DropdownMenuItem disabled={!connection.hasAddress} onSelect={onForgetAddress}>
          <HugeiconsIcon icon={Location01Icon} strokeWidth={1.5} aria-hidden />
          Забути адресу
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDisconnect}>
          <HugeiconsIcon icon={Unlink01Icon} strokeWidth={1.5} aria-hidden />
          Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const letters = "abcdefghijklmnopqrstuvwxyz";

const randomFrom = (pool: string) => {
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
};

// Same length and character classes as the real value, so the blurred row is as wide as the revealed one.
const scramble = (value: string) => {
  return value
    .replace(/\d/g, () => randomFrom("0123456789"))
    .replace(/\p{L}/gu, () => randomFrom(letters));
};

type RedactedContactProps = { value: string; kind: "phone" | "email" };

const RedactedContact: FC<RedactedContactProps> = ({ value, kind }) => {
  const label = kind === "phone" ? "телефон" : "пошту";
  const [revealed, setRevealed] = React.useState(false);
  const scrambled = React.useMemo(() => scramble(value), [value]);

  return (
    <DropdownMenuItem
      className={styles["profile-contact"]}
      data-kind={kind}
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
};
