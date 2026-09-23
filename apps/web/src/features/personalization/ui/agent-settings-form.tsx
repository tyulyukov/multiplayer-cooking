import type { FC } from "react";
import styles from "@/features/personalization/ui/personal-settings.module.scss";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import type { AgentSettings } from "@/features/personalization/model/types";

import type { usePersonalSettings } from "../model/use-personal-settings";
const tones: Array<{ value: AgentSettings["tone"]; label: string; description: string }> = [
  { value: "friendly", label: "Теплий", description: "Пояснює спокійно і по-людськи" },
  { value: "concise", label: "Лаконічний", description: "Каже тільки потрібне" },
  { value: "playful", label: "Грайливий", description: "Додає трохи настрою" },
];

type Props = Pick<
  ReturnType<typeof usePersonalSettings>,
  "cookName" | "changeCookName" | "draft" | "changeDraft"
> & { loading: boolean };
export const AgentSettingsForm: FC<Props> = ({
  cookName,
  changeCookName,
  draft,
  changeDraft,
  loading,
}) => {
  return (
    <section className={styles["personal-settings__form"]}>
      <label>
        Твоє ім’я на кухні
        <Input
          value={cookName}
          maxLength={80}
          autoComplete="name"
          placeholder="Наприклад, Аня"
          disabled={loading}
          onChange={(event) => changeCookName(event.target.value)}
        />
      </label>
      <fieldset>
        <legend>Тон агента</legend>
        <div className={styles["personal-settings__tone-options"]}>
          {tones.map((tone) => (
            <label key={tone.value} data-selected={draft.tone === tone.value}>
              <input
                type="radio"
                name="tone"
                value={tone.value}
                checked={draft.tone === tone.value}
                disabled={loading}
                onChange={() => changeDraft({ tone: tone.value })}
              />
              <span>{tone.label}</span>
              <small>{tone.description}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Що ще враховувати
        <Textarea
          value={draft.customInstructions}
          maxLength={1000}
          rows={4}
          placeholder="Наприклад, завжди пропонуй простішу альтернативу"
          disabled={loading}
          onChange={(event) => changeDraft({ customInstructions: event.target.value })}
        />
        <small>{draft.customInstructions.length}/1000</small>
      </label>
      <label>
        Розкажи про себе
        <Textarea
          value={draft.about}
          maxLength={600}
          rows={3}
          placeholder="Наприклад, готую для двох і не люблю довго стояти біля плити"
          disabled={loading}
          onChange={(event) => changeDraft({ about: event.target.value })}
        />
        <small>{draft.about.length}/600</small>
      </label>
    </section>
  );
};
