import { useState } from "react";

import { cn } from "@/lib/utils";

export function KitchenIllustration({
  name,
  className,
}: {
  name:
    | "recipe-box"
    | "memory-fridge"
    | "bag-pot"
    | "serving-dome"
    | "basket-filled"
    | "oven-mitts";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      className={cn("kitchen-illustration", className)}
      src={`/images/${name}.webp`}
      alt=""
      width={384}
      height={384}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
