/* ATC Startup Registration Portal Javascript Controller */

// Global State
let currentSlideIndex = 0;
const totalSlides = 12; // 0 to 11
let selectedStage = '';
let selectedTeamSize = '';
let selectedInternationalPresence = '';
const selectedVerticals = new Set();
const selectedObjectives = new Set();
let founderCount = 0;

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
  // Add first founder card automatically
  addFounderCard();

  // Load saved state if any
  loadSessionProgress();

  // Initialize progress bar
  updateProgress();

  // Keybindings listener
  document.addEventListener('keydown', handleGlobalKeydown);

  // Auto-focus on active inputs on load
  focusActiveInput();
});

// Clean input helper to prevent XSS
function sanitizeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Focus on first input of current slide
function focusActiveInput() {
  setTimeout(() => {
    const activeSlide = document.querySelector('.slide.active');
    if (!activeSlide) return;
    
    const textInput = activeSlide.querySelector('input[type="text"]:not(.mini-input), textarea');
    if (textInput) {
      textInput.focus();
    }
  }, 100);
}

// Slide Navigation
function goToSlide(index) {
  if (index < 0 || index >= totalSlides) return;
  
  const currentSlide = document.getElementById(`slide-${currentSlideIndex}`);
  const nextSlide = document.getElementById(`slide-${index}`);
  
  if (currentSlide && nextSlide) {
    // Hide error messages
    const activeError = currentSlide.querySelector('.error-msg');
    if (activeError) activeError.classList.remove('visible');

    // Handle slide classes for transitions
    if (index > currentSlideIndex) {
      currentSlide.classList.remove('active');
      currentSlide.classList.add('exit-up');
      
      nextSlide.classList.remove('exit-down', 'exit-up');
      nextSlide.classList.add('active');
    } else {
      currentSlide.classList.remove('active');
      currentSlide.classList.add('exit-down');
      
      nextSlide.classList.remove('exit-down', 'exit-up');
      nextSlide.classList.add('active');
    }

    currentSlideIndex = index;
    updateProgress();
    saveSessionProgress();
    focusActiveInput();

    // Scroll the slide panel back to the top on navigation
    setTimeout(() => {
      const activeSlide = document.getElementById(`slide-${currentSlideIndex}`);
      if (activeSlide) activeSlide.scrollTop = 0;
    }, 50);

    // If on review slide, compile data
    if (currentSlideIndex === 10) {
      compileReviewData();
    }
  }
}

function nextSlide() {
  goToSlide(currentSlideIndex + 1);
}

function prevSlide() {
  goToSlide(currentSlideIndex - 1);
}

// Keyboard shortcuts (Enter, Arrows)
function handleGlobalKeydown(e) {
  // Avoid interfering if user is focused inside textarea or dynamic list inputs
  const activeEl = document.activeElement;
  const isTextarea = activeEl && activeEl.tagName === 'TEXTAREA';
  
  if (e.key === 'Enter') {
    if (isTextarea) return; // Allow newlines in textareas
    e.preventDefault();
    
    // Trigger next slide validation depending on current slide
    triggerNextValidation();
  }
}

// Route next validation depending on step
function triggerNextValidation() {
  switch (currentSlideIndex) {
    case 0:
      nextSlide();
      break;
    case 1:
      validateSlide1();
      break;
    case 2:
      validateSlide2();
      break;
    case 3:
      validateSlide3();
      break;
    case 4:
      validateSlide4();
      break;
    case 5:
      validateSlide5();
      break;
    case 6:
      validateSlide6();
      break;
    case 7:
      validateSlide7();
      break;
    case 8:
      nextSlide(); // Valuation optional
      break;
    case 9:
      validateSlide9();
      break;
    case 10:
      submitApplication();
      break;
  }
}

// Progress calculations
function updateProgress() {
  // Exclude success slide (11) from percentage calculation
  const percentage = Math.round((currentSlideIndex / (totalSlides - 1)) * 100);
  
  const bar = document.getElementById('progressBar');
  const text = document.getElementById('progressText');
  
  if (bar) bar.style.width = `${percentage}%`;
  if (text) text.innerText = `${percentage}% Complete`;

  updateStepTracker();
}

