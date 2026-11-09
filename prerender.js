// FIXED (trap 3): renders the sign-up page once at build time (npm run build),
// so the server sends a ready file instead of rendering it on every request.
// Safe because the page is the same for every visitor.
// Also adds the ribbon (views/ribbon.js) to both pages, right after the nav bar.
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToString } = require('react-dom/server');
const SignupPage = require('./build/views/SignupPage').default;
const { ribbonHtml } = require('./views/ribbon');

function withRibbon(html, navEnd) {
  if (!html.includes(navEnd)) throw new Error(`prerender.js: couldn't find ${navEnd}`);
  return html.replace(navEnd, navEnd + ribbonHtml());
}

const write = (file, html) => fs.writeFileSync(path.join(__dirname, 'build', file), html);
const renderSignup = (props) =>
  withRibbon('<!doctype html>' + renderToString(React.createElement(SignupPage, props)), '</header>');

write('index.html', withRibbon(fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8'), '</nav>'));
write('signup.html', renderSignup());
write('signup-demo.html', renderSignup({ demo: true })); // used by demo-site/build.js
