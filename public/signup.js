// Sends the sign-up form to the API and shows the result, without reloading.
const form = document.getElementById('signup-form');
const message = form.querySelector('.signup-message');
const button = form.querySelector('button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  message.textContent = '';
  message.className = 'signup-message';

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.value }),
    });
    const body = await response.json();
    if (response.status === 201) {
      message.textContent = 'Check your inbox: we’ve sent you a code to confirm it’s you.';
      message.classList.add('is-success');
      form.reset();
    } else {
      message.textContent = body.error;
      message.classList.add('is-error');
    }
  } catch {
    message.textContent = 'Something went wrong. Please try again.';
    message.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});
