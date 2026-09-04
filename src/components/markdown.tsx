import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const remarkPlugins = [remarkGfm];

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className ? `markdown ${className}` : "markdown"}>
      <ReactMarkdown remarkPlugins={remarkPlugins}>{text}</ReactMarkdown>
    </div>
  );
}
