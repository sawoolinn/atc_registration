import { formState, PROGRAM_PRICES } from './state.js';

export function getPricing() {
  let subtotal = 0;
  formState.selectedPrograms.forEach(program => {
    subtotal += PROGRAM_PRICES[program] || 0;
  });

  const workshopSelected =
    formState.selectedPrograms.has('level1') &&
    formState.selectedPrograms.has('level2');

  const tripSelected =
    formState.selectedPrograms.has('singapore') ||
    formState.selectedPrograms.has('silicon_valley');

  const discount = workshopSelected && tripSelected ? 2000 : 0;

  return { subtotal, discount, total: subtotal - discount };
}

export function toggleProgramOption(card) {
  const val = card.dataset.val;
  const chk = document.getElementById('chk-' + val);

  if (formState.selectedPrograms.has(val)) {
    formState.selectedPrograms.delete(val);
    card.classList.remove('selected');
    if (chk) chk.textContent = '\u2610';
  } else {
    formState.selectedPrograms.add(val);
    card.classList.add('selected');
    if (chk) chk.textContent = '\u2611';
  }

  updatePricingUI();
}

export function updatePricingUI() {
  const pricing    = getPricing();
  const calculator = document.getElementById('pricingCalculator');
  if (!calculator) return;

  if (formState.selectedPrograms.size === 0) {
    calculator.style.display = 'none';
    return;
  }
  calculator.style.display = 'block';

  document.getElementById('price-subtotal').textContent =
    'US$ ' + pricing.subtotal.toLocaleString();
  document.getElementById('price-total').textContent =
    'US$ ' + pricing.total.toLocaleString();

  const discountRow    = document.getElementById('discount-row');
  const discountNotice = document.getElementById('discount-notice');
  const priceDiscount  = document.getElementById('price-discount');

  if (pricing.discount > 0) {
    if (priceDiscount) priceDiscount.textContent = '-US$ ' + pricing.discount.toLocaleString();
    if (discountRow)   discountRow.style.display  = 'flex';
    if (discountNotice) discountNotice.style.display = 'block';
  } else {
    if (discountRow)   discountRow.style.display  = 'none';
    if (discountNotice) discountNotice.style.display = 'none';
  }
}