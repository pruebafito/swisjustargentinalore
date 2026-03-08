/* ═══════════════════════════════════════════════════
   SWISS JUST ARGENTINA — Bot de Lore
   app.js — Lógica principal
═══════════════════════════════════════════════════ */

// ── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  adminPass:  'lore2025',
  waNumber:   '5492966508751',
  waMsg:      'Hola%20Lore!%20Vi%20tu%20bot%20y%20quiero%20consultar%20sobre%20productos%20Swiss%20Just%20%F0%9F%8C%BF',
  fbUrl:      'https://www.facebook.com/lorena.liffourrena',
  igUrl:      'https://www.instagram.com/lorena_liffourrena/',
  storeUrl:   'https://www.justargentina.com/lorenaliffourrena',
  catalogUrl: 'https://viewer.ipaper.io/swiss-just/america/catalogos-web/web-catalogo-argentina/',
  email:      'Liffourrenalorena@gmail.com',
  evKey:      'swjust_event_v3',
  regKey:     'swjust_regs_v3',
};

// ── ESTADO ────────────────────────────────────────────────────────────────
let aiHistory = [];
let isSending  = false;

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos Noa, la asistente virtual de Lore Liffourrena, Consultora oficial de Swiss Just Argentina.
Sos experta en aromaterapia, bienestar natural y cosmética suiza. Hablás en español rioplatense (vos, tenés, consultá).
Tono: cálido, cercano, como una amiga experta en bienestar. Respuestas cortas: máx 3-4 líneas.

CATÁLOGO COMPLETO (60 productos):
${CATALOG.map(p => `[ID:${p.id}] ${p.name} (${p.cat}): ${p.desc}. Tags: ${p.tags.slice(0,5).join(', ')}`).join('\n')}

SOBRE SWISS JUST:
- Marca suiza fundada en 1930. Productos 100% naturales con aceites esenciales y extractos alpinos.
- El Óleo 31 es el producto estrella: 31 aceites esenciales puros.
- Tienda online de Lore: https://www.justargentina.com/lorenaliffourrena

CONTACTO DE LORE:
- WhatsApp: +54 9 2966 50-8751
- Facebook: facebook.com/lorena.liffourrena
- Instagram: @lorena_liffourrena

