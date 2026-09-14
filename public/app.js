/**
 * VALORIS — Superhero Emergency Intake & Interactive Experience
 * Directly integrated with backend /api/dispatch & /api/incidents
 */

let ROOT_EMAIL = 'emergency@valoris-nexus.local';

// State Machine
const state = {
  step: 0,
  data: {
    name: '',
    age: '',
    location: '',
    email: '',
    grievance: ''
  },
  lastDispatchedIncident: null
};

const STEPS = [
  {
    key: 'name',
    introMessages: [
      "You found it. Most people walk straight past this lot.",
      "I'm Valoris. I deal with the things this city gave up on.",
      "What do I call you?"
    ],
    placeholder: "Your name",
    chips: [],
    validate: (val) => val.trim().length >= 2 || "Please provide your name (at least 2 characters)."
  },
  {
    key: 'age',
    introMessages: [
      (data) => `Got it, <strong>${escapeHtml(data.name)}</strong>. How old are you?`
    ],
    placeholder: "Your age (e.g. 24)",
    chips: [],
    validate: (val) => {
      const n = parseInt(val, 10);
      return (!isNaN(n) && n > 0 && n < 120) || "Please enter a valid numeric age.";
    }
  },
  {
    key: 'location',
    introMessages: [
      "Where are you right now? <em>(Requesting your GPS coordinates to pinpoint you...)</em>"
    ],
    placeholder: "Your location or area...",
    chips: [],
    validate: (val) => val.trim().length >= 3 || "Please specify your location or area."
  },
  {
    key: 'email',
    introMessages: [
      "What's your email address so I can confirm the dispatch?"
    ],
    placeholder: "Your email address",
    chips: [],
    validate: (val) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(val.trim()) || "Please enter a valid email address.";
    }
  },
  {
    key: 'grievance',
    introMessages: [
      "Tell me what you need help with. Describe the threat or crisis."
    ],
    placeholder: "Describe what's happening...",
    chips: [],
    validate: (val) => val.trim().length >= 5 || "Please provide at least a few words explaining the issue."
  }
];

// DOM References
const chatWidget = document.getElementById('chat-widget');
const closeWidgetBtn = document.getElementById('close-widget-btn');
const floatingChatTrigger = document.getElementById('floating-chat-trigger');
const navAskHelpBtn = document.getElementById('nav-ask-help-btn');
const heroAskHelpBtn = document.getElementById('hero-ask-help-btn');
const missionAskHelpBtn = document.getElementById('mission-ask-help-btn');

const chatFlow = document.getElementById('chat-flow');
const chatInputForm = document.getElementById('chat-input-form');
const userInput = document.getElementById('user-input');
const quickTags = document.getElementById('quick-tags');
const typingBox = document.getElementById('typing-box');


const successModal = document.getElementById('success-modal');
const modalDetails = document.getElementById('modal-details');
const closeModal = document.getElementById('close-modal');
const directEmailClientBtn = document.getElementById('direct-email-client-btn');

// Boot Overlay DOM
const bootOverlay = document.getElementById('boot-overlay');
const bootFill = document.getElementById('boot-fill');
const bootPercent = document.getElementById('boot-percent');
const bootLogs = document.getElementById('boot-logs');
const skipBootBtn = document.getElementById('skip-boot-btn');

// Init
window.addEventListener('DOMContentLoaded', () => {
  initBootSequence();
  startChat();
  setupEvents();
  initMouseTrackingCanvas();
  initScrollReveal();
  initHeroLetters();
  initPowerCards();
});

/* ==========================================================================
   Boot Sequence Simulation (0% -> 100%)
   ========================================================================== */
function initBootSequence() {
  if (!bootOverlay) return;

  let progress = 0;
  let logIndex = 0;
  const logItems = bootLogs ? bootLogs.querySelectorAll('.boot-item') : [];
  let isSkipped = false;

  function dismissBoot() {
    if (isSkipped) return;
    isSkipped = true;
    bootOverlay.classList.add('hidden');
    setTimeout(() => {
      bootOverlay.style.display = 'none';
      if (userInput) userInput.focus();
    }, 500);
  }

  if (skipBootBtn) skipBootBtn.addEventListener('click', dismissBoot);
  window.addEventListener('keydown', dismissBoot, { once: true });
  bootOverlay.addEventListener('click', dismissBoot);

  const interval = setInterval(() => {
    if (isSkipped) {
      clearInterval(interval);
      return;
    }

    progress += Math.floor(Math.random() * 9 + 5);
    if (progress > 100) progress = 100;

    if (bootFill) bootFill.style.width = `${progress}%`;
    if (bootPercent) bootPercent.textContent = `${String(progress).padStart(3, '0')}%`;

    const targetLog = Math.min(logItems.length - 1, Math.floor((progress / 100) * logItems.length));
    if (targetLog > logIndex && logItems[targetLog]) {
      logIndex = targetLog;
      logItems.forEach((el, idx) => el.classList.toggle('active', idx <= logIndex));
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(dismissBoot, 350);
    }
  }, 65);
}

