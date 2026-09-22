import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
import { Button } from "@/shared/ui/button";
import { KitchenIllustration } from "@/shared/ui/kitchen-illustration";
import type { CookingActions, CookingRoomData } from "@/features/cooking/model/types";

export function CookingLobby({
  data,
  actions,
}: {
  data: CookingRoomData;
  actions: CookingActions;
}) {
  const host = data.me.role === "host";
  const missing = Math.max(0, data.room.cookCount - data.members.length);
  const failed = data.room.state === "error";
  return (
    <section className={cookingStyles["cooking-lobby"]} aria-labelledby="cooking-lobby-title">
      <div className={cookingStyles["cooking-lobby-intro"]}>
        <div className={cookingStyles["cooking-lobby-copy"]}>
          <h2 id="cooking-lobby-title">
            Збираємося
            <br />
            на кухні
          </h2>
          <div className={cookingStyles["cooking-lobby-count"]} role="status">
            Приєдналися {data.members.length} з {data.room.cookCount}
          </div>
        </div>
        <KitchenIllustration name="oven-mitts" className={cookingStyles["cooking-lobby-art"]} />
      </div>
      <ul className={cookingStyles["cooking-lobby-cooks"]} aria-label="Кухарі в лобі">
        {data.members.map((member) => (
          <li key={member._id}>
            <button
              type="button"
              className={cookingStyles["cooking-lobby-member"]}
              onClick={actions.managePeople}
              aria-label={`Кухарі: ${member.name}`}
            >
              <span
                className={cookingStyles["cooking-lobby-avatar"]}
                data-mine={member._id === data.me._id}
                aria-hidden
              >
                {member.name.slice(0, 1)}
              </span>
              <span>
                {member.name}
                {member._id === data.me._id ? " · ти" : ""}
              </span>
              {member.role === "host" && <small>Господар</small>}
            </button>
          </li>
        ))}
        {Array.from({ length: missing }, (_, index) => (
          <li key={`empty-${index}`} className={cookingStyles["cooking-lobby-empty"]}>
            <span className={cookingStyles["cooking-lobby-avatar"]} aria-hidden>
              +
            </span>
            <span>Чекаємо на кухаря</span>
          </li>
        ))}
      </ul>
      {host && data.room.cookCount > 1 && (
        <Button
          variant="outline"
          size="xl"
          disabled={!actions.online || actions.busy}
          onClick={actions.invite}
        >
          Запросити за посиланням
        </Button>
      )}
      {failed && (
        <div className={cookingStyles["cooking-lobby-plan"]} role="alert">
          <div>
            <strong>План не створився</strong>
            <p>{data.room.generationError ?? "Спробуй ще раз."}</p>
          </div>
        </div>
      )}
      {host ? (
        <Button
          size="xl"
          disabled={!actions.online || actions.busy || (!failed && missing > 0)}
          onClick={failed ? actions.retryGeneration : actions.startSession}
        >
          {failed ? "Спробувати ще раз" : "Почати готувати"}
        </Button>
      ) : (
        <p className={cookingStyles["cooking-lobby-wait"]}>
          {failed
            ? "Господар може повторити створення плану."
            : "Господар почне, коли всі приєднаються."}
        </p>
      )}
    </section>
  );
}
