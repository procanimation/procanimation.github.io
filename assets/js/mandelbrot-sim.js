/**
 * Procanimation World — Interactive Mandelbrot Deep Zoom Canvas
 * Formula: z_{n+1} = z_n^2 + c in C
 * Features:
 *  - Real-time complex plane exploration with smooth pan & zoom
 *  - High-performance escape time rendering with continuous smooth shading
 *  - Landmark presets: Seahorse Valley, Mini Mandelbrot, Elephant Valley
 */

(function () {
  const canvas = document.getElementById('mandelbrotCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let centerX = -0.7;
  let centerY = 0.0;
  let zoom = 1.0;
  let maxIterations = 80;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.floor(rect.width * dpr);
    height = Math.floor(rect.height * dpr);
    canvas.width = width;
    canvas.height = height;
    render();
  }
  window.addEventListener('resize', resize);

  // Smooth color mapping for Procanimation cosmic palette
  function getColor(iter, maxIter) {
    if (iter === maxIter) return [7, 9, 14, 255]; // Deep cosmic black

    // Normalized continuous index
    const t = iter / maxIter;
    // Cosmic neon gradient: dark violet -> pink -> cyan -> bright white
    const r = Math.floor(Math.sin(t * Math.PI * 4 + 0.5) * 127 + 128);
    const g = Math.floor(Math.sin(t * Math.PI * 4 + 2.5) * 127 + 128);
    const b = Math.floor(Math.sin(t * Math.PI * 4 + 4.5) * 127 + 128);
    return [r, g, b, 255];
  }

  function render() {
    if (width === 0 || height === 0) return;
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

        while (zRe * zRe + zIm * zIm <= 4.0 && iter < maxIterations) {
          const nextRe = zRe * zRe - zIm * zIm + cRe;
          zIm = 2 * zRe * zIm + cIm;
          zRe = nextRe;
          iter++;
        }

        // Smooth coloring correction
        let smoothIter = iter;
        if (iter < maxIterations) {
          const modZ = Math.sqrt(zRe * zRe + zIm * zIm);
          smoothIter = iter + 1 - Math.log(Math.max(1, Math.log(modZ))) / Math.log(2);
        }

        const col = getColor(smoothIter, maxIterations);
        data[pIdx] = col[0];
        data[pIdx + 1] = col[1];
        data[pIdx + 2] = col[2];
        data[pIdx + 3] = 255;
        pIdx += 4;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Update HUD
    const zoomElem = document.getElementById('hudZoom');
    const coordElem = document.getElementById('hudCoords');
    if (zoomElem) zoomElem.textContent = `${zoom.toFixed(1)}x`;
    if (coordElem) coordElem.textContent = `${centerX.toFixed(5)} + ${centerY.toFixed(5)}i`;
  }

  // Mouse Interaction: Drag to pan
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const scale = 3.0 / (zoom * Math.min(width, height));
    centerX -= dx * scale;
    centerY -= dy * scale;
    render();
  });

  // Wheel to zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    zoom *= factor;
    maxIterations = Math.min(300, Math.floor(70 + Math.log10(zoom) * 30));
    render();
  }, { passive: false });

  // Preset Buttons
  const presets = {
    seahorse: { x: -0.743643887037158704752191506114774, y: 0.131825904205311970493132056385139, zoom: 45.0, iter: 140 },
    elephant: { x: 0.274, y: 0.482, zoom: 12.0, iter: 100 },
    mini: { x: -1.768778833, y: -0.001738994, zoom: 60.0, iter: 150 },
    reset: { x: -0.7, y: 0.0, zoom: 1.0, iter: 80 }
  };

  window.setMandelbrotPreset = function (name) {
    const p = presets[name] || presets.reset;
    centerX = p.x;
    centerY = p.y;
    zoom = p.zoom;
    maxIterations = p.iter;
    render();
  };

  resize();
})();
