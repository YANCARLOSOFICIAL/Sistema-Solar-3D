/* studio.js — Solar System Assembly Mode (Three.js) */
'use strict';

// ── Planet data ────────────────────────────────────────────────────────────────
const PLANETS = [
  { id:'sol',      name:'Sol',      cat:'Estrella',        color:0xfdb813, orbit:0,    size:0.72, funcion:'Centro gravitacional y fuente de energía',      ubicacion:'Centro del sistema solar',        datoCurioso:'Más de 1.300.000 Tierras cabrían dentro del Sol.' },
  { id:'mercurio', name:'Mercurio', cat:'Planeta Rocoso',  color:0x9e9080, orbit:1.25, size:0.18, funcion:'Planeta más cercano al Sol, sin atmósfera',      ubicacion:'0,39 UA del Sol',                 datoCurioso:'Su núcleo de hierro ocupa el 85% de su radio.' },
  { id:'venus',    name:'Venus',    cat:'Planeta Rocoso',  color:0xe8c87a, orbit:1.85, size:0.22, funcion:'El planeta más caliente por efecto invernadero', ubicacion:'0,72 UA del Sol',                 datoCurioso:'Un día en Venus es más largo que su propio año.' },
  { id:'tierra',   name:'Tierra',   cat:'Planeta Rocoso',  color:0x3b78c3, orbit:2.55, size:0.23, funcion:'Único planeta conocido con vida',               ubicacion:'1 UA — 149,6 millones de km',     datoCurioso:'El 71% de su superficie está cubierta de agua.' },
  { id:'luna',     name:'Luna',     cat:'Satélite Natural',color:0xb8b0a5, orbit:2.55, size:0.12, funcion:'Satélite que estabiliza el eje terrestre',       ubicacion:'384.400 km de la Tierra',         datoCurioso:'La Luna se aleja 3,8 cm de la Tierra cada año.' },
  { id:'marte',    name:'Marte',    cat:'Planeta Rocoso',  color:0xc1440e, orbit:3.35, size:0.19, funcion:'Principal candidato a colonización humana',      ubicacion:'1,52 UA del Sol',                 datoCurioso:'Monte Olimpo es el volcán más alto del sistema solar.' },
  { id:'jupiter',  name:'Júpiter',  cat:'Gigante Gaseoso', color:0xc88b3a, orbit:4.55, size:0.52, funcion:'Escudo gravitacional del sistema solar',         ubicacion:'5,20 UA del Sol',                 datoCurioso:'1.321 Tierras cabrían en su interior.' },
  { id:'saturno',  name:'Saturno',  cat:'Gigante Gaseoso', color:0xe8d5a0, orbit:5.65, size:0.44, funcion:'Gigante gaseoso con los anillos más icónicos',   ubicacion:'9,58 UA del Sol',                 datoCurioso:'Es el único planeta menos denso que el agua.' },
  { id:'urano',    name:'Urano',    cat:'Gigante de Hielo',color:0x7de8e8, orbit:6.60, size:0.31, funcion:'Gira de lado con eje inclinado 97,77°',          ubicacion:'19,19 UA del Sol',                datoCurioso:'Tiene la temperatura más baja del sistema solar: −224 °C.' },
  { id:'neptuno',  name:'Neptuno',  cat:'Gigante de Hielo',color:0x3f54ba, orbit:7.50, size:0.30, funcion:'Vientos más veloces del sistema solar',          ubicacion:'30,07 UA del Sol',                datoCurioso:'Fue descubierto por predicción matemática antes de ser observado.' },
  { id:'pluton',   name:'Plutón',   cat:'Planeta Enano',  color:0xc4a882, orbit:8.40, size:0.13, funcion:'Planeta enano del Cinturón de Kuiper',            ubicacion:'39,5 UA del Sol (media)',         datoCurioso:'Caronte es tan grande que juntos forman un sistema binario.' },
];

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  placed:   {},   // id → true
  selected: null, // id of currently selected card
  history:  [],   // undo stack: array of id
};

