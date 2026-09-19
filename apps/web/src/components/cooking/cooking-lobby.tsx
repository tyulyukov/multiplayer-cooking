import { Button } from "@/components/ui/button";
import { KitchenIllustration } from "@/components/kitchen-illustration";
import type { CookingActions, CookingRoomData } from "./cooking-session";

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
    <section className="cooking-lobby" aria-labelledby="cooking-lobby-title">
      <div className="cooking-lobby-intro">
        <div className="cooking-lobby-copy">
          <h2 id="cooking-lobby-title">
            Збираємося
            <br />
            на кухні
          </h2>
          <div className="cooking-lobby-count" role="status">
            Приєдналися {data.members.length} з {data.room.cookCount}
          </div>
        </div>
        <KitchenIllustration name="oven-mitts" className="cooking-lobby-art" />
      </div>
      <ul className="cooking-lobby-cooks" aria-label="Кухарі в лобі">
        {data.members.map((member) => (
          <li key={member._id}>
            <button
              type="button"
              className="cooking-lobby-member"
              onClick={actions.managePeople}
              aria-label={`Кухарі: ${member.name}`}
            >
              <span
                className="cooking-lobby-avatar"
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
          <li key={`empty-${index}`} className="cooking-lobby-empty">
            <span className="cooking-lobby-avatar" aria-hidden>
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
        <div className="cooking-lobby-plan" role="alert">
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
        <p className="cooking-lobby-wait">
          {failed
            ? "Господар може повторити створення плану."
            : "Господар почне, коли всі приєднаються."}
        </p>
      )}
    </section>
  );
}