/* ==========================================================================
   Chatbot Widget Open / Close & Event Setup
   ========================================================================== */
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

function startChat() {
  state.step = 0;
  state.data = { name: '', age: '', location: '', email: '', grievance: '' };
  if (chatFlow) chatFlow.innerHTML = '';
  promptStep();
}

function promptStep() {
  if (state.step >= STEPS.length) {
    showConfirmationReview();
    return;
  }

  const current = STEPS[state.step];
  if (userInput) userInput.placeholder = current.placeholder;

  const messages = current.introMessages.map(msg => 
    typeof msg === 'function' ? msg(state.data) : msg
  );

  deliverMessagesSequentially(messages, 0, () => {
    renderChips(current.chips);
    if (current.key === 'location') {
      triggerAutoGeolocation();
    }
    if (userInput) userInput.focus();
  });
}

function deliverMessagesSequentially(messages, index, callback) {
  if (index >= messages.length) {
    if (callback) callback();
    return;
  }

  showTyping(() => {
    addBotMessage(messages[index]);
    setTimeout(() => {
      deliverMessagesSequentially(messages, index + 1, callback);
    }, 280);
  });
}

function triggerAutoGeolocation() {
  if (!navigator.geolocation) {
    addBotMessage("<em>(GPS not supported on this browser. Type your location below:)</em>");
    if (userInput) userInput.focus();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      let locationString = `Coordinates: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
          headers: { 'Accept': 'application/json' }
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.display_name) {
            const parts = geoData.display_name.split(',');
            const shortAddress = parts.slice(0, 3).join(',').trim();
            locationString = `${shortAddress} (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;
          }
        }
      } catch (e) {}

      state.data.location = locationString;
      addBotMessage(`📍 <strong>Location Acquired:</strong> ${locationString}`);
      
      state.step++;
      setTimeout(promptStep, 450);
    },
    (error) => {
      console.warn('Geolocation status:', error.message);
      addBotMessage(`<em>(Location permission was not granted. Please type your location below:)</em>`);
      
      if (quickTags) {
        quickTags.innerHTML = '';
        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'tag-btn';
        retryBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Retry GPS Access';
        retryBtn.addEventListener('click', triggerAutoGeolocation);
        quickTags.appendChild(retryBtn);
      }

      if (userInput) userInput.focus();
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

function renderChips(chips) {
  if (!quickTags) return;
  quickTags.innerHTML = '';
  if (!chips || chips.length === 0) return;

  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tag-btn';
    btn.textContent = chip;
    btn.addEventListener('click', () => {
      if (userInput) {
        userInput.value = chip;
        chatInputForm.dispatchEvent(new Event('submit'));
      }
    });
    quickTags.appendChild(btn);
  });
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

function showConfirmationReview() {
  const d = state.data;
  const reviewHtml = `
    <strong>Emergency Dossier Compiled</strong>
    <div class="review-card">
      <div><strong>Name:</strong> ${escapeHtml(d.name)}</div>
      <div><strong>Age:</strong> ${escapeHtml(d.age)}</div>
      <div><strong>Location:</strong> ${escapeHtml(d.location)}</div>
      <div><strong>Email:</strong> ${escapeHtml(d.email)}</div>
      <div><strong>Issue:</strong> ${escapeHtml(d.grievance)}</div>
    </div>
    <div style="margin-top: 8px;">Click below to dispatch this SOS:</div>
  `;

  showTyping(() => {
    addBotMessage(reviewHtml);

    if (quickTags) {
      quickTags.innerHTML = '';
      const sendBtn = document.createElement('button');
      sendBtn.type = 'button';
      sendBtn.className = 'tag-btn confirm-tag';
      sendBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> <strong>SEND SOS TO VALORIS</strong>';
      sendBtn.addEventListener('click', dispatchToBackend);
      quickTags.appendChild(sendBtn);
    }
  });
}

