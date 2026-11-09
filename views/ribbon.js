// The "fictional bank" ribbon on every page of the site. prerender.js adds it to
// the pages at build time; its styles are in public/styles.css.
const PHRASES = [
  'This is a demo site for a fictional bank, used as part of a portfolio',
  'Not affiliated with any real bank or company',
  'Any resemblance to real names or products is purely coincidental',
];

// Four copies so the loop has no gap on wide screens (the styles move the track
// by half its width). Screen readers only get the first copy.
function ribbonHtml() {
  const copy = PHRASES.map((phrase) => `<span>${phrase}</span><i class="demo-ribbon-dot" aria-hidden="true"></i>`).join('');
  const copies = [0, 1, 2, 3]
    .map((i) => `<div class="demo-ribbon-copy"${i ? ' aria-hidden="true"' : ''}>${copy}</div>`)
    .join('');
  return `<div class="demo-ribbon" role="note"><div class="demo-ribbon-track">${copies}</div></div>`;
}

module.exports = { ribbonHtml };
