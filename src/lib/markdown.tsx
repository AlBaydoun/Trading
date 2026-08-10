import * as React from "react";
import { slugify } from "@/lib/utils";

/**
 * Minimal markdown renderer for editorial content.
 *
 * Purpose-built rather than pulled from a dependency: the content comes from
 * our own CMS, we need exactly six block types, and rendering to React elements
 * instead of an HTML string means no `dangerouslySetInnerHTML` anywhere in the
 * article path. Unsupported syntax degrades to plain text rather than breaking.
 *
 * Supports: headings (##, ###), paragraphs, unordered and ordered lists,
 * blockquotes, fenced code blocks, pipe tables, and inline bold / italic /
 * code / links.
 */

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Extracts the heading outline for a table of contents. */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inCodeFence = false;

  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (match) {
      const text = stripInline(match[2].trim());
      headings.push({
        id: slugify(text),
        text,
        level: match[1].length === 2 ? 2 : 3,
      });
    }
  }

  return headings;
}

function stripInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

/**
 * Parses inline emphasis, code and links into React nodes.
 * Ordered so that code spans win over emphasis — `**not bold**` inside
 * backticks stays literal.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.86em] text-brand-bright"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        const href = linkMatch[2];
        const external = /^https?:\/\//.test(href);
        nodes.push(
          <a
            key={key}
            href={href}
            className="text-brand-bright underline decoration-brand/40 underline-offset-[3px] transition-colors hover:text-mint hover:decoration-mint/60"
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {linkMatch[1]}
          </a>,
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let code: { lines: string[]; language: string } | null = null;
  let table: string[][] | null = null;
  let key = 0;

  /** `| a | b |` → ["a", "b"]. Trailing and leading pipes are optional. */
  const parseRow = (line: string): string[] =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());

  const isSeparatorRow = (line: string): boolean =>
    /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());

  const flushTable = () => {
    if (!table || table.length === 0) return;
    const [header, ...rows] = table;

    blocks.push(
      <div key={`t-${key++}`} className="my-7 w-full overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[14.5px]">
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th
                  key={i}
                  scope="col"
                  className="border-b border-line-bright px-3 py-2.5 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-ink-faint"
                >
                  {renderInline(cell, `th${key}-${i}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="border-b border-line/60 px-3 py-2.5 align-top leading-relaxed text-ink-muted"
                  >
                    {renderInline(cell, `td${key}-${r}-${c}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    table = null;
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    blocks.push(
      <p key={`p-${key++}`} className="my-5 text-[16.5px] leading-[1.78] text-ink-muted">
        {renderInline(text, `p${key}`)}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list || list.items.length === 0) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={`l-${key++}`}
        className={`my-5 space-y-2.5 pl-1 text-[16.5px] leading-[1.75] text-ink-muted ${
          list.ordered ? "list-none counter-reset-item" : "list-none"
        }`}
      >
        {list.items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={`mt-[0.55em] shrink-0 ${
                list!.ordered
                  ? "mt-0 w-5 font-mono text-[13px] text-brand"
                  : "size-1.5 rounded-full bg-brand/70"
              }`}
              aria-hidden="true"
            >
              {list!.ordered ? `${i + 1}.` : ""}
            </span>
            <span>{renderInline(item, `li${key}-${i}`)}</span>
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };

  const flushQuote = () => {
    if (quote.length === 0) return;
    blocks.push(
      <blockquote
        key={`q-${key++}`}
        className="my-7 border-l-2 border-brand/60 bg-surface/50 py-3 pl-5 pr-4 text-[16.5px] italic leading-relaxed text-ink"
      >
        {renderInline(quote.join(" "), `q${key}`)}
      </blockquote>,
    );
    quote = [];
  };

  const flushCode = () => {
    if (!code) return;
    blocks.push(
      <pre
        key={`c-${key++}`}
        className="my-6 overflow-x-auto rounded-xl border border-line bg-abyss p-4 font-mono text-[13px] leading-relaxed text-ink-muted"
      >
        <code>{code.lines.join("\n")}</code>
      </pre>,
    );
    code = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Fenced code takes priority — nothing inside it is parsed.
    if (line.trimStart().startsWith("```")) {
      if (code) {
        flushCode();
      } else {
        flushParagraph();
        flushList();
        flushQuote();
        code = { lines: [], language: line.trim().slice(3) };
      }
      continue;
    }
    if (code) {
      code.lines.push(raw);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      flushQuote();
      flushTable();
      continue;
    }

    // A pipe table: header row, separator row, then body rows.
    if (line.trim().includes("|") && /^\|/.test(line.trim())) {
      if (isSeparatorRow(line)) continue; // the |---|---| divider carries no data
      flushParagraph();
      flushList();
      flushQuote();
      if (!table) table = [];
      table.push(parseRow(line));
      continue;
    }
    flushTable();

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();

      const text = heading[2].trim();
      const id = slugify(stripInline(text));

      if (heading[1].length === 2) {
        blocks.push(
          <h2
            key={`h-${key++}`}
            id={id}
            className="mt-12 scroll-mt-28 font-display text-[26px] font-semibold tracking-tight text-ink"
          >
            {renderInline(text, `h${key}`)}
          </h2>,
        );
      } else {
        blocks.push(
          <h3
            key={`h-${key++}`}
            id={id}
            className="mt-9 scroll-mt-28 font-display text-[20px] font-semibold tracking-tight text-ink"
          >
            {renderInline(text, `h${key}`)}
          </h3>,
        );
      }
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line.trimStart());
    if (bullet) {
      flushParagraph();
      flushQuote();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = /^\d+\.\s+(.+)$/.exec(line.trimStart());
    if (numbered) {
      flushParagraph();
      flushQuote();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    if (line.trimStart().startsWith("> ")) {
      flushParagraph();
      flushList();
      quote.push(line.trimStart().slice(2));
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushTable();
  flushCode();

  return <div className="markdown-body">{blocks}</div>;
}
