import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '.';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(OUTPUT_DIR, { recursive: true });

const src = join(BOT_DIR, 'POST.json');
const dest = join(OUTPUT_DIR, 'POST.json');

if (!existsSync(src)) {
  console.error(`Fatal Error: Source file ${src} is missing from bot directory.`);
  process.exit(1);
}

try {
  copyFileSync(src, dest);
  const stats = statSync(dest);
  if (stats.size === 0) {
    console.error(`Error: Copied POST.json is empty.`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed to copy POST.json to ${dest}: ${(err as Error).message}`);
  process.exit(1);
}
