import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '.';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const source = resolve(BOT_DIR, 'POST.json');
const destination = resolve(OUTPUT_DIR, 'POST.json');

try {
  if (statSync(source).size === 0) throw new Error('The source POST.json is empty.');
  if (source === destination) throw new Error('The bot and output directories must differ.');
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyFileSync(source, destination);
  if (statSync(destination).size === 0) throw new Error('The copied POST.json is empty.');
} catch (error) {
  console.error('Could not deliver POST.json:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
