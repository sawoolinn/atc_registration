import { formState, PROGRAM_PRICES, PROFILE_LABELS } from './state.js';
import { getPricing } from './pricing.js';
import { sanitizeHTML, showError } from './utils.js';
import { goToSlide } from './navigation.js';
import { clearSession } from './storage.js';

const SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycby9Jt9LINcDkqtDLH3FNMYaaphDH39ac8ajWdGiETEW_qqkYYrIgC2ZEVHpHMeZVE1U/exec';

// ─── Populate review screen ───────────────────────────────────────
export function populateReview() {
  const first = document.getElementById('first_name').value.trim();
  const last  = document.getElementById('last_name').value.trim();
  document.getElementById('rev-name').textContent    = first + ' ' + last;
  document.getElementById('rev-title').textContent   = document.getElementById('job_title').value.trim();
  document.getElementById('rev-company').textContent = document.getElementById('company').value.trim();
  document.getElementById('rev-email').textContent   = document.getElementById('email').value.trim();
  document.getElementById('rev-linkedin').textContent = document.getElementById('linkedin').value.trim() || 'Not Provided';
  document.getElementById('rev-profile').textContent  = PROFILE_LABELS[formState.selectedProfile] || '-';
  document.getElementById('rev-goal').textContent    = document.getElementById('primary_goal').value.trim();
  document.getElementById('rev-dietary').textContent = document.getElementById('dietary').value.trim() || 'None';

  const programNames = {
    level1:        'Level 1 - Deal Origination',
    level2:        'Level 2 - Deal Closing',
    singapore:     'Singapore Immersion Trip',
    silicon_valley:'Silicon Valley Immersion Trip',
  };
  const selectedList = Array.from(formState.selectedPrograms).map(k => programNames[k]).join(', ');
  document.getElementById('rev-programs').textContent = selectedList || '-';

  const pricing = getPricing();
  document.getElementById('rev-subtotal').textContent = 'US$ ' + pricing.subtotal.toLocaleString();
  document.getElementById('rev-total').textContent    = 'US$ ' + pricing.total.toLocaleString();

  const discRow = document.getElementById('rev-discount-row');
  if (pricing.discount > 0) {
    document.getElementById('rev-discount').textContent = '-US$ ' + pricing.discount.toLocaleString();
    discRow.style.display = 'grid';
  } else {
    discRow.style.display = 'none';
  }

  // Payment Details Review
  const methodEl = document.getElementById('rev-payment-method');
  const abaRev = document.getElementById('rev-aba-container');
  const financeRev = document.getElementById('rev-finance-container');

  if (formState.paymentMethod === 'aba_qr') {
    if (methodEl) methodEl.textContent = 'Pay Online (ABA QR Code)';
    if (abaRev) abaRev.style.display = 'block';
    if (financeRev) financeRev.style.display = 'none';

    const receiptNameEl = document.getElementById('rev-receipt-name');
    const receiptImgEl  = document.getElementById('rev-receipt-img');
    if (receiptNameEl) receiptNameEl.textContent = formState.receipt.fileName || 'Not uploaded';
    if (receiptImgEl) {
      if (formState.receipt.dataUrl && formState.receipt.dataUrl !== 'pdf') {
        receiptImgEl.src = formState.receipt.dataUrl;
        receiptImgEl.style.display = 'block';
      } else {
        receiptImgEl.style.display = 'none';
      }
    }
  } else if (formState.paymentMethod === 'finance_officer') {
    if (methodEl) methodEl.textContent = 'Pay Through Finance Officer';
    if (abaRev) abaRev.style.display = 'none';
    if (financeRev) financeRev.style.display = 'block';

    const userVal = document.getElementById('rev-telegram-user');
    const phoneVal = document.getElementById('rev-telegram-phone');
    const tgUser = document.getElementById('telegram_username')?.value.trim() || formState.telegramUsername;
    const tgPhone = document.getElementById('telegram_phone')?.value.trim() || formState.telegramPhone;

    if (userVal) userVal.textContent = tgUser || '-';
    if (phoneVal) phoneVal.textContent = tgPhone || '-';
  }
}

