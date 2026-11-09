import type { NoteStyle } from './CanvasRenderer'

export const NOTE_COLOR_STYLES: Record<string, NoteStyle> = {
  yellow: { bg: '#fdf6c3', text: '#5b4b2a', border: '#e5d98a' },
  mint: { bg: '#d7f0e1', text: '#2f5a45', border: '#b5dcc6' },
  pink: { bg: '#fbdce3', text: '#6b3444', border: '#eab9c6' },
  blue: { bg: '#d9ebfb', text: '#2c4a6e', border: '#b6d2ee' },
  peach: { bg: '#ffe6d3', text: '#6b452c', border: '#efc8a8' },
  lilac: { bg: '#e9e1fa', text: '#4a3b72', border: '#cdbceb' },
}
