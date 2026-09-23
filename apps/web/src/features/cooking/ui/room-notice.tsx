import type { FC } from "react";
import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
type RoomNoticeProps = { title: string; body: string };

export const RoomNotice: FC<RoomNoticeProps> = ({ title, body }) => {
  return (
    <main className={cookingStyles["cooking-shell"]}>
      <div className="checker-band" aria-hidden />
      <header className="topbar page-frame">
        <a href="/" className="brand">
          <i aria-hidden />
          Multiplayer Cooking
        </a>
      </header>
      <section className={cookingStyles["cooking-status"]}>
        <h1>{title}</h1>
        <p>{body}</p>
      </section>
    </main>
  );
};