async function dispatchToBackend() {
  showTyping(() => {
    addBotMessage("<em>Transmitting emergency telemetry to Valoris...</em>");
  });

  try {
    const res = await fetch('/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.data)
    });

    const result = await res.json();

    if (result.success) {
      state.lastDispatchedIncident = result.incident;
      addBotMessage(`<strong>HELP IS ON THE WAY.</strong> Your emergency signal has been recorded under <strong>${result.incident.id}</strong>.`);
      openSuccessModal(result.incident);
    } else {
      addBotMessage(`❌ <strong>Failed to dispatch:</strong> ${result.message || 'Server error'}`);
    }
  } catch (err) {
    console.error(err);
    addBotMessage(`❌ <strong>Network Error:</strong> Could not connect to backend server.`);
  }
}

function openSuccessModal(incident) {
  if (!modalDetails || !successModal) return;
  modalDetails.innerHTML = `
    <div><strong>Incident ID:</strong> ${incident.id}</div>
    <div><strong>Timestamp:</strong> ${incident.timestamp}</div>
    <div><strong>Civilian:</strong> ${escapeHtml(incident.name)} (Age: ${escapeHtml(incident.age)})</div>
    <div><strong>Location:</strong> ${escapeHtml(incident.location)}</div>
    <div><strong>Contact Email:</strong> ${escapeHtml(incident.email)}</div>
    <div><strong>Grievance:</strong> ${escapeHtml(incident.grievance)}</div>
    <div><strong>Status:</strong> Dispatched to Valoris</div>
  `;
  successModal.style.display = 'flex';
}

