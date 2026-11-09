// The pieces of the tomorrow site shown on the components page, in atoms,
// molecules, organisms order. Most are taken from the real pages by CSS class
// (`pick`: [page, selector] pairs), so they can't drift from the site. `build`
// writes by hand the states that only JavaScript creates on the site.
//
// Options: standalone (undoes the absolute position it has inside its parent),
// full (no padding, for whole sections), dark (navy background), width (px),
// glow (the hero's background glow), stacked (one piece per line), variants
// (versions of one piece, shown one at a time with a toggle), usedIn (the
// organism it's used in, for pieces written by hand: the others are worked out
// from the pages)
const home = (...selectors) => selectors.map((selector) => ['home', selector]);
const signup = (...selectors) => selectors.map((selector) => ['signup', selector]);

// Same markup as rateCard() in public/home.js
const rateCard = ({ product, ratePercent }) =>
  `<article class="rate-card"><p class="rate-value">${ratePercent}%</p><div><p class="rate-product">${product}</p><p class="rate-unit">a year</p></div></article>`;

// The email field with signup.js's message filled in
function emailField(pick, text, kind) {
  const holder = document.createElement('div');
  holder.innerHTML = pick('signup', '.signup-field');
  const message = holder.querySelector('.signup-message');
  message.textContent = text;
  message.className = `signup-message is-${kind}`;
  return holder.innerHTML;
}

export const SPECIMENS = [
  {
    level: 'Atoms',
    name: 'Logo',
    variants: [
      { label: 'Light', pick: home('.nav .logo') },
      { label: 'Dark', pick: home('.footer-bottom .logo'), dark: true },
    ],
  },
  { level: 'Atoms', name: 'Button (small, large, soft shadow, coral)', pick: home('.nav .btn-small', '.hero-cta', '.features-cta .btn', '.footer-cta .btn-coral') },
  { level: 'Atoms', name: 'Eyebrow (regular, large)', pick: home('.hero-copy .eyebrow', '.features-head .eyebrow-large') },
  { level: 'Atoms', name: 'Avatar (40, 36, 36 green)', pick: home('.phone-balance .avatar-40', '.activity-list .avatar-36:not(.avatar-green)', '.activity-list .avatar-green') },
  { level: 'Atoms', name: 'Stars', pick: home('.stars') },
  {
    level: 'Atoms',
    name: 'Icon',
    iconLinks: true, // each icon links to its own first use
    build: ({ manifest, iconUrl }) =>
      manifest.icons
        .map((file) => `<button type="button" class="spec-icon" data-icon="${file}"><span class="spec-icon-tile"><img src="${iconUrl(file)}" alt=""></span><code>${file.replace('.svg', '')}</code></button>`)
        .join(''),
  },

  { level: 'Molecules', name: 'Check list (homepage, sign-up)', pick: [...home('.hero-checks'), ...signup('.signup-benefits')], stacked: true },
  { level: 'Molecules', name: 'Rating card', pick: home('.rating-card'), width: 590 },
  { level: 'Molecules', name: 'Feature card', pick: home('.feature-card') },
  { level: 'Molecules', name: 'Stats', pick: home('.stats'), width: 440 },
  { level: 'Molecules', name: 'Rate card (normal)', build: ({ manifest }) => rateCard(manifest.rates[0]), width: 380, usedIn: 'Savings rates' },
  { level: 'Molecules', name: 'Rate card (loading)', pick: home('.rate-card.is-loading'), width: 380 },
  { level: 'Molecules', name: 'Activity list', pick: home('.activity'), width: 288 },
  { level: 'Molecules', name: 'Floating cards', pick: home('.float-month', '.float-payment'), standalone: true },
  { level: 'Molecules', name: 'Bank card', pick: home('.bank-card'), width: 288 },
  { level: 'Molecules', name: 'Debit card', pick: signup('.debit-card'), standalone: true },
  { level: 'Molecules', name: 'Reassurance card', pick: signup('.signup-reassurance'), standalone: true },
  { level: 'Molecules', name: 'Savings widget', pick: home('.roundup-widget'), standalone: true, width: 400 },
  { level: 'Molecules', name: 'Sign-up steps', pick: signup('.signup-steps') },
  { level: 'Molecules', name: 'Email field (empty)', pick: signup('.signup-field'), width: 500 },
  {
    level: 'Molecules',
    name: 'Email field (success, error)',
    build: ({ pick }) =>
      emailField(pick, 'Check your inbox: we’ve sent you a code to confirm it’s you.', 'success') +
      emailField(pick, 'Please enter a valid email address.', 'error'),
    width: 500,
    stacked: true,
    usedIn: 'Sign-up form',
  },

  { level: 'Organisms', name: 'Nav bar (homepage)', pick: home('.nav'), full: true },
  { level: 'Organisms', name: 'Nav bar (sign-up)', pick: signup('.signup-header'), full: true },
  { level: 'Organisms', name: 'Ribbon', pick: home('.demo-ribbon'), full: true },
  { level: 'Organisms', name: 'Hero', pick: home('.hero-grid'), full: true, glow: true },
  { level: 'Organisms', name: 'Ratings', pick: home('.ratings'), full: true },
  { level: 'Organisms', name: 'Features', pick: home('.features'), full: true },
  { level: 'Organisms', name: 'Round-ups', pick: home('.roundups'), full: true },
  {
    level: 'Organisms',
    name: 'Savings rates',
    pick: home('.rates'), // what it's built from, so pieces inside it link here
    build: ({ pick, manifest }) => {
      const holder = document.createElement('div');
      holder.innerHTML = pick('home', '.rates');
      holder.querySelector('#rates-grid').innerHTML = manifest.rates.map(rateCard).join('');
      return holder.innerHTML;
    },
    full: true,
  },
  { level: 'Organisms', name: 'Sign-up form', pick: signup('.signup-form-col'), width: 500 },
  { level: 'Organisms', name: 'Welcome panel', pick: signup('.signup-panel'), width: 560 },
  { level: 'Organisms', name: 'Footer (homepage)', pick: home('.footer'), full: true },
  { level: 'Organisms', name: 'Footer (sign-up)', pick: signup('.footer'), full: true },
];

