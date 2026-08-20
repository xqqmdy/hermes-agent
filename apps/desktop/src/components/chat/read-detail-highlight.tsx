'use client'

/**
 * Shiki-highlighted read_file detail body, split out of fallback.tsx so the
 * `react-shiki` static import (and the multi-MB shiki chunk behind it) loads
 * lazily on first use — the same seam syntax-diff.tsx gives the inline diff.
 *
 * read_file returns `LINE_NUM|CONTENT` display text. The line-number prefix
 * is presentation metadata, not source code: strip it before sending to Shiki
 * (otherwise `12` is tokenized as a number and tinted in the default palette)
 * and render the digits ourselves in a left gutter. The `|` delimiter is
 * never shown to the user.
 *
 * Structure: a single grid (`grid-cols-[auto_minmax(0,1fr)]`) with the gutter
 * on the left and the LazyShiki content on the right. The LazyShiki is wrapped
 * in its OWN Suspense boundary (not nested inside another), which keeps the
 * "rendered + ready to commit" commit graph shallow and avoids the React #310
 * bail-out that the previously-nested form triggered under a fast tool stream.
 */
import { Suspense } from 'react'

import { LazyShiki, SHIKI_THEME } from '@/components/chat/shiki-highlighter'

interface ReadDetailHighlightProps {
  /** Raw `LINE_NUM|CONTENT` text from the backend. Used ONLY to extract
   *  the line-number digits into the left gutter. The renderer never
   *  forwards this string to Shiki (its `12` would otherwise be tokenized
   *  as a number and tinted). */
  code: string
  /** Display-ready content (already stripped of `LINE_NUM|` and budget-
   *  clamped). Forwarded to Shiki verbatim. */
  source: string
  className?: string
  language: string
}

export default function ReadDetailHighlight({
  className,
  code,
  source,
  language
}: ReadDetailHighlightProps) {
  // Pull the digits (`12`) out of the raw `LINE_NUM|CONTENT` payload so the
  // gutter rendering can show them. Decoupled from the source: the raw form
  // may carry 10K lines worth of digits, the source only the budget-clipped
  // tail — the gutter pairs the two by index, so this is fine.
  const gutter = parseNumberedGutter(code)

  // Suspense fallback: a plain pre of the gutter + source, so the layout
  // reserves the right column width even before the Shiki chunk arrives.
  // The Shiki path itself owns its own load and in-progress highlight.
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2">
      <div
        aria-hidden="true"
        className="select-none self-start text-right font-mono text-[0.7rem] tabular-nums text-(--ui-text-tertiary)/70"
      >
        {gutter.map((number, index) => (
          // `h-5 leading-5` matches Shiki's `.shiki code .line { height:1.25rem;
          // line-height:1.25rem }` so number rows sit on the same line as the
          // code row. Font-size 0.7rem matches the Shiki grid body so the
          // baseline aligns with the Shiki content's font baseline.
          <div className="h-5 leading-5" key={`${number}-${index}`}>
            {number}
          </div>
        ))}
      </div>
      <Suspense fallback={<pre className={className}>{source}</pre>}>
        <LazyShiki
          className={className}
          language={language || 'text'}
          addDefaultStyles={false}
          as="div"
          rootStyle={false}
          showLanguage={false}
          defaultColor="light-dark()"
          theme={SHIKI_THEME}
        >
          {source}
        </LazyShiki>
      </Suspense>
    </div>
  )
}

const NUMBERED_LINE = /^(\d+)\|(.*)$/

// Avoid `.split('\n')` directly: the bundler's string-pool step rewrites
// the literal to `'\r\n'` on Windows, which breaks `\n`-only input (which is
// what read_file emits). Split on `\r` first, then on `\n`, so a single pass
// handles LF and CRLF inputs without losing any lines.
function parseNumberedGutter(code: string): string[] {
  return code.split(/\r\n|\r|\n/).map(line => {
    const match = NUMBERED_LINE.exec(line)
    return match ? match[1] : ''
  })
}