function formatText(content) {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function addBotMessage(html) {
  if (!chatFlow) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-msg bot';
  wrapper.innerHTML = `
    <div class="msg-bubble">${formatText(html)}</div>
  `;
  chatFlow.appendChild(wrapper);
  chatFlow.scrollTop = chatFlow.scrollHeight;
}

function addUserMessage(text) {
  if (!chatFlow) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-msg user';
  wrapper.innerHTML = `
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;
  chatFlow.appendChild(wrapper);
  chatFlow.scrollTop = chatFlow.scrollHeight;
}

function showTyping(cb) {
  if (typingBox) typingBox.style.display = 'flex';
  if (chatFlow) chatFlow.scrollTop = chatFlow.scrollHeight;
  setTimeout(() => {
    if (typingBox) typingBox.style.display = 'none';
    if (cb) cb();
  }, 280);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

/* ==========================================================================
   High-Performance 60FPS Mouse Tracking Canvas
   ========================================================================== */
function initMouseTrackingCanvas() {
  const canvas = document.getElementById('interactive-canvas');
  const cursorGlow = document.getElementById('cursor-glow');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const mouse = {
    x: width / 2,
    y: height / 2,
    targetX: width / 2,
    targetY: height / 2,
    radius: 180,
    active: false
  };

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  function handlePointer(clientX, clientY) {
    mouse.active = true;
    mouse.targetX = clientX;
    mouse.targetY = clientY;

    if (cursorGlow) {
      cursorGlow.style.left = `${clientX}px`;
      cursorGlow.style.top = `${clientY}px`;
      cursorGlow.style.opacity = '1';
    }
  }

  window.addEventListener('mousemove', (e) => handlePointer(e.clientX, e.clientY));
  
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
    if (cursorGlow) cursorGlow.style.opacity = '0';
  });

  window.addEventListener('touchend', () => {
    mouse.active = false;
    if (cursorGlow) cursorGlow.style.opacity = '0';
  });

  class EnergyParticle {
    constructor() {
      this.prevX = Math.random() * width;
      this.prevY = Math.random() * height;
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.prevX = this.x;
      this.prevY = this.y + 12;
      this.vx = (Math.random() - 0.5) * 1.0;
      this.vy = -(Math.random() * 1.2 + 0.4);
      this.radius = Math.random() * 2.0 + 1.2;
      this.baseAlpha = Math.random() * 0.45 + 0.35;
      this.alpha = this.baseAlpha;
    }

    update() {
      this.prevX = this.x;
      this.prevY = this.y;

      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);

        if (dist < mouse.radius && dist > 0) {
          const force = (1 - dist / mouse.radius) * 3.2;
          const angle = Math.atan2(dy, dx);
          this.x += Math.cos(angle) * force;
          this.y += Math.sin(angle) * force;
          this.alpha = Math.min(1, this.baseAlpha + (1 - dist / mouse.radius) * 0.6);
        } else {
          this.alpha += (this.baseAlpha - this.alpha) * 0.05;
        }
      } else {
        this.alpha += (this.baseAlpha - this.alpha) * 0.05;
      }

      this.x += this.vx;
      this.y += this.vy;

      if (this.y < -15 || this.x < -20 || this.x > width + 20) {
        this.reset(false);
      }
    }
  }

  const particles = [];
  const particleCount = Math.min(110, Math.floor((width * height) / 9000));
  for (let i = 0; i < particleCount; i++) {
    particles.push(new EnergyParticle());
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    mouse.x += (mouse.targetX - mouse.x) * 0.18;
    mouse.y += (mouse.targetY - mouse.y) * 0.18;

    // 1. Batched Motion Tails
    ctx.beginPath();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.update();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Batched Particle Heads
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.moveTo(p.x + p.radius, p.y);
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    }
    ctx.fill();

    // 3. Batched Laser Filaments to Mouse
    if (mouse.active) {
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dMouse < mouse.radius) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
        }
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    // 4. Neighbor Connections
    ctx.beginPath();
    for (let i = 0; i < particles.length; i += 2) {
      const p = particles[i];
      for (let j = i + 1; j < Math.min(particles.length, i + 5); j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 90) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    requestAnimationFrame(render);
  }

  render();
}

/* ==========================================================================
   Scroll Reveal — IntersectionObserver Engine
   ========================================================================== */
function initScrollReveal() {
  const revealSelectors = [
    '.scroll-reveal',
    '.scroll-reveal-left',
    '.scroll-reveal-right',
    '.scroll-reveal-scale',
    '.scroll-reveal-blur'
  ];

  const allTargets = document.querySelectorAll(revealSelectors.join(','));
  if (!allTargets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      } else {
        // Reverse back to vanish state when element exits viewport (e.g. scrolling up)
        entry.target.classList.remove('revealed');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  allTargets.forEach(el => observer.observe(el));
}

/* ==========================================================================
   Hero Title — Individual Letter Hover + Signal Ripple
   ========================================================================== */
function initHeroLetters() {
  const letters = document.querySelectorAll('.hero-letter');
  if (!letters.length) return;

  const rippleTimers = new WeakMap();

  function clearRippleTimers() {
    letters.forEach((other) => {
      const t = rippleTimers.get(other);
      if (t) {
        clearTimeout(t);
        rippleTimers.delete(other);
      }
    });
  }

  letters.forEach((letter, index) => {
    letter.style.setProperty('--i', index);

    letter.addEventListener('mouseenter', () => {
      clearRippleTimers();
      letters.forEach((other, otherIndex) => {
        other.classList.remove('ripple-active');
        other.style.transitionDelay = `0s`;
        other.style.webkitTransitionDelay = `0s`;
        if (other === letter) return;

        const dist = Math.abs(index - otherIndex);
        const delay = dist * 35;
        other.style.transitionDelay = `${delay}ms`;
        other.style.webkitTransitionDelay = `${delay}ms`;
        other.classList.add('ripple-active');

        const t = setTimeout(() => {
          other.classList.remove('ripple-active');
          rippleTimers.delete(other);
        }, delay + 450);
        rippleTimers.set(other, t);
      });
    });

    letter.addEventListener('mouseleave', () => {
      clearRippleTimers();
      letters.forEach((other) => {
        other.style.transitionDelay = `0s`;
        other.style.webkitTransitionDelay = `0s`;
        other.classList.remove('ripple-active');
      });
    });
  });
}

/* ==========================================================================
   Power Cards — Cursor Light, Scan Line, Signal Transition
   ========================================================================== */
function initPowerCards() {
  const cards = document.querySelectorAll('.power-card');
  if (!cards.length) return;

  const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  cards.forEach((card) => {
    let rect = card.getBoundingClientRect();

    const refreshRect = () => { rect = card.getBoundingClientRect(); };
    window.addEventListener('resize', refreshRect, { passive: true });
    window.addEventListener('scroll', refreshRect, { passive: true });

    card.addEventListener('mouseenter', () => {
      refreshRect();
      if (prefersReduced()) return;
      card.classList.remove('scan-active');
      void card.offsetWidth;
      card.classList.add('scan-active');
    });

    card.addEventListener('mousemove', (e) => {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });

    card.addEventListener('animationend', (e) => {
      if (e.animationName === 'cardScan') {
        card.classList.remove('scan-active');
      }
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('scan-active');
    });
  });
}