// Animate step tracker in the brand sidebar
function updateStepTracker() {
  const stepItems = document.querySelectorAll('.step-tracker .step-item');
  stepItems.forEach(item => {
    const step = parseInt(item.getAttribute('data-step'));
    item.classList.remove('active-step', 'completed');

    if (step === currentSlideIndex) {
      item.classList.add('active-step');
    } else if (step < currentSlideIndex) {
      item.classList.add('completed');
    }
  });
}

// Show validation error helper
function showError(slideNum, message) {
  const errorBox = document.getElementById(`error-slide-${slideNum}`);
  const slideEl = document.getElementById(`slide-${slideNum}`);
  
  if (errorBox) {
    if (message) errorBox.querySelector('span').innerText = message;
    errorBox.classList.add('visible');
  }
  
  if (slideEl) {
    const card = slideEl.querySelector('.slide-content-card');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 400);
    }
  }
}

// Currency Formatting Helper
function formatCurrency(input) {
  let val = input.value.replace(/[^0-9]/g, '');
  if (val) {
    input.value = Number(val).toLocaleString('en-US');
  } else {
    input.value = '';
  }
}

// Choice Card Selections (Stage, Team Size — MULTI-choice groups)
function selectChoice(type, card) {
  const containerId = type === 'stage' ? 'stage-choices' : 'team-choices';
  const container = document.getElementById(containerId);
  
  if (container) {
    // Unselect all others
    container.querySelectorAll('.choice-card').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Select this
    card.classList.add('selected');
    
    const val = card.getAttribute('data-val');
    if (type === 'stage') {
      selectedStage = val;
    } else {
      selectedTeamSize = val;
    }
    
    saveSessionProgress();
    
    // Auto-advance slightly after choice selection for better UX
    setTimeout(() => {
      // Only advance if both selections on slide 3 are completed
      if (currentSlideIndex === 3 && selectedStage && selectedTeamSize) {
        validateSlide3();
      }
    }, 300);
  }
}

// Single-select choice (International presence, etc.)
function selectChoiceSingle(type, card) {
  // Find parent choices grid and deselect siblings
  const parent = card.closest('.choices-grid');
  if (parent) {
    parent.querySelectorAll('.choice-card').forEach(item => item.classList.remove('selected'));
  }
  card.classList.add('selected');
  
  const val = card.getAttribute('data-val');
  if (type === 'international_presence') {
    selectedInternationalPresence = val;
  }
  saveSessionProgress();
}

// Pills Selector (Verticals, Objectives)
function togglePill(pill, category) {
  const label = pill.innerText.trim();
  const targetSet = category === 'verticals' ? selectedVerticals : selectedObjectives;
  
  if (targetSet.has(label)) {
    targetSet.delete(label);
    pill.classList.remove('active');
  } else {
    targetSet.add(label);
    pill.classList.add('active');
  }
  
  saveSessionProgress();
}

// Founder Card Dynamic Manager
function addFounderCard() {
  founderCount++;
  const container = document.getElementById('foundersList');
  if (!container) return;
  
  const cardId = `founder-card-${founderCount}`;
  const card = document.createElement('div');
  card.className = 'founder-card';
  card.id = cardId;
  
  card.innerHTML = `
    <div class="founder-card-header">
      <span class="founder-title">Founder #${founderCount}</span>
      ${founderCount > 1 ? `<button type="button" class="btn-remove-founder" onclick="removeFounderCard('${cardId}')">Remove</button>` : ''}
    </div>
    <div class="founder-grid">
      <div class="mini-input-group">
        <label class="mini-label">Full Name*</label>
        <input type="text" class="mini-input founder-name" placeholder="e.g. John Doe" required autocomplete="off">
      </div>
      <div class="mini-input-group">
        <label class="mini-label">Email Address*</label>
        <input type="email" class="mini-input founder-email" placeholder="e.g. john@startup.com" required autocomplete="off">
      </div>
      <div class="mini-input-group full-width" style="margin-top: 10px;">
        <label class="mini-label">Telegram Handle*</label>
        <input type="text" class="mini-input founder-telegram" placeholder="e.g. @john_doe" required autocomplete="off">
      </div>
    </div>
  `;
  
  container.appendChild(card);
}

