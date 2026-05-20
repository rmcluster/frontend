import ReactMarkdown from 'react-markdown';

export function MarkdownViewer({ raw }: { raw: string }) {
  return (
    <div className="px-8 py-6 max-w-3xl">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3 text-(--text-primary) border-b border-(--border) pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-2 text-(--text-primary)">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-(--text-primary)">{children}</h3>,
          p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-(--text-primary)">{children}</p>,
          a: ({ href, children }) => <a href={href} className="text-(--accent) hover:underline">{children}</a>,
          ul: ({ children }) => <ul className="mb-3 ml-5 list-disc text-sm text-(--text-primary)">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal text-sm text-(--text-primary)">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children, className }) =>
            className ? (
              <code className="block overflow-auto rounded bg-(--bg-elevated) text-(--text-primary) text-xs font-mono p-3 mb-3">{children}</code>
            ) : (
              <code className="text-xs font-mono bg-(--bg-elevated) text-(--accent) px-1 py-0.5 rounded">{children}</code>
            ),
          pre: ({ children }) => <pre className="mb-3">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-(--border) pl-4 text-(--text-muted) italic mb-3">{children}</blockquote>,
          hr: () => <hr className="my-4 border-(--border)" />,
          strong: ({ children }) => <strong className="font-semibold text-(--text-primary)">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {raw}
      </ReactMarkdown>
    </div>
  );
}
