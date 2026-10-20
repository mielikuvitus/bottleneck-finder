// FIXED (trap 3): renders the sign-up page once at build time (npm run build),
// so the server sends a ready file instead of rendering it on every request.
// Safe because the page is the same for every visitor.
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToString } = require('react-dom/server');
const SignupPage = require('./build/views/SignupPage').default;

const out = path.join(__dirname, 'build', 'signup.html');
fs.writeFileSync(out, '<!doctype html>' + renderToString(React.createElement(SignupPage)));
