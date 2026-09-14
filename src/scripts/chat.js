/**
 * VALORIS — Emergency Intake Chatbot & Incident Dispatch State Machine
 */

export let ROOT_EMAIL = 'emergency@valoris-nexus.local';

export const state = {
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

export const STEPS = [
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

export function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

export function formatText(content) {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

export function addBotMessage(html) {
  const chatFlow = document.getElementById('chat-flow');
  if (!chatFlow) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-msg bot';
  wrapper.innerHTML = `
    <div class="msg-bubble">${formatText(html)}</div>
  `;
  chatFlow.appendChild(wrapper);
  chatFlow.scrollTop = chatFlow.scrollHeight;
}

export function addUserMessage(text) {
  const chatFlow = document.getElementById('chat-flow');
  if (!chatFlow) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-msg user';
  wrapper.innerHTML = `
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;
  chatFlow.appendChild(wrapper);
  chatFlow.scrollTop = chatFlow.scrollHeight;
}

export function showTyping(cb) {
  const typingBox = document.getElementById('typing-box');
  const chatFlow = document.getElementById('chat-flow');
  if (typingBox) typingBox.style.display = 'flex';
  if (chatFlow) chatFlow.scrollTop = chatFlow.scrollHeight;
  setTimeout(() => {
    if (typingBox) typingBox.style.display = 'none';
    if (cb) cb();
  }, 280);
}

export function renderChips(chips) {
  const quickTags = document.getElementById('quick-tags');
  const userInput = document.getElementById('user-input');
  const chatInputForm = document.getElementById('chat-input-form');
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

export function deliverMessagesSequentially(messages, index, callback) {
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

export function promptStep() {
  const userInput = document.getElementById('user-input');
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

export function triggerAutoGeolocation() {
  const userInput = document.getElementById('user-input');
  const quickTags = document.getElementById('quick-tags');

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

export function showConfirmationReview() {
  const quickTags = document.getElementById('quick-tags');
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

export async function dispatchToBackend() {
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
      fetchBackendIncidents();
    } else {
      addBotMessage(`❌ <strong>Failed to dispatch:</strong> ${result.message || 'Server error'}`);
    }
  } catch (err) {
    console.error(err);
    addBotMessage(`❌ <strong>Network Error:</strong> Could not connect to backend server.`);
  }
}

export async function fetchBackendIncidents() {
  try {
    const res = await fetch('/api/incidents');
    if (!res.ok) return;
    const incidents = await res.json();
    renderIncidents(incidents);
  } catch (err) {
    console.warn('Could not fetch incidents from backend:', err);
  }
}

export function renderIncidents(incidents) {
  const recordsCount = document.getElementById('records-count');
  const recordsList = document.getElementById('records-list');
  if (!recordsCount || !recordsList) return;
  recordsCount.textContent = `${incidents.length} Signal${incidents.length === 1 ? '' : 's'}`;

  if (!incidents || incidents.length === 0) {
    recordsList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-satellite-dish"></i>
        <p>No active distress calls logged. Use the chatbot to send an encrypted emergency request to Valoris.</p>
      </div>
    `;
    return;
  }

  recordsList.innerHTML = '';
  incidents.forEach(inc => {
    const item = document.createElement('div');
    item.className = 'record-item';
    item.innerHTML = `
      <div class="record-top">
        <span class="record-id">${inc.id}</span>
        <span class="record-time"><i class="fa-regular fa-clock"></i> ${inc.timestamp}</span>
      </div>
      <div class="record-details">
        <strong>${escapeHtml(inc.name)}</strong> (Age: ${escapeHtml(inc.age)}) • 📍 ${escapeHtml(inc.location)} • 📧 ${escapeHtml(inc.email)}
      </div>
      <div class="record-grievance">
        <strong>Grievance:</strong> ${escapeHtml(inc.grievance)}
      </div>
    `;
    recordsList.appendChild(item);
  });
}

export function openSuccessModal(incident) {
  const modalDetails = document.getElementById('modal-details');
  const successModal = document.getElementById('success-modal');
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

export function startChat() {
  const chatFlow = document.getElementById('chat-flow');
  state.step = 0;
  state.data = { name: '', age: '', location: '', email: '', grievance: '' };
  if (chatFlow) chatFlow.innerHTML = '';
  promptStep();
}
