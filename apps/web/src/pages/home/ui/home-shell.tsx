import { cn } from "@/shared/lib/utils";
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
    <Alert
      variant="destructive"
      className={cn(
        styles["home-error"],
        "rounded-[14px] border-2 px-[18px] py-4 has-[>svg]:gap-x-2.5",
      )}
    >
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
      <AlertDescription className="text-[0.9375rem] leading-[1.375rem] font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );
}
