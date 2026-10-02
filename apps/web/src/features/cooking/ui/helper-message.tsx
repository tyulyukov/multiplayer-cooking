import type { FC } from "react";
import { cn } from "@/shared/lib/utils";
import { proxyConvexStorageUrl } from "@/shared/lib/convex-url";
import type { CookingHelperProps } from "../model/helper-types";
import { CookingMarkdown } from "./cooking-markdown";
import styles from "./helper-message.module.scss";

type HelperMessageProps = {
  message: CookingHelperProps["messages"][number];
  onPhotoLoad: () => void;
};

export const HelperMessage: FC<HelperMessageProps> = ({ message, onPhotoLoad }) => (
  <div
    className={cn(
      styles["helper-message"],
      message.role === "user" && styles["helper-message-user"],
    )}
  >
    <span className={styles["helper-message-author"]}>
      {message.role === "assistant" ? "Помічник" : (message.authorName ?? "Кухар")}
    </span>
    {message.attachmentUrls && message.attachmentUrls.length > 0 && (
      <div className={styles["helper-message-photos"]}>
        {message.attachmentUrls.map((url) => (
          <a
            key={url}
            href={proxyConvexStorageUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Відкрити фото"
          >
            <img src={proxyConvexStorageUrl(url)} alt="Фото з кухні" onLoad={onPhotoLoad} />
          </a>
        ))}
      </div>
    )}
    {message.text && <CookingMarkdown text={message.text} />}
  </div>
);
