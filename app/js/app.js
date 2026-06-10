import { BODIES, CATEGORIAS } from './data.js';
import { initStarField } from './stars.js';

const $ = id => document.getElementById(id);

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  currentBody:   null,
  mode:          '3D',
  starsOn:       true,
  autoRotate:    true,
  fov:           30,
  cleanupStars:  null,
  collapseState: JSON.parse(localStorage.getItem('ss_collapse') || '{}'),
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const modelViewer    = $('modelViewer');
const loadingOverlay = $('loadingOverlay');
const loadingName    = $('loadingName');
const bodyList       = $('bodyList');
const searchInput    = $('searchInput');
const viewerTitle    = $('viewerTitle');
const viewerSystem   = $('viewerSystem');
const detailBody     = $('detailBody');
const notasBody      = $('notasBody');
const anatImg        = $('anatImg');
const fichaImg       = $('fichaImg');
const starCanvas     = $('starCanvas');

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  state.cleanupStars = initStarField(starCanvas);
  buildBodyList();
  populateCompareSelects();
  setupCollapsibles();
  setupEvents();
  applyAjustes();
  selectBody(BODIES[0]);
  lucide.createIcons();
}

// ── Body list (left column) ───────────────────────────────────────────────────
function buildBodyList() {
  bodyList.innerHTML = '';
  CATEGORIAS.forEach(cat => {
    const bodies = BODIES.filter(b => b.categoria === cat);
    if (!bodies.length) return;
    const sec = document.createElement('div');
    sec.className = 'list-section';
    sec.innerHTML = `<div class="list-section-title">${cat}</div>`;
    bodies.forEach(body => {
      const item = document.createElement('div');
      item.className = 'organ-item';
      item.dataset.id = body.id;
      item.innerHTML = `
        <div class="organ-thumb-wrap">
          <img class="organ-thumb" src="../app-assets/miniaturas/${body.id}.jpg" alt="${body.name}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="organ-thumb-fallback" style="display:none;background:radial-gradient(circle,${body.color}88,${body.color}11)"></div>
        </div>
        <div class="organ-info">
          <div class="organ-name">${body.name}</div>
          <div class="organ-system">${body.clasificacion}</div>
        </div>
      `;
      item.addEventListener('click', () => selectBody(body));
      sec.appendChild(item);
    });
    bodyList.appendChild(sec);
  });
}

// ── Select body ───────────────────────────────────────────────────────────────
function selectBody(body) {
  state.currentBody = body;
  state.fov = 30;

  document.querySelectorAll('.organ-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === body.id)
  );

  loadingName.textContent = body.name;
  loadingOverlay.classList.remove('hidden');

  modelViewer.setAttribute('src', body.archivo);
  modelViewer.setAttribute('camera-orbit', body.cameraOrbit);
  modelViewer.setAttribute('field-of-view', `${state.fov}deg`);
  if (state.autoRotate) modelViewer.setAttribute('auto-rotate', '');
  else modelViewer.removeAttribute('auto-rotate');

  viewerTitle.textContent = body.name;
  viewerSystem.textContent = body.clasificacion;

  anatImg.style.display  = '';
  fichaImg.style.display = '';
  anatImg.src  = `../app-assets/anatomia/${body.id}.png`;
  fichaImg.src = `../app-assets/datos_importantes/${body.id}.png`;
  anatImg.onerror  = () => { anatImg.style.display  = 'none'; };
  fichaImg.onerror = () => { fichaImg.style.display = 'none'; };

  // Sync compareA to selected body; auto-swap compareB if it would duplicate
  const cmpA = $('compareA');
  const cmpB = $('compareB');
  cmpA.value = body.id;
  if (cmpB.value === body.id) {
    const other = BODIES.find(b => b.id !== body.id);
    if (other) cmpB.value = other.id;
  }

  renderDetalles(body);
  renderNotas(body);
  renderCompareChips();
}

modelViewer.addEventListener('load',  () => loadingOverlay.classList.add('hidden'));
modelViewer.addEventListener('error', () => {
  loadingOverlay.classList.add('hidden');
  toast('Error al cargar el modelo 3D');
});

