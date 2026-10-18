// Fills in the savings rates section from the API as soon as the page loads.
const grid = document.getElementById('rates-grid');

function rateCard({ product, ratePercent }) {
  const card = document.createElement('article');
  card.className = 'rate-card';

  const value = document.createElement('p');
  value.className = 'rate-value';
  value.textContent = `${ratePercent}%`;

  const text = document.createElement('div');
  const name = document.createElement('p');
  name.className = 'rate-product';
  name.textContent = product;
  const unit = document.createElement('p');
  unit.className = 'rate-unit';
  unit.textContent = 'a year';
  text.append(name, unit);

  card.append(value, text);
  return card;
}

fetch('/api/rates')
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(({ rates }) => grid.replaceChildren(...rates.map(rateCard)))
  .catch(() => {
    const message = document.createElement('p');
    message.className = 'rates-error';
    message.textContent = 'Couldn’t load rates right now.';
    grid.replaceChildren(message);
  });
