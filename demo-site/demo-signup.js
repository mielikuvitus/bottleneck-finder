// The published sign-up form does nothing except explain why.
const form = document.getElementById('signup-form');
const message = form.querySelector('.signup-message');
const CONTROLS = '.signup-input, .signup-submit';

message.setAttribute('role', 'status');

// Keeps the input and button from taking focus when clicked
form.addEventListener('mousedown', (event) => {
  if (event.target.closest(CONTROLS)) event.preventDefault();
});

form.addEventListener('click', (event) => {
  if (!event.target.closest(CONTROLS)) return;
  message.textContent = 'This is a demo site, inputs are not working.';
  message.className = 'signup-message is-demo';
});

form.addEventListener('submit', (event) => event.preventDefault());