// ── Right panel: details ──────────────────────────────────────────────────────
function renderDetalles(body) {
  detailBody.innerHTML = `
    <div class="detail-header">
      <img class="detail-thumb" src="../app-assets/miniaturas/${body.id}.jpg" alt="${body.name}"
        onerror="this.style.display='none'">
      <div>
        <h2 class="detail-name">${body.name}</h2>
        <span class="detail-type">${body.clasificacion}</span>
      </div>
    </div>

    <div class="detail-fields">
      <div class="detail-field">
        <div class="field-icon"><i data-lucide="zap"></i></div>
        <div>
          <span class="field-label">FUNCIÓN</span>
          <span class="field-value">${body.funcion}</span>
        </div>
      </div>
      <div class="detail-field">
        <div class="field-icon"><i data-lucide="map-pin"></i></div>
        <div>
          <span class="field-label">UBICACIÓN</span>
          <span class="field-value">${body.ubicacion}</span>
        </div>
      </div>
      <div class="detail-field">
        <div class="field-icon"><i data-lucide="link"></i></div>
        <div>
          <span class="field-label">RELACIÓN</span>
          <span class="field-value">${body.relacion}</span>
        </div>
      </div>
      <div class="detail-field">
        <div class="field-icon"><i data-lucide="ruler"></i></div>
        <div>
          <span class="field-label">TAMAÑO</span>
          <span class="field-value">${body.tamano}</span>
        </div>
      </div>
    </div>

    <div class="detail-table-section">
      <div class="detail-field-label"><i data-lucide="bar-chart-2"></i> DATOS CLAVE</div>
      <table class="data-table">
        ${Object.entries(body.datos).map(([k,v]) =>
          `<tr><td class="dk">${k}</td><td class="dv">${v}</td></tr>`
        ).join('')}
      </table>
    </div>
  `;
  lucide.createIcons({ nameAttr: 'data-lucide', nodes: [detailBody] });
}

function renderNotas(body) {
  notasBody.innerHTML = `
    <p class="notas-desc">${body.descripcion}</p>
    <div class="dato-curioso">
      <i data-lucide="lightbulb"></i>
      <p>Dato curioso: ${body.datoCurioso}</p>
    </div>
    <ul class="facts-list">
      ${body.curiosidades.map(f => `<li>${f}</li>`).join('')}
    </ul>
    <div class="notas-nota">
      <p>${body.nota}</p>
    </div>
  `;
  lucide.createIcons({ nameAttr: 'data-lucide', nodes: [notasBody] });
}

// ── Compare ───────────────────────────────────────────────────────────────────
function populateCompareSelects() {
  const opts = BODIES.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  $('compareA').innerHTML = opts;
  $('compareB').innerHTML = opts;
  $('compareB').value = 'tierra';
}

function renderCompareChips() {
  const chips = $('compareChips');
  const A = BODIES.find(b => b.id === $('compareA').value);
  const B = BODIES.find(b => b.id === $('compareB').value);
  if (!A || !B) return;
  chips.innerHTML = `
    <div class="cmp-chip">
      <img src="../app-assets/miniaturas/${A.id}.jpg" alt="${A.name}" onerror="this.style.display='none'">
      <div>
        <strong>${A.name}</strong>
        <span>${A.categoria}</span>
      </div>
    </div>
    <div class="cmp-vs">VS</div>
    <div class="cmp-chip">
      <img src="../app-assets/miniaturas/${B.id}.jpg" alt="${B.name}" onerror="this.style.display='none'">
      <div>
        <strong>${B.name}</strong>
        <span>${B.categoria}</span>
      </div>
    </div>
  `;
}

