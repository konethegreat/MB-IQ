// Code written by Kone & Claude | The code does the following: " Shared renderer for everything the AI
// produces. Renders Markdown (GitHub-flavoured: headings, lists, tables, code) and turns fenced
// ```mermaid blocks into live diagrams via <Mermaid>. This replaces the old monospace <pre> dumps so AI
// output is consistently, readably structured across the Agent, Meetings, Documentation and Reports. "

import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mermaid } from './Mermaid';

// Code written by Kone & Claude | The code does the following: " Reads the language + text out of the
// <code> element react-markdown produces for a fenced block, so we can route ```mermaid to <Mermaid>. "
function readFencedCode(child: unknown): { lang: string; text: string } | null {
  const el = child as { props?: { className?: string; children?: unknown } } | null;
  if (!el || !el.props) return null;
  const cls = el.props.className ?? '';
  const match = /language-(\w+)/.exec(cls);
  const text = String(el.props.children ?? '').replace(/\n$/, '');
  return { lang: match?.[1] ?? '', text };
}

const components: Components = {
  // Fenced code blocks arrive wrapped in <pre><code>. Mermaid blocks render as diagrams; the rest keep
  // a styled code block. (Inline `code` falls through to the default element.)
  pre(props) {
    const { children } = props;
    const first = Array.isArray(children) ? children[0] : children;
    const info = readFencedCode(first);
    if (info && info.lang === 'mermaid') return <Mermaid code={info.text} />;
    return <pre className="code-block">{children}</pre>;
  },
};

export function RichContent({ markdown }: { markdown: string }) {
  return (
    <div className="rich-content">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>{markdown || ''}</Markdown>
    </div>
  );
}
