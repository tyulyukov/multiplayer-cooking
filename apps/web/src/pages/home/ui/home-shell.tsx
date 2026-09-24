import styles from "@/pages/home/home-page.module.scss";
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Alert, AlertDescription } from "@/shared/ui/alert";

export function Brand({ ready }: { ready: boolean }) {
  return (
    <div className="brand" data-backend-ready={ready}>
      <i aria-hidden />
      Multiplayer Cooking
    </div>
  );
}

export function SendError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className={styles["home-error"]}>
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
      <AlertDescription className={styles["home-error-description"]}>{message}</AlertDescription>
    </Alert>
  );
}
