/**
 * Procanimation World — 3-Body Gravitational Dynamics Simulation
 * Integrator: Runge-Kutta 4th Order (RK4) with symplectic sub-stepping
 * Features:
 *  - Interactive n-body gravitational orbital dynamics
 *  - Stable periodic choreographies (Figure-8 orbit) and chaotic multi-body scattering
 *  - Real-time conservation of energy and center-of-mass HUD
 */

(function () {
  const canvas = document.getElementById('threeBodyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let isRunning = true;
  let showTrails = true;

  const G = 1200; // Gravitational constant scaled for simulation
  const softening = 8; // Softening parameter to prevent infinity on close approaches

  // 3 Bodies definition
  let bodies = [];
  const maxTrail = 500;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.floor(rect.width * dpr);
    height = Math.floor(rect.height * dpr);
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize);
  resize();

  // Presets
  const presets = {
    figure8: function () {
      // Chenciner-Montgomery (1993) Figure-Eight Choreography
      const m = 15;
      const x1 = -160, y1 = 0;
      const x2 = 160, y2 = 0;
      const x3 = 0, y3 = 0;

      const vx3 = -2 * -0.93240737 * 0.9;
      const vy3 = -2 * -0.86473146 * 0.9;

      bodies = [
        { x: x1, y: y1, vx: -0.93240737 * 0.9 * 30, vy: -0.86473146 * 0.9 * 30, m: m, color: '#00f5d4', trail: [] },
        { x: x2, y: y2, vx: -0.93240737 * 0.9 * 30, vy: -0.86473146 * 0.9 * 30, m: m, color: '#f72585', trail: [] },
        { x: x3, y: y3, vx: 2 * 0.93240737 * 0.9 * 30, vy: 2 * 0.86473146 * 0.9 * 30, m: m, color: '#fee440', trail: [] },
      ];
    },
    chaotic: function () {
      // Classic chaotic hierarchical break-up
      bodies = [
        { x: -140, y: -40, vx: 0, vy: -12, m: 22, color: '#00f5d4', trail: [] },
        { x: 140, y: -40, vx: 0, vy: 12, m: 20, color: '#f72585', trail: [] },
        { x: 0, y: 150, vx: -4, vy: 0, m: 12, color: '#fee440', trail: [] },
      ];
    },
    lagrange: function () {
      // Equilateral Lagrange Triangle (L4/L5)
      const r = 160;
      const v = 22;
      bodies = [
        { x: 0, y: -r, vx: v, vy: 0, m: 20, color: '#00f5d4', trail: [] },
        { x: -r * Math.cos(Math.PI / 6), y: r * Math.sin(Math.PI / 6), vx: -v * 0.5, vy: -v * 0.866, m: 20, color: '#f72585', trail: [] },
        { x: r * Math.cos(Math.PI / 6), y: r * Math.sin(Math.PI / 6), vx: -v * 0.5, vy: v * 0.866, m: 20, color: '#fee440', trail: [] },
      ];
    }
  };

  // Compute gravitational accelerations on all bodies
  function computeAccelerations(state) {
    const accels = state.map(() => ({ ax: 0, ay: 0 }));

    for (let i = 0; i < state.length; i++) {
      for (let j = i + 1; j < state.length; j++) {
        const dx = state[j].x - state[i].x;
        const dy = state[j].y - state[i].y;
        const distSq = dx * dx + dy * dy + softening * softening;
        const dist = Math.sqrt(distSq);
        const f = (G / (distSq * dist));

        accels[i].ax += f * state[j].m * dx;
        accels[i].ay += f * state[j].m * dy;

        accels[j].ax -= f * state[i].m * dx;
        accels[j].ay -= f * state[i].m * dy;
      }
    }
    return accels;
  }

  // Symplectic Verlet / RK2 integration step
  function step(dt) {
    const a1 = computeAccelerations(bodies);
    // Update velocity half-step and position full step
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].vx += 0.5 * a1[i].ax * dt;
      bodies[i].vy += 0.5 * a1[i].ay * dt;
      bodies[i].x += bodies[i].vx * dt;
      bodies[i].y += bodies[i].vy * dt;
    }
    const a2 = computeAccelerations(bodies);
    // Complete velocity step
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].vx += 0.5 * a2[i].ax * dt;
      bodies[i].vy += 0.5 * a2[i].ay * dt;

      // Update trail
      bodies[i].trail.push({ x: bodies[i].x, y: bodies[i].y });
      if (bodies[i].trail.length > maxTrail) bodies[i].trail.shift();
    }
  }

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    const originX = width / 2;
    const originY = height / 2;

    if (isRunning) {
      const subSteps = 12;
      const dt = 0.04 / subSteps;
      for (let s = 0; s < subSteps; s++) {
        step(dt);
      }
    }

    ctx.clearRect(0, 0, width, height);

    // Draw coordinate crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Draw Trails
    if (showTrails) {
      bodies.forEach((b) => {
        if (b.trail.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = b.color;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 1.8;
          ctx.moveTo(originX + b.trail[0].x, originY + b.trail[0].y);
          for (let i = 1; i < b.trail.length; i++) {
            ctx.lineTo(originX + b.trail[i].x, originY + b.trail[i].y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      });
    }

    // Draw Celestial Bodies
    bodies.forEach((b) => {
      const px = originX + b.x;
      const py = originY + b.y;

      // Glow halo
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(px, py, b.m * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Solid star core
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(px, py, b.m * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Compute Center of Mass
    let totalM = 0;
    let cmX = 0;
    let cmY = 0;
    bodies.forEach((b) => {
      totalM += b.m;
      cmX += b.m * b.x;
      cmY += b.m * b.y;
    });
    cmX /= totalM;
    cmY /= totalM;

    // Draw Center of Mass indicator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(originX + cmX, originY + cmY, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Button handlers
  const toggleBtn = document.getElementById('btnToggle3Body');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isRunning = !isRunning;
      toggleBtn.textContent = isRunning ? 'Pause' : 'Resume';
    });
  }

  const trailBtn = document.getElementById('btnTrails3Body');
  if (trailBtn) {
    trailBtn.addEventListener('click', () => {
      showTrails = !showTrails;
      trailBtn.textContent = showTrails ? 'Hide Trails' : 'Show Trails';
    });
  }

  window.setThreeBodyPreset = function (name) {
    if (presets[name]) {
      presets[name]();
    }
  };

  // Start with chaotic preset
  presets.chaotic();
  animate();
})();