// The site's body styles, plus what the pieces need away from their pages
export const SPECIMEN_CSS = `
:host {
  all: initial;
  display: block;
  background: var(--cream);
  color: var(--ink);
  font-family: 'Manrope', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.spec { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 24px; padding: 24px; }
.spec-stacked { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }
.spec-full { display: block; padding: 0; }
.spec-dark { background: var(--navy); }
.spec-glow { background: radial-gradient(circle 424px at 75% 58px, rgba(255, 79, 64, 0.16), rgba(255, 79, 64, 0)) 0 0 / 100% 580px no-repeat; }
.spec-limit > * { flex: 1 1 100%; }
.spec-limit { max-width: var(--spec-width); }
.spec-standalone .float-card,
.spec-standalone .debit-card,
.spec-standalone .signup-reassurance,
.spec-standalone .roundup-widget { position: relative; left: auto; right: auto; top: auto; }
/* Whole sections at the layout width of a 1280px screen, as the column is narrower */
.spec-full > * { zoom: 0.88; }
.spec-full > .demo-ribbon { zoom: 1; position: static; }
/* Spacing that belongs to a piece's place on its page */
.spec > .bank-card, .spec > .hero-cta, .spec > .stats { margin-top: 0; }
.spec > .hero-checks, .spec > .activity { padding-top: 0; }
.spec-linked, .spec-linked * { cursor: pointer; }
.spec-icon { display: inline-flex; align-items: center; gap: 8px; padding: 0; border: 0; background: none; font: inherit; }
.spec-icon code { font-size: 12px; color: var(--grey-text); }
.spec-icon-tile { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 8px; background: var(--grey-faint); }
.spec-icon-tile img { max-width: 32px; max-height: 32px; }
`;
