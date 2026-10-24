/**
 * Procanimation Studio — Interactive Mandelbrot Research Laboratory
 * Formula: z_{n+1} = z_n^2 + c in Complex Plane C
 * 
 * Features:
 *  - Real-time smooth pan & cursor-centered zoom
 *  - Multi-touch pinch zoom & drag for mobile
 *  - Multi-palette engine (Cosmic Nebula, Solar Flare, Cyberpunk Neon, Quantum Obsidian)
 *  - Cinematic Auto-Flight camera with smooth s-curve interpolation
 *  - Interactive Complex Orbit Tracer (Argand plane trajectory visualization)
 *  - 4K Wallpaper snapshot generation & instant download
 *  - Real-time telemetry HUD (Coordinates, Zoom, Iterations, Render latency)
 */

(function () {
  'use strict';

  // --- Main Simulation Elements ---
  const canvas = document.getElementById('mandelbrotCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stage = canvas.parentElement;

  // Orbit Tracer Elements
  const orbitCanvas = document.getElementById('orbitTracerCanvas');
  const orbitCtx = orbitCanvas ? orbitCanvas.getContext('2d') : null;
  const orbitStatus = document.getElementById('orbitStatus');
  const orbitFormula = document.getElementById('orbitFormula');

  // HUD Elements
  const hudCoords = document.getElementById('hudCoords');
  const hudZoom = document.getElementById('hudZoom');
  const hudIter = document.getElementById('hudIter');
  const hudFps = document.getElementById('hudFps');
  const iterSlider = document.getElementById('iterSlider');
  const iterDisplay = document.getElementById('iterDisplay');

  // State Variables
  let width = 0;
  let height = 0;
  let centerX = -0.7;
  let centerY = 0.0;
  let zoom = 1.0;
  let maxIterations = 90;
  let currentPalette = 'cosmic'; // 'cosmic', 'solar', 'cyber', 'obsidian'

  // Interaction State
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let hoverRe = -0.7;
  let hoverIm = 0.0;
  let lastTouchDist = 0;

  // Auto-Flight State
  let isAutoFlying = false;
  let flightStartTime = 0;
  let flightReqId = null;

  // Benchmark / Latency
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fpsTicker = 60;

  // Color Palettes
  const palettes = {
    cosmic: function (t) {
      // Cosmic Nebula: Deep void -> Violet -> Magenta -> Neon Cyan -> Pure Starlight
      const r = Math.floor(Math.sin(t * Math.PI * 4 + 0.5) * 127 + 128);
      const g = Math.floor(Math.sin(t * Math.PI * 4 + 2.5) * 127 + 128);
      const b = Math.floor(Math.sin(t * Math.PI * 4 + 4.5) * 127 + 128);
      return [r, g, b];
    },
    solar: function (t) {
      // Solar Flare: Obsidian -> Blood Crimson -> Molten Gold -> White Plasma
      const r = Math.min(255, Math.floor(Math.pow(t, 0.4) * 255));
      const g = Math.min(255, Math.floor(Math.pow(t, 1.2) * 220));
      const b = Math.min(255, Math.floor(Math.pow(t, 2.8) * 180));
      return [r, g, b];
    },
    cyber: function (t) {
      // Cyberpunk Neon: Dark Grid -> Ultraviolet -> Hot Fuchsia -> Laser Mint
      const r = Math.floor(Math.sin(t * Math.PI * 6 + 0.2) * 120 + 135);
      const g = Math.floor(Math.sin(t * Math.PI * 6 + 2.8) * 110 + 125);
      const b = Math.floor(Math.sin(t * Math.PI * 6 + 4.8) * 120 + 135);
      return [r, g, b];
    },
    obsidian: function (t) {
      // Quantum Obsidian: Silver liquid metal gradient
      const val = Math.floor(Math.sin(t * Math.PI * 5) * 110 + 130);
      return [val, val, Math.min(255, val + 15)];
    }
  };

  function getPixelColor(smoothIter, maxIter) {
    if (smoothIter >= maxIter) {
      return [6, 9, 14, 255]; // Mandelbrot interior core: obsidian void
    }
    const t = smoothIter / maxIter;
    const rgb = (palettes[currentPalette] || palettes.cosmic)(t);
    return [rgb[0], rgb[1], rgb[2], 255];
  }

  // --- Rendering Loop ---
  function render() {
    if (width === 0 || height === 0) return;
    const t0 = performance.now();

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const scale = 3.0 / (zoom * Math.min(width, height));
    const startRe = centerX - (width / 2) * scale;
    const startIm = centerY - (height / 2) * scale;

    let pIdx = 0;
    for (let py = 0; py < height; py++) {
      const cIm = startIm + py * scale;
      for (let px = 0; px < width; px++) {
        const cRe = startRe + px * scale;

        let zRe = 0;
        let zIm = 0;
        let iter = 0;

        // Cardioid / bulb early bailout check for major performance boost
        const crMinusQuarter = cRe - 0.25;
        const q = crMinusQuarter * crMinusQuarter + cIm * cIm;
        if (q * (q + crMinusQuarter) <= 0.25 * cIm * cIm) {
          // Inside main cardioid
          data[pIdx] = 6;
          data[pIdx + 1] = 9;
          data[pIdx + 2] = 14;
          data[pIdx + 3] = 255;
          pIdx += 4;
          continue;
        }

        while (zRe * zRe + zIm * zIm <= 4.0 && iter < maxIterations) {
          const nextRe = zRe * zRe - zIm * zIm + cRe;
          zIm = 2 * zRe * zIm + cIm;
          zRe = nextRe;
          iter++;
        }

        let smooth = iter;
        if (iter < maxIterations) {
          const modZ = Math.sqrt(zRe * zRe + zIm * zIm);
          smooth = iter + 1 - Math.log(Math.max(1, Math.log(modZ))) / Math.log(2);
        }

        const col = getPixelColor(smooth, maxIterations);
        data[pIdx] = col[0];
        data[pIdx + 1] = col[1];
        data[pIdx + 2] = col[2];
        data[pIdx + 3] = 255;
        pIdx += 4;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const renderTime = (performance.now() - t0).toFixed(1);

    // Update Telemetry HUD
    if (hudZoom) hudZoom.textContent = zoom < 1000 ? `${zoom.toFixed(1)}×` : `${(zoom).toExponential(2)}×`;
    if (hudCoords) hudCoords.textContent = `${centerX >= 0 ? '+' : ''}${centerX.toFixed(6)} ${centerY >= 0 ? '+' : ''}${centerY.toFixed(6)}i`;
    if (hudIter) hudIter.textContent = `${maxIterations}`;
    if (hudFps) hudFps.textContent = `${renderTime} ms`;
    if (iterDisplay) iterDisplay.textContent = `${maxIterations}`;

    // Update Orbit Tracer for current center or hover
    traceOrbit(hoverRe, hoverIm);
  }

  // --- Resize Handler ---
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.floor(rect.width * dpr);
    height = Math.floor(rect.height * dpr);
    canvas.width = width;
    canvas.height = height;

    if (orbitCanvas) {
      const oRect = orbitCanvas.getBoundingClientRect();
      orbitCanvas.width = Math.floor(oRect.width * (window.devicePixelRatio || 1));
      orbitCanvas.height = Math.floor(oRect.height * (window.devicePixelRatio || 1));
    }

    render();
  }
  window.addEventListener('resize', resize);

  // --- Interactive Complex Orbit Tracer ---
  function traceOrbit(cRe, cIm) {
    if (!orbitCtx || !orbitCanvas) return;
    const w = orbitCanvas.width;
    const h = orbitCanvas.height;
    orbitCtx.clearRect(0, 0, w, h);

    const toScreenX = (re) => (w / 2) + (re / 2.5) * (w / 2);
    const toScreenY = (im) => (h / 2) - (im / 2.5) * (h / 2);

    // Draw Complex Grid & Axes
    orbitCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    orbitCtx.lineWidth = 1;
    orbitCtx.beginPath();
    orbitCtx.moveTo(0, h / 2); orbitCtx.lineTo(w, h / 2);
    orbitCtx.moveTo(w / 2, 0); orbitCtx.lineTo(w / 2, h);
    orbitCtx.stroke();

    // Escape boundary circle |z| = 2
    orbitCtx.strokeStyle = 'rgba(247, 37, 133, 0.4)';
    orbitCtx.setLineDash([4, 4]);
    orbitCtx.beginPath();
    orbitCtx.arc(w / 2, h / 2, (2.0 / 2.5) * (w / 2), 0, Math.PI * 2);
    orbitCtx.stroke();
    orbitCtx.setLineDash([]);

    // Compute Orbit: z_0 = 0 -> z_1 = c -> z_2 = z_1^2 + c ...
    const orbit = [{ re: 0, im: 0 }];
    let zRe = 0;
    let zIm = 0;
    let escaped = false;
    let escapeStep = 0;
    const maxSteps = 40;

    for (let k = 1; k <= maxSteps; k++) {
      const nextRe = zRe * zRe - zIm * zIm + cRe;
      zIm = 2 * zRe * zIm + cIm;
      zRe = nextRe;
      orbit.push({ re: zRe, im: zIm });

      if (zRe * zRe + zIm * zIm > 4.0) {
        escaped = true;
        escapeStep = k;
        break;
      }
    }

    // Render Orbit Path
    if (orbit.length > 1) {
      orbitCtx.strokeStyle = escaped ? '#f72585' : '#00f5d4';
      orbitCtx.lineWidth = 1.5;
      orbitCtx.beginPath();
      orbitCtx.moveTo(toScreenX(orbit[0].re), toScreenY(orbit[0].im));
      for (let i = 1; i < orbit.length; i++) {
        orbitCtx.lineTo(toScreenX(orbit[i].re), toScreenY(orbit[i].im));
      }
      orbitCtx.stroke();

      // Draw Orbit Point Nodes
      orbit.forEach((pt, i) => {
        const sx = toScreenX(pt.re);
        const sy = toScreenY(pt.im);
        orbitCtx.fillStyle = i === 0 ? '#ffffff' : (escaped ? '#f72585' : '#00f5d4');
        orbitCtx.beginPath();
        orbitCtx.arc(sx, sy, i === 0 ? 4 : (i === orbit.length - 1 ? 5 : 2.5), 0, Math.PI * 2);
        orbitCtx.fill();
      });
    }

    // Update Status Badges
    if (orbitStatus) {
      if (escaped) {
        orbitStatus.innerHTML = `<span style="color:#f72585;">● ESCAPING DIVERGENCE</span> (|z| > 2 at iteration ${escapeStep})`;
      } else {
        orbitStatus.innerHTML = `<span style="color:#00f5d4;">● BOUNDED CORE (M)</span> (Trapped in limit attractor)`;
      }
    }
    if (orbitFormula) {
      orbitFormula.textContent = `c = ${cRe >= 0 ? '+' : ''}${cRe.toFixed(4)} ${cIm >= 0 ? '+' : ''}${cIm.toFixed(4)}i`;
    }
  }

  // --- Pointer & Mouse Interactions ---
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    if (isAutoFlying) stopAutoFlight();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (width / rect.width);
    const my = (e.clientY - rect.top) * (height / rect.height);
    const scale = 3.0 / (zoom * Math.min(width, height));
    hoverRe = centerX - (width / 2) * scale + mx * scale;
    hoverIm = centerY - (height / 2) * scale + my * scale;

    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      centerX -= dx * scale;
      centerY -= dy * scale;
      render();
    } else {
      // Trace orbit under crosshair
      traceOrbit(hoverRe, hoverIm);
    }
  });

  // Cursor-centered Wheel Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (isAutoFlying) stopAutoFlight();

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (width / rect.width);
    const my = (e.clientY - rect.top) * (height / rect.height);
    const scaleBefore = 3.0 / (zoom * Math.min(width, height));
    const targetRe = centerX - (width / 2) * scaleBefore + mx * scaleBefore;
    const targetIm = centerY - (height / 2) * scaleBefore + my * scaleBefore;

    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    zoom *= factor;
    zoom = Math.max(0.5, Math.min(1e12, zoom));
    maxIterations = Math.min(450, Math.floor(75 + Math.log10(Math.max(1, zoom)) * 40));

    const scaleAfter = 3.0 / (zoom * Math.min(width, height));
    centerX = targetRe - (mx - width / 2) * scaleAfter;
    centerY = targetIm - (my - height / 2) * scaleAfter;

    render();
  }, { passive: false });

  // Touch Support (Drag & Pinch Zoom)
  canvas.addEventListener('touchstart', (e) => {
    if (isAutoFlying) stopAutoFlight();
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      const scale = 3.0 / (zoom * Math.min(width, height));
      const dx = e.touches[0].clientX - dragStartX;
      const dy = e.touches[0].clientY - dragStartY;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      centerX -= dx * scale;
      centerY -= dy * scale;
      render();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDist > 0) {
        const factor = dist / lastTouchDist;
        zoom *= factor;
        zoom = Math.max(0.5, Math.min(1e12, zoom));
        maxIterations = Math.min(450, Math.floor(75 + Math.log10(Math.max(1, zoom)) * 40));
        render();
      }
      lastTouchDist = dist;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
    lastTouchDist = 0;
  });

  // --- Presets ---
  const landmarks = {
    seahorse: { x: -0.7436438870371587, y: 0.13182590420531197, zoom: 45.0, iter: 140 },
    elephant: { x: 0.274, y: 0.482, zoom: 14.0, iter: 110 },
    mini: { x: -1.768778833, y: -0.001738994, zoom: 85.0, iter: 180 },
    spirals: { x: -0.748, y: 0.1, zoom: 320.0, iter: 220 },
    reset: { x: -0.7, y: 0.0, zoom: 1.0, iter: 90 }
  };

  window.setMandelbrotPreset = function (name) {
    if (isAutoFlying) stopAutoFlight();
    const target = landmarks[name] || landmarks.reset;
    smoothTransition(target.x, target.y, target.zoom, target.iter, 800);
  };

  // Smooth Camera Transition
  function smoothTransition(tx, ty, tZoom, tIter, durationMs) {
    const sX = centerX;
    const sY = centerY;
    const sZoom = zoom;
    const sIter = maxIterations;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI); // easeInOutSine

      centerX = sX + (tx - sX) * ease;
      centerY = sY + (ty - sY) * ease;
      zoom = sZoom * Math.pow(tZoom / sZoom, ease);
      maxIterations = Math.floor(sIter + (tIter - sIter) * ease);
      render();

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // --- Palette Switcher ---
  window.setMandelbrotPalette = function (name) {
    if (palettes[name]) {
      currentPalette = name;
      document.querySelectorAll('.palette-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.palette === name);
      });
      render();
    }
  };

  // --- Iteration Slider ---
  if (iterSlider) {
    iterSlider.addEventListener('input', (e) => {
      maxIterations = parseInt(e.target.value, 10);
      render();
    });
  }

  // --- Cinematic Auto-Flight ---
  window.toggleAutoFlight = function () {
    if (isAutoFlying) {
      stopAutoFlight();
    } else {
      startAutoFlight();
    }
  };

  function startAutoFlight() {
    isAutoFlying = true;
    flightStartTime = performance.now();
    const btn = document.getElementById('autoFlightBtn');
    if (btn) btn.innerHTML = '<span>⏸ Pause Flight</span>';

    // Auto-flight coordinates: Seahorse Valley Deep Core
    const targetX = -0.743643887037158704752191506114774;
    const targetY = 0.131825904205311970493132056385139;

    function flightLoop(now) {
      if (!isAutoFlying) return;
      const elapsed = (now - flightStartTime) / 1000; // in seconds
      
      // Calibrated exponential zoom rate
      zoom = 1.0 * Math.exp(0.35 * elapsed);
      centerX += (targetX - centerX) * 0.05;
      centerY += (targetY - centerY) * 0.05;
      maxIterations = Math.min(380, Math.floor(80 + Math.log10(zoom) * 35));

      render();
      flightReqId = requestAnimationFrame(flightLoop);
    }
    flightReqId = requestAnimationFrame(flightLoop);
  }

  function stopAutoFlight() {
    isAutoFlying = false;
    if (flightReqId) cancelAnimationFrame(flightReqId);
    flightReqId = null;
    const btn = document.getElementById('autoFlightBtn');
    if (btn) btn.innerHTML = '<span>▶ Auto-Flight</span>';
  }

  // --- 4K Snapshot Exporter ---
  window.exportMandelbrotSnapshot = function () {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 3840;
    offCanvas.height = 2160;
    const offCtx = offCanvas.getContext('2d');
    const offData = offCtx.createImageData(3840, 2160);
    const d = offData.data;

    const scale = 3.0 / (zoom * Math.min(3840, 2160));
    const startRe = centerX - (3840 / 2) * scale;
    const startIm = centerY - (2160 / 2) * scale;
    const hiIter = Math.min(500, maxIterations + 80);

    let idx = 0;
    for (let py = 0; py < 2160; py++) {
      const cIm = startIm + py * scale;
      for (let px = 0; px < 3840; px++) {
        const cRe = startRe + px * scale;
        let zRe = 0, zIm = 0, iter = 0;

        while (zRe * zRe + zIm * zIm <= 4.0 && iter < hiIter) {
          const nextRe = zRe * zRe - zIm * zIm + cRe;
          zIm = 2 * zRe * zIm + cIm;
          zRe = nextRe;
          iter++;
        }

        let smooth = iter;
        if (iter < hiIter) {
          const modZ = Math.sqrt(zRe * zRe + zIm * zIm);
          smooth = iter + 1 - Math.log(Math.max(1, Math.log(modZ))) / Math.log(2);
        }

        const col = getPixelColor(smooth, hiIter);
        d[idx] = col[0];
        d[idx + 1] = col[1];
        d[idx + 2] = col[2];
        d[idx + 3] = 255;
        idx += 4;
      }
    }
    offCtx.putImageData(offData, 0, 0);

    // Overlay Watermark
    offCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    offCtx.font = 'bold 28px Inter, sans-serif';
    offCtx.fillText('Procanimation Studio • The Mandelbrot Deep Zoom', 60, 2100);

    const link = document.createElement('a');
    link.download = `procanimation_mandelbrot_${Math.floor(zoom)}x.png`;
    link.href = offCanvas.toDataURL('image/png');
    link.click();
  };

  // Fullscreen Toggle
  window.toggleMandelbrotFullscreen = function () {
    if (!document.fullscreenElement) {
      if (stage.requestFullscreen) stage.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  // Initialize
  resize();
})();
