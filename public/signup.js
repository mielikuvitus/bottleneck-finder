// Sends the sign-up form to the API and shows the result, without reloading.
const form = document.getElementById('signup-form');
const message = form.querySelector('.signup-message');
const button = form.querySelector('button');

// Give up after 3 seconds (a sign-up normally takes about 0.15s), before an
// impatient visitor would leave, so they still see a message
const SIGNUP_TIMEOUT_MS = 3000;

// The request never got a usable answer, so nothing was saved
const NOT_SAVED = 'We couldn’t save your details just now. Nothing was submitted, please try again in a moment.';
// Timed out: the server may still have created the account, so don't say it failed
const NOT_CONFIRMED = 'We couldn’t confirm your sign-up. Check your inbox, or try again in a moment.';

function show(text, kind) {
  message.textContent = text;
  message.className = `signup-message is-${kind}`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  show('', 'empty');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIGNUP_TIMEOUT_MS);

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.value }),
      signal: controller.signal,
    });

    if (response.status === 201) {
      show('Check your inbox: we’ve sent you a code to confirm it’s you.', 'success');
      form.reset();
    } else if (response.status === 400 || response.status === 409) {
      // The server explains what's wrong with the email
      show((await response.json()).error, 'error');
    } else {
      show(NOT_SAVED, 'error');
    }
  } catch (error) {
    show(error.name === 'AbortError' ? NOT_CONFIRMED : NOT_SAVED, 'error');
  } finally {
    clearTimeout(timer);
    button.disabled = false;
  }
});