const TOTAL = PLANETS.filter(p => p.id !== 'sol').length + 1; // including sol (always placed)

// ── Three.js setup ─────────────────────────────────────────────────────────────
const canvas  = document.getElementById('studioCanvas');
const wrap    = canvas.parentElement;
const W = () => wrap.clientWidth;
const H = () => wrap.clientHeight;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x06090f, 1);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, W()/H(), 0.1, 200);
camera.position.set(0, 12, 0);
camera.lookAt(0, 0, 0);

// Resize
function resize() {
  renderer.setSize(W(), H());
  camera.aspect = W()/H();
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// ── Lighting ───────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x223355, 1.8);
scene.add(ambient);
const sunLight = new THREE.PointLight(0xfff5cc, 3.5, 40);
sunLight.position.set(0, 1, 0);
scene.add(sunLight);

// ── Stars background ───────────────────────────────────────────────────────────
(function buildStars() {
  const geo = new THREE.BufferGeometry();
  const n = 800;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 50 + Math.random() * 30;
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true });
  scene.add(new THREE.Points(geo, mat));
})();

// ── Orbital rings ──────────────────────────────────────────────────────────────
const orbitMeshes   = {};
const targetMarkers = {};
const planetMeshes  = {};

PLANETS.forEach(p => {
  if (p.orbit === 0) return; // sun has no ring
  const ringGeo = new THREE.RingGeometry(p.orbit - 0.015, p.orbit + 0.015, 96);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x253a56, side: THREE.DoubleSide, transparent: true, opacity: 0.55
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  orbitMeshes[p.id] = ring;

  // Target marker: glowing circle at angle 0 on the orbit
  const angle = p.id === 'luna' ? 0.3 : 0;
  const markerGeo = new THREE.CircleGeometry(p.size * 0.9 + 0.12, 32);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x4fc3f7, transparent: true, opacity: 0.25, side: THREE.DoubleSide
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(
    p.orbit * Math.cos(angle), 0.01, p.orbit * Math.sin(angle)
  );
  marker.userData = { planetId: p.id, baseOrbit: p.orbit, angle };
  scene.add(marker);
  targetMarkers[p.id] = marker;
});

// ── Sun (always present) ───────────────────────────────────────────────────────
const sunGeo = new THREE.SphereGeometry(0.72, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xfdb813 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
scene.add(sunMesh);
state.placed['sol'] = true;

// Sun glow halo
const haloGeo = new THREE.SphereGeometry(1.05, 32, 32);
const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.12, side: THREE.FrontSide });
scene.add(new THREE.Mesh(haloGeo, haloMat));

