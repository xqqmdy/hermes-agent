export const LARGE_PASTE = { lines: 5 }

export const LIVE_RENDER_MAX_CHARS = 16_000
export const LIVE_RENDER_MAX_LINES = 240

// Persisted verbose tool-trail blocks (Args/Result embedded in a completed
// tool line) are kept for the WHOLE session in transcript Msg.tools[] and
// rendered expanded by default, so a render-node tree is built for every one
// of up to MAX_HISTORY messages at once. Capping these to the live-render
// budget (16KB) let a heavy browser/large-output session retain ~12MB of
// strings that exploded into a few hundred MB of Ink nodes and silently OOM-
// killed the Node parent (→ stdin EOF, gateway death; issue #34095). The live
// streaming tail still uses the larger LIVE_RENDER budget — only the persisted
// per-call block shrinks to a readable preview here. Full output remains in the
// agent context and the SQLite session; the trail is a glance, not a log.
//
// `MAX_LINES` is bumped from 12 → 60 so a moderate `execute_code` (a `dir`,
// a `git status`, a small build log) renders in full without scrolling away
// into an "[omitted N lines]" notice. The char cap stays at 800 to keep the
// worst case (`MAX_HISTORY * 800` strings) inside Ink's render-node budget.
//
// `MAX_CHARS` is bumped from 800 → 16_000 to match the live-render budget:
// at 800 chars an `ls -la` on a real directory already shows the truncation
// banner instead of the actual output. The Ink render-node ceiling is now
// (`MAX_HISTORY * 16_000`) ≈ 12 MB of strings in the absolute worst case —
// Ink can inflate that to ~120 MB of nodes, which is large but no longer
// OOM-on-launch. A user with hundreds of heavy tool outputs in one session
// is rare; clipping at 800 chars was the more common pain.
export const VERBOSE_TRAIL_MAX_CHARS = 16_000
export const VERBOSE_TRAIL_MAX_LINES = 60

export const LONG_MSG = 300
export const MAX_HISTORY = 800
export const THINKING_COT_MAX = 160

// Rows per wheel event (pre-accel). 1 keeps Ink's DECSTBM fast path live
// (each scroll < viewport-1) and produces smooth motion. wheelAccel.ts
// ramps this on sustained scrolls.
export const WHEEL_SCROLL_STEP = 1
