import Location01Icon from "@hugeicons/core-free-icons/Location01Icon";
import ViewIcon from "@hugeicons/core-free-icons/ViewIcon";
import ViewOffIcon from "@hugeicons/core-free-icons/ViewOffIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { FormEvent } from "react";

import { ADDRESS_MAX_CHARACTERS } from "../../convex/lib/ai_config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Grok Bot style secure input: masked on screen, stored only on the server, never sent to the model.
export function AddressPrompt({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (address: string) => void;
}) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const address = value.trim();

    if (address.length < 5 || pending) {
      return;
    }

    onSubmit(address);
    setValue("");
  }

  return (
    <form className="address-prompt chrome" onSubmit={handleSubmit} aria-label="Адреса доставки">
      <div className="address-head">
        <HugeiconsIcon icon={Location01Icon} size={20} strokeWidth={1.5} aria-hidden />
        <h3>Адреса доставки</h3>
      </div>
      <p>
        Потрібна, щоб Сільпо показало ціни і зібрало кошик. Зберігається лише на сервері, модель її
        не бачить.
      </p>
      <div className="address-field">
        <label className="sr-only" htmlFor="delivery-address">
          Місто, вулиця, будинок
        </label>
        <Input
          id="delivery-address"
          type={visible ? "text" : "password"}
          autoComplete="street-address"
          placeholder="Одеса, пров. Семафорний, 4"
          maxLength={ADDRESS_MAX_CHARACTERS}
          value={value}
          readOnly={pending}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={visible ? "Сховати адресу" : "Показати адресу"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <HugeiconsIcon icon={visible ? ViewOffIcon : ViewIcon} strokeWidth={1.5} aria-hidden />
        </Button>
      </div>
      {error && <p className="address-error">{error}</p>}
      {pending ? (
        <p className="thinking t-shimmer">Готуємо кошик Сільпо</p>
      ) : (
        <Button type="submit" disabled={value.trim().length < 5}>
          Зберегти адресу
        </Button>
      )}
    </form>
  );
}