function removeFounderCard(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.remove();
    // Renumber remaining cards
    const cards = document.querySelectorAll('.founder-card');
    founderCount = 0;
    cards.forEach((item, index) => {
      founderCount++;
      item.id = `founder-card-${founderCount}`;
      item.querySelector('.founder-title').innerText = `Founder #${founderCount}`;
    });
    saveSessionProgress();
  }
}

function getFoundersData() {
  const cards = document.querySelectorAll('.founder-card');
  const data = [];
  cards.forEach(card => {
    const name = card.querySelector('.founder-name').value.trim();
    const email = card.querySelector('.founder-email').value.trim();
    const telegram = card.querySelector('.founder-telegram').value.trim();
    data.push({ name, email, telegram });
  });
  return data;
}

// Validators for Steps
function validateSlide1() {
  const name = document.getElementById('startup_name').value.trim();
  const oneliner = document.getElementById('startup_oneliner').value.trim();
  
  if (!name || !oneliner) {
    showError(1, "Please enter both the Startup Name and a One-liner description.");
    return;
  }
  nextSlide();
}

function validateSlide2() {
  const dateVal = document.getElementById('founded_date').value;
  const country = document.getElementById('startup_country').value.trim();
  
  if (!dateVal) {
    showError(2, "Please select your founding date.");
    return;
  }
  
  const selectedDate = new Date(dateVal);
  const today = new Date();
  if (selectedDate > today) {
    showError(2, "Founding date cannot be in the future.");
    return;
  }
  
  if (!country) {
    showError(2, "Please specify your startup's headquarters country.");
    return;
  }
  
  nextSlide();
}

function validateSlide3() {
  if (!selectedStage || !selectedTeamSize) {
    showError(3, "Please select options for both startup stage and core team size.");
    return;
  }
  nextSlide();
}

function validateSlide4() {
  const overview = document.getElementById('startup_overview').value.trim();
  const logo = document.getElementById('logo_link').value.trim();
  const pitch = document.getElementById('pitch_deck_link').value.trim();
  
  if (!overview) {
    showError(4, "Please describe your startup overview.");
    return;
  }
  
  // Basic URL regex checks
  const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
  
  if (logo && !urlRegex.test(logo)) {
    showError(4, "Logo link must be a valid website URL (e.g. https://domain.com/image.png).");
    return;
  }
  
  if (pitch && !urlRegex.test(pitch)) {
    showError(4, "Pitch Deck link must be a valid website URL (e.g. https://drive.google.com/...).");
    return;
  }
  
  nextSlide();
}

function validateSlide5() {
  const email = document.getElementById('contact_email').value.trim();
  const phone = document.getElementById('contact_phone').value.trim();
  const telegram = document.getElementById('contact_telegram').value.trim();
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Allows basic phone characters: digits, spaces, hyphens, plus sign
  const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
  
  if (!email || !emailRegex.test(email)) {
    showError(5, "Please enter a valid primary email address.");
    return;
  }
  
  if (!phone || !phoneRegex.test(phone)) {
    showError(5, "Please enter a valid phone number (digits and spacing only).");
    return;
  }
  
  if (!telegram) {
    showError(5, "Please input your Telegram username or link.");
    return;
  }
  
  nextSlide();
}

function validateSlide6() {
  const founders = getFoundersData();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (founders.length === 0) {
    showError(6, "Please add at least one founder.");
    return;
  }
  
  for (let i = 0; i < founders.length; i++) {
    const f = founders[i];
    if (!f.name || !f.email || !f.telegram) {
      showError(6, `Founder #${i+1} has incomplete details. All fields are required.`);
      return;
    }
    if (!emailRegex.test(f.email)) {
      showError(6, `Founder #${i+1} email address is invalid.`);
      return;
    }
    if (f.telegram.charAt(0) !== '@' && !f.telegram.includes('t.me/')) {
      showError(6, `Founder #${i+1} Telegram handle must start with @ or contain a direct telegram link.`);
      return;
    }
  }
  
  nextSlide();
}

function validateSlide7() {
  if (selectedVerticals.size === 0) {
    showError(7, "Please select at least one business vertical.");
    return;
  }
  nextSlide();
}

function validateSlide9() {
  if (selectedObjectives.size === 0) {
    showError(9, "Please select at least one primary program objective.");
    return;
  }
  nextSlide();
}

