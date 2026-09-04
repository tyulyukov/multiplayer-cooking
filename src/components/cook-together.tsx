import MinusSignIcon from "@hugeicons/core-free-icons/MinusSignIcon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";

const minServings = 1;
const maxServings = 12;

function servingsLabel(count: number) {
  if (count === 1) {
    return "1 порція";
  }

  if (count >= 2 && count <= 4) {
    return `${count} порції`;
  }

  return `${count} порцій`;
}

function ServingsForm({
  initial,
  saved,
  onGenerate,
}: {
  initial: number;
  saved: number | undefined;
  onGenerate: (servings: number) => void;
}) {
  const [servings, setServings] = useState(saved ?? initial);
  const [busy, setBusy] = useState(false);
  const done = saved !== undefined && !busy;

  async function generate() {
    setBusy(true);

    try {
      await onGenerate(servings);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cook-form">
      <div className="servings-stepper" role="group" aria-label="Кількість порцій">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Менше порцій"
          disabled={servings <= minServings}
          onClick={() => setServings((count) => Math.max(minServings, count - 1))}
        >
          <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} aria-hidden />
        </Button>
        <output className="servings-value" aria-live="polite">
          {servingsLabel(servings)}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Більше порцій"
          disabled={servings >= maxServings}
          onClick={() => setServings((count) => Math.min(maxServings, count + 1))}
        >
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} aria-hidden />
        </Button>
      </div>
      {done ? (
        <p className="cook-soon">
          Скоро. Покроковий план для {saved === 1 ? "1 порції" : `${saved} порцій`} готується в
          наступній версії.
        </p>
      ) : (
        <Button type="button" size="xl" aria-busy={busy} disabled={busy} onClick={generate}>
          {busy ? "Зберігаємо…" : "Згенерувати інструкції"}
        </Button>
      )}
    </div>
  );
}

// "Готуємо разом": a dialog on desktop, a drawer on mobile, with the servings stepper.
export function CookTogether({
  defaultServings,
  savedServings,
  onGenerate,
}: {
  defaultServings: number;
  savedServings: number | undefined;
  onGenerate: (servings: number) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const trigger: ReactNode = (
    <Button type="button" variant="outline" size="chip">
      <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.5} aria-hidden />
      Готуємо разом
    </Button>
  );
  const title = "Готуємо разом";
  const description = "На скільки людей готуємо? Від цього залежать кроки і таймери.";
  const form = (
    <ServingsForm initial={defaultServings} saved={savedServings} onGenerate={onGenerate} />
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="cook-dialog">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="cook-dialog">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        {form}
      </DrawerContent>
    </Drawer>
  );
}
