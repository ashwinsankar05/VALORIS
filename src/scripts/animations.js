/**
 * VALORIS — Visual Transitions, Boot Sequence & Scroll Reveal Engine
 */

export function initBootSequence() {
  const bootOverlay = document.getElementById('boot-overlay');
  const bootFill = document.getElementById('boot-fill');
  const bootPercent = document.getElementById('boot-percent');
  const bootLogs = document.getElementById('boot-logs');
  const skipBootBtn = document.getElementById('skip-boot-btn');
  const userInput = document.getElementById('user-input');

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

export function initScrollReveal() {
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
