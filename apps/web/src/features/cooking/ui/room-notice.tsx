import cookingStyles from "@/features/cooking/ui/cooking.module.scss";

export function RoomNotice({ title, body }: { title: string; body: string }) {
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
}
