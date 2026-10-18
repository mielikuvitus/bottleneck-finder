// A fake outside CMS (content management system) that serves savings rates.
// Like a real outside service, it has a limit: it only handles MAX_IN_FLIGHT
// requests at once. Extra requests wait in a queue, first come first served.

const MAX_IN_FLIGHT = 10;

const RATES = [
  { product: 'Easy Access Saver', ratePercent: 3.1 },
  { product: '1-Year Fixed Saver', ratePercent: 4.2 },
  { product: 'ISA', ratePercent: 3.8 },
];

let inFlight = 0;
const queue = []; // requests waiting for a free slot

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function takeSlot() {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function releaseSlot() {
  const next = queue.shift();
  if (next) next(); // hand the slot straight to the next waiting request
  else inFlight--;
}

async function getRates() {
  await takeSlot();
  try {
    await wait(200 + Math.random() * 100);
    return RATES;
  } finally {
    releaseSlot();
  }
}

module.exports = { getRates };
