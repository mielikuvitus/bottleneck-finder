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
let dropped = 0; // queued requests cancelled before they got a slot

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// signal (optional): when it aborts while the request is still queued, the
// request leaves the queue, so the slot goes to someone still waiting
function takeSlot(signal) {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight++;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      queue.splice(queue.indexOf(waiter), 1);
      dropped++;
      reject(signal.reason);
    };
    const waiter = () => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    };
    queue.push(waiter);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function releaseSlot() {
  const next = queue.shift();
  if (next) next(); // hand the slot straight to the next waiting request
  else inFlight--;
}

function getStats() {
  return { inFlight, queued: queue.length, limit: MAX_IN_FLIGHT, dropped };
}

async function getRates(signal) {
  await takeSlot(signal);
  try {
    await wait(200 + Math.random() * 100);
    return RATES;
  } finally {
    releaseSlot();
  }
}

module.exports = { getRates, getStats };
