import { formState } from './state.js';
import { getPricing } from './pricing.js';
import { showError } from './utils.js';

export function updatePaymentDisplay() {
  const pricing = getPricing();
  const el = document.getElementById('payment-amount-display');
  if (el) el.textContent = 'US$ ' + pricing.total.toLocaleString();
}

export function selectPaymentMethod(method, card) {
  formState.paymentMethod = method;

  document.querySelectorAll('#payment-choices .choice-card').forEach(c => c.classList.remove('selected'));

  if (card) {
    card.classList.add('selected');
  } else {
    const cardEl = document.querySelector(`#payment-choices [data-val="${method}"]`);
    if (cardEl) cardEl.classList.add('selected');
  }

  const abaPanel = document.getElementById('payment-option-aba');
  const financePanel = document.getElementById('payment-option-finance');

  if (method === 'aba_qr') {
    if (abaPanel) abaPanel.style.display = 'block';
    if (financePanel) financePanel.style.display = 'none';
    updatePaymentDisplay();
  } else if (method === 'finance_officer') {
    if (abaPanel) abaPanel.style.display = 'none';
    if (financePanel) financePanel.style.display = 'block';
  }
}

export function handleReceiptUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const isJpg =
    file.type === 'image/jpeg' ||
    file.name.toLowerCase().endsWith('.jpg') ||
    file.name.toLowerCase().endsWith('.jpeg');

  if (!isJpg) {
    showError(7, 'Please upload a JPG or JPEG image file only.');
    input.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showError(7, 'File too large. Please upload a file smaller than 5MB.');
    input.value = '';
    return;
  }

  formState.receipt.fileName = file.name;

  const area    = document.getElementById('receiptUploadArea');
  const icon    = document.getElementById('receiptUploadIcon');
  const preview = document.getElementById('receiptPreviewImg');
  const nameEl  = document.getElementById('receiptFileName');

  const reader = new FileReader();
  reader.onload = function (e) {
    formState.receipt.dataUrl = e.target.result;
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (icon) icon.style.display = 'none';
  };
  reader.readAsDataURL(file);

  if (area) area.classList.add('has-file');
  if (nameEl) { nameEl.textContent = '\u2713 ' + file.name; nameEl.style.display = 'block'; }
}
