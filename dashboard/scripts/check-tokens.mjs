// Fails if a raw colour is used in the dashboard (the tokens are in
// public/tokens.css, shared with the bank site), or a component reaches past
// the named tokens to the palette. Run with npm run check:tokens (also in CI).
// siteSpecimens.js is skipped: its styles belong to the bank site.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = ['src/styles', 'src/components', 'src/components-library'];
const SKIP = new Set(['src/components-library/siteSpecimens.js']);
const EXTENSIONS = /\.(css|jsx|js)$/;

const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(/;
const PALETTE = /--palette-/;

// Blanks comments but keeps the line breaks, so line numbers stay right
const withoutComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, '');

function filesIn(folder) {
  return readdirSync(join(ROOT, folder), { withFileTypes: true }).flatMap((entry) => {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) return filesIn(path);
    return EXTENSIONS.test(entry.name) && !SKIP.has(path) ? [path] : [];
  });
}

const problems = [];
const files = FOLDERS.flatMap(filesIn);
for (const file of files) {
  withoutComments(readFileSync(join(ROOT, file), 'utf8'))
    .split('\n')
    .forEach((line, index) => {
      if (RAW_COLOUR.test(line)) problems.push(`${file}:${index + 1}: raw colour: ${line.trim()}`);
      if (PALETTE.test(line)) problems.push(`${file}:${index + 1}: use a named token, not the palette: ${line.trim()}`);
    });
}

if (problems.length) {
  console.error(`Tokens: ${problems.length} problem(s), in ${relative(process.cwd(), ROOT) || '.'}:`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('Add or reuse a token in public/tokens.css.');
  process.exit(1);
}
console.log(`Tokens: OK (${files.length} files checked).`);
