// A fake outside email-validation service (like checking that the email's
// domain can receive mail). It always says the email is fine, after 50-150ms.

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function validateEmail(email) {
  await wait(50 + Math.random() * 100);
  return true;
}

module.exports = { validateEmail };
