// Builds the published copy of the test site into build/tomorrow-bank/:
// static files only, with no server, database or traps. Upload the folder to
// /monzo/tomorrow-bank/ on the domain. Run with npm run build:demo.
const fs = require('fs');
const path = require('path');
const { RATES } = require('../cms');

const BASE = '/monzo/tomorrow-bank/';
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'build', 'tomorrow-bank');

// Stops the build if the page changes and a replacement no longer applies
function replaceOrFail(text, find, replacement) {
  if (!text.includes(find)) throw new Error(`demo-site/build.js: couldn't find ${find}`);
  return text.replace(find, replacement);
}

function toDemoPage(html) {
  const withPaths = html
    .replace(/\b(href|src)="\/(?!\/)/g, `$1="${BASE}`)
    .replaceAll(`href="${BASE}signup"`, `href="${BASE}signup/"`);
  return replaceOrFail(
    withPaths,
    '</head>',
    `<meta name="robots" content="noindex"><link rel="stylesheet" href="${BASE}demo.css"></head>`
  );
}

function write(file, content) {
  const target = path.join(OUT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

fs.rmSync(OUT, { recursive: true, force: true });

// Styles and icons, as they are
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(PUBLIC, 'icons'), path.join(OUT, 'icons'), { recursive: true });
for (const file of ['styles.css', 'favicon.svg']) fs.copyFileSync(path.join(PUBLIC, file), path.join(OUT, file));

// The form's stand-in behaviour and styles
for (const file of ['demo-signup.js', 'demo.css']) fs.copyFileSync(path.join(__dirname, file), path.join(OUT, file));

// Pages
write('index.html', toDemoPage(fs.readFileSync(path.join(ROOT, 'build', 'index.html'), 'utf8')));
write('signup/index.html', toDemoPage(fs.readFileSync(path.join(ROOT, 'build', 'signup-demo.html'), 'utf8')));

// The rates section reads a file in place of /api/rates
write('rates.json', JSON.stringify({ rates: RATES }));
write('home.js', replaceOrFail(fs.readFileSync(path.join(PUBLIC, 'home.js'), 'utf8'), "'/api/rates'", `'${BASE}rates.json'`));

console.log(`Demo site built in ${path.relative(ROOT, OUT)}/`);