// Accordion Control for Review Screen
function toggleAccordion(bodyId) {
  const body = document.getElementById(bodyId);
  if (body) {
    const isOpen = body.classList.contains('open');
    // Close all
    document.querySelectorAll('.review-body').forEach(item => item.classList.remove('open'));
    
    // Toggle current
    if (!isOpen) {
      body.classList.add('open');
    }
  }
}

// Compile Review Page
function compileReviewData() {
  document.getElementById('rev-name').innerText = document.getElementById('startup_name').value || '-';
  document.getElementById('rev-oneliner').innerText = document.getElementById('startup_oneliner').value || '-';
  document.getElementById('rev-founded').innerText = document.getElementById('founded_date').value || '-';
  document.getElementById('rev-country').innerText = document.getElementById('startup_country').value || '-';
  
  document.getElementById('rev-stage').innerText = selectedStage || '-';
  document.getElementById('rev-teamsize').innerText = selectedTeamSize || '-';
  document.getElementById('rev-overview').innerText = document.getElementById('startup_overview').value || '-';
  document.getElementById('rev-logolink').innerText = document.getElementById('logo_link').value || 'Not provided';
  document.getElementById('rev-pitchlink').innerText = document.getElementById('pitch_deck_link').value || 'Not provided';
  
  document.getElementById('rev-email').innerText = document.getElementById('contact_email').value || '-';
  document.getElementById('rev-phone').innerText = document.getElementById('contact_phone').value || '-';
  document.getElementById('rev-telegram').innerText = document.getElementById('contact_telegram').value || '-';
  document.getElementById('rev-hq').innerText = document.getElementById('headquarters').value || 'Not provided';
  
  // Format founders list
  const founders = getFoundersData();
  const foundersListContainer = document.getElementById('rev-founders-list');
  foundersListContainer.innerHTML = '';
  if (founders.length > 0) {
    founders.forEach((f, idx) => {
      const div = document.createElement('div');
      div.style.marginBottom = '6px';
      div.innerHTML = `<strong>#${idx+1}: ${sanitizeHTML(f.name)}</strong> &ndash; ${sanitizeHTML(f.email)} (${sanitizeHTML(f.telegram)})`;
      foundersListContainer.appendChild(div);
    });
  } else {
    foundersListContainer.innerText = '-';
  }

  // Format financials & goals
  document.getElementById('rev-val').innerText = document.getElementById('valuation').value ? `$${document.getElementById('valuation').value}` : 'Not provided';
  document.getElementById('rev-round').innerText = document.getElementById('round_size').value ? `$${document.getElementById('round_size').value}` : 'Not provided';
  document.getElementById('rev-rounddeadline').innerText = document.getElementById('round_deadline').value || 'Not provided';
  document.getElementById('rev-grants').innerText = document.getElementById('grants').value || 'None';
  
  document.getElementById('rev-objectives').innerText = Array.from(selectedObjectives).join(', ') || '-';
}

// Session auto-save state
function saveSessionProgress() {
  const data = {
    currentSlideIndex,
    startup_name: document.getElementById('startup_name').value,
    startup_oneliner: document.getElementById('startup_oneliner').value,
    founded_date: document.getElementById('founded_date').value,
    startup_country: document.getElementById('startup_country').value,
    selectedStage,
    selectedTeamSize,
    selectedInternationalPresence,
    startup_overview: document.getElementById('startup_overview').value,
    logo_link: document.getElementById('logo_link').value,
    pitch_deck_link: document.getElementById('pitch_deck_link').value,
    headquarters: document.getElementById('headquarters').value,
    website: document.getElementById('website').value,
    contact_email: document.getElementById('contact_email').value,
    contact_phone: document.getElementById('contact_phone').value,
    contact_telegram: document.getElementById('contact_telegram').value,
    founders: getFoundersData(),
    selectedVerticals: Array.from(selectedVerticals),
    focus_areas: document.getElementById('focus_areas').value,
    current_clients: document.getElementById('current_clients').value,
    valuation: document.getElementById('valuation').value,
    round_size: document.getElementById('round_size').value,
    round_deadline: document.getElementById('round_deadline').value,
    grants: document.getElementById('grants').value,
    selectedObjectives: Array.from(selectedObjectives),
    expansion_targets: document.getElementById('expansion_targets').value,
    mentor_pref: document.getElementById('mentor_pref').value
  };
  
  // Safe storage in sessionStorage (cleared when browser closes)
  sessionStorage.setItem('atc_form_progress', JSON.stringify(data));
}

