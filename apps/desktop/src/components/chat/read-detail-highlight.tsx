'use client'

/**
 * Shiki-highlighted read_file detail body, split out of fallback.tsx so the
 * `react-shiki` static import (and the multi-MB shiki chunk behind it) loads
 * lazily on first use — the same seam syntax-diff.tsx gives the inline diff.
 *
 * Uses the same LazyShiki component as the main chat (addDefaultStyles=false,
 * as="div", rootStyle=false) so the wrapper's mono font/size/padding and
 * transparent background carry through. No default shiki pre styles injected.
 */
import { Suspense } from 'react'

import { LazyShiki, SHIKI_THEME } from '@/components/chat/shiki-highlighter'

interface ReadDetailHighlightProps {
  className?: string
  code: string
  language: string
}

export default function ReadDetailHighlight({
  className,
  code,
  language
}: ReadDetailHighlightProps) {
  // Suspense fallback: plain pre with same className — no flash while chunk loads.
  // highlight-in-progress fallback is inside LazyShiki (PlainCode).
  return (
    <Suspense fallback={<pre className={className}>{code}</pre>}>
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
        {code}
      </LazyShiki>
    </Suspense>
  )
}