// ── Planet spheres (hidden until placed) ──────────────────────────────────────
PLANETS.forEach(p => {
  if (p.id === 'sol') return;
  const geo = new THREE.SphereGeometry(p.size, 28, 28);
  const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.55, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  const angle = p.id === 'luna' ? 0.3 : 0;
  mesh.position.set(p.orbit * Math.cos(angle), 0, p.orbit * Math.sin(angle));
  mesh.visible = false;
  scene.add(mesh);
  planetMeshes[p.id] = mesh;

  // Saturn ring
  if (p.id === 'saturno') {
    const rg = new THREE.RingGeometry(p.size * 1.35, p.size * 2.05, 48);
    const rm = new THREE.MeshBasicMaterial({ color: 0xc8b880, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const r  = new THREE.Mesh(rg, rm);
    r.rotation.x = Math.PI / 2 * 0.4;
    r.visible = false;
    mesh.add(r);
  }
});

// ── Label layer ────────────────────────────────────────────────────────────────
const labelLayer = document.getElementById('labelLayer');
const labelEls   = {};

PLANETS.forEach(p => {
  const el = document.createElement('div');
  el.className = 'orbit-label';
  el.textContent = p.name;
  el.style.display = 'none';
  labelLayer.appendChild(el);
  labelEls[p.id] = el;
});

function worldToScreen(v3) {
  const v = v3.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * W(),
    y: (-v.y * 0.5 + 0.5) * H()
  };
}

// ── Raycaster for click ────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

canvas.addEventListener('click', e => {
  if (!state.selected) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const targets = Object.values(targetMarkers).filter(m => !state.placed[m.userData.planetId]);
  const hits = raycaster.intersectObjects(targets);
  if (!hits.length) return;

  const targetId = hits[0].object.userData.planetId;
  if (targetId === state.selected) {
    placePlanet(state.selected);
  } else {
    toast(`Esa órbita pertenece a ${PLANETS.find(p=>p.id===targetId).name}`);
  }
});

// ── Placement ─────────────────────────────────────────────────────────────────
function placePlanet(id) {
  state.placed[id] = true;
  state.history.push(id);

  const mesh   = planetMeshes[id];
  const marker = targetMarkers[id];
  const ring   = orbitMeshes[id];

  mesh.visible = true;
  mesh.scale.set(0.01, 0.01, 0.01);
  animateScale(mesh, 1, 400);

  marker.material.opacity = 0;
  ring.material.color.set(0x4fc3f7);
  ring.material.opacity = 0.7;

  labelEls[id].style.display = 'block';

  document.querySelector(`.piece-card[data-id="${id}"]`)?.classList.add('placed');
  deselectAll();
  updateProgress();
  toast(`✓ ${PLANETS.find(p=>p.id===id).name} colocado correctamente`);

  const placed = Object.keys(state.placed).length;
  if (placed >= PLANETS.length) {
    setTimeout(() => document.getElementById('completeBanner').classList.remove('hidden'), 600);
  }
}

function animateScale(mesh, targetScale, ms) {
  const start = performance.now();
  const init  = mesh.scale.x;
  function step(now) {
    const t = Math.min((now - start) / ms, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const s = init + (targetScale - init) * ease;
    mesh.scale.set(s, s, s);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Undo ───────────────────────────────────────────────────────────────────────
function undo() {
  if (!state.history.length) return;
  const id = state.history.pop();
  if (id === 'sol') return;
  delete state.placed[id];

  const mesh   = planetMeshes[id];
  const marker = targetMarkers[id];
  const ring   = orbitMeshes[id];

  animateScale(mesh, 0.01, 300);
  setTimeout(() => { mesh.visible = false; mesh.scale.set(1,1,1); }, 310);
  marker.material.opacity = 0.25;
  ring.material.color.set(0x253a56);
  ring.material.opacity = 0.55;
  labelEls[id].style.display = 'none';

  document.querySelector(`.piece-card[data-id="${id}"]`)?.classList.remove('placed');
  updateProgress();
  toast(`Descolocado: ${PLANETS.find(p=>p.id===id).name}`);
}

// ── Auto-assemble ──────────────────────────────────────────────────────────────
function autoEnsamblar() {
  const remaining = PLANETS.filter(p => p.id !== 'sol' && !state.placed[p.id]);
  remaining.forEach((p, i) => {
    setTimeout(() => placePlanet(p.id), i * 320);
  });
}

// ── Reset ──────────────────────────────────────────────────────────────────────
function resetAll() {
  PLANETS.forEach(p => {
    if (p.id === 'sol') return;
    delete state.placed[p.id];
    const mesh = planetMeshes[p.id];
    mesh.visible = false;
    mesh.scale.set(1,1,1);
    targetMarkers[p.id].material.opacity = 0.25;
    orbitMeshes[p.id].material.color.set(0x253a56);
    orbitMeshes[p.id].material.opacity = 0.55;
    labelEls[p.id].style.display = 'none';
    document.querySelector(`.piece-card[data-id="${p.id}"]`)?.classList.remove('placed');
  });
  state.history = [];
  deselectAll();
  updateProgress();
  document.getElementById('completeBanner').classList.add('hidden');
}

// ── Progress ───────────────────────────────────────────────────────────────────
function updateProgress() {
  const n = Object.keys(state.placed).length;
  const total = PLANETS.length;
  document.getElementById('progressText').textContent = `${n} / ${total} colocados`;
  document.getElementById('progressBar').style.width = `${(n / total) * 100}%`;
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function buildSidebar() {
  const grid = document.getElementById('pieceGrid');
  PLANETS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'piece-card';
    card.dataset.id = p.id;
    card.innerHTML = `
      <img class="piece-thumb" src="../app-assets/miniaturas/${p.id}.jpg" alt="${p.name}"
        onerror="this.style.background='radial-gradient(circle,${p.color.toString(16).padStart(6,'0')}88,#111e30)'">
      <div class="piece-info">
        <div class="piece-name">${p.name}</div>
        <div class="piece-cat">${p.cat}</div>
      </div>
      <span class="piece-check">✓</span>
    `;
    if (p.id === 'sol') card.classList.add('placed');
    card.addEventListener('click', () => selectCard(p));
    grid.appendChild(card);
  });
}

function selectCard(p) {
  if (state.placed[p.id]) return;
  const wasSelected = state.selected === p.id;
  deselectAll();
  if (!wasSelected) {
    state.selected = p.id;
    document.querySelector(`.piece-card[data-id="${p.id}"]`)?.classList.add('selected');
    highlightTarget(p.id);
    showInfo(p);
  }
}

function deselectAll() {
  state.selected = null;
  document.querySelectorAll('.piece-card.selected').forEach(c => c.classList.remove('selected'));
  clearHighlights();
}

function highlightTarget(id) {
  clearHighlights();
  const m = targetMarkers[id];
  if (m) {
    m.material.opacity = 0.55;
    m.material.color.set(0xffd54f);
  }
  const ring = orbitMeshes[id];
  if (ring) { ring.material.color.set(0xffd54f); ring.material.opacity = 0.8; }
  labelEls[id].style.display = 'block';
  labelEls[id].classList.add('pulse');
  document.getElementById('studioHint').textContent = `Haz clic sobre la órbita de ${PLANETS.find(p=>p.id===id).name} para colocarlo`;
}

function clearHighlights() {
  PLANETS.forEach(p => {
    if (p.id === 'sol') return;
    if (!state.placed[p.id]) {
      const m = targetMarkers[p.id];
      if (m) { m.material.opacity = 0.25; m.material.color.set(0x4fc3f7); }
      const ring = orbitMeshes[p.id];
      if (ring) { ring.material.color.set(0x253a56); ring.material.opacity = 0.55; }
      labelEls[p.id].style.display = 'none';
    }
    labelEls[p.id]?.classList.remove('pulse');
  });
  document.getElementById('studioHint').textContent = 'Selecciona un planeta y haz clic en su órbita para colocarlo';
}

// ── Info panel ─────────────────────────────────────────────────────────────────
function showInfo(p) {
  const content = document.getElementById('infoContent');
  const placeholder = document.getElementById('infoPlaceholder');
  placeholder.style.display = 'none';
  content.style.display = 'flex';
  content.innerHTML = `
    <div class="info-thumb-wrap">
      <img class="info-thumb" src="../app-assets/miniaturas/${p.id}.jpg" alt="${p.name}"
        onerror="this.style.display='none'">
      <div>
        <div class="info-name">${p.name}</div>
        <div class="info-type">${p.cat}</div>
      </div>
    </div>
    <div class="info-field">
      <div class="info-field-lbl">FUNCIÓN</div>
      <div class="info-field-val">${p.funcion}</div>
    </div>
    <div class="info-field">
      <div class="info-field-lbl">UBICACIÓN</div>
      <div class="info-field-val">${p.ubicacion}</div>
    </div>
    <div class="info-dato">
      💡 ${p.datoCurioso}
    </div>
  `;
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('studioToast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); el.classList.add('hidden'); }, 2200);
}

// ── Camera orbit (mouse drag) ──────────────────────────────────────────────────
let isDragging = false, prevX = 0, prevY = 0;
let camTheta = 0, camPhi = Math.PI / 3, camDist = 12;
const MIN_PHI = 0.2, MAX_PHI = Math.PI / 2 - 0.05;

canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
window.addEventListener('mouseup',   () => { isDragging = false; });
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  camTheta -= (e.clientX - prevX) * 0.008;
  camPhi    = Math.max(MIN_PHI, Math.min(MAX_PHI, camPhi - (e.clientY - prevY) * 0.008));
  prevX = e.clientX; prevY = e.clientY;
  updateCamera();
});
canvas.addEventListener('wheel', e => {
  camDist = Math.max(5, Math.min(22, camDist + e.deltaY * 0.015));
  updateCamera();
});
// Touch
canvas.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; });
canvas.addEventListener('touchend',   () => { isDragging = false; });
canvas.addEventListener('touchmove',  e => {
  e.preventDefault();
  camTheta -= (e.touches[0].clientX - prevX) * 0.008;
  camPhi    = Math.max(MIN_PHI, Math.min(MAX_PHI, camPhi - (e.touches[0].clientY - prevY) * 0.008));
  prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  updateCamera();
}, { passive: false });

