import { mkdir, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const src = join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
const destDir = join(root, 'public', 'assets')
const dest = join(destDir, 'sql-wasm.wasm')

await mkdir(destDir, { recursive: true })
await copyFile(src, dest)
console.log('copied sql-wasm.wasm -> public/assets/sql-wasm.wasm')