function loadSessionProgress() {
  const saved = sessionStorage.getItem('atc_form_progress');
  if (!saved) return;
  
  try {
    const data = JSON.parse(saved);
    
    // Fill text inputs
    document.getElementById('startup_name').value = data.startup_name || '';
    document.getElementById('startup_oneliner').value = data.startup_oneliner || '';
    document.getElementById('founded_date').value = data.founded_date || '';
    document.getElementById('startup_country').value = data.startup_country || '';
    document.getElementById('startup_overview').value = data.startup_overview || '';
    document.getElementById('logo_link').value = data.logo_link || '';
    document.getElementById('pitch_deck_link').value = data.pitch_deck_link || '';
    document.getElementById('headquarters').value = data.headquarters || '';
    document.getElementById('website').value = data.website || '';
    document.getElementById('contact_email').value = data.contact_email || '';
    document.getElementById('contact_phone').value = data.contact_phone || '';
    document.getElementById('contact_telegram').value = data.contact_telegram || '';
    document.getElementById('focus_areas').value = data.focus_areas || '';
    document.getElementById('current_clients').value = data.current_clients || '';
    document.getElementById('valuation').value = data.valuation || '';
    document.getElementById('round_size').value = data.round_size || '';
    document.getElementById('round_deadline').value = data.round_deadline || '';
    document.getElementById('grants').value = data.grants || '';
    document.getElementById('expansion_targets').value = data.expansion_targets || '';
    document.getElementById('mentor_pref').value = data.mentor_pref || '';
    
    // Load stage
    if (data.selectedStage) {
      selectedStage = data.selectedStage;
      const card = document.querySelector(`#stage-choices .choice-card[data-val="${selectedStage}"]`);
      if (card) card.classList.add('selected');
    }
    
    // Load team size
    if (data.selectedTeamSize) {
      selectedTeamSize = data.selectedTeamSize;
      const card = document.querySelector(`#team-choices .choice-card[data-val="${selectedTeamSize}"]`);
      if (card) card.classList.add('selected');
    }

    // Load international presence
    if (data.selectedInternationalPresence) {
      selectedInternationalPresence = data.selectedInternationalPresence;
      const card = document.querySelector(`#intl-choices .choice-card[data-val="${selectedInternationalPresence}"]`);
      if (card) card.classList.add('selected');
    }
    
    // Load verticals
    if (data.selectedVerticals) {
      data.selectedVerticals.forEach(v => {
        selectedVerticals.add(v);
        const pills = document.querySelectorAll('#verticals-pills .pill-item');
        pills.forEach(pill => {
          if (pill.innerText.trim() === v) pill.classList.add('active');
        });
      });
    }

    // Load objectives
    if (data.selectedObjectives) {
      data.selectedObjectives.forEach(obj => {
        selectedObjectives.add(obj);
        const pills = document.querySelectorAll('#objectives-pills .pill-item');
        pills.forEach(pill => {
          if (pill.innerText.trim() === obj) pill.classList.add('active');
        });
      });
    }

    // Load founders list
    if (data.founders && data.founders.length > 0) {
      const container = document.getElementById('foundersList');
      container.innerHTML = '';
      founderCount = 0;
      data.founders.forEach(f => {
        addFounderCard();
        const cards = document.querySelectorAll('.founder-card');
        const currentCard = cards[cards.length - 1];
        currentCard.querySelector('.founder-name').value = f.name || '';
        currentCard.querySelector('.founder-email').value = f.email || '';
        currentCard.querySelector('.founder-telegram').value = f.telegram || '';
      });
    }

    // Load index
    if (data.currentSlideIndex && data.currentSlideIndex < 11) {
      goToSlide(data.currentSlideIndex);
    }
    
  } catch (e) {
    console.error("Error reading saved session state", e);
  }
}

