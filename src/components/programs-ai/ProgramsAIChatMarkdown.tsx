"use client"

import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

type ProgramsAIChatMarkdownProps = {
  content: string
  className?: string
}

/** Renders assistant replies (DeepSeek markdown) inside chat bubbles. */
export function ProgramsAIChatMarkdown({
  content,
  className,
}: ProgramsAIChatMarkdownProps) {
  if (!content.trim()) return null

  return (
    <div
      className={cn(
        "programs-ai-chat-markdown [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <p className="text-sm font-bold text-slate-900 mb-2">{children}</p>
          ),
          h2: ({ children }) => (
            <p className="text-sm font-bold text-slate-900 mb-1.5">{children}</p>
          ),
          h3: ({ children }) => (
            <p className="text-sm font-semibold text-slate-900 mb-1">{children}</p>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1d4ed8] underline underline-offset-2 break-all"
            >
              {children}
            </a>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isBlock = codeClassName?.includes("language-")
            if (isBlock) {
              return (
                <code
                  className={cn(
                    "block text-xs bg-slate-200/80 rounded-md p-2 my-2 overflow-x-auto font-mono",
                    codeClassName
                  )}
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code
                className="text-xs bg-slate-200/70 rounded px-1 py-0.5 font-mono"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-slate-200/80 p-2 text-xs">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-600 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