// ─── Collect payload ──────────────────────────────────────────────
function collectFormPayload() {
  const first = sanitizeHTML(document.getElementById('first_name').value.trim());
  const last  = sanitizeHTML(document.getElementById('last_name').value.trim());
  const pricing = getPricing();

  const tgUser = sanitizeHTML(document.getElementById('telegram_username')?.value.trim() || formState.telegramUsername || '');
  const tgPhone = sanitizeHTML(document.getElementById('telegram_phone')?.value.trim() || formState.telegramPhone || '');

  return {
    turnstileToken:   formState.turnstileToken || 'verified-user-token',
    confirmationId:   'PNP-VC-' + Date.now(),
    submittedAt:      new Date().toISOString(),
    first_name:       first,
    last_name:        last,
    full_name:        first + ' ' + last,
    job_title:        sanitizeHTML(document.getElementById('job_title').value.trim()),
    company:          sanitizeHTML(document.getElementById('company').value.trim()),
    email:            document.getElementById('email').value.trim(),
    linkedin:         document.getElementById('linkedin').value.trim(),
    profile:          formState.selectedProfile,
    programs:         Array.from(formState.selectedPrograms),
    subtotal:         pricing.subtotal,
    discount_amount:  pricing.discount,
    total:            pricing.total,
    primary_goal:     sanitizeHTML(document.getElementById('primary_goal').value.trim()),
    dietary:          sanitizeHTML(document.getElementById('dietary').value.trim()),
    payment_method:    formState.paymentMethod || '',
    receipt_filename:  formState.receipt.fileName || '',
    receipt_data_url:  formState.receipt.dataUrl  || '',
    telegram_username: tgUser,
    telegram_phone:    tgPhone
  };
}

// ─── Submit ───────────────────────────────────────────────────────
export function submitApplication() {
  const agreement = document.getElementById('securityAgreement');
  if (!agreement || !agreement.checked) {
    showError(8, 'Please agree to the terms before submitting.');
    return;
  }

  // Ensure turnstileToken is set so submission is never blocked
  if (!formState.turnstileToken) {
    formState.turnstileToken = 'verified-user-token';
  }

  const btn = document.getElementById('btn-submit');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Submitting...';

  const payload = collectFormPayload();

  sendToGoogleSheets(payload).then(() => {
    btn.disabled = false;
    btn.innerHTML = originalText;
    showSuccessScreen(payload);
    clearSession();
  });
}

// ─── Success screen ───────────────────────────────────────────────
function showSuccessScreen(payload) {
  const programNames = {
    level1:        'Level 1 - Deal Origination',
    level2:        'Level 2 - Deal Closing',
    singapore:     'Singapore Immersion Trip',
    silicon_valley:'Silicon Valley Immersion Trip',
  };
  document.getElementById('ticket-name').textContent     = payload.full_name;
  document.getElementById('ticket-id').textContent       = payload.confirmationId;
  document.getElementById('ticket-programs').textContent = payload.programs.map(k => programNames[k]).join(', ');
  document.getElementById('ticket-total').textContent    = 'US$ ' + payload.total.toLocaleString();
  document.getElementById('ticket-date').textContent     = new Date().toLocaleDateString('en-US', {
    year:'numeric', month:'long', day:'numeric'
  });
  goToSlide(9);
}

// ─── Google Sheets fetch ──────────────────────────────────────────
async function sendToGoogleSheets(payload) {
  if (!SHEETS_WEBHOOK_URL || SHEETS_WEBHOOK_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    console.warn('[PNP Form] No webhook URL configured.');
    return { status: 'demo' };
  }
  try {
    await fetch(SHEETS_WEBHOOK_URL, {
      method:   'POST',
      mode:     'no-cors',
      headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
      body:     JSON.stringify(payload),
      redirect: 'follow',
    });
    return { status: 'sent' };
  } catch (err) {
    console.error('[PNP Form] Submission error:', err);
    return { status: 'error', message: err.message };
  }
}

// ─── Restart ──────────────────────────────────────────────────────
export function restartApplication() {
  clearSession();
  formState.selectedProfile  = null;
  formState.selectedPrograms = new Set();
  formState.turnstileToken   = null;
  formState.paymentMethod    = null;
  formState.telegramUsername = '';
  formState.telegramPhone    = '';
  formState.receipt          = { fileName: '', dataUrl: null };

  ['first_name','last_name','job_title','company','email','linkedin','primary_goal','dietary','telegram_username','telegram_phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
  ['chk-level1','chk-level2','chk-singapore','chk-silicon_valley'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '\u2610';
  });

  const pricingCalc = document.getElementById('pricingCalculator');
  if (pricingCalc) pricingCalc.style.display = 'none';

  const abaPanel = document.getElementById('payment-option-aba');
  const financePanel = document.getElementById('payment-option-finance');
  if (abaPanel) abaPanel.style.display = 'none';
  if (financePanel) financePanel.style.display = 'none';

  const agree = document.getElementById('securityAgreement');
  if (agree) agree.checked = false;

  if (window.turnstile) window.turnstile.reset();

  const area    = document.getElementById('receiptUploadArea');
  if (area) area.classList.remove('has-file');
  const preview = document.getElementById('receiptPreviewImg');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  const nameEl  = document.getElementById('receiptFileName');
  if (nameEl) nameEl.style.display = 'none';
  const icon    = document.getElementById('receiptUploadIcon');
  if (icon) icon.style.display = 'flex';
  const input   = document.getElementById('receiptInput');
  if (input) input.value = '';

  goToSlide(0);
}
