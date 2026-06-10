/**
 * generate_assets.mjs
 * Genera con Playwright:
 *  - app-assets/anatomia/        → diagramas de estructura interna (600×480)
 *  - app-assets/datos_importantes/ → fichas visuales de datos (640×420)
 *  - app-assets/identidad/       → logo y favicon (SVG + PNG)
 * Y descarga:
 *  - app-assets/imagenes/        → fotos panorámicas 16:9 de NASA
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { createWriteStream } from 'fs';
import { get as httpsGet } from 'https';

// ─── DATOS DE ESTRUCTURA INTERNA ──────────────────────────────────────────────
const ESTRUCTURA = {
  sol: {
    titulo: 'El Sol — Estructura Interna',
    capas: [
      { nombre: 'Núcleo',            grosor: '0 – 175.000 km',    color: '#FF2200', pct: 25 },
      { nombre: 'Zona Radiactiva',   grosor: '175.000 – 496.000 km', color: '#FF5500', pct: 45 },
      { nombre: 'Zona Convectiva',   grosor: '496.000 – 696.000 km', color: '#FF8800', pct: 28 },
      { nombre: 'Fotosfera',         grosor: '~500 km',            color: '#FFD000', pct: 1 },
      { nombre: 'Cromosfera/Corona', grosor: '2.000+ km',          color: '#FFF0A0', pct: 1 },
    ]
  },
  mercurio: {
    titulo: 'Mercurio — Estructura Interna',
    capas: [
      { nombre: 'Núcleo de Hierro',  grosor: '0 – 2.000 km (85% del radio)', color: '#8B8B8B', pct: 60 },
      { nombre: 'Manto Silicato',    grosor: '2.000 – 2.400 km',  color: '#C0A060', pct: 30 },
      { nombre: 'Corteza',           grosor: '~100 km',            color: '#D4C0A0', pct: 10 },
    ]
  },
  venus: {
    titulo: 'Venus — Estructura Interna',
    capas: [
      { nombre: 'Núcleo de Hierro',  grosor: '0 – 3.000 km',      color: '#B85020', pct: 50 },
      { nombre: 'Manto',             grosor: '3.000 – 5.900 km',   color: '#D08040', pct: 40 },
      { nombre: 'Corteza',           grosor: '~30 km',             color: '#E8C888', pct: 5 },
      { nombre: 'Atmósfera (CO₂)',   grosor: '~250 km',            color: '#F0D878', pct: 5 },
    ]
  },
  tierra: {
    titulo: 'Tierra — Estructura Interna',
    capas: [
      { nombre: 'Núcleo Sólido (Fe-Ni)',  grosor: '5.150 – 6.371 km',  color: '#B0B0B0', pct: 19 },
      { nombre: 'Núcleo Líquido (Fe-Ni)', grosor: '2.890 – 5.150 km',  color: '#808080', pct: 35 },
      { nombre: 'Manto Inferior',         grosor: '660 – 2.890 km',    color: '#C06030', pct: 30 },
      { nombre: 'Manto Superior',         grosor: '70 – 660 km',       color: '#D08050', pct: 12 },
      { nombre: 'Corteza',                grosor: '0 – 70 km',         color: '#8BA870', pct: 4 },
    ]
  },
  luna: {
    titulo: 'Luna — Estructura Interna',
    capas: [
      { nombre: 'Núcleo Sólido (Fe)',  grosor: '0 – 240 km',     color: '#B0B0C0', pct: 14 },
      { nombre: 'Núcleo Líquido',      grosor: '240 – 330 km',   color: '#909090', pct: 10 },
      { nombre: 'Manto Inferior',      grosor: '330 – 1.000 km', color: '#A08060', pct: 40 },
      { nombre: 'Manto Superior',      grosor: '1.000 – 1.700 km', color: '#C0A080', pct: 25 },
      { nombre: 'Corteza',             grosor: '~60 km',          color: '#D0C0B0', pct: 11 },
    ]
  },
  marte: {
    titulo: 'Marte — Estructura Interna',
    capas: [
      { nombre: 'Núcleo (Fe-S)',    grosor: '0 – 1.700 km',     color: '#A05050', pct: 50 },
      { nombre: 'Manto',           grosor: '1.700 – 3.000 km',  color: '#C07050', pct: 38 },
      { nombre: 'Corteza',         grosor: '~60 km',            color: '#D09070', pct: 7 },
      { nombre: 'Atmósfera',       grosor: '~11 km efectivos',  color: '#E0A878', pct: 5 },
    ]
  },
  jupiter: {
    titulo: 'Júpiter — Estructura Interna',
    capas: [
      { nombre: 'Núcleo Rocoso/Hielo',      grosor: '0 – 15.000 km',     color: '#806040', pct: 10 },
      { nombre: 'Hidrógeno Metálico',        grosor: '15.000 – 55.000 km', color: '#C06820', pct: 37 },
      { nombre: 'Hidrógeno Molecular',       grosor: '55.000 – 68.000 km', color: '#D89050', pct: 37 },
      { nombre: 'Capa de Nubes',             grosor: '~1.000 km',          color: '#E8C888', pct: 16 },
    ]
  },
  saturno: {
    titulo: 'Saturno — Estructura Interna',
    capas: [
      { nombre: 'Núcleo Rocoso/Hielo',      grosor: '0 – 10.000 km',     color: '#806040', pct: 10 },
      { nombre: 'Hidrógeno Metálico',        grosor: '10.000 – 30.000 km', color: '#C09040', pct: 35 },
      { nombre: 'Hidrógeno Molecular',       grosor: '30.000 – 57.000 km', color: '#D8B870', pct: 38 },
      { nombre: 'Capa de Nubes',             grosor: '~1.000 km',          color: '#F0DCA0', pct: 17 },
    ]
  },
  urano: {
    titulo: 'Urano — Estructura Interna',
    capas: [
      { nombre: 'Núcleo Rocoso (Silicato)',  grosor: '0 – 8.000 km',      color: '#607080', pct: 20 },
      { nombre: 'Manto de Hielo (H₂O, NH₃, CH₄)', grosor: '8.000 – 24.000 km', color: '#406090', pct: 60 },
      { nombre: 'Atmósfera (H₂, He, CH₄)',  grosor: '~8.000 km',          color: '#80D0D8', pct: 20 },
    ]
  },
  neptuno: {
    titulo: 'Neptuno — Estructura Interna',
    capas: [
      { nombre: 'Núcleo Rocoso (Silicato)',  grosor: '0 – 8.000 km',      color: '#405080', pct: 20 },
      { nombre: 'Manto de Hielo (H₂O, NH₃, CH₄)', grosor: '8.000 – 23.000 km', color: '#304070', pct: 60 },
      { nombre: 'Atmósfera (H₂, He, CH₄)',  grosor: '~7.000 km',          color: '#4060A0', pct: 20 },
    ]
  },
  pluton: {
    titulo: 'Plutón — Estructura Interna',
    capas: [
      { nombre: 'Núcleo Rocoso',            grosor: '0 – 850 km',  color: '#907060', pct: 55 },
      { nombre: 'Océano de Agua (Posible)', grosor: '~100 km',     color: '#405070', pct: 10 },
      { nombre: 'Corteza de Hielo (H₂O)',   grosor: '~300 km',     color: '#A0B8C8', pct: 25 },
      { nombre: 'Capas de N₂, CO, CH₄',    grosor: '~4 km',       color: '#D8E8F0', pct: 10 },
    ]
  },
};

// ─── DATOS PARA FICHAS VISUALES ──────────────────────────────────────────────
const FICHAS = {
  sol:      { color: '#FDB813', icono: '☀️', categoria: 'Estrella',         stats: [['Diámetro','1.392.700 km'],['Masa','1,989 × 10³⁰ kg'],['Temp. Sup.','5.500 °C'],['Temp. Corona','~2.000.000 °C'],['Rotación','25–35 días'],['Edad','4.600 Ma']] },
  mercurio: { color: '#9E9080', icono: '🪨', categoria: 'Planeta Rocoso',    stats: [['Diámetro','4.879 km'],['Masa','3,30 × 10²³ kg'],['Temp. Máx.','430 °C'],['Temp. Mín.','-180 °C'],['Órbita','88 días'],['Lunas','0']] },
  venus:    { color: '#E8C87A', icono: '🌡️', categoria: 'Planeta Rocoso',   stats: [['Diámetro','12.104 km'],['Masa','4,87 × 10²⁴ kg'],['Temperatura','465 °C'],['Presión Atm.','92 bar'],['Órbita','225 días'],['Lunas','0']] },
  tierra:   { color: '#3B78C3', icono: '🌍', categoria: 'Planeta Rocoso',   stats: [['Diámetro','12.742 km'],['Masa','5,97 × 10²⁴ kg'],['Temperatura','15 °C'],['Atmósfera','N₂ 78%, O₂ 21%'],['Órbita','365,25 días'],['Lunas','1']] },
  luna:     { color: '#B8B0A5', icono: '🌕', categoria: 'Satélite Natural', stats: [['Diámetro','3.474 km'],['Masa','7,35 × 10²² kg'],['Temp. Día','127 °C'],['Temp. Noche','-173 °C'],['Órbita Tierra','27,3 días'],['Dist. Tierra','384.400 km']] },
  marte:    { color: '#C1440E', icono: '🔴', categoria: 'Planeta Rocoso',   stats: [['Diámetro','6.779 km'],['Masa','6,39 × 10²³ kg'],['Temperatura','-65 °C'],['Atmósfera','CO₂ 95%'],['Órbita','687 días'],['Lunas','2']] },
  jupiter:  { color: '#C88B3A', icono: '🪐', categoria: 'Gigante Gaseoso', stats: [['Diámetro','139.820 km'],['Masa','1,90 × 10²⁷ kg'],['Temperatura','-108 °C'],['Rotación','9 h 55 min'],['Órbita','11,86 años'],['Lunas','95']] },
  saturno:  { color: '#E8D5A0', icono: '💫', categoria: 'Gigante Gaseoso', stats: [['Diámetro','116.460 km'],['Masa','5,68 × 10²⁶ kg'],['Temperatura','-138 °C'],['Rotación','10 h 34 min'],['Órbita','29,45 años'],['Lunas','146']] },
  urano:    { color: '#7DE8E8', icono: '🔵', categoria: 'Gigante de Hielo', stats: [['Diámetro','50.724 km'],['Masa','8,68 × 10²⁵ kg'],['Temperatura','-195 °C'],['Inclinación Eje','97,77°'],['Órbita','84 años'],['Lunas','27']] },
  neptuno:  { color: '#3F54BA', icono: '🌊', categoria: 'Gigante de Hielo', stats: [['Diámetro','49.244 km'],['Masa','1,02 × 10²⁶ kg'],['Temperatura','-200 °C'],['Vientos Máx.','2.100 km/h'],['Órbita','164,8 años'],['Lunas','16']] },
  pluton:   { color: '#C4A882', icono: '❄️', categoria: 'Planeta Enano',  stats: [['Diámetro','2.377 km'],['Masa','1,30 × 10²² kg'],['Temperatura','-229 °C'],['Atmósfera','N₂, CH₄, CO'],['Órbita','248 años'],['Lunas','5']] },
};

// ─── NOMBRES EN ESPAÑOL ───────────────────────────────────────────────────────
const NOMBRES = {
  sol:'Sol', mercurio:'Mercurio', venus:'Venus', tierra:'Tierra', luna:'Luna',
  marte:'Marte', jupiter:'Júpiter', saturno:'Saturno', urano:'Urano', neptuno:'Neptuno', pluton:'Plutón'
};

// ─── HTML TEMPLATES ───────────────────────────────────────────────────────────

function htmlAnatomia(id, data) {
  const capas = data.capas;
  const total = capas.reduce((s, c) => s + c.pct, 0);
  let acc = 0;

  // SVG arcs for half-circle cross section
  const cx = 200, cy = 240, rMax = 190;
  let svgArcs = '';
  // Draw from outside in
  const reversed = [...capas].reverse();
  let runPct = 100;
  for (const capa of reversed) {
    const r = rMax * Math.sqrt(runPct / 100);
    svgArcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${capa.color}" />`;
    runPct -= capa.pct;
  }

  // Clip half
  const legend = capas.map((c, i) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:14px;height:14px;border-radius:3px;background:${c.color};flex-shrink:0"></div>
      <div>
        <div style="font-size:12px;font-weight:600;color:#dde6f4">${c.nombre}</div>
        <div style="font-size:10px;color:#5a7090">${c.grosor}</div>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 600px; height: 480px; background: #06090f;
    font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; }
  .wrap { display: flex; width: 600px; height: 480px; }
  .left { width: 400px; height: 480px; position: relative; }
  .right { flex: 1; padding: 24px 16px; display: flex; flex-direction: column; justify-content: center; }
  h2 { font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: #4fc3f7; margin-bottom: 16px; }
  svg { width: 400px; height: 480px; }
  .grad { position: absolute; top:0; right:0; width:60px; height:480px;
    background: linear-gradient(to right, transparent, #06090f); }
</style>
</head><body>
<div class="wrap">
  <div class="left">
    <svg viewBox="0 0 400 480" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="half">
          <rect x="200" y="0" width="400" height="480"/>
        </clipPath>
        <!-- star field -->
        ${Array.from({length:60},(_,i)=>{
          const x=Math.random()*400, y=Math.random()*480, r=Math.random()*1+0.3;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="white" opacity="${(0.2+Math.random()*0.5).toFixed(2)}"/>`;
        }).join('')}
      </defs>
      <g clip-path="url(#half)">
        ${svgArcs}
        <!-- radius lines -->
        <line x1="${cx}" y1="${cy}" x2="${cx + rMax}" y2="${cy}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      </g>
      <!-- vertical cut line -->
      <line x1="${cx}" y1="${cy - rMax - 10}" x2="${cx}" y2="${cy + rMax + 10}"
        stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="4,4"/>
      <!-- center dot -->
      <circle cx="${cx}" cy="${cy}" r="3" fill="white" opacity="0.6"/>
      <!-- title -->
      <text x="20" y="32" font-family="Segoe UI,sans-serif" font-size="13"
        font-weight="700" fill="#4fc3f7" letter-spacing="1">${data.titulo.toUpperCase()}</text>
      <text x="20" y="50" font-family="Segoe UI,sans-serif" font-size="10"
        fill="#4a6080" letter-spacing="0.5">CORTE TRANSVERSAL</text>
    </svg>
    <div class="grad"></div>
  </div>
  <div class="right">
    <h2>Capas</h2>
    ${legend}
  </div>
</div>
</body></html>`;
}

function htmlFicha(id, data) {
  const rows = data.stats.map(([k, v]) => `
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
      border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:3px">
      <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#4a6080;font-weight:600">${k}</div>
      <div style="font-size:14px;font-weight:700;color:#dde6f4;line-height:1.2">${v}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 640px; height: 420px; background: #06090f;
    font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; }
</style>
</head><body>
<div style="width:640px;height:420px;position:relative;overflow:hidden">

  <!-- Space background stars -->
  <svg style="position:absolute;inset:0;width:640px;height:420px" xmlns="http://www.w3.org/2000/svg">
    ${Array.from({length:80},()=>{
      const x=(Math.random()*640).toFixed(1), y=(Math.random()*420).toFixed(1);
      const r=(Math.random()*0.9+0.2).toFixed(1), o=(0.1+Math.random()*0.4).toFixed(2);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${o}"/>`;
    }).join('')}
  </svg>

  <!-- Accent glow -->
  <div style="position:absolute;top:-80px;left:-80px;width:300px;height:300px;
    border-radius:50%;background:radial-gradient(circle,${data.color}22,transparent 70%);pointer-events:none"></div>

  <!-- Content -->
  <div style="position:relative;z-index:2;padding:28px 32px">
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px">
      <div style="font-size:36px;line-height:1">${data.icono}</div>
      <div>
        <div style="font-size:26px;font-weight:800;color:#dde6f4;line-height:1">${NOMBRES[id]}</div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
          color:${data.color};margin-top:4px">${data.categoria}</div>
      </div>
      <div style="margin-left:auto;font-size:9px;font-weight:700;letter-spacing:1.5px;
        text-transform:uppercase;color:#2a3a50;padding:4px 10px;border:1px solid #1c2d50;
        border-radius:4px">NASA / DATOS CLAVE</div>
    </div>

    <!-- Accent line -->
    <div style="height:2px;background:linear-gradient(to right,${data.color},transparent);
      margin-bottom:18px;border-radius:1px"></div>

    <!-- Stats grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      ${rows}
    </div>
  </div>
</div>
</body></html>`;
}

// ─── LOGO SVG ─────────────────────────────────────────────────────────────────
const logoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="70" viewBox="0 0 280 70">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4fc3f7"/>
      <stop offset="100%" stop-color="#ffd54f"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd54f"/>
      <stop offset="100%" stop-color="#ff8f00"/>
    </radialGradient>
  </defs>
  <rect width="280" height="70" fill="#06090f" rx="8"/>
  <!-- Orbits -->
  <ellipse cx="36" cy="35" rx="28" ry="28" fill="none" stroke="#1c2d50" stroke-width="1.2"/>
  <ellipse cx="36" cy="35" rx="20" ry="20" fill="none" stroke="#1c2d50" stroke-width="1.2"/>
  <ellipse cx="36" cy="35" rx="12" ry="12" fill="none" stroke="#1c2d50" stroke-width="1.2"/>
  <!-- Sun -->
  <circle cx="36" cy="35" r="6" fill="url(#sun)"/>
  <!-- Planets -->
  <circle cx="56" cy="35" r="3" fill="#3B78C3"/>
  <circle cx="36" cy="55" r="2" fill="#C1440E"/>
  <circle cx="16" cy="38" r="2.5" fill="#E8D5A0"/>
  <!-- Text -->
  <text x="74" y="28" font-family="Segoe UI,sans-serif" font-size="16" font-weight="800"
    fill="url(#g1)" letter-spacing="1">SISTEMA SOLAR</text>
  <text x="74" y="50" font-family="Segoe UI,sans-serif" font-size="13" font-weight="400"
    fill="#4a6080" letter-spacing="3">STUDIO</text>
  <!-- Divider -->
  <line x1="74" y1="33" x2="264" y2="33" stroke="#1c2d50" stroke-width="0.8"/>
</svg>`;

const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#06090f" rx="6"/>
  <circle cx="16" cy="16" r="12" fill="none" stroke="#1c2d50" stroke-width="1"/>
  <circle cx="16" cy="16" r="8"  fill="none" stroke="#1c2d50" stroke-width="1"/>
  <circle cx="16" cy="16" r="4"  fill="none" stroke="#1c2d50" stroke-width="1"/>
  <circle cx="16" cy="16" r="3.5" fill="#ffd54f"/>
  <circle cx="24" cy="16" r="2.2" fill="#3B78C3"/>
  <circle cx="16" cy="24" r="1.5" fill="#C1440E"/>
  <ellipse cx="12" cy="14" rx="7" ry="2.5" fill="none" stroke="#E8D5A0" stroke-width="1.2" transform="rotate(-30,12,14)"/>
</svg>`;

// ─── DESCARGA IMÁGENES 16:9 ────────────────────────────────────────────────────
function download(url, dest) {
  return new Promise((res, rej) => {
    function attempt(u) {
      httpsGet(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
          return attempt(r.headers.location);
        const f = createWriteStream(dest);
        r.pipe(f);
        f.on('finish', () => f.close(res));
        f.on('error', rej);
      }).on('error', rej);
    }
    attempt(url);
  });
}

function nasaSearch(q) {
  return new Promise((res, rej) => {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image&page_size=5`;
    httpsGet(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const json = JSON.parse(d);
          const items = json?.collection?.items ?? [];
          // prefer large items
          for (const item of items) {
            const href = item.links?.find(l => l.rel === 'preview' || l.href?.includes('thumb'))?.href;
            if (href) { res(href); return; }
          }
          res(null);
        } catch(e) { rej(e); }
      });
    }).on('error', rej);
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();

const IDS = Object.keys(ESTRUCTURA);

// 1. Anatomy diagrams
console.log('\n── Generando diagramas de anatomía...');
for (const id of IDS) {
  process.stdout.write(`  ${id}.png ... `);
  const html = htmlAnatomia(id, ESTRUCTURA[id]);
  await page.setViewportSize({ width: 600, height: 480 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `app-assets/anatomia/${id}.png`, clip: { x:0,y:0,width:600,height:480 } });
  console.log('OK');
}

// 2. Data infographic cards
console.log('\n── Generando fichas de datos...');
for (const id of IDS) {
  process.stdout.write(`  ${id}.png ... `);
  const html = htmlFicha(id, FICHAS[id]);
  await page.setViewportSize({ width: 640, height: 420 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `app-assets/datos_importantes/${id}.png`, clip: { x:0,y:0,width:640,height:420 } });
  console.log('OK');
}

await browser.close();

// 3. Identity assets (SVG, no browser needed)
console.log('\n── Generando identidad...');
writeFileSync('app-assets/identidad/logo.svg', logoSVG);
writeFileSync('app-assets/identidad/favicon.svg', faviconSVG);
console.log('  logo.svg OK\n  favicon.svg OK');

// 4. Panoramic 16:9 images
console.log('\n── Descargando imágenes panorámicas...');
const panoramas = [
  { id: 'sol',      q: 'solar corona SDO sun full disk' },
  { id: 'mercurio', q: 'Mercury surface MESSENGER crater' },
  { id: 'venus',    q: 'Venus atmosphere clouds planet' },
  { id: 'tierra',   q: 'Earth from space blue marble ISS' },
  { id: 'luna',     q: 'Moon surface Apollo landscape' },
  { id: 'marte',    q: 'Mars surface panorama rover landscape' },
  { id: 'jupiter',  q: 'Jupiter clouds great red spot Juno' },
  { id: 'saturno',  q: 'Saturn rings Cassini wide' },
  { id: 'urano',    q: 'Uranus planet Voyager blue' },
  { id: 'neptuno',  q: 'Neptune planet Voyager 2' },
  { id: 'pluton',   q: 'Pluto New Horizons landscape' },
];

for (const p of panoramas) {
  const dest = `app-assets/imagenes/${p.id}.jpg`;
  process.stdout.write(`  ${p.id}.jpg ... `);
  try {
    const url = await nasaSearch(p.q);
    if (!url) { console.log('no URL'); continue; }
    await download(url, dest);
    const sz = statSync(dest).size;
    if (sz < 3000) { unlinkSync(dest); console.log('FAIL'); }
    else console.log(`OK (${(sz/1024).toFixed(0)}KB)`);
  } catch(e) { console.log(`ERR: ${e.message}`); }
}

console.log('\n✅ Todos los assets generados.\n');