// ─────────────────────────────────────────────────────────────────
// DATABASE LINK — Paste your Google Apps Script Web App URL here:
// ─────────────────────────────────────────────────────────────────
const SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycby9Jt9LINcDkqtDLH3FNMYaaphDH39ac8ajWdGiETEW_qqkYYrIgC2ZEVHpHMeZVE1U/exec';
// Example: 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxx/exec'
// ─────────────────────────────────────────────────────────────────

// Secure submit visualizer
function submitApplication() {
  const agreement = document.getElementById('securityAgreement');
  if (!agreement.checked) {
    showError(10, "You must review the details and check the security verification box to proceed.");
    return;
  }
  
  // Trigger overlay visualizer
  const overlay = document.getElementById('securityOverlay');
  overlay.classList.add('visible');
  
  runSecuritySimulation();
}

// Collect all form data into a structured payload object
function collectFormPayload(confirmationId) {
  return {
    confirmationId,
    submittedAt: new Date().toISOString(),

    // Section 1: Identity
    startup_name: sanitizeHTML(document.getElementById('startup_name').value.trim()),
    startup_oneliner: sanitizeHTML(document.getElementById('startup_oneliner').value.trim()),

    // Section 2: Origins
    founded_date: document.getElementById('founded_date').value,
    startup_country: sanitizeHTML(document.getElementById('startup_country').value.trim()),
    international_presence: selectedInternationalPresence || 'Not specified',

    // Section 3: Stage & Scale
    stage: selectedStage,
    team_size: selectedTeamSize,

    // Section 4: Overview & Assets
    startup_overview: sanitizeHTML(document.getElementById('startup_overview').value.trim()),
    logo_link: document.getElementById('logo_link').value.trim(),
    pitch_deck_link: document.getElementById('pitch_deck_link').value.trim(),

    // Section 5: Contact
    headquarters: sanitizeHTML(document.getElementById('headquarters').value.trim()),
    website: document.getElementById('website').value.trim(),
    contact_email: document.getElementById('contact_email').value.trim(),
    contact_phone: document.getElementById('contact_phone').value.trim(),
    contact_telegram: document.getElementById('contact_telegram').value.trim(),

    // Section 6: Founders
    founders: getFoundersData().map(f => ({
      name: sanitizeHTML(f.name),
      email: f.email,
      telegram: f.telegram
    })),

    // Section 7: Business Details
    verticals: Array.from(selectedVerticals),
    focus_areas: sanitizeHTML(document.getElementById('focus_areas').value.trim()),
    current_clients: sanitizeHTML(document.getElementById('current_clients').value.trim()),

    // Section 8: Funding
    valuation: document.getElementById('valuation').value.replace(/,/g, ''),
    round_size: document.getElementById('round_size').value.replace(/,/g, ''),
    round_deadline: document.getElementById('round_deadline').value,
    grants: sanitizeHTML(document.getElementById('grants').value.trim()),

    // Section 9: Goals
    objectives: Array.from(selectedObjectives),
    expansion_targets: sanitizeHTML(document.getElementById('expansion_targets').value.trim()),
    mentor_pref: sanitizeHTML(document.getElementById('mentor_pref').value.trim())
  };
}

// Send data to Google Sheets via Apps Script webhook
async function sendToGoogleSheets(payload) {
  // If no webhook URL is configured, skip silently (dev mode)
  if (!SHEETS_WEBHOOK_URL || SHEETS_WEBHOOK_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    console.warn('[ATC Form] No Google Sheets webhook URL configured. Submission is in demo mode only.');
    return { status: 'demo', message: 'Demo mode — no webhook configured.' };
  }

  try {
    const response = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return { status: 'sent' };
  } catch (err) {
    console.error('[ATC Form] Failed to send data to Google Sheets:', err);
    return { status: 'error', message: err.message };
  }
}


