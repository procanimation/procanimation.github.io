/**
 * Procanimation World — 3-Body Gravitational Dynamics Simulation
 * Integrator: Symplectic Leapfrog / Verlet with sub-stepping
 * Features:
 *  - Interactive n-body gravitational orbital dynamics
 *  - Stable periodic choreographies (Figure-8 orbit) and chaotic multi-body scattering
 *  - Real-time conservation of energy (T, V, E_tot, drift) and center-of-mass HUD
 *  - Interactive mouse dragging of celestial bodies
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
  const maxTrail = 600;
  let draggedBody = null;
  let initialEnergy = null;
  let currentPreset = 'chaotic';

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      const m = 18;
      const x1 = -160, y1 = 0;
      const x2 = 160, y2 = 0;
      const x3 = 0, y3 = 0;

      const vx = 0.93240737 * 0.9 * 30;
      const vy = 0.86473146 * 0.9 * 30;

      bodies = [
        { x: x1, y: y1, vx: -vx, vy: -vy, m: m, color: '#00f5d4', name: 'Star A', trail: [] },
        { x: x2, y: y2, vx: -vx, vy: -vy, m: m, color: '#f72585', name: 'Star B', trail: [] },
        { x: x3, y: y3, vx: 2 * vx, vy: 2 * vy, m: m, color: '#fee440', name: 'Star C', trail: [] },
      ];
      initialEnergy = computeTotalEnergy(bodies);
    },
    chaotic: function () {
      // Classic chaotic hierarchical break-up
      bodies = [
        { x: -140, y: -40, vx: 0, vy: -12, m: 22, color: '#00f5d4', name: 'Star A', trail: [] },
        { x: 140, y: -40, vx: 0, vy: 12, m: 20, color: '#f72585', name: 'Star B', trail: [] },
        { x: 0, y: 150, vx: -4, vy: 0, m: 14, color: '#fee440', name: 'Star C', trail: [] },
      ];
      initialEnergy = computeTotalEnergy(bodies);
    },
    lagrange: function () {
      // Equilateral Lagrange Triangle (L4/L5)
      const r = 160;
      const v = 22;
      bodies = [
        { x: 0, y: -r, vx: v, vy: 0, m: 20, color: '#00f5d4', name: 'Star A', trail: [] },
        { x: -r * Math.cos(Math.PI / 6), y: r * Math.sin(Math.PI / 6), vx: -v * 0.5, vy: -v * 0.866, m: 20, color: '#f72585', name: 'Star B', trail: [] },
        { x: r * Math.cos(Math.PI / 6), y: r * Math.sin(Math.PI / 6), vx: -v * 0.5, vy: v * 0.866, m: 20, color: '#fee440', name: 'Star C', trail: [] },
      ];
      initialEnergy = computeTotalEnergy(bodies);
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

  // Energy computations
  function computeTotalEnergy(state) {
    let kinetic = 0;
    let potential = 0;

    for (let i = 0; i < state.length; i++) {
      const v2 = state[i].vx * state[i].vx + state[i].vy * state[i].vy;
      kinetic += 0.5 * state[i].m * v2;

      for (let j = i + 1; j < state.length; j++) {
        const dx = state[j].x - state[i].x;
        const dy = state[j].y - state[i].y;
        const r = Math.sqrt(dx * dx + dy * dy + softening * softening);
        potential -= (G * state[i].m * state[j].m) / r;
      }
    }
    return { kinetic, potential, total: kinetic + potential };
  }

  // Symplectic Verlet / Leapfrog integration step
  function step(dt) {
    if (draggedBody) return;
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

  // Mouse / Touch Dragging
  function getPosFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * dpr - width / 2,
      y: (clientY - rect.top) * dpr - height / 2
    };
  }

  canvas.addEventListener('mousedown', (e) => {
    const pos = getPosFromEvent(e);
    for (let b of bodies) {
      const d = Math.hypot(b.x - pos.x, b.y - pos.y);
      if (d < b.m * 1.5 + 10) {
        draggedBody = b;
        draggedBody.vx = 0;
        draggedBody.vy = 0;
        draggedBody.trail = [];
        break;
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (draggedBody) {
      const pos = getPosFromEvent(e);
      draggedBody.x = pos.x;
      draggedBody.y = pos.y;
    }
  });

  window.addEventListener('mouseup', () => {
    if (draggedBody) {
      draggedBody = null;
      initialEnergy = computeTotalEnergy(bodies);
    }
  });

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    const originX = width / 2;
    const originY = height / 2;

    if (isRunning) {
      const subSteps = 16;
      const dt = 0.035 / subSteps;
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

    // Draw gravitational potential lines between bodies
    ctx.lineWidth = 1;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const dist = Math.hypot(dx, dy);
        const alpha = Math.max(0.04, Math.min(0.25, 120 / (dist + 1)));
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(originX + bodies[i].x, originY + bodies[i].y);
        ctx.lineTo(originX + bodies[j].x, originY + bodies[j].y);
        ctx.stroke();
      }
    }

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
      ctx.arc(px, py, b.m * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Solid star core
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(px, py, b.m * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Velocity vector arrow
      if (!draggedBody) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + b.vx * 1.5, py + b.vy * 1.5);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(originX + cmX, originY + cmY, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('COM', originX + cmX + 8, originY + cmY + 4);

    // Energy Telemetry Overlay (Symplectic conservation)
    const energy = computeTotalEnergy(bodies);
    if (!initialEnergy) initialEnergy = energy;
    const driftPct = initialEnergy.total !== 0 
      ? Math.abs((energy.total - initialEnergy.total) / initialEnergy.total * 100) 
      : 0;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(16, 16, 220, 82);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(16, 16, 220, 82);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SYMPLECTIC ENERGY TELEMETRY', 26, 32);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Kinetic (T):  ${energy.kinetic.toFixed(1)} J`, 26, 48);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`Potential (V): ${energy.potential.toFixed(1)} J`, 26, 62);
    ctx.fillStyle = '#00f5d4';
    ctx.fillText(`Total E:      ${energy.total.toFixed(1)} J (Δ: ${driftPct.toFixed(3)}%)`, 26, 78);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Mode: ${currentPreset.toUpperCase()} | Drag stars to perturb`, 26, 92);
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

  function updatePresetButtons(activeName) {
    currentPreset = activeName;
    document.querySelectorAll('.preset-btn').forEach(btn => {
      if (btn.getAttribute('data-preset') === activeName) {
        btn.classList.add('primary');
      } else {
        btn.classList.remove('primary');
      }
    });
  }

  window.setThreeBodyPreset = function (name) {
    if (presets[name]) {
      presets[name]();
      updatePresetButtons(name);
    }
  };

  // Start with chaotic preset
  presets.chaotic();
  animate();
})();
