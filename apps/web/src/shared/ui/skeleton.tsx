import type { FC } from "react";
import { cn } from "@/shared/lib/utils";

type SkeletonProps = React.ComponentProps<"div">;

const Skeleton: FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
};

export { Skeleton };
