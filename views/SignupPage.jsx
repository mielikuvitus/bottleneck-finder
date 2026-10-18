// How many invisible helper components every design-system component renders
// next to its content. Real React apps are full of components like this
// (analytics, feature flags, providers) that output nothing but still cost
// CPU time to render. Tuned so one render of this page takes about 15ms
// (with NODE_ENV=production).
const RENDER_WEIGHT = 2750;

const HELPER_KEYS = Array.from({ length: RENDER_WEIGHT }, (_, i) => i);

function Helper() {
  return null;
}

function Weighted({ children }) {
  return (
    <>
      {HELPER_KEYS.map((key) => <Helper key={key} />)}
      {children}
    </>
  );
}

// Small design-system-style building blocks
function Stack({ as: Tag = 'div', className, children }) {
  return <Weighted><Tag className={className}>{children}</Tag></Weighted>;
}

function Text({ as: Tag = 'p', className, children }) {
  return <Weighted><Tag className={className}>{children}</Tag></Weighted>;
}

function Icon({ name, width, height }) {
  return <Weighted><img src={`/icons/${name}.svg`} width={width} height={height} alt="" /></Weighted>;
}

function Logo({ light }) {
  return (
    <a className={light ? 'logo logo-light' : 'logo'} href="/" aria-label="Tomorrow home">
      <span className="logo-mark">T</span>
      <span className="logo-word">tomorrow</span>
    </a>
  );
}

function Benefit({ children }) {
  return (
    <Stack as="li">
      <Icon name="check-signup" width={16} height={16} />
      {children}
    </Stack>
  );
}

function WelcomePanel() {
  return (
    <Stack as="section" className="signup-panel">
      <Text className="signup-eyebrow">Your next chapter</Text>
      <Text as="h2" className="signup-panel-title">
        A brighter<br />tomorrow<br />starts <span className="accent">here.</span>
      </Text>
      <Text className="signup-panel-text">
        One simple account to spend, save, and grow. A little less banking. A lot more living.
      </Text>

      <Stack className="signup-illustration">
        <img className="signup-backdrop" src="/icons/signup-backdrop.svg" width="294" height="228" alt="" />
        <Stack className="debit-card">
          <Stack className="debit-card-top">
            <Text as="span" className="debit-card-brand">tomorrow</Text>
            <Icon name="nfc" width={20} height={20} />
          </Stack>
          <Stack className="debit-card-details">
            <span className="debit-card-chip" />
            <Stack className="debit-card-bottom">
              <Text as="span" className="debit-card-number">{'••••  4082'}</Text>
              <Icon name="card-symbol" width={39} height={24} />
            </Stack>
          </Stack>
        </Stack>
        <Stack className="signup-reassurance">
          <span className="signup-reassurance-icon"><Icon name="check-signup" width={16} height={16} /></span>
          <Text as="span">Made for your everyday.</Text>
        </Stack>
      </Stack>

      <Stack as="ul" className="signup-benefits">
        <Benefit>Free to open</Benefit>
        <Benefit>Ready in 5 minutes</Benefit>
      </Stack>
    </Stack>
  );
}

function SignupForm() {
  return (
    <Stack as="section" className="signup-form-col">
      <Stack as="ol" className="signup-steps" aria-label="Application progress">
        <li className="is-current" aria-current="step"><span className="signup-step-num">1</span>Your email</li>
        <li>Verify</li>
        <li>Your details</li>
      </Stack>

      <Stack className="signup-intro">
        <Text as="h1" className="signup-title">Open your free<br />bank account.</Text>
        <Text className="signup-intro-text">
          Let’s start with your email. We’ll send you a code to confirm it’s you.
        </Text>
      </Stack>

      <form id="signup-form" className="signup-form" noValidate>
        <Stack className="signup-field">
          <label htmlFor="email">Email address</label>
          <Stack className="signup-input">
            <Icon name="mail" width={20} height={20} />
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </Stack>
          <Text className="signup-message" />
        </Stack>
        <Text className="signup-terms">
          By continuing, you agree to our <a href="#">Terms &amp; Conditions</a> and acknowledge
          our <a href="#">Privacy Policy</a>.
        </Text>
        <button className="signup-submit" type="submit">
          Continue with email
          <Icon name="arrow-right" width={20} height={20} />
        </button>
        <Text className="signup-privacy">
          <Icon name="lock-keyhole" width={14} height={14} />
          Your details stay private and protected.
        </Text>
      </form>

      <Text className="signup-support">
        Need a hand? <a href="#">Contact support</a>
      </Text>
    </Stack>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <p className="eyebrow eyebrow-large">Make more of tomorrow</p>
            <h2 className="footer-title">Ready when<br />you are.</h2>
          </div>
          <div className="footer-cta">
            <p>Join thousands of people building a calmer, clearer relationship with their money.</p>
            <div className="footer-cta-space" />
          </div>
        </div>
        <div className="footer-bottom">
          <Logo light />
          <p>© 2026 Tomorrow Financial, Inc. All rights reserved.</p>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function SignupPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Open your account · tomorrow</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header className="signup-header container">
          <Logo />
        </header>
        <main className="signup-main container">
          <SignupForm />
          <WelcomePanel />
        </main>
        <Footer />
        <script src="/signup.js" />
      </body>
    </html>
  );
}
