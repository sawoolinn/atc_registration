'use strict';

// ─── Entry point — imports all modules and wires up globals ───────
import { formState } from './state.js';
import { goToSlide, nextSlide, prevSlide } from './navigation.js';
import {
  validateSlide1, validateSlide2, validateSlide3,
  validateSlide4, validateSlide5, validateSlide6,
  validateSlide7,
} from './validation.js';
import { toggleProgramOption, updatePricingUI } from './pricing.js';
import { handleReceiptUpload, selectPaymentMethod } from './payment.js';
import { loadSessionProgress, saveSessionProgress } from './storage.js';
import { submitApplication, restartApplication, populateReview } from './submission.js';

// ─── Expose functions to window so HTML onclick="" attributes work ─
window.nextSlide         = nextSlide;
window.prevSlide         = prevSlide;
window.goToSlide         = goToSlide;
window.validateSlide1    = validateSlide1;
window.validateSlide2    = validateSlide2;
window.validateSlide3    = validateSlide3;
window.validateSlide4    = validateSlide4;
window.validateSlide5    = validateSlide5;
window.validateSlide6    = validateSlide6;
window.validateSlide7    = validateSlide7;
window.toggleProgramOption  = toggleProgramOption;
window.selectChoiceSingle   = selectChoiceSingle;
window.selectPaymentMethod  = selectPaymentMethod;
window.handleReceiptUpload  = handleReceiptUpload;
window.submitApplication    = submitApplication;
window.restartApplication   = restartApplication;
window.toggleAccordion      = toggleAccordion;

// ─── Turnstile callbacks (must be on window) ──────────────────────
window.onTurnstileSuccess = function (token) {
  formState.turnstileToken = token;
};
window.onTurnstileExpired = function () {
  formState.turnstileToken = null;
};

// ─── Single-select (attendee profile) ────────────────────────────
function selectChoiceSingle(category, card) {
  document.querySelectorAll('#profile-choices .choice-card')
    .forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  formState.selectedProfile = card.dataset.val;
}

// ─── Accordion toggle ─────────────────────────────────────────────
function toggleAccordion(id) {
  const body = document.getElementById(id);
  if (body) body.classList.toggle('open');
}

// ─── Keyboard navigation ──────────────────────────────────────────
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const i = formState.currentSlide;
  if (i === 0) { nextSlide(); return; }
  const fns = [
    null,
    validateSlide1, validateSlide2, validateSlide3,
    validateSlide4, validateSlide5, validateSlide6,
    validateSlide7
  ];
  if (fns[i]) fns[i]();
});

// ─── Auto-save on input ───────────────────────────────────────────
document.addEventListener('input', function (e) {
  const targets = [
    'first_name','last_name','job_title','company',
    'email','linkedin','primary_goal','dietary',
    'telegram_username','telegram_phone'
  ];
  if (targets.includes(e.target.id)) saveSessionProgress();
});

// ─── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const savedSlide = loadSessionProgress();

  // Re-render pricing if programs were restored from session
  if (formState.selectedPrograms.size > 0) updatePricingUI();

  // Restore slide position (use goToSlide only if needed to avoid animation on first load)
  if (savedSlide && savedSlide >= 1 && savedSlide < 9) {
    goToSlide(savedSlide);
  }
});
