import { formState } from './state.js';
import { isValidEmail, isValidLinkedIn, showError } from './utils.js';
import { nextSlide } from './navigation.js';
import { populateReview } from './submission.js';

export function validateSlide1() {
  const first = document.getElementById('first_name').value.trim();
  const last  = document.getElementById('last_name').value.trim();

  if (!first || !last) {
    showError(1, 'Please enter both your first and last name.');
    return;
  }
  if (first.length < 2) {
    showError(1, 'First name must be at least 2 characters.');
    return;
  }
  nextSlide();
}

export function validateSlide2() {
  const title   = document.getElementById('job_title').value.trim();
  const company = document.getElementById('company').value.trim();

  if (!title || !company) {
    showError(2, 'Please enter your job title and company name.');
    return;
  }
  nextSlide();
}

export function validateSlide3() {
  const email    = document.getElementById('email').value.trim();
  const linkedin = document.getElementById('linkedin').value.trim();

  if (!isValidEmail(email)) {
    showError(3, 'Please enter a valid email.');
    return;
  }
  if (linkedin && !isValidLinkedIn(linkedin)) {
    showError(3, 'Please enter a valid LinkedIn URL.');
    return;
  }
  nextSlide();
}

export function validateSlide4() {
  if (!formState.selectedProfile) {
    showError(4, 'Please select your profile.');
    return;
  }
  nextSlide();
}

export function validateSlide5() {
  if (formState.selectedPrograms.size === 0) {
    showError(5, 'Please select at least one program.');
    return;
  }
  nextSlide();
}

export function validateSlide6() {
  const goal = document.getElementById('primary_goal').value.trim();

  if (goal.length < 10) {
    showError(6, 'Please share your primary goal.');
    return;
  }
  populateReview();
  nextSlide();
}