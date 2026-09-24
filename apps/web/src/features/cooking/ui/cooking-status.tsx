import cookingStyles from "@/features/cooking/ui/cooking.module.scss";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

export function CookingStatus({
  title,
  body,
  image,
  action,
  onAction,
  disabled,
  loading = false,
}: {
  title: string;
  body: string;
  image?: string;
  action?: string;
  onAction?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <section className={cookingStyles["cooking-status"]}>
      {image && !failed && (
        <img
          src={`/images/${image}`}
          alt=""
          width={112}
          height={112}
          onError={() => setFailed(true)}
        />
      )}
      <div role={loading ? "status" : undefined}>
        {loading && <Spinner className={cookingStyles["cooking-generation-spinner"]} />}
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      {action && (
        <Button size="xl" disabled={disabled} onClick={onAction}>
          {action}
        </Button>
      )}
    </section>
  );
}
