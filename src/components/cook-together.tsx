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

function CooksForm({
  initial,
  saved,
  onGenerate,
}: {
  initial: number;
  saved: number | undefined;
  onGenerate: (count: number) => Promise<void> | void;
}) {
  const [count, setCooks] = useState(saved ?? initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = saved === count && !busy;

  async function generate() {
    setBusy(true);
    setError(null);

    try {
      await onGenerate(count);
    } catch {
      setError("Не вдалося зберегти кількість кухарів. Спробуй ще раз.");
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
      {error && (
        <p role="alert" className="address-error">
          {error}
        </p>
      )}
      {done ? (
        <p className="cook-soon">
          Збережено: {countLabel(count)}. Покроковий план з розподілом роботи з’явиться в наступній
          версії.
        </p>
      ) : (
        <Button type="button" size="xl" aria-busy={busy} disabled={busy} onClick={generate}>
          {busy ? "Зберігаємо…" : "Зберегти кількість кухарів"}
        </Button>
      )}
    </div>
  );
}

export function CookTogether({
  savedCount,
  onGenerate,
}: {
  savedCount: number | undefined;
  onGenerate: (count: number) => Promise<void> | void;
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
  const form = <CooksForm initial={1} saved={savedCount} onGenerate={onGenerate} />;

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
    <Drawer open={open} onOpenChange={setOpen}>
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
