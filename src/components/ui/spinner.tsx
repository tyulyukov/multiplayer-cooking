import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { HugeiconsIconProps } from "@hugeicons/react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: Omit<HugeiconsIconProps, "icon">) {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      data-slot="spinner"
      aria-hidden
      strokeWidth={1.5}
      className={cn(
        "size-4 animate-spin motion-reduce:animate-none motion-reduce:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Spinner };
