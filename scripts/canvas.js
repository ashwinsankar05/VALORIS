/**
 * VALORIS — High-Performance 60FPS Interactive Mouse Tracking & Particle Engine
 */

export function initMouseTrackingCanvas() {
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
  const isMobile = width < 768;
  const particleCount = isMobile ? 45 : Math.min(75, Math.floor((width * height) / 14000));
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
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Batched Particle Heads
    ctx.fillStyle = '#00e5ff';
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
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
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
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    requestAnimationFrame(render);
  }

  render();
}
