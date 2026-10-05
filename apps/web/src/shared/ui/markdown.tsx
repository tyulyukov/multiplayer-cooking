import type { ComponentProps, FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/shared/lib/utils";
import styles from "./markdown.module.scss";

const remarkPlugins = [remarkGfm];

type MarkdownProps = { text: string; className?: string } & Pick<
  ComponentProps<typeof ReactMarkdown>,
  "disallowedElements" | "components"
>;

export const Markdown: FC<MarkdownProps> = ({
  text,
  className,
  disallowedElements,
  components,
}) => {
  return (
    <div className={cn(styles.markdown, className)} data-slot="markdown">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        disallowedElements={disallowedElements}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