REGLAS:
1. Siempre español rioplatense, tono cálido.
2. Para mostrar productos: [SHOW:id1,id2,id3,id4] (máx 4 IDs).
3. NUNCA menciones precios — Lore los informa personalmente.
4. Para compras y pedidos, dirigí siempre a la tienda o al WhatsApp de Lore.
5. No hagas afirmaciones médicas — usá lenguaje de bienestar natural.`;

// ── DOM ───────────────────────────────────────────────────────────────────
const $  = id  => document.getElementById(id);
const msgs = () => $('messages');

function scrollDown() {
  setTimeout(() => { msgs().scrollTop = msgs().scrollHeight; }, 50);
}

// ── RENDER MENSAJES ───────────────────────────────────────────────────────
function addBotMsg(html) {
  const wrap = document.createElement('div');
  wrap.className = 'msg bot';
  const av = document.createElement('div'); av.className = 'avatar'; av.textContent = '🌿';
  const bub = document.createElement('div'); bub.className = 'bubble'; bub.innerHTML = html;
  wrap.appendChild(av); wrap.appendChild(bub);
  msgs().appendChild(wrap); scrollDown();
}

function addUserMsg(text) {
  const wrap = document.createElement('div');
  wrap.className = 'msg user';
  const av = document.createElement('div'); av.className = 'avatar'; av.textContent = '👤';
  const bub = document.createElement('div'); bub.className = 'bubble'; bub.textContent = text;
  wrap.appendChild(av); wrap.appendChild(bub);
  msgs().appendChild(wrap); scrollDown();
}

function appendExtra(el) {
  const wrap = document.createElement('div'); wrap.className = 'msg bot';
  const bub = document.createElement('div'); bub.className = 'bubble';
  bub.style.cssText = 'background:transparent;border:none;padding:2px 0 0 36px;';
  bub.appendChild(el); wrap.appendChild(bub);
  msgs().appendChild(wrap); scrollDown();
}

function showTyping() {
  const wrap = document.createElement('div'); wrap.className = 'msg bot typing'; wrap.id = 'typing';
  const av = document.createElement('div'); av.className = 'avatar'; av.textContent = '🌿';
  const bub = document.createElement('div'); bub.className = 'bubble';
  bub.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
  wrap.appendChild(av); wrap.appendChild(bub); msgs().appendChild(wrap); scrollDown();
}
function removeTyping() { const t = $('typing'); if (t) t.remove(); }

// ── PRODUCT CARDS ──────────────────────────────────────────────────────────
function makeCards(ids) {
  const scroll = document.createElement('div'); scroll.className = 'product-scroll';
  ids.forEach(id => {
    const p = CATALOG.find(x => x.id === id); if (!p) return;
    const card = document.createElement('div');
    card.className = 'p-card'; card.setAttribute('data-card', p.id);
    card.innerHTML = `
      <div class="p-emoji">${p.emoji}</div>
      <div class="p-cat">${p.cat}</div>
      <div class="p-name">${p.name}</div>
      <div class="p-desc">${p.desc}</div>
      <button class="p-add" data-addcart="${p.id}" type="button">+ Ver más</button>`;
    scroll.appendChild(card);
  });
  return scroll;
}

// ── QUICK REPLIES ──────────────────────────────────────────────────────────
// Al tocar una opción: muestra tarjetas del catálogo + invitación a contactar Lore
const QR_MAP = {
  '🌿 ¿Qué es el Óleo 31?':         { ids:[1,2],         msg:'El <b>Óleo 31</b> es el producto ícono de Swiss Just — una fórmula suiza única con 31 aceites esenciales puros. Ideal para dolores de cabeza, circulación, músculos y mucho más 🌿' },
  '😌 Estrés y ansiedad':            { ids:[16,17,4,18],  msg:'Para el estrés y la ansiedad, Swiss Just tiene productos increíbles con aceites esenciales que calman la mente y el cuerpo de forma natural 🌿' },
  '🤕 Dolores musculares':           { ids:[23,24,25,28], msg:'Para dolores musculares y articulares, estos son los productos más recomendados por Lore. ¡Funcionan solos o combinados! 💪' },
  '😴 Mejorar el sueño':            { ids:[4,17,18,16],  msg:'Para dormir mejor de forma natural, la aromaterapia suiza es una solución maravillosa. Lavanda, Melisa y Sándalo son los favoritos 🌙' },
  '✨ Cuidado facial antiedad':      { ids:[52,53,54,56], msg:'La línea <b>Vital Just</b> es el tratamiento facial premium de Swiss Just — ingredientes suizos para una piel firme, luminosa y rejuvenecida ✨' },
  '🌬️ Resfriado y tos':            { ids:[20,21,3,22],  msg:'Para resfriados y problemas respiratorios, Swiss Just tiene soluciones naturales muy efectivas. El Eucasol es el más pedido en invierno 🌿' },
  '💆 Cuidado de la piel':          { ids:[31,33,36,37], msg:'Para el cuidado diario de la piel, cremas con extractos de plantas alpinas suizas que hidratan y nutren profundamente 🌸' },
  '💪 Deportes y actividad física': { ids:[23,24,25,26], msg:'Para el deporte, estos productos son los favoritos de quienes hacen ejercicio. Ideales antes y después del entrenamiento 💪' },
  '🦵 Piernas cansadas':            { ids:[41,46,44,42], msg:'Para piernas cansadas, pesadas o con mala circulación, la línea <b>Pedi</b> de Swiss Just es excelente 🦵' },
  '💇 Cuidado del cabello':         { ids:[47,49,50,48], msg:'Para el cuidado capilar, shampoos y tratamientos con ingredientes naturales para distintos tipos de cabello 💆' },
  '🧴 Anti-celulitis':              { ids:[57,58,59,60], msg:'La línea <b>Cellfit</b> está especialmente formulada para combatir la celulitis y reafirmar la piel de forma natural 💪' },
  '💬 Contactar a Lore':            { ids:null,           msg:null },
};

function makeQR(options) {
  const wrap = document.createElement('div'); wrap.className = 'quick-wrap';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'qr'; btn.type = 'button';
    btn.textContent = opt; btn.setAttribute('data-qr', opt);
    wrap.appendChild(btn);
  });
  return wrap;
}

function handleQR(opt) {
  if (opt.includes('Contactar') || opt.includes('Lore') || opt.includes('contactar')) {
    showContactMsg(); return;
  }
  const entry = QR_MAP[opt];
  if (!entry) { callAI(opt); return; }
  if (entry.msg) addBotMsg(entry.msg);
  if (entry.ids && entry.ids.length) appendExtra(makeCards(entry.ids));
  setTimeout(() => {
    addBotMsg(
      `¿Te interesa alguno? Consultá directamente con <b>Lore</b> 💬<br><br>` +
      `<a href="mailto:${CONFIG.email}" class="link-btn teal">✉️ Email de Lore</a>` +
      `&nbsp;&nbsp;<a href="${CONFIG.igUrl}" target="_blank" rel="noopener" class="link-btn purple">📸 Instagram</a>`
    );
  }, 200);
}

function showContactMsg() {
  addBotMsg(
    `Para consultas, precios y pedidos, contactá directamente a <b>Lore</b> 🌿<br><br>` +
    `<a href="https://wa.me/${CONFIG.waNumber}?text=${CONFIG.waMsg}" target="_blank" rel="noopener" class="link-btn teal">💬 WhatsApp: +54 9 2966 50-8751</a><br><br>` +
    `<a href="${CONFIG.fbUrl}" target="_blank" rel="noopener" style="color:var(--sage);font-weight:500">📘 Facebook: Lorena Liffourrena</a><br>` +
    `<a href="${CONFIG.igUrl}" target="_blank" rel="noopener" style="color:var(--sage);font-weight:500">📸 Instagram: @lorena_liffourrena</a><br><br>` +
    `¡Te asesora sin compromiso y con todo el cariño! 🌿`
  );
}

// ── CLAUDE AI ─────────────────────────────────────────────────────────────
async function callAI(userMsg) {
  aiHistory.push({ role: 'user', content: userMsg });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'sk-ant-TU_KEY_AQUI',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:     SYSTEM_PROMPT,
      messages:   aiHistory,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data  = await res.json();
  const reply = data.content.map(b => b.text || '').join('');
  aiHistory.push({ role: 'assistant', content: reply });
  return reply;
}

function parseAIResponse(raw) {
  let text = raw;
  const showMatch = text.match(/\[SHOW:([\d,]+)\]/);
  if (showMatch) {
    const ids = showMatch[1].split(',').map(Number).filter(id => CATALOG.find(p => p.id === id));
    if (ids.length) appendExtra(makeCards(ids));
    text = text.replace(showMatch[0], '').trim();
  }
  if (text.trim()) addBotMsg(text.trim());
}

// ── SEND MESSAGE ──────────────────────────────────────────────────────────
async function sendMsg(override) {
  if (isSending) return;
  const input = $('userInput');
  const text  = (override || input.value).trim();
  if (!text) return;
  input.value = '';
  isSending = true; $('sendBtn').disabled = true;
  addUserMsg(text);

  const t = text.toLowerCase();

  // Comandos locales
  if (t.includes('contactar') || t.includes('whatsapp') || t.includes('instagram') || t.includes('facebook') || t.includes('precio') || t.includes('comprar') || t.includes('pedir')) {
    showContactMsg();
    isSending = false; $('sendBtn').disabled = false; return;
  }

  // IA
  showTyping();
  try {
    const reply = await callAI(text);
    removeTyping(); parseAIResponse(reply);
  } catch(e) {
    removeTyping();
    addBotMsg(`Disculpá, hubo un problema de conexión. Podés contactar directamente a <b>Lore</b> 💬<br><br><a href="https://wa.me/${CONFIG.waNumber}?text=${CONFIG.waMsg}" target="_blank" class="link-btn teal">💬 WhatsApp de Lore</a>`);
  }
  isSending = false; $('sendBtn').disabled = false;
}

// ── EVENTO ────────────────────────────────────────────────────────────────
function loadEvent() {
  try {
    const ev = JSON.parse(localStorage.getItem(CONFIG.evKey) || 'null');
    if (!ev || !ev.active) return;
    $('eventBtn').style.display = 'flex';
    if (ev.title)    { $('eventBtnTxt').textContent = `🎉 ${ev.title}`; $('evTitle').textContent = ev.title; }
    if (ev.desc)       $('evDesc').textContent = ev.desc;
    if (ev.date) {
      const fmt = new Date(ev.date).toLocaleString('es-AR', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' });
      $('evDate').textContent = `📅 ${fmt}`; $('cDate').textContent = fmt;
    }
    if (ev.platform) { $('evPlatform').textContent = `📱 ${ev.platform}`; $('cPlatform').textContent = ev.platform; }
  } catch(e) {}
}

function showPanel(id) {
  ['panelInfo','panelForm','panelConfirm'].forEach(p => { const el = $(p); if (el) el.style.display = p === id ? 'block' : 'none'; });
}
function openEvent()  { showPanel('panelInfo'); $('eventOverlay').classList.add('open'); }
function closeEvent() { $('eventOverlay').classList.remove('open'); }

function submitForm() {
  const name  = $('fName').value.trim();
  const phone = $('fPhone').value.trim();
  if (!name || !phone) { alert('Por favor completá nombre y WhatsApp 🙏'); return; }
  try {
    const regs = JSON.parse(localStorage.getItem(CONFIG.regKey) || '[]');
    regs.push({ name, phone, email: $('fEmail').value.trim(), source: $('fSource').value, accept: $('fAccept').checked, date: new Date().toLocaleString('es-AR') });
    localStorage.setItem(CONFIG.regKey, JSON.stringify(regs));
  } catch(e) {}
  showPanel('panelConfirm');
  addBotMsg(`🎉 ¡<b>${name}</b>, ya estás inscripta y entraste al sorteo! Lore te va a contactar por WhatsApp. ¡Nos vemos en el live! 🌿`);
}

// ── ADMIN ─────────────────────────────────────────────────────────────────
function openAdmin()  { $('adminLock').style.display='block'; $('adminPanel').style.display='none'; $('adminPass').value=''; $('adminErr').style.display='none'; $('adminOverlay').classList.add('open'); }
function closeAdmin() { $('adminOverlay').classList.remove('open'); }

function adminLogin() {
  if ($('adminPass').value === CONFIG.adminPass) {
    $('adminLock').style.display = 'none'; $('adminPanel').style.display = 'block'; loadAdminPanel();
  } else { $('adminErr').style.display = 'block'; }
}

function loadAdminPanel() {
  try {
    const ev = JSON.parse(localStorage.getItem(CONFIG.evKey) || 'null');
    if (ev) {
      if (ev.title)    $('aTitle').value    = ev.title;
      if (ev.desc)     $('aDesc').value     = ev.desc;
      if (ev.date)     $('aDate').value     = ev.date;
      if (ev.platform) $('aPlatform').value = ev.platform;
      if (ev.link)     $('aLink').value     = ev.link;
      $('aActive').checked = !!ev.active;
    }
    const regs = JSON.parse(localStorage.getItem(CONFIG.regKey) || '[]');
    $('regCount').textContent = regs.length;
    $('regList').innerHTML = regs.length
      ? regs.map((r,i) => `<div style="border-bottom:1px solid #f0ebe0;padding:3px 0"><b>${i+1}. ${r.name}</b> — ${r.phone}${r.email ? ' · '+r.email : ''} <span style="color:#aaa;font-size:10.5px">(${r.date})</span></div>`).join('')
      : '<em>Aún no hay inscriptas.</em>';
  } catch(e) {}
}

function saveEvent() {
  const ev = { title: $('aTitle').value.trim(), desc: $('aDesc').value.trim(), date: $('aDate').value, platform: $('aPlatform').value, link: $('aLink').value.trim(), active: $('aActive').checked };
  localStorage.setItem(CONFIG.evKey, JSON.stringify(ev));
  $('adminOk').style.display = 'block';
  setTimeout(() => { $('adminOk').style.display = 'none'; closeAdmin(); loadEvent(); }, 1400);
}

function exportCSV() {
  try {
    const regs = JSON.parse(localStorage.getItem(CONFIG.regKey) || '[]');
    if (!regs.length) { alert('No hay inscriptas aún.'); return; }
    const csv = ['Nombre,WhatsApp,Email,Cómo conoció a Lore,Fecha,Acepta comunicaciones',
      ...regs.map(r => `"${r.name}","${r.phone}","${r.email}","${r.source}","${r.date}","${r.accept?'Sí':'No'}"`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'inscriptas-swiss-just.csv'; a.click();
  } catch(e) { alert('Error al exportar.'); }
}

// ── BIENVENIDA ────────────────────────────────────────────────────────────
function welcome() {
  setTimeout(() => {
    addBotMsg(
      `¡Hola! Soy <b>Noa</b> 🌿, la asistente de <b>Lore Liffourrena</b>, Consultora oficial Swiss Just Argentina.<br><br>` +
      `Podés preguntarme sobre nuestros productos naturales suizos, o ir directo a la ` +
      `<a href="${CONFIG.catalogUrl}" target="_blank" rel="noopener" style="color:var(--sage);font-weight:500">catálogo de productos</a> ` +
      `para registrarte y comenzar a disfrutar. ¿En qué te puedo ayudar?`
    );
    setTimeout(() => {
      appendExtra(makeQR([
        '🌿 ¿Qué es el Óleo 31?',
        '😌 Estrés y ansiedad',
        '🤕 Dolores musculares',
        '😴 Mejorar el sueño',
        '✨ Cuidado facial antiedad',
        '🌬️ Resfriado y tos',
        '💆 Cuidado de la piel',
        '💪 Deportes y actividad física',
        '🦵 Piernas cansadas',
        '💇 Cuidado del cabello',
        '🧴 Anti-celulitis',
        '💬 Contactar a Lore',
      ]));
    }, 350);
  }, 400);
}

// ── EVENT DELEGATION (un solo listener para todo) ─────────────────────────
document.addEventListener('click', function(e) {

  // Quick replies
  const qr = e.target.closest('[data-qr]');
  if (qr && !qr.hasAttribute('data-addcart') && !qr.hasAttribute('data-card') && !qr.hasAttribute('data-action')) {
    e.preventDefault();
    const opt = qr.getAttribute('data-qr');
    const wrap = qr.closest('.quick-wrap');
    if (wrap) wrap.querySelectorAll('[data-qr]').forEach(b => { b.disabled = true; b.style.opacity = '0.48'; });
    addUserMsg(opt);
    handleQR(opt);
    return;
  }

  // Botón añadir en tarjeta → abre WhatsApp de Lore con el producto mencionado
  const addBtn = e.target.closest('[data-addcart]');
  if (addBtn) {
    e.preventDefault(); e.stopPropagation();
    const id = parseInt(addBtn.getAttribute('data-addcart'));
    const p  = CATALOG.find(x => x.id === id);
    if (p) {
      const msg = encodeURIComponent(`Hola Lore! Me interesa el producto: ${p.name} 🌿`);
      window.open(`https://wa.me/${CONFIG.waNumber}?text=${msg}`, '_blank');
    }
    return;
  }

  // Click en tarjeta → consulta a la IA
  const card = e.target.closest('[data-card]');
  if (card && !e.target.closest('[data-addcart]')) {
    e.preventDefault();
    const p = CATALOG.find(x => x.id === parseInt(card.getAttribute('data-card')));
    if (p) sendMsg(`Contame más sobre ${p.name}`);
    return;
  }

  // Acciones de modales
  const action = e.target.closest('[data-action]');
  if (action) {
    e.preventDefault();
    switch(action.getAttribute('data-action')) {
      case 'showForm':   showPanel('panelForm');  break;
      case 'submitForm': submitForm();             break;
      case 'backInfo':   showPanel('panelInfo');  break;
      case 'closeEvent': closeEvent();            break;
      case 'adminLogin': adminLogin();            break;
      case 'saveEvent':  saveEvent();             break;
      case 'exportCSV':  exportCSV();             break;
    }
    return;
  }

  // Cerrar modales al click en el fondo
  if (e.target.id === 'eventOverlay') { closeEvent(); return; }
  if (e.target.id === 'adminOverlay') { closeAdmin(); return; }

}, true); // useCapture = true — máxima compatibilidad cross-browser/mobile

// ── KEYBOARD ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.activeElement === $('userInput'))  sendMsg();
  if (e.key === 'Enter' && document.activeElement === $('adminPass'))  adminLogin();
  if (e.key === 'Escape') { closeEvent(); closeAdmin(); }
});

// ── BOTONES DIRECTOS ──────────────────────────────────────────────────────
$('sendBtn').addEventListener('click', () => sendMsg());
$('eventBtn').addEventListener('click', openEvent);
$('closeEvent').addEventListener('click', closeEvent);
$('closeAdmin').addEventListener('click', closeAdmin);
$('adminAccess').addEventListener('click', openAdmin);

// ── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => { loadEvent(); welcome(); });
