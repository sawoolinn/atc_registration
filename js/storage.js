import { formState } from './state.js';
import { selectPaymentMethod } from './payment.js';

const SESSION_KEY = 'pnp_vc_form';

export function saveSessionProgress() {
  try {
    const state = {
      currentSlide: formState.currentSlide,
      selectedProfile: formState.selectedProfile,
      selectedPrograms: Array.from(formState.selectedPrograms),
      first_name:    getValue('first_name'),
      last_name:     getValue('last_name'),
      job_title:     getValue('job_title'),
      company:       getValue('company'),
      email:         getValue('email'),
      linkedin:      getValue('linkedin'),
      primary_goal:  getValue('primary_goal'),
      dietary:       getValue('dietary'),
      paymentMethod: formState.paymentMethod,
      telegram_username: getValue('telegram_username'),
      telegram_phone:    getValue('telegram_phone')
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch (e) { /* silent */ }
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

export function loadSessionProgress() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    ['first_name','last_name','job_title','company','email','linkedin','primary_goal','dietary','telegram_username','telegram_phone']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el && data[id]) el.value = data[id];
      });

    if (data.selectedProfile) {
      formState.selectedProfile = data.selectedProfile;
      const card = document.querySelector(`#profile-choices [data-val="${data.selectedProfile}"]`);
      if (card) card.classList.add('selected');
    }

    if (Array.isArray(data.selectedPrograms)) {
      data.selectedPrograms.forEach(val => {
        formState.selectedPrograms.add(val);
        const card = document.querySelector(`#program-choices [data-val="${val}"]`);
        const chk  = document.getElementById('chk-' + val);
        if (card) card.classList.add('selected');
        if (chk)  chk.textContent = '\u2611';
      });
    }

    if (data.paymentMethod) {
      selectPaymentMethod(data.paymentMethod);
    }

    return data.currentSlide || 0;
  } catch (e) { return 0; }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
