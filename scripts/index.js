/**
 * VALORIS — Master Application Entry Point
 * Coordinates Boot, Atmospheric Canvas, Scroll Reveal, and Chat SOS Intake
 */

import { initMouseTrackingCanvas } from './canvas.js';
import { initBootSequence, initScrollReveal } from './animations.js';
import {
  ROOT_EMAIL,
  state,
  STEPS,
  startChat,
  promptStep,
  addUserMessage,
  addBotMessage,
  fetchBackendIncidents
} from './chat.js';

// DOM References
const chatWidget = document.getElementById('chat-widget');
const closeWidgetBtn = document.getElementById('close-widget-btn');
const floatingChatTrigger = document.getElementById('floating-chat-trigger');
const navAskHelpBtn = document.getElementById('nav-ask-help-btn');
const heroAskHelpBtn = document.getElementById('hero-ask-help-btn');
const missionAskHelpBtn = document.getElementById('mission-ask-help-btn');

const chatInputForm = document.getElementById('chat-input-form');
const userInput = document.getElementById('user-input');
const quickTags = document.getElementById('quick-tags');

const successModal = document.getElementById('success-modal');
const closeModal = document.getElementById('close-modal');
const directEmailClientBtn = document.getElementById('direct-email-client-btn');

function openChatWidget() {
  if (chatWidget) {
    chatWidget.classList.remove('hidden');
    chatWidget.style.display = 'flex';
  }
  if (floatingChatTrigger) floatingChatTrigger.style.display = 'none';
  if (userInput) userInput.focus();
}

function closeChatWidget() {
  if (chatWidget) {
    chatWidget.classList.add('hidden');
  }
  if (floatingChatTrigger) floatingChatTrigger.style.display = 'flex';
}

function handleFormSubmit(e) {
  e.preventDefault();
  if (!userInput) return;
  const val = userInput.value.trim();
  if (!val) return;

  if (state.step >= STEPS.length) return;

  const current = STEPS[state.step];
  const check = current.validate(val);

  if (check !== true) {
    addBotMessage(`⚠️ ${check}`);
    return;
  }

  state.data[current.key] = val;
  addUserMessage(val);
  userInput.value = '';
  if (quickTags) quickTags.innerHTML = '';

  state.step++;
  setTimeout(promptStep, 300);
}

function setupEvents() {
  if (closeWidgetBtn) closeWidgetBtn.addEventListener('click', closeChatWidget);
  if (floatingChatTrigger) floatingChatTrigger.addEventListener('click', openChatWidget);
  if (navAskHelpBtn) navAskHelpBtn.addEventListener('click', openChatWidget);
  if (heroAskHelpBtn) heroAskHelpBtn.addEventListener('click', openChatWidget);
  if (missionAskHelpBtn) missionAskHelpBtn.addEventListener('click', openChatWidget);

  if (chatInputForm) chatInputForm.addEventListener('submit', handleFormSubmit);

  if (closeModal) {
    closeModal.addEventListener('click', () => {
      successModal.style.display = 'none';
    });
  }

  if (directEmailClientBtn) {
    directEmailClientBtn.addEventListener('click', () => {
      const inc = state.lastDispatchedIncident || state.data;
      const subject = encodeURIComponent(`🚨 [VALORIS HERO SOS] Emergency Request from ${inc.name} (${inc.location})`);
      const body = encodeURIComponent(
        `🚨 === VALORIS SUPERHERO EMERGENCY DISPATCH ===\n` +
        `Incident ID: ${inc.id || 'SOS-MANUAL'}\n` +
        `Civilian: ${inc.name} (Age: ${inc.age})\n` +
        `Location: ${inc.location}\n` +
        `Contact: ${inc.email}\n` +
        `Timestamp: ${inc.timestamp || new Date().toUTCString()}\n\n` +
        `EMERGENCY GRIEVANCE / ISSUE TO RESOLVE:\n` +
        `${inc.grievance}\n` +
        `==================================================`
      );
      window.open(`mailto:${ROOT_EMAIL}?subject=${subject}&body=${body}`, '_blank');
    });
  }
}

// Lifecycle Init
window.addEventListener('DOMContentLoaded', () => {
  initBootSequence();
  fetchBackendIncidents();
  startChat();
  setupEvents();
  initMouseTrackingCanvas();
  initScrollReveal();
});
