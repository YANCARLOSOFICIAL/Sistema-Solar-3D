export function initStarField(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, stars = [], nebulas = [], animId = null;

  const STAR_COLORS = [
    [255, 255, 255],   // white  (most common)
    [210, 225, 255],   // blue-white
    [255, 245, 210],   // warm white
    [180, 200, 255],   // blue
    [255, 220, 180],   // orange
  ];

  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr)       { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Build star and nebula arrays ──────────────────────────────────────────
  function build() {
    const density = W * H / 2200;
    stars = [];

    for (let i = 0; i < density; i++) {
      const isBig = Math.random() < 0.04;
      stars.push({
        x:     rand(0, W),
        y:     rand(0, H),
        r:     isBig ? rand(1.2, 2.2) : rand(0.25, 0.9),
        base:  rand(0.25, 0.9),
        amp:   rand(0.1, 0.5),
        speed: rand(0.3, 1.8),
        phase: rand(0, Math.PI * 2),
        color: pick(STAR_COLORS),
        cross: isBig && Math.random() < 0.5,   // diffraction spikes on bright stars
      });
    }

    // Faint nebula blobs for atmosphere
    nebulas = [];
    for (let i = 0; i < 4; i++) {
      nebulas.push({
        x:  rand(0.1, 0.9),
        y:  rand(0.1, 0.9),
        rx: rand(0.08, 0.22),
        ry: rand(0.06, 0.16),
        r:  rand(0, Math.PI),
        c:  pick([[40,60,120],[20,50,100],[60,30,100],[10,40,80]]),
        a:  rand(0.025, 0.06),
      });
    }
  }

  // ── Draw diffraction cross on bright stars ────────────────────────────────
  function drawCross(x, y, r, alpha) {
    const len = r * 5;
    ctx.save();
    ctx.strokeStyle = `rgba(200,220,255,${alpha * 0.35})`;
    ctx.lineWidth = 0.5;
    for (let angle = 0; angle < Math.PI; angle += Math.PI / 2) {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(angle) * r, y - Math.sin(angle) * r);
      ctx.lineTo(x - Math.cos(angle) * len, y - Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function draw() {
    animId = requestAnimationFrame(draw);
    const t = performance.now() * 0.001;

    ctx.clearRect(0, 0, W, H);

    // Nebulas
    for (const n of nebulas) {
      const grd = ctx.createRadialGradient(
        n.x * W, n.y * H, 0,
        n.x * W, n.y * H, n.rx * W
      );
      grd.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${n.a})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(n.x * W, n.y * H);
      ctx.rotate(n.r);
      ctx.scale(1, n.ry / n.rx);
      ctx.translate(-n.x * W, -n.y * H);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(n.x * W, n.y * H, n.rx * W, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Stars
    for (const s of stars) {
      const alpha = Math.max(0, s.base + s.amp * Math.sin(s.speed * t + s.phase));
      const [r, g, b] = s.color;

      // Glow for larger stars
      if (s.r > 1.2) {
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        grd.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.5})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        if (s.cross) drawCross(s.x, s.y, s.r, alpha);
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  // ── Resize handling ───────────────────────────────────────────────────────
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = rect.width  || canvas.offsetWidth;
    H = canvas.height = rect.height || canvas.offsetHeight;
    build();
  }

  const obs = new ResizeObserver(resize);
  obs.observe(canvas.parentElement);
  resize();
  draw();

  return () => {
    cancelAnimationFrame(animId);
    obs.disconnect();
  };
}
