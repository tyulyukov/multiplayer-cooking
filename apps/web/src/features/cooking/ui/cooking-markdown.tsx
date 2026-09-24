import type { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const plugins = [remarkGfm];

type CookingMarkdownProps = { text: string; className?: string };

export const CookingMarkdown: FC<CookingMarkdownProps> = ({ text, className = "" }) => {
  return (
    <div className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={plugins}
        disallowedElements={["img"]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
