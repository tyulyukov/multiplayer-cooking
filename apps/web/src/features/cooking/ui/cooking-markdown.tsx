import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const plugins = [remarkGfm];
export function CookingMarkdown({ text, className = "" }: { text: string; className?: string }) {
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
}
