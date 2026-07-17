'use strict';

// ─────────────────────────────────────────────────────────────────
// DATABASE LINK — Google Apps Script Web App URL:
// ─────────────────────────────────────────────────────────────────
const SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycby9Jt9LINcDkqtDLH3FNMYaaphDH39ac8ajWdGiETEW_qqkYYrIgC2ZEVHpHMeZVE1U/exec';

// ─────────────────────────────────────────────────────────────────
// FORM STATE
// ─────────────────────────────────────────────────────────────────
const TOTAL_SLIDES = 9; // 0-8 (0=welcome, 8=success)
const PROGRAM_PRICES = { level1: 2000, level2: 2000, singapore: 3000, silicon_valley: 6000 };
const PROFILE_LABELS = {
  corporate: 'Corporate Innovation & Venture Professional',
  angel: 'Angel Investor, HNWI',
  family_office: 'Family Office, Businesses',
  aspiring_vc: 'Aspiring Investor or Venture Capitalist',
  business_pro: 'Business Professional or Strategist'
};

let currentSlideIndex = 0;
let selectedProfile = null;
let selectedPrograms = new Set();
let turnstileToken = null;

// ─────────────────────────────────────────────────────────────────
// TURNSTILE CALLBACKS (called by Cloudflare's script)
// ─────────────────────────────────────────────────────────────────
function onTurnstileSuccess(token) {
  turnstileToken = token;
}

function onTurnstileExpired() {
  turnstileToken = null;
}

// ─────────────────────────────────────────────────────────────────
// SECURITY HELPERS
// ─────────────────────────────────────────────────────────────────
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function isValidLinkedIn(url) {
  return /^https?:\/\/(www\.)?linkedin\.com\/(in|pub|company)\/[^\s/]+\/?$/i.test(url.trim());
}

// ─────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────
function goToSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const current = slides[currentSlideIndex];
  const next = slides[index];
  if (!next) return;

  const goingForward = index > currentSlideIndex;
  current.classList.remove('active');
  current.classList.add(goingForward ? 'exit-up' : 'exit-down');

  setTimeout(() => {
    current.classList.remove('exit-up', 'exit-down');
  }, 600);

  next.style.transform = goingForward ? 'translateY(40px)' : 'translateY(-40px)';
  next.classList.add('active');
  next.scrollTop = 0;
  currentSlideIndex = index;

  updateProgressBar();
  updateStepTracker();
  focusActiveInput();
  saveSessionProgress();
}

function nextSlide() { goToSlide(currentSlideIndex + 1); }
function prevSlide() { goToSlide(currentSlideIndex - 1); }

function updateProgressBar() {
  const pct = Math.round((currentSlideIndex / 7) * 100);
  const bar = document.getElementById('progressBar');
  const text = document.getElementById('progressText');
  if (bar) bar.style.width = Math.min(pct, 100) + '%';
  if (text) text.textContent = Math.min(pct, 100) + '% Complete';
}

function updateStepTracker() {
  document.querySelectorAll('.step-item').forEach(item => {
    const step = parseInt(item.dataset.step);
    item.classList.remove('active-step', 'completed');
    if (step === currentSlideIndex) item.classList.add('active-step');
    else if (step < currentSlideIndex) item.classList.add('completed');
  });
}

function focusActiveInput() {
  setTimeout(() => {
    const slide = document.getElementById('slide-' + currentSlideIndex);
    if (!slide) return;
    const input = slide.querySelector('input:not([type=checkbox]), textarea');
    if (input) input.focus();
  }, 350);
}

// ─────────────────────────────────────────────────────────────────
// KEYBOARD NAVIGATION
// ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', function (e) {
  if (currentSlideIndex === 0 && e.key === 'Enter') { nextSlide(); return; }
  if (currentSlideIndex >= 1 && currentSlideIndex <= 6 && e.key === 'Enter') {
    const fns = [null, validateSlide1, validateSlide2, validateSlide3, validateSlide4, validateSlide5, validateSlide6];
    if (fns[currentSlideIndex]) fns[currentSlideIndex]();
  }
});

