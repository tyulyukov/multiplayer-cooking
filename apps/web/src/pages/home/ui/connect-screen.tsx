import { cn } from "@/shared/lib/utils";
import styles from "@/features/silpo/ui/silpo-connect.module.scss";
import { ConnectCard } from "@/features/silpo/ui/silpo-connect";

import { Brand, SendError } from "./home-shell";

export function ConnectScreen({
  backendReady,
  busy,
  error,
  onConnect,
}: {
  backendReady: boolean;
  busy: boolean;
  error: string | null;
  onConnect: () => void;
}) {
  return (
    <main className={cn(styles["starter-screen"], "app-shell")}>
      <div className="checker-band" aria-hidden />
      <div className="page-frame">
        <header className="topbar">
          <Brand ready={backendReady} />
        </header>
      </div>
      <div className="home-layout">
        <ConnectCard busy={busy} onConnect={onConnect} />

        {error && <SendError message={error} />}
      </div>
    </main>
  );
}