function renderCompareModal() {
  const A = BODIES.find(b => b.id === $('compareA').value);
  const B = BODIES.find(b => b.id === $('compareB').value);
  if (!A || !B) return;
  const allKeys = [...new Set([...Object.keys(A.datos), ...Object.keys(B.datos)])];

  const colHTML = body => `
    <div class="cmp-col" style="--body-color:${body.color}">
      <div class="cmp-col-hero">
        <img src="../app-assets/miniaturas/${body.id}.jpg" alt="${body.name}"
          onerror="this.style.display='none'">
        <div>
          <h3 class="cmp-col-name">${body.name}</h3>
          <span class="cmp-col-type">${body.categoria}</span>
        </div>
      </div>
      <dl class="cmp-dl">
        <dt>Función</dt><dd>${body.funcion}</dd>
        <dt>Ubicación</dt><dd>${body.ubicacion}</dd>
        <dt>Relación</dt><dd>${body.relacion}</dd>
        <dt>Tamaño</dt><dd>${body.tamano}</dd>
        <dt>Importancia</dt><dd>${body.importancia}</dd>
        <dt>Dato curioso</dt><dd>${body.datoCurioso}</dd>
      </dl>
    </div>`;

  $('compareContent').innerHTML = `
    <div class="cmp-2col">
      ${colHTML(A)}
      <div class="cmp-vs-bar">VS</div>
      ${colHTML(B)}
    </div>
    <div class="cmp-table-section">
      <div class="cmp-table-title">DATOS COMPARATIVOS</div>
      <table class="cmp-table">
        <thead><tr><th>Parámetro</th><th>${A.name}</th><th>${B.name}</th></tr></thead>
        <tbody>
          ${allKeys.map(k => `
            <tr>
              <td class="cmp-key">${k}</td>
              <td>${A.datos[k] ?? '—'}</td>
              <td>${B.datos[k] ?? '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Gallery overlay ───────────────────────────────────────────────────────────
function buildGaleriaOverlay() {
  const grid = $('galeriaCuerpos');
  if (grid.children.length) return;
  BODIES.forEach(body => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
      <div class="card-preview">
        <img class="card-thumb" src="../app-assets/miniaturas/${body.id}.jpg" alt="${body.name}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="card-thumb-fallback" style="display:none;background:radial-gradient(circle at 38% 32%,${body.color}88,${body.color}11 80%)">
          <div class="card-sphere-glow" style="box-shadow:0 0 40px 12px ${body.color}55"></div>
        </div>
        <div class="card-overlay">
          <span class="card-cat-badge">${body.categoria}</span>
          <span class="card-zoom-icon">🔍</span>
        </div>
      </div>
      <div class="card-body">
        <h3 class="card-name">${body.name}</h3>
        <p class="card-desc">${body.descripcion.slice(0, 110)}…</p>
        <button class="card-btn">Ver en 3D</button>
      </div>
    `;
    card.querySelector('.card-btn').addEventListener('click', () => {
      selectBody(body);
      closeAllOverlays();
    });
    card.querySelector('.card-preview').addEventListener('click', () => openLightbox(body));
    grid.appendChild(card);
  });
}

// ── Biblioteca overlay ────────────────────────────────────────────────────────
function buildBiblioteca() {
  const el = $('bibliotecaContent');
  if (el.children.length) return;
  el.innerHTML = CATEGORIAS.map(cat => {
    const bodies = BODIES.filter(b => b.categoria === cat);
    if (!bodies.length) return '';
    return `
      <div class="bib-section">
        <h3 class="bib-cat">${cat}</h3>
        ${bodies.map(b => `
          <div class="bib-item bib-item-clickable" data-id="${b.id}" title="Ver ${b.name}">
            <img src="../app-assets/miniaturas/${b.id}.jpg" alt="${b.name}" onerror="this.style.display='none'">
            <div>
              <strong>${b.name}</strong>
              <p>${b.funcion}</p>
            </div>
            <i data-lucide="chevron-right" style="margin-left:auto;flex-shrink:0;opacity:.4;width:14px;height:14px"></i>
          </div>`).join('')}
      </div>`;
  }).join('');

  el.querySelectorAll('.bib-item-clickable').forEach(item => {
    item.addEventListener('click', () => {
      const body = BODIES.find(b => b.id === item.dataset.id);
      if (body) { selectBody(body); closeAllOverlays(); }
    });
  });
  lucide.createIcons({ nameAttr: 'data-lucide', nodes: [el] });
}

// ── Cuaderno ──────────────────────────────────────────────────────────────────
function openCuaderno() {
  const body = state.currentBody;
  const hdr  = $('cuadernoBodyHdr');
  const ta   = $('cuadernoNota');

  if (body) {
    hdr.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px 0 14px">
        <img src="../app-assets/miniaturas/${body.id}.jpg" alt="${body.name}"
          style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid var(--border2)"
          onerror="this.style.display='none'">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${body.name}</div>
          <div style="font-size:10.5px;color:var(--text3)">${body.clasificacion}</div>
        </div>
      </div>`;
    ta.value = localStorage.getItem(`ss_nota_${body.id}`) ?? '';
  } else {
    hdr.innerHTML = `<div class="detail-placeholder" style="padding:16px;font-size:12px">Selecciona un cuerpo celeste para tomar notas</div>`;
    ta.value = '';
  }

  renderCuadernoTodas();
  $('cuaderno-overlay').classList.remove('hidden');
}

function renderCuadernoTodas() {
  const el  = $('cuadernoTodas');
  const notas = BODIES.map(b => ({ body: b, nota: localStorage.getItem(`ss_nota_${b.id}`) }))
                      .filter(x => x.nota?.trim());
  if (!notas.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="cuaderno-saved-title">NOTAS GUARDADAS</div>
    ${notas.map(({ body: b, nota }) => `
      <div class="cuaderno-saved-item">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <img src="../app-assets/miniaturas/${b.id}.jpg" style="width:22px;height:22px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">
          <strong style="font-size:12px;color:var(--text)">${b.name}</strong>
        </div>
        <p style="font-size:11.5px;color:var(--text2);white-space:pre-wrap">${nota.slice(0,180)}${nota.length>180?'…':''}</p>
      </div>`).join('')}
  `;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(body) {
  const lb = $('lightbox');
  $('lightboxImg').src = `../app-assets/imagenes/${body.id}.jpg`;
  $('lightboxCaption').textContent = `${body.name} · ${body.clasificacion}`;
  lb.classList.remove('hidden');
}

function closeLightbox() {
  $('lightbox').classList.add('hidden');
  $('lightboxImg').src = '';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  clearTimeout(toastTimer);
  el.classList.remove('show', 'hidden');
  el.textContent = msg;
  void el.offsetWidth; // force reflow so CSS transition fires
  el.classList.add('show');
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 260);
  }, 2200);
}

// ── Collapsibles ──────────────────────────────────────────────────────────────
function setupCollapsibles() {
  document.querySelectorAll('.collapse-btn').forEach(btn => {
    const targetId = btn.dataset.target;
    const collapsed = state.collapseState[targetId] ?? false;
    if (collapsed) applyCollapse(targetId, true);
    btn.addEventListener('click', () => toggleCollapse(targetId));
  });

  // Also clicking the header row toggles
  document.querySelectorAll('.below-card-hdr, .right-card-hdr').forEach(hdr => {
    hdr.addEventListener('click', e => {
      if (!e.target.closest('.collapse-btn')) {
        const targetId = hdr.dataset.target;
        if (targetId) toggleCollapse(targetId);
      }
    });
  });
}

function toggleCollapse(targetId) {
  const cur = state.collapseState[targetId] ?? false;
  state.collapseState[targetId] = !cur;
  localStorage.setItem('ss_collapse', JSON.stringify(state.collapseState));
  applyCollapse(targetId, !cur);
}

function applyCollapse(targetId, collapsed) {
  const el = $(targetId);
  if (!el) return;
  el.style.display = collapsed ? 'none' : '';
  const btn = document.querySelector(`.collapse-btn[data-target="${targetId}"]`);
  if (btn) btn.classList.toggle('rotated', collapsed);
}

// ── Overlays ──────────────────────────────────────────────────────────────────
function closeAllOverlays() {
  ['galeria-overlay','biblioteca-overlay','ajustes-overlay','cuaderno-overlay','compareModal'].forEach(id => {
    $(id)?.classList.add('hidden');
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'explorador'));
  history.replaceState(null,'',window.location.pathname);
}

function openViewByHash() {
  const hash = window.location.hash.replace('#','');
  if (!hash || hash === 'explorador') return;
  const btn = document.querySelector(`.nav-btn[data-view="${hash}"]`);
  if (btn) btn.click();
}

// ── Mode switching ────────────────────────────────────────────────────────────
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode)
  );
  if (mode === '360') {
    modelViewer.setAttribute('auto-rotate', '');
    modelViewer.setAttribute('rotation-per-second', '10deg');
    toast('Modo 360° activado — rotación automática');
  } else if (mode === 'AR') {
    if (modelViewer.canActivateAR) {
      modelViewer.activateAR();
      toast('Apunta tu cámara a una superficie plana');
    } else {
      toast('AR no disponible en este dispositivo');
      setMode('3D');
    }
  } else {
    if (state.autoRotate) modelViewer.setAttribute('auto-rotate', '');
    else modelViewer.removeAttribute('auto-rotate');
    modelViewer.setAttribute('rotation-per-second', '20deg');
  }
}

// ── Ajustes ───────────────────────────────────────────────────────────────────
function applyAjustes() {
  const savedStars = localStorage.getItem('ss_stars');
  if (savedStars === 'false') {
    state.starsOn = false;
    $('toggleStars').checked = false;
    if ($('ajusteStars')) $('ajusteStars').checked = false;
    starCanvas.style.display = 'none';
  }
  const savedHint = localStorage.getItem('ss_hint');
  if (savedHint === 'false') {
    $('viewerHint').style.display = 'none';
    if ($('ajusteHint')) $('ajusteHint').checked = false;
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
function setupEvents() {

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (view === 'explorador') { closeAllOverlays(); btn.classList.add('active'); }
      else if (view === 'galeria') {
        closeAllOverlays();
        buildGaleriaOverlay();
        $('galeria-overlay').classList.remove('hidden');
        btn.classList.add('active');
      }
      else if (view === 'studio') { window.location.href = './studio.html'; }
      else if (view === 'biblioteca') {
        closeAllOverlays();
        buildBiblioteca();
        $('biblioteca-overlay').classList.remove('hidden');
        btn.classList.add('active');
        history.replaceState(null,'','#biblioteca');
      }
      else if (view === 'cuaderno') {
        closeAllOverlays();
        openCuaderno();
        btn.classList.add('active');
        history.replaceState(null,'','#cuaderno');
      }
      else if (view === 'ajustes') {
        closeAllOverlays();
        $('ajustes-overlay').classList.remove('hidden');
        btn.classList.add('active');
        history.replaceState(null,'','#ajustes');
      }
    });
  });

  // Overlay closes
  $('closeGaleria').addEventListener('click', closeAllOverlays);
  $('closeBiblioteca').addEventListener('click', closeAllOverlays);
  $('closeCuaderno').addEventListener('click', closeAllOverlays);
  $('closeAjustes').addEventListener('click', closeAllOverlays);
  $('closeCompare').addEventListener('click', () => $('compareModal').classList.add('hidden'));

  // Cuaderno save/clear
  $('btnGuardarNota').addEventListener('click', () => {
    if (!state.currentBody) return;
    const val = $('cuadernoNota').value.trim();
    if (val) localStorage.setItem(`ss_nota_${state.currentBody.id}`, val);
    else localStorage.removeItem(`ss_nota_${state.currentBody.id}`);
    renderCuadernoTodas();
    toast('Nota guardada');
  });
  $('btnBorrarNota').addEventListener('click', () => {
    if (!state.currentBody) return;
    $('cuadernoNota').value = '';
    localStorage.removeItem(`ss_nota_${state.currentBody.id}`);
    renderCuadernoTodas();
    toast('Nota borrada');
  });
  $('compareModal').addEventListener('click', e => { if (e.target === e.currentTarget) $('compareModal').classList.add('hidden'); });

  // Backdrop click-to-close for full-screen overlays
  ['galeria-overlay','biblioteca-overlay','ajustes-overlay','cuaderno-overlay'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeAllOverlays(); });
  });

  // Mode tabs
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Star toggle
  $('toggleStars').addEventListener('change', e => {
    state.starsOn = e.target.checked;
    starCanvas.style.display = state.starsOn ? '' : 'none';
    localStorage.setItem('ss_stars', state.starsOn);
    if ($('ajusteStars')) $('ajusteStars').checked = state.starsOn;
    toast(state.starsOn ? 'Fondo estelar activado' : 'Fondo estelar desactivado');
  });

  // Viewer controls
  $('btnReset').addEventListener('click', () => {
    if (!state.currentBody) return;
    state.fov = 30;
    modelViewer.setAttribute('camera-orbit', state.currentBody.cameraOrbit);
    modelViewer.setAttribute('field-of-view', `${state.fov}deg`);
    modelViewer.resetTurntableRotation?.();
    toast('Vista restablecida');
  });
  $('btnZoomIn').addEventListener('click', () => {
    state.fov = Math.max(15, state.fov - 4);
    modelViewer.setAttribute('field-of-view', `${state.fov}deg`);
  });
  $('btnZoomOut').addEventListener('click', () => {
    state.fov = Math.min(50, state.fov + 4);
    modelViewer.setAttribute('field-of-view', `${state.fov}deg`);
  });
  $('btnAutoRotate').addEventListener('click', () => {
    state.autoRotate = !state.autoRotate;
    $('btnAutoRotate').classList.toggle('active', state.autoRotate);
    if (state.autoRotate) modelViewer.setAttribute('auto-rotate', '');
    else modelViewer.removeAttribute('auto-rotate');
  });
  $('btnFullscreen').addEventListener('click', () => {
    const stage = $('viewerStage');
    document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
  });

  // Compare
  $('compareA').addEventListener('change', renderCompareChips);
  $('compareB').addEventListener('change', renderCompareChips);
  $('btnOpenCompare').addEventListener('click', () => {
    renderCompareModal();
    $('compareModal').classList.remove('hidden');
  });

  // Gallery items (anatomy / ficha)
  $('anatCard').addEventListener('click', () => {
    if (!state.currentBody) return;
    $('lightboxImg').src = `../app-assets/anatomia/${state.currentBody.id}.png`;
    $('lightboxCaption').textContent = state.currentBody.importancia;
    $('lightbox').classList.remove('hidden');
  });
  $('fichaCard').addEventListener('click', () => {
    if (!state.currentBody) return;
    $('lightboxImg').src = `../app-assets/datos_importantes/${state.currentBody.id}.png`;
    $('lightboxCaption').textContent = state.currentBody.descripcion;
    $('lightbox').classList.remove('hidden');
  });

  // Lightbox
  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  document.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

  // Search
  searchInput.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.organ-item').forEach(item => {
      const name = item.querySelector('.organ-name').textContent.toLowerCase();
      item.style.display = name.includes(q) ? '' : 'none';
    });
    document.querySelectorAll('.list-section').forEach(sec => {
      const any = [...sec.querySelectorAll('.organ-item')].some(i => i.style.display !== 'none');
      sec.style.display = any ? '' : 'none';
    });
  });

  // Ajustes checkboxes
  $('ajusteStars')?.addEventListener('change', e => {
    $('toggleStars').checked = e.target.checked;
    $('toggleStars').dispatchEvent(new Event('change'));
  });
  $('ajusteAutoRotate')?.addEventListener('change', e => {
    state.autoRotate = e.target.checked;
    $('btnAutoRotate').classList.toggle('active', state.autoRotate);
    if (state.autoRotate) modelViewer.setAttribute('auto-rotate', '');
    else modelViewer.removeAttribute('auto-rotate');
  });
  $('ajusteHint')?.addEventListener('change', e => {
    $('viewerHint').style.display = e.target.checked ? '' : 'none';
    localStorage.setItem('ss_hint', e.target.checked);
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeAllOverlays();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => { init(); openViewByHash(); });
