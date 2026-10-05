import type { FC } from "react";
import { Markdown } from "@/shared/ui/markdown";

type CookingMarkdownProps = { text: string; className?: string };

export const CookingMarkdown: FC<CookingMarkdownProps> = ({ text, className }) => {
  return (
    <Markdown
      text={text}
      className={className}
      disallowedElements={["img"]}
      components={{
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    />
  );
};