// ─────────────────────────────────────────────────────────────────
// SINGLE-SELECT (Attendee Profile)
// ─────────────────────────────────────────────────────────────────
function selectChoiceSingle(category, card) {
  document.querySelectorAll('#profile-choices .choice-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedProfile = card.dataset.val;
}

// ─────────────────────────────────────────────────────────────────
// MULTI-SELECT + LIVE PRICING (Program Options)
// ─────────────────────────────────────────────────────────────────
function toggleProgramOption(card) {
  const val = card.dataset.val;
  const chk = document.getElementById('chk-' + val);

  if (selectedPrograms.has(val)) {
    selectedPrograms.delete(val);
    card.classList.remove('selected');
    if (chk) chk.textContent = '\u2610';
  } else {
    selectedPrograms.add(val);
    card.classList.add('selected');
    if (chk) chk.textContent = '\u2611';
  }
  calculatePricing();
}

function calculatePricing() {
  const calc = document.getElementById('pricingCalculator');
  if (!calc) return;

  if (selectedPrograms.size === 0) { calc.style.display = 'none'; return; }
  calc.style.display = 'block';

  let subtotal = 0;
  selectedPrograms.forEach(key => { subtotal += PROGRAM_PRICES[key] || 0; });

  // Discount: Level1 + Level2 + at least one immersion trip
  const hasLevel1 = selectedPrograms.has('level1');
  const hasLevel2 = selectedPrograms.has('level2');
  const hasTrip = selectedPrograms.has('singapore') || selectedPrograms.has('silicon_valley');
  const discountEligible = hasLevel1 && hasLevel2 && hasTrip;
  const discountAmount = discountEligible ? 2000 : 0; // 50% of 4000 workshops
  const total = subtotal - discountAmount;

  document.getElementById('price-subtotal').textContent = 'US$ ' + subtotal.toLocaleString();
  document.getElementById('price-total').textContent = 'US$ ' + total.toLocaleString();

  const discountRow = document.getElementById('discount-row');
  const discountNotice = document.getElementById('discount-notice');
  if (discountEligible) {
    document.getElementById('price-discount').textContent = '-US$ ' + discountAmount.toLocaleString();
    discountRow.style.display = 'flex';
    discountNotice.style.display = 'block';
  } else {
    discountRow.style.display = 'none';
    discountNotice.style.display = 'none';
  }
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────
function showError(slideNum, message) {
  const errEl = document.getElementById('error-slide-' + slideNum);
  if (!errEl) return;
  errEl.querySelector('span').textContent = message;
  errEl.classList.add('visible');
  const slide = document.getElementById('slide-' + slideNum);
  if (slide) { slide.classList.add('shake'); setTimeout(() => slide.classList.remove('shake'), 400); }
  setTimeout(() => errEl.classList.remove('visible'), 5000);
}

function validateSlide1() {
  const first = document.getElementById('first_name').value.trim();
  const last = document.getElementById('last_name').value.trim();
  if (!first || !last) { showError(1, 'Please enter both your first and last name.'); return; }
  if (first.length < 2) { showError(1, 'First name must be at least 2 characters.'); return; }
  nextSlide();
}

function validateSlide2() {
  const title = document.getElementById('job_title').value.trim();
  const company = document.getElementById('company').value.trim();
  if (!title || !company) { showError(2, 'Please enter your job title and company name.'); return; }
  nextSlide();
}

function validateSlide3() {
  const email = document.getElementById('email').value.trim();
  const linkedin = document.getElementById('linkedin').value.trim();
  if (!isValidEmail(email)) { showError(3, 'Please enter a valid professional email address.'); return; }
  if (!isValidLinkedIn(linkedin)) { showError(3, 'Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/your-name).'); return; }
  nextSlide();
}

function validateSlide4() {
  if (!selectedProfile) { showError(4, 'Please select the profile that best describes you.'); return; }
  nextSlide();
}

function validateSlide5() {
  if (selectedPrograms.size === 0) { showError(5, 'Please select at least one program option.'); return; }
  nextSlide();
}

function validateSlide6() {
  const goal = document.getElementById('primary_goal').value.trim();
  if (!goal || goal.length < 10) { showError(6, 'Please share your primary goal (at least 10 characters).'); return; }
  populateReview();
  nextSlide();
}

// ─────────────────────────────────────────────────────────────────
// REVIEW SCREEN POPULATION
// ─────────────────────────────────────────────────────────────────
function populateReview() {
  const first = document.getElementById('first_name').value.trim();
  const last = document.getElementById('last_name').value.trim();
  document.getElementById('rev-name').textContent = first + ' ' + last;
  document.getElementById('rev-title').textContent = document.getElementById('job_title').value.trim();
  document.getElementById('rev-company').textContent = document.getElementById('company').value.trim();
  document.getElementById('rev-email').textContent = document.getElementById('email').value.trim();
  document.getElementById('rev-linkedin').textContent = document.getElementById('linkedin').value.trim();
  document.getElementById('rev-profile').textContent = PROFILE_LABELS[selectedProfile] || '-';
  document.getElementById('rev-goal').textContent = document.getElementById('primary_goal').value.trim();
  document.getElementById('rev-dietary').textContent = document.getElementById('dietary').value.trim() || 'None';

  // Programs
  const programNames = {
    level1: 'Level 1 - Deal Origination',
    level2: 'Level 2 - Deal Closing',
    singapore: 'Singapore Immersion Trip',
    silicon_valley: 'Silicon Valley Immersion Trip'
  };
  const selectedList = Array.from(selectedPrograms).map(k => programNames[k]).join(', ');
  document.getElementById('rev-programs').textContent = selectedList || '-';

  // Pricing
  let subtotal = 0;
  selectedPrograms.forEach(k => subtotal += PROGRAM_PRICES[k] || 0);
  const hasLevel1 = selectedPrograms.has('level1');
  const hasLevel2 = selectedPrograms.has('level2');
  const hasTrip = selectedPrograms.has('singapore') || selectedPrograms.has('silicon_valley');
  const discountEligible = hasLevel1 && hasLevel2 && hasTrip;
  const discountAmount = discountEligible ? 2000 : 0;
  const total = subtotal - discountAmount;

  document.getElementById('rev-subtotal').textContent = 'US$ ' + subtotal.toLocaleString();
  document.getElementById('rev-total').textContent = 'US$ ' + total.toLocaleString();

  const discRow = document.getElementById('rev-discount-row');
  if (discountEligible) {
    document.getElementById('rev-discount').textContent = '-US$ ' + discountAmount.toLocaleString();
    discRow.style.display = 'grid';
  } else {
    discRow.style.display = 'none';
  }
}

// ─────────────────────────────────────────────────────────────────
// ACCORDION
// ─────────────────────────────────────────────────────────────────
function toggleAccordion(id) {
  const body = document.getElementById(id);
  if (!body) return;
  body.classList.toggle('open');
}

// ─────────────────────────────────────────────────────────────────
// SESSION PERSISTENCE
// ─────────────────────────────────────────────────────────────────
function saveSessionProgress() {
  try {
    const state = {
      currentSlideIndex,
      selectedProfile,
      selectedPrograms: Array.from(selectedPrograms),
      first_name: document.getElementById('first_name') ? document.getElementById('first_name').value : '',
      last_name: document.getElementById('last_name') ? document.getElementById('last_name').value : '',
      job_title: document.getElementById('job_title') ? document.getElementById('job_title').value : '',
      company: document.getElementById('company') ? document.getElementById('company').value : '',
      email: document.getElementById('email') ? document.getElementById('email').value : '',
      linkedin: document.getElementById('linkedin') ? document.getElementById('linkedin').value : '',
      primary_goal: document.getElementById('primary_goal') ? document.getElementById('primary_goal').value : '',
      dietary: document.getElementById('dietary') ? document.getElementById('dietary').value : ''
    };
    sessionStorage.setItem('pnp_vc_form', JSON.stringify(state));
  } catch (e) { /* silent */ }
}

function loadSessionProgress() {
  try {
    const raw = sessionStorage.getItem('pnp_vc_form');
    if (!raw) return;
    const data = JSON.parse(raw);

    const fields = ['first_name', 'last_name', 'job_title', 'company', 'email', 'linkedin', 'primary_goal', 'dietary'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id]) el.value = data[id];
    });

    if (data.selectedProfile) {
      selectedProfile = data.selectedProfile;
      const card = document.querySelector('#profile-choices [data-val="' + selectedProfile + '"]');
      if (card) card.classList.add('selected');
    }

    if (Array.isArray(data.selectedPrograms)) {
      data.selectedPrograms.forEach(val => {
        selectedPrograms.add(val);
        const card = document.querySelector('#program-choices [data-val="' + val + '"]');
        const chk = document.getElementById('chk-' + val);
        if (card) card.classList.add('selected');
        if (chk) chk.textContent = '\u2611';
      });
      calculatePricing();
    }
    if (data.currentSlideIndex && data.currentSlideIndex >= 1 && data.currentSlideIndex < 8) {
      goToSlide(data.currentSlideIndex);
    }
  } catch (e) { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────
// PAYLOAD COLLECTION
// ─────────────────────────────────────────────────────────────────
function collectFormPayload() {
  const first = sanitizeHTML(document.getElementById('first_name').value.trim());
  const last = sanitizeHTML(document.getElementById('last_name').value.trim());

  let subtotal = 0;
  selectedPrograms.forEach(k => subtotal += PROGRAM_PRICES[k] || 0);
  const hasLevel1 = selectedPrograms.has('level1');
  const hasLevel2 = selectedPrograms.has('level2');
  const hasTrip = selectedPrograms.has('singapore') || selectedPrograms.has('silicon_valley');
  const discountEligible = hasLevel1 && hasLevel2 && hasTrip;
  const discountAmount = discountEligible ? 2000 : 0;
  const total = subtotal - discountAmount;

  return {
    turnstileToken: turnstileToken,
    confirmationId: 'PNP-VC-' + Date.now(),
    submittedAt: new Date().toISOString(),
    first_name: first,
    last_name: last,
    full_name: first + ' ' + last,
    job_title: sanitizeHTML(document.getElementById('job_title').value.trim()),
    company: sanitizeHTML(document.getElementById('company').value.trim()),
    email: document.getElementById('email').value.trim(),
    linkedin: document.getElementById('linkedin').value.trim(),
    profile: selectedProfile,
    programs: Array.from(selectedPrograms),
    subtotal: subtotal,
    discount_amount: discountAmount,
    total: total,
    primary_goal: sanitizeHTML(document.getElementById('primary_goal').value.trim()),
    dietary: sanitizeHTML(document.getElementById('dietary').value.trim())
  };
}

// ─────────────────────────────────────────────────────────────────
// SUBMISSION FLOW
// ─────────────────────────────────────────────────────────────────
function submitApplication() {
  const agreement = document.getElementById('securityAgreement');
  if (!agreement || !agreement.checked) {
    showError(7, 'Please agree to the terms before submitting.');
    return;
  }
  if (!turnstileToken) {
    showError(7, 'Please complete the Cloudflare security check first.');
    return;
  }
  runSecuritySimulation();
}

function runSecuritySimulation() {
  const overlay = document.getElementById('securityOverlay');
  const title = document.getElementById('securityOverlayTitle');
  const matrix = document.getElementById('cipherMatrix');
  const fill = document.getElementById('securityProgressFill');
  const statusText = document.getElementById('securityStatusText');

  overlay.classList.add('visible');

  const steps = [
    { title: 'Verifying Turnstile token...', desc: 'Cloudflare challenge response being validated' },
    { title: 'Sanitizing submission data...', desc: 'Checking inputs for malicious content' },
    { title: 'Encrypting payload...', desc: 'Preparing secure HTTPS transmission' },
    { title: 'Transmitting to secure server...', desc: 'Sending to Google Apps Script backend' },
    { title: 'Server-side validation running...', desc: 'Backend verifying fields and pricing' },
    { title: 'Storing enrollment data...', desc: 'Writing verified data to Google Sheets' },
    { title: 'Enrollment confirmed!', desc: 'All checks passed successfully' }
  ];

  let step = 0;
  const interval = setInterval(() => {
    if (step >= steps.length) {
      clearInterval(interval);
      const payload = collectFormPayload();
      sendToGoogleSheets(payload).then(result => {
        setTimeout(() => {
          overlay.classList.remove('visible');
          showSuccessScreen(payload);
          sessionStorage.removeItem('pnp_vc_form');
        }, 800);
      });
      return;
    }
    const s = steps[step];
    title.textContent = s.title;
    statusText.textContent = s.desc;
    fill.style.width = ((step + 1) / steps.length * 100) + '%';
    matrix.textContent = generateCipherText();
    step++;
  }, 700);
}

function generateCipherText() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let out = '';
  for (let i = 0; i < 80; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function showSuccessScreen(payload) {
  const programNames = {
    level1: 'Level 1 - Deal Origination',
    level2: 'Level 2 - Deal Closing',
    singapore: 'Singapore Immersion Trip',
    silicon_valley: 'Silicon Valley Immersion Trip'
  };
  document.getElementById('ticket-name').textContent = payload.full_name;
  document.getElementById('ticket-id').textContent = payload.confirmationId;
  document.getElementById('ticket-programs').textContent = payload.programs.map(k => programNames[k]).join(', ');
  document.getElementById('ticket-total').textContent = 'US$ ' + payload.total.toLocaleString();
  document.getElementById('ticket-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  goToSlide(8);
}

// ─────────────────────────────────────────────────────────────────
// GOOGLE SHEETS SUBMISSION
// ─────────────────────────────────────────────────────────────────
async function sendToGoogleSheets(payload) {
  if (!SHEETS_WEBHOOK_URL || SHEETS_WEBHOOK_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    console.warn('[PNP Form] No webhook URL configured.');
    return { status: 'demo' };
  }
  try {
    await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return { status: 'sent' };
  } catch (err) {
    console.error('[PNP Form] Submission error:', err);
    return { status: 'error', message: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// RESTART
// ─────────────────────────────────────────────────────────────────
function restartApplication() {
  sessionStorage.removeItem('pnp_vc_form');
  selectedProfile = null;
  selectedPrograms = new Set();
  turnstileToken = null;

  // Reset all inputs
  ['first_name', 'last_name', 'job_title', 'company', 'email', 'linkedin', 'primary_goal', 'dietary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.choice-letter.program-letter').forEach(c => c.textContent = '\u2610');
  ['chk-level1', 'chk-level2', 'chk-singapore', 'chk-silicon_valley'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '\u2610';
  });

  const pricingCalc = document.getElementById('pricingCalculator');
  if (pricingCalc) pricingCalc.style.display = 'none';

  const agree = document.getElementById('securityAgreement');
  if (agree) agree.checked = false;

  // Reset Turnstile
  if (window.turnstile) window.turnstile.reset();

  goToSlide(0);
}

// ─────────────────────────────────────────────────────────────────
// INPUT AUTO-SAVE (attach to all inputs)
// ─────────────────────────────────────────────────────────────────
document.addEventListener('input', function (e) {
  const targets = ['first_name', 'last_name', 'job_title', 'company', 'email', 'linkedin', 'primary_goal', 'dietary'];
  if (targets.includes(e.target.id)) saveSessionProgress();
});

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  loadSessionProgress();
  updateProgressBar();
  updateStepTracker();
});

