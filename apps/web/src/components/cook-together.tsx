import MinusSignIcon from "@hugeicons/core-free-icons/MinusSignIcon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { ReactNode } from "react";

import { KitchenIllustration } from "@/components/kitchen-illustration";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  normalizeCookName,
  readSavedCookName,
  resolveCookName,
  saveCookName,
} from "@/lib/cook-name";
import { useMediaQuery } from "@/lib/use-media-query";

const minCooks = 1;
const maxCooks = 12;

function countLabel(count: number) {
  if (count === 1) {
    return "1 кухар";
  }

  if (count >= 2 && count <= 4) {
    return `${count} кухарі`;
  }

  return `${count} кухарів`;
}

export type CookingSetup = Readonly<{
  cookCount: number;
  servings: number;
  name: string;
  constraints: string;
}>;

export function CooksForm({
  initial,
  initialServings = 2,
  initialName = "",
  suggestedName = "",
  disabled = false,
  onGenerate,
}: {
  initial: number;
  initialServings?: number;
  initialName?: string;
  suggestedName?: string;
  disabled?: boolean;
  onGenerate: (setup: CookingSetup) => Promise<void> | void;
}) {
  const [count, setCooks] = useState(initial);
  const [name, setName] = useState(() =>
    resolveCookName(initialName, readSavedCookName(), suggestedName),
  );
  const [needsName] = useState(() => !name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function generate() {
    if (disabled || busy) return;
    const cookName = normalizeCookName(name);

    if (!cookName) {
      setError("Напиши, як тебе називати на кухні.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      await onGenerate({
        cookCount: count,
        servings: initialServings,
        name: cookName,
        constraints: "",
      });
      saveCookName(cookName);
    } catch {
      setError("Не вдалося створити кухню. Спробуй ще раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cook-form">
      <KitchenIllustration name="oven-mitts" className="cooks-illustration" />
      <div className="servings-stepper" role="group" aria-label="Кількість кухарів">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Менше кухарів"
          disabled={count <= minCooks}
          onClick={() => setCooks((count) => Math.max(minCooks, count - 1))}
        >
          <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} aria-hidden />
        </Button>
        <output className="servings-value" aria-live="polite">
          {countLabel(count)}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Більше кухарів"
          disabled={count >= maxCooks}
          onClick={() => setCooks((count) => Math.min(maxCooks, count + 1))}
        >
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} aria-hidden />
        </Button>
      </div>
      {needsName ? (
        <label className="cook-setup-field">
          <span>Твоє ім’я</span>
          <input
            value={name}
            maxLength={80}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Наприклад, Аня"
          />
        </label>
      ) : null}
      {error && (
        <p role="alert" className="address-error">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="xl"
        aria-busy={busy}
        disabled={disabled || busy}
        onClick={generate}
      >
        {busy ? "Створюємо кухню…" : "Створити кухню"}
      </Button>
    </div>
  );
}

export function CookTogether({
  onGenerate,
  servings = 2,
  cookCount = 1,
  profileName = "",
}: {
  servings?: number;
  cookCount?: number;
  profileName?: string;
  onGenerate: (setup: CookingSetup) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const trigger: ReactNode = (
    <Button type="button" variant="outline" size="chip">
      <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.5} aria-hidden />
      Готуємо разом
    </Button>
  );
  const title = "Скільки вас готує?";
  const form = (
    <CooksForm
      initial={cookCount}
      initialServings={servings}
      suggestedName={profileName}
      onGenerate={onGenerate}
    />
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="cook-dialog" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer autoFocus open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="cook-dialog" aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {form}
      </DrawerContent>
    </Drawer>
  );
}