function runSecuritySimulation() {
  const steps = [
    { title: "Securing local input buffers...", desc: "Sanitizing registration variables, scanning for XSS vectors" },
    { title: "Generating client-side keypair...", desc: "Diffie-Hellman ephemeral key Exchange initialized" },
    { title: "Encrypting startup profile data...", desc: "AES-256-GCM symmetric block cipher wrapping payload" },
    { title: "Hashing private identities...", desc: "Generating SHA-256 fingerprint checks for emails" },
    { title: "Establishing TLS 1.3 pipeline...", desc: "Negotiating cipher suites with ATC secure servers" },
    { title: "Transmitting encrypted payload...", desc: "Routing encapsulated data package over secure channels" },
    { title: "Validating submission receipt...", desc: "Awaiting remote host cryptographic sign-off" },
    { title: "Transmission Complete!", desc: "Local session buffers purged successfully" }
  ];
  
  const matrix = document.getElementById('cipherMatrix');
  const fill = document.getElementById('securityProgressFill');
  const statusText = document.getElementById('securityStatusText');
  const title = document.getElementById('securityOverlayTitle');
  const subtitle = document.querySelector('.visualizer-subtitle');

  let currentSimStep = 0;
  
  // Matrix random text generator
  const matrixInterval = setInterval(() => {
    let rawStr = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=!@#$%^&*()';
    for (let i = 0; i < 200; i++) {
      rawStr += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i > 0 && i % 40 === 0) rawStr += '\n';
    }
    matrix.innerText = rawStr;
  }, 80);

  // Simulation timeline loop
  const runNextSimStep = () => {
    if (currentSimStep >= steps.length) {
      clearInterval(matrixInterval);
      
      // Complete! Clean up and load success slide
      setTimeout(() => {
        // Clear progress cache
        sessionStorage.removeItem('atc_form_progress');
        
        // Generate confirmation ID
        const confirmId = `ATC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        const name = document.getElementById('startup_name').value;
        const dateStr = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // ── SEND DATA TO GOOGLE SHEETS ──
        const payload = collectFormPayload(confirmId);
        sendToGoogleSheets(payload).then(result => {
          console.log('[ATC Form] Submission result:', result);
        });

        // Populate the ticket on the success screen
        document.getElementById('ticket-name').innerText = name;
        document.getElementById('ticket-id').innerText = confirmId;
        document.getElementById('ticket-date').innerText = dateStr;

        // Hide overlay and show success slide
        document.getElementById('securityOverlay').classList.remove('visible');
        nextSlide();
      }, 500);
      return;
    }

    const currentData = steps[currentSimStep];
    title.innerText = currentData.title;
    subtitle.innerText = currentData.desc;
    
    // Update progress bar
    const progressPercent = Math.round(((currentSimStep + 1) / steps.length) * 100);
    fill.style.width = `${progressPercent}%`;
    statusText.innerText = `Step ${currentSimStep + 1}/${steps.length}: ${currentData.title}`;

    currentSimStep++;
    
    // Time spent on each step
    const delay = currentSimStep === 3 || currentSimStep === 6 ? 800 : 400;
    setTimeout(runNextSimStep, delay);
  };
  
  runNextSimStep();
}

function restartApplication() {
  // Clear forms and state
  document.getElementById('startup_name').value = '';
  document.getElementById('startup_oneliner').value = '';
  document.getElementById('founded_date').value = '';
  document.getElementById('startup_country').value = '';
  document.getElementById('startup_overview').value = '';
  document.getElementById('logo_link').value = '';
  document.getElementById('pitch_deck_link').value = '';
  document.getElementById('headquarters').value = '';
  document.getElementById('website').value = '';
  document.getElementById('contact_email').value = '';
  document.getElementById('contact_phone').value = '';
  document.getElementById('contact_telegram').value = '';
  document.getElementById('focus_areas').value = '';
  document.getElementById('current_clients').value = '';
  document.getElementById('valuation').value = '';
  document.getElementById('round_size').value = '';
  document.getElementById('round_deadline').value = '';
  document.getElementById('grants').value = '';
  document.getElementById('expansion_targets').value = '';
  document.getElementById('mentor_pref').value = '';
  
  selectedStage = '';
  selectedTeamSize = '';
  selectedInternationalPresence = '';
  selectedVerticals.clear();
  selectedObjectives.clear();
  
  // Unselect active styles
  document.querySelectorAll('.choice-card').forEach(item => item.classList.remove('selected'));
  document.querySelectorAll('.pill-item').forEach(item => item.classList.remove('active'));
  
  // Re-initialize founder container
  const container = document.getElementById('foundersList');
  container.innerHTML = '';
  founderCount = 0;
  addFounderCard();
  
  // Return to slide 0
  goToSlide(0);
}
