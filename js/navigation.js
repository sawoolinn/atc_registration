import { formState } from './state.js';
import { saveSessionProgress } from './storage.js';

export function goToSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const current = slides[formState.currentSlide];
  const next    = slides[index];
  if (!next) return;

  const forward = index > formState.currentSlide;

  // ── Exit current slide ────────────────────────────────────────
  current.classList.remove('active');
  current.classList.add(forward ? 'exit-up' : 'exit-down');
  setTimeout(() => current.classList.remove('exit-up', 'exit-down'), 600);

  // ── Enter next slide ──────────────────────────────────────────
  // For FORWARD: the CSS default (.slide { transform: translateY(40px) }) is the
  // starting position. Adding .active transitions it to translateY(0). ✓
  //
  // For BACKWARD: we need to start from translateY(-40px) instead.
  // We use a CSS class + reflow trick so no inline style is ever set.
  if (!forward) {
    next.classList.add('enter-from-above');
    next.offsetHeight; // force reflow — browser snapshots this style
    next.classList.remove('enter-from-above'); // triggers transition -40px → 0
  }

  next.classList.add('active');

  // Reset scroll inside the slide and on the page
  next.scrollTop = 0;
  window.scrollTo(0, 0);

  formState.currentSlide = index;

  updateProgressBar();
  updateStepTracker();
  focusInput();
  saveSessionProgress();
}

export function nextSlide() { goToSlide(formState.currentSlide + 1); }
export function prevSlide() { goToSlide(formState.currentSlide - 1); }

function updateProgressBar() {
  const percent = Math.round((formState.currentSlide / 7) * 100);
  const bar  = document.getElementById('progressBar');
  const text = document.getElementById('progressText');
  if (bar)  bar.style.width  = Math.min(percent, 100) + '%';
  if (text) text.textContent = Math.min(percent, 100) + '% Complete';
}

function updateStepTracker() {
  document.querySelectorAll('.step-item').forEach(item => {
    const step = parseInt(item.dataset.step);
    item.classList.remove('active-step', 'completed');
    if (step === formState.currentSlide)    item.classList.add('active-step');
    else if (step < formState.currentSlide) item.classList.add('completed');
  });
}

function focusInput() {
  setTimeout(() => {
    const slide = document.getElementById('slide-' + formState.currentSlide);
    if (!slide) return;
    const input = slide.querySelector('input:not([type=checkbox]), textarea');
    if (input) input.focus({ preventScroll: true }); // prevent auto-scroll on focus
  }, 350);
}