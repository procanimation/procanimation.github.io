/**
 * Procanimation World — Double Pendulum Deterministic Chaos Simulation
 * Numerical Integration: Runge-Kutta 4th Order (RK4) with sub-stepping
 * Features:
 *  - Dual coupled pendulums showing microscopic initial condition divergence (0.01°)
 *  - Interactive mouse dragging to test arbitrary phase-space launch angles
 *  - Real-time Lyapunov divergence display
 */

(function () {
  const canvas = document.getElementById('pendulumCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Physical constants
  const g = 9.81;
  const l1 = 135;
  const l2 = 135;
  const m1 = 12;
  const m2 = 12;

  let isRunning = true;
  let showTrails = true;
  let isDragging = false;

  // Dual pendulum state: A (Cyan) and B (Pink, offset by 0.01 deg = 0.0001745 rad)
  const initialOffset = 0.0001745; // ~0.01 degrees

  let stateA = {
    theta1: Math.PI / 2,
    theta2: Math.PI / 2,
    omega1: 0,
    omega2: 0,
  };

  let stateB = {
    theta1: Math.PI / 2 + initialOffset,
    theta2: Math.PI / 2 + initialOffset,
    omega1: 0,
    omega2: 0,
  };

  let trailA = [];
  let trailB = [];
  const maxTrail = 800;

  // Resize canvas to element
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  // Equations of motion: angular accelerations derived from Euler-Lagrange
  function getDerivatives(theta1, theta2, omega1, omega2) {
    const delta = theta1 - theta2;

    const num1 =
      -g * (2 * m1 + m2) * Math.sin(theta1) -
      m2 * g * Math.sin(theta1 - 2 * theta2) -
      2 * Math.sin(delta) * m2 * (omega2 * omega2 * l2 + omega1 * omega1 * l1 * Math.cos(delta));
    const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const alpha1 = num1 / den1;

    const num2 =
      2 *
      Math.sin(delta) *
      (omega1 * omega1 * l1 * (m1 + m2) +
        g * (m1 + m2) * Math.cos(theta1) +
        omega2 * omega2 * l2 * m2 * Math.cos(delta));
    const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const alpha2 = num2 / den2;

    return { dTheta1: omega1, dTheta2: omega2, dOmega1: alpha1, dOmega2: alpha2 };
  }

  // Runge-Kutta 4th Order Integrator
  function rk4Step(s, dt) {
    const k1 = getDerivatives(s.theta1, s.theta2, s.omega1, s.omega2);

    const k2 = getDerivatives(
      s.theta1 + 0.5 * dt * k1.dTheta1,
      s.theta2 + 0.5 * dt * k1.dTheta2,
      s.omega1 + 0.5 * dt * k1.dOmega1,
      s.omega2 + 0.5 * dt * k1.dOmega2
    );

    const k3 = getDerivatives(
      s.theta1 + 0.5 * dt * k2.dTheta1,
      s.theta2 + 0.5 * dt * k2.dTheta2,
      s.omega1 + 0.5 * dt * k2.dOmega1,
      s.omega2 + 0.5 * dt * k2.dOmega2
    );

    const k4 = getDerivatives(
      s.theta1 + dt * k3.dTheta1,
      s.theta2 + dt * k3.dTheta2,
      s.omega1 + dt * k3.dOmega1,
      s.omega2 + dt * k3.dOmega2
    );

    s.theta1 += (dt / 6) * (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1);
    s.theta2 += (dt / 6) * (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2);
    s.omega1 += (dt / 6) * (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1);
    s.omega2 += (dt / 6) * (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2);

    // Keep theta bounded
    s.theta1 = (s.theta1 + Math.PI) % (2 * Math.PI) - Math.PI;
    s.theta2 = (s.theta2 + Math.PI) % (2 * Math.PI) - Math.PI;
  }

  // Mouse interaction
  function getOrigin() {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height * 0.32 };
  }

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    handlePointer(e);
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      // Re-initialize B with microscopic offset from dragged A
      stateB.theta1 = stateA.theta1 + initialOffset;
      stateB.theta2 = stateA.theta2 + initialOffset;
      stateA.omega1 = 0;
      stateA.omega2 = 0;
      stateB.omega1 = 0;
      stateB.omega2 = 0;
      trailA = [];
      trailB = [];
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) handlePointer(e);
  });

  function handlePointer(e) {
    const rect = canvas.getBoundingClientRect();
    const origin = getOrigin();
    const mx = e.clientX - rect.left - origin.x;
    const my = e.clientY - rect.top - origin.y;

    const angle = Math.atan2(mx, my);
    stateA.theta1 = angle;
    stateA.theta2 = angle;
    stateA.omega1 = 0;
    stateA.omega2 = 0;
  }

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    const rect = canvas.getBoundingClientRect();
    const origin = getOrigin();

    if (isRunning && !isDragging) {
      // Multiple sub-steps for symplectic precision
      const subSteps = 10;
      const dt = 0.035 / subSteps;
      for (let i = 0; i < subSteps; i++) {
        rk4Step(stateA, dt);
        rk4Step(stateB, dt);
      }
    }

    // Positions A
    const x1A = origin.x + l1 * Math.sin(stateA.theta1);
    const y1A = origin.y + l1 * Math.cos(stateA.theta1);
    const x2A = x1A + l2 * Math.sin(stateA.theta2);
    const y2A = y1A + l2 * Math.cos(stateA.theta2);

    // Positions B
    const x1B = origin.x + l1 * Math.sin(stateB.theta1);
    const y1B = origin.y + l1 * Math.cos(stateB.theta1);
    const x2B = x1B + l2 * Math.sin(stateB.theta2);
    const y2B = y1B + l2 * Math.cos(stateB.theta2);

    if (isRunning && !isDragging) {
      trailA.push({ x: x2A, y: y2A });
      trailB.push({ x: x2B, y: y2B });
      if (trailA.length > maxTrail) trailA.shift();
      if (trailB.length > maxTrail) trailB.shift();
    }

    // Render Canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw Grid & Coordinate Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, rect.height);
    ctx.moveTo(0, origin.y);
    ctx.lineTo(rect.width, origin.y);
    ctx.stroke();

    // Draw Trails
    if (showTrails) {
      // Trail A (Cyan)
      if (trailA.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(trailA[0].x, trailA[0].y);
        for (let i = 1; i < trailA.length; i++) {
          ctx.lineTo(trailA[i].x, trailA[i].y);
        }
        ctx.stroke();
      }

      // Trail B (Pink)
      if (trailB.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(247, 37, 133, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(trailB[0].x, trailB[0].y);
        for (let i = 1; i < trailB.length; i++) {
          ctx.lineTo(trailB[i].x, trailB[i].y);
        }
        ctx.stroke();
      }
    }

    // Draw Pendulum B (Ghost Pink)
    ctx.strokeStyle = 'rgba(247, 37, 133, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(x1B, y1B);
    ctx.lineTo(x2B, y2B);
    ctx.stroke();

    ctx.fillStyle = '#f72585';
    ctx.beginPath();
    ctx.arc(x1B, y1B, 5, 0, Math.PI * 2);
    ctx.arc(x2B, y2B, 7, 0, Math.PI * 2);
    ctx.fill();

    // Draw Pendulum A (Primary Cyan)
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(x1A, y1A);
    ctx.lineTo(x2A, y2A);
    ctx.stroke();

    ctx.fillStyle = '#00f5d4';
    ctx.beginPath();
    ctx.arc(x1A, y1A, 6, 0, Math.PI * 2);
    ctx.arc(x2A, y2A, 8, 0, Math.PI * 2);
    ctx.fill();

    // Origin Pivot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Update HUD metrics
    const delta1 = Math.abs(stateA.theta1 - stateB.theta1);
    const delta2 = Math.abs(stateA.theta2 - stateB.theta2);
    const totalDivergenceDeg = (Math.sqrt(delta1 * delta1 + delta2 * delta2) * 180) / Math.PI;

    const divElem = document.getElementById('hudDivergence');
    const phaseElem = document.getElementById('hudPhase');
    if (divElem) {
      divElem.textContent = `${totalDivergenceDeg.toFixed(2)}°`;
      if (totalDivergenceDeg > 15) {
        divElem.className = 'hud-alert';
      } else {
        divElem.className = 'hud-val';
      }
    }
    if (phaseElem) {
      phaseElem.textContent = totalDivergenceDeg > 15 ? 'MACROSCOPIC CHAOS' : 'SYNCHRONIZED';
      phaseElem.className = totalDivergenceDeg > 15 ? 'hud-alert' : 'hud-val';
    }
  }

  // Button Listeners
  const toggleBtn = document.getElementById('btnToggleSim');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isRunning = !isRunning;
      toggleBtn.textContent = isRunning ? 'Pause' : 'Resume';
    });
  }

  const resetBtn = document.getElementById('btnResetSim');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      stateA.theta1 = Math.PI / 2;
      stateA.theta2 = Math.PI / 2;
      stateA.omega1 = 0;
      stateA.omega2 = 0;

      stateB.theta1 = Math.PI / 2 + initialOffset;
      stateB.theta2 = Math.PI / 2 + initialOffset;
      stateB.omega1 = 0;
      stateB.omega2 = 0;

      trailA = [];
      trailB = [];
    });
  }

  const trailBtn = document.getElementById('btnToggleTrails');
  if (trailBtn) {
    trailBtn.addEventListener('click', () => {
      showTrails = !showTrails;
      trailBtn.textContent = showTrails ? 'Hide Trails' : 'Show Trails';
    });
  }

  animate();
})();
