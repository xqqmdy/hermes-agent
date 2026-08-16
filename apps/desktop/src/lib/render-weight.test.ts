import { describe, expect, it } from 'vitest'

import { messagePaintWeight, messageStoreWeight, RENDER_WEIGHT_CHARS } from './render-weight'

const bigResult = (chars: number) => ({
  type: 'tool-call',
  toolName: 'skill_view',
  args: { name: 'hermes-agent' },
  result: { content: 'x'.repeat(chars) }
})

describe('messageStoreWeight', () => {
  it('charges large text and tool results by character cost, not only part count', () => {
    const text = [{ type: 'text', text: 'x'.repeat(RENDER_WEIGHT_CHARS * 3) }]

    expect(messageStoreWeight(text)).toBe(4)
    expect(messageStoreWeight([bigResult(RENDER_WEIGHT_CHARS * 100)])).toBeGreaterThanOrEqual(101)
  })

  it('prices a 51KB tool output well above a plain exchange', () => {
    const heavy = messageStoreWeight([bigResult(51_236)])
    const light = messageStoreWeight([{ type: 'text', text: 'ok' }])

    expect(heavy).toBeGreaterThan(light * 50)
  })

  it('handles circular tool payloads without recursing forever', () => {
    const result: { content: string; self?: unknown } = { content: 'ok' }
    result.self = result

    expect(messageStoreWeight([{ type: 'tool-call', result }])).toBe(2)
  })

  it('bounds a single enormous payload', () => {
    const enormous = messageStoreWeight([bigResult(RENDER_WEIGHT_CHARS * 10_000)])

    expect(enormous).toBeLessThanOrEqual(302)
  })
})

describe('messagePaintWeight', () => {
  // Activity rows (read_file / terminal / search_files / ...) now open by
  // default, so their detail + stdout/stderr gets mounted. The renderer still
  // clamps each row's paint to ~20KB (`MAX_TOOL_RENDER_CHARS`), so an
  // enormous payload doesn't scale linearly with the bytes — pricing stops at
  // the clamp.
  it('caps an expanded activity row at its render clamp, not its payload size', () => {
    const clamped = messagePaintWeight([bigResult(RENDER_WEIGHT_CHARS * 100)])
    const wayOverClamp = messagePaintWeight([bigResult(RENDER_WEIGHT_CHARS * 500)])
    const moderate = messagePaintWeight([bigResult(RENDER_WEIGHT_CHARS * 5)])
    const tiny = messagePaintWeight([bigResult(200)])

    // Both over-clamp rows paint the same — once we hit the 20KB render
    // clamp, more payload bytes stop adding paint cost.
    expect(clamped).toBe(wayOverClamp)
    // A row that fits below the clamp paints proportional to its bytes.
    expect(tiny).toBeLessThan(clamped)
    expect(moderate).toBeLessThan(clamped)
    // The clamp also keeps paint way below store weight.
    expect(clamped).toBeLessThan(messageStoreWeight([bigResult(RENDER_WEIGHT_CHARS * 100)]))
  })

  it('charges a reasoning block one collapsed header', () => {
    const thought = [{ type: 'reasoning', text: 'x'.repeat(RENDER_WEIGHT_CHARS * 20) }]

    expect(messagePaintWeight(thought)).toBe(1)
  })

  it('charges rendered markdown its real character cost', () => {
    const text = [{ type: 'text', text: 'x'.repeat(RENDER_WEIGHT_CHARS * 3) }]

    expect(messagePaintWeight(text)).toBe(4)
  })

  it('charges a diff by size — FileDiffPanel really does mount a row per line', () => {
    const diff = Array.from({ length: 400 }, (_, i) => `+line ${i}`).join('\n')

    const patch = messagePaintWeight([
      { type: 'tool-call', toolName: 'patch', args: { path: 'a.ts' }, result: { inline_diff: diff } }
    ])

    expect(patch).toBeGreaterThan(5)
  })

  it('prices an image card flat, however long its data URL', () => {
    const card = (chars: number) => [
      {
        type: 'tool-call',
        toolName: 'image_generate',
        args: {},
        result: { image: `data:image/png;base64,${'A'.repeat(chars)}` }
      }
    ]

    expect(messagePaintWeight(card(10_000_000))).toBe(messagePaintWeight(card(80)))
  })

  it('charges nothing for a row that renders nothing', () => {
    const hoisted = [
      {
        type: 'tool-call',
        toolName: 'todo',
        args: { todos: Array.from({ length: 40 }, (_, i) => ({ content: `t${i}` })) }
      },
      { type: 'tool-call', toolName: 'react_to_message', args: { emoji: '❤️' } }
    ]

    // Floors at 1: a message always occupies at least a row of the transcript.
    expect(messagePaintWeight(hoisted)).toBe(1)
  })

  it('bounds paint under the render clamp even for a tool-heavy turn', () => {
    // Activity rows now open by default, so each tool paints its detail. The
    // renderer's per-row clamp keeps paint bounded — past it, more payload
    // doesn't add paint cost. Twelve 4KB rows paint ~108 units; they would
    // blow past that without the clamp.
    const parts = Array.from({ length: 12 }, () => bigResult(4_000)).concat([
      { type: 'text', text: 'x'.repeat(600) } as unknown as ReturnType<typeof bigResult>
    ])

    const paint = messagePaintWeight(parts)

    // Each 4KB row paints ~9 units (1 + ceil(4000/512)) — well below the
    // 20KB clamp — and the message as a whole stays well under the
    // virtualizer's per-message ceiling.
    expect(paint).toBeLessThan(300)
  })

  it('bounds a message of many enormous parts', () => {
    const parts = Array.from({ length: 50 }, () => ({
      type: 'text',
      text: 'x'.repeat(RENDER_WEIGHT_CHARS * 500)
    }))

    // One ceiling for the whole message — not one per part.
    expect(messagePaintWeight(parts)).toBeLessThanOrEqual(350)
  })
})
