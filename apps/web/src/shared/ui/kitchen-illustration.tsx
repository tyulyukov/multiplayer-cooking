import type { FC } from "react";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";

type KitchenIllustrationProps = {
  name:
    | "starter-sign"
    | "recipe-box"
    | "memory-fridge"
    | "bag-pot"
    | "serving-dome"
    | "serving-bell"
    | "basket-filled"
    | "oven-mitts";
  className?: string;
};

export const KitchenIllustration: FC<KitchenIllustrationProps> = ({ name, className }) => {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      className={cn("kitchen-illustration", className)}
      src={`/images/${name}.webp`}
      alt=""
      width={384}
      height={name === "starter-sign" ? 394 : 384}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};