function updateCamera() {
  camera.position.set(
    camDist * Math.sin(camPhi) * Math.sin(camTheta),
    camDist * Math.cos(camPhi),
    camDist * Math.sin(camPhi) * Math.cos(camTheta)
  );
  camera.lookAt(0, 0, 0);
}
updateCamera();

// ── Animation loop ─────────────────────────────────────────────────────────────
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.008;

  // Pulse unplaced target markers
  Object.entries(targetMarkers).forEach(([id, m]) => {
    if (!state.placed[id]) {
      const pulse = 0.18 + 0.07 * Math.sin(t * 2.5 + m.position.x);
      m.material.opacity = state.selected === id ? 0.55 : pulse;
    }
  });

  // Slowly rotate placed planets on their orbit
  PLANETS.forEach(p => {
    if (!state.placed[p.id] || p.id === 'sol' || p.id === 'luna') return;
    const mesh  = planetMeshes[p.id];
    const speed = 0.12 / (p.orbit || 1);
    const angle = (t * speed) % (Math.PI * 2);
    mesh.position.set(p.orbit * Math.cos(angle), 0, p.orbit * Math.sin(angle));
  });

  // Luna orbits Earth
  if (state.placed['luna'] && state.placed['tierra']) {
    const earth = planetMeshes['tierra'];
    const lunaAngle = t * 0.9;
    planetMeshes['luna'].position.set(
      earth.position.x + 0.52 * Math.cos(lunaAngle),
      0,
      earth.position.z + 0.52 * Math.sin(lunaAngle)
    );
  }

  // Update labels
  PLANETS.forEach(p => {
    const el = labelEls[p.id];
    if (!el || el.style.display === 'none') return;
    const mesh = p.id === 'sol' ? sunMesh : planetMeshes[p.id];
    if (!mesh) return;
    const screen = worldToScreen(mesh.position);
    el.style.left = screen.x + 'px';
    el.style.top  = (screen.y - 22) + 'px';
  });

  renderer.render(scene, camera);
}

// ── Events ─────────────────────────────────────────────────────────────────────
document.getElementById('btnAutoEnsamblar').addEventListener('click', autoEnsamblar);
document.getElementById('btnUndo').addEventListener('click', undo);
document.getElementById('btnReset').addEventListener('click', resetAll);
document.getElementById('btnResetComplete')?.addEventListener('click', () => {
  document.getElementById('completeBanner').classList.add('hidden');
  resetAll();
});

// ── Boot ───────────────────────────────────────────────────────────────────────
buildSidebar();
updateProgress();
animate();
