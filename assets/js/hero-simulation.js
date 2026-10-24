// Procanimation - Interactive Gravitational Resonance Hero Canvas
(function() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const numParticles = 140;

  let mouse = { x: null, y: null, radius: 180 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.angle = Math.random() * Math.PI * 2;
      this.radius = initial ? 60 + Math.random() * (Math.min(width, height) * 0.45) : Math.min(width, height) * 0.45;
      this.speed = (0.003 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1);
      this.size = 1.2 + Math.random() * 2.2;
      this.alpha = 0.2 + Math.random() * 0.7;

      const colors = [
        [0, 245, 212],   // cyan
        [123, 44, 191],  // violet
        [247, 37, 133],  // pink
        [76, 201, 240],  // blue
      ];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.history = [];
    }

    update(time) {
      this.angle += this.speed;

      let cx = width / 2;
      let cy = height / 2;

      let x = cx + Math.cos(this.angle) * this.radius;
      let y = cy + Math.sin(this.angle) * (this.radius * 0.65);

      // Mouse gravitational deflection
      if (mouse.x !== null && mouse.y !== null) {
        let dx = mouse.x - x;
        let dy = mouse.y - y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          let force = (mouse.radius - dist) / mouse.radius;
          x += (dx / dist) * force * 35;
          y += (dy / dist) * force * 35;
        }
      }

      this.history.push({ x, y });
      if (this.history.length > 8) this.history.shift();
    }

    draw() {
      if (this.history.length < 2) return;

      // Draw faint motion trail
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.strokeStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${this.alpha * 0.35})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw glowing particle head
      const head = this.history[this.history.length - 1];
      ctx.beginPath();
      ctx.arc(head.x, head.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${this.alpha})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgb(${this.color[0]}, ${this.color[1]}, ${this.color[2]})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle());
  }

  let lastTime = 0;
  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    // Subtle central orbital core
    const cx = width / 2;
    const cy = height / 2;
    const pulse = Math.sin(time * 0.002) * 8;

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 160 + pulse);
    grad.addColorStop(0, 'rgba(0, 245, 212, 0.12)');
    grad.addColorStop(0.5, 'rgba(123, 44, 191, 0.06)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 160 + pulse, 0, Math.PI * 2);
    ctx.fill();

    particles.forEach(p => {
      p.update(time);
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
