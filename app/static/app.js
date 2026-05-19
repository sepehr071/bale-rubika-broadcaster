const PLATFORM_LABEL = window.PLATFORM_LABEL;
const el = window.el;
const cleanError = window.cleanError;

const BROADCAST_TYPES = new Set(['group', 'supergroup', 'channel', 'Group', 'Channel']);
const SELECTION = new Set();

function chatTypeLabel(t) {
  switch ((t || '').toLowerCase()) {
    case 'group': return 'گروه';
    case 'supergroup': return 'سوپرگروه';
    case 'channel': return 'کانال';
    case 'private': case 'user': return 'خصوصی';
    case 'bot': return 'بات';
    default: return t || 'نامشخص';
  }
}

function updateSelectionUI() {
  const count = SELECTION.size;
  const countEl = document.getElementById('selectedCount');
  if (countEl) countEl.textContent = String(count);
  const sendBtn = document.getElementById('send');
  if (sendBtn) {
    sendBtn.disabled = count === 0;
    sendBtn.textContent = count === 0 ? 'مقصدی انتخاب نشده' : `ارسال به ${count} مقصد`;
  }
}

function renderChatsSection(platform, items) {
  const targets = items.filter(c => BROADCAST_TYPES.has(c.type));
  const others = items.filter(c => !BROADCAST_TYPES.has(c.type));

  const selectAllBox = el('input', { type: 'checkbox', class: 'chat-checkbox' });
  selectAllBox.checked = targets.length > 0 && targets.every(c => SELECTION.has(platform + ':' + c.chat_id));
  selectAllBox.indeterminate = !selectAllBox.checked && targets.some(c => SELECTION.has(platform + ':' + c.chat_id));
  selectAllBox.addEventListener('change', () => {
    for (const c of targets) {
      const k = platform + ':' + c.chat_id;
      if (selectAllBox.checked) SELECTION.add(k); else SELECTION.delete(k);
    }
    renderAll();
  });

  const header = el('div', { class: 'chats-group-head' },
    el('label', { class: 'select-all-label' },
      selectAllBox,
      el('span', { class: 'log-plat plat-' + platform }, PLATFORM_LABEL[platform]),
    ),
    el('span', { class: 'muted' }, `${targets.length} مقصد`),
    others.length ? el('span', { class: 'muted' }, ` + ${others.length} غیرفعال`) : null,
  );

  const list = el('div', { class: 'chats-list' });
  if (!items.length) {
    list.appendChild(el('div', { class: 'chats-empty muted' }, 'هیچ چتی شناسایی نشده.'));
  } else {
    for (const c of items) {
      const isTarget = BROADCAST_TYPES.has(c.type);
      const key = platform + ':' + c.chat_id;
      const box = el('input', { type: 'checkbox', class: 'chat-checkbox' });
      box.checked = SELECTION.has(key);
      box.disabled = !isTarget;
      box.addEventListener('change', () => {
        if (box.checked) SELECTION.add(key); else SELECTION.delete(key);
        updateSelectionUI();
        renderAll();
      });
      const row = el('label', { class: 'chat-row' + (isTarget ? '' : ' chat-row-muted') },
        box,
        el('span', { class: 'chat-type-pill ' + (isTarget ? 'target' : 'muted-pill') }, chatTypeLabel(c.type)),
        el('span', { class: 'chat-title' }, c.title || el('span', { class: 'muted' }, '— بدون عنوان —')),
        el('span', { class: 'chat-id-mono' }, c.chat_id),
      );
      list.appendChild(row);
    }
  }
  return el('div', { class: 'chats-group' }, header, list);
}

let LAST_DATA = null;

function renderAll() {
  if (!LAST_DATA) return;
  const groups = document.getElementById('chatsGroups');
  if (!groups) return;
  groups.replaceChildren(
    renderChatsSection('bale', LAST_DATA.chats.bale || []),
    renderChatsSection('rubika', LAST_DATA.chats.rubika || []),
  );
  updateSelectionUI();
}

async function loadCounts(preserveSelection = false) {
  const r = await fetch('/api/chats');
  if (r.status === 503) { window.location.href = '/setup'; return; }
  const data = await r.json();
  LAST_DATA = data;
  const c = data.counts;
  const badges = document.getElementById('badges');
  badges.replaceChildren(
    el('span', { class: 'badge badge-bale' }, 'بله ', el('strong', {}, String(c.bale_total))),
    el('span', { class: 'badge badge-rubika' }, 'روبیکا ', el('strong', {}, String(c.rubika_total))),
    el('span', { class: 'badge badge-target' }, 'مقصد پخش ', el('strong', {}, String(c.broadcast_targets))),
  );
  const hint = document.getElementById('hint');
  if (c.broadcast_targets === 0) {
    hint.textContent = 'هیچ گروه یا کانالی شناسایی نشده. ربات را به گروه/کانال اضافه کن و یک پیام بفرست.';
  } else {
    hint.textContent = '';
  }

  if (!preserveSelection) {
    SELECTION.clear();
    for (const platform of ['bale', 'rubika']) {
      for (const ch of data.chats[platform] || []) {
        if (BROADCAST_TYPES.has(ch.type)) SELECTION.add(platform + ':' + ch.chat_id);
      }
    }
  } else {
    const valid = new Set();
    for (const platform of ['bale', 'rubika']) {
      for (const ch of data.chats[platform] || []) {
        if (BROADCAST_TYPES.has(ch.type)) valid.add(platform + ':' + ch.chat_id);
      }
    }
    for (const k of [...SELECTION]) if (!valid.has(k)) SELECTION.delete(k);
  }
  renderAll();
}

function logLine({ icon, iconClass, platform, title, chatId, message, messageClass, details }) {
  const log = document.getElementById('log');
  const row = el('div', { class: 'log-row' });

  row.appendChild(el('span', { class: 'log-icon ' + (iconClass || '') }, icon || '•'));

  const meta = el('div', { class: 'log-meta' });
  if (platform || title) {
    const head = el('div', { class: 'log-head' });
    if (platform) head.appendChild(el('span', { class: 'log-plat plat-' + platform }, PLATFORM_LABEL[platform] || platform));
    if (title) head.appendChild(el('span', { class: 'log-title' }, title));
    if (chatId) head.appendChild(el('span', { class: 'log-id' }, '#' + chatId));
    meta.appendChild(head);
  }
  if (message) {
    meta.appendChild(el('div', { class: 'log-msg ' + (messageClass || '') }, message));
  }
  if (details) {
    const wrap = el('details', { class: 'log-details' });
    wrap.appendChild(el('summary', {}, 'نمایش جزئیات فنی'));
    wrap.appendChild(el('pre', {}, details));
    meta.appendChild(wrap);
  }
  row.appendChild(meta);

  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function logInfo(message) {
  logLine({ icon: 'i', iconClass: 'info', message, messageClass: 'info' });
}

function reset() {
  document.getElementById('log').replaceChildren();
  document.getElementById('summary').style.display = 'none';
}

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('text').value.trim();
  const file = document.getElementById('image').files[0];
  if (!text && !file) { alert('متن یا تصویر لازم است.'); return; }
  if (file && file.size > 10 * 1024 * 1024) { alert('حجم تصویر بیش از ۱۰ مگابایت است.'); return; }

  if (SELECTION.size === 0) { alert('حداقل یک مقصد انتخاب کنید.'); return; }

  const fd = new FormData();
  fd.append('text', text);
  if (file) fd.append('image', file);
  for (const key of SELECTION) fd.append('targets', key);

  const sendBtn = document.getElementById('send');
  sendBtn.disabled = true;
  document.getElementById('resultCard').style.display = '';
  reset();
  logInfo('در حال ایجاد پخش…');

  let bid;
  try {
    const r = await fetch('/api/broadcast', { method: 'POST', body: fd });
    if (r.status === 503) { window.location.href = '/setup'; return; }
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    bid = j.broadcast_id;
    logInfo(`پخش #${bid} ساخته شد — ${j.total} مقصد. در حال ارسال…`);
  } catch (err) {
    logLine({ icon: '!', iconClass: 'err', message: 'خطا در ایجاد پخش', messageClass: 'err', details: err.message });
    sendBtn.disabled = false;
    return;
  }

  const es = new EventSource(`/api/broadcast/${bid}/stream`);
  let okCount = 0, errCount = 0, fallbackCount = 0;

  es.addEventListener('progress', (e) => {
    const d = JSON.parse(e.data);
    if (d.status === 'ok') {
      if (d.fallback) {
        fallbackCount += 1;
        const ce = cleanError(d.error);
        logLine({
          icon: '↻', iconClass: 'warn',
          platform: d.platform, title: d.title, chatId: d.chat_id,
          message: 'متن ارسال شد — تصویر ناموفق: ' + ce.short,
          messageClass: 'warn',
          details: ce.raw,
        });
      } else {
        okCount += 1;
        logLine({
          icon: '✓', iconClass: 'ok',
          platform: d.platform, title: d.title, chatId: d.chat_id,
          message: 'ارسال شد',
          messageClass: 'ok',
        });
      }
    } else {
      errCount += 1;
      const ce = cleanError(d.error);
      logLine({
        icon: '✕', iconClass: 'err',
        platform: d.platform, title: d.title, chatId: d.chat_id,
        message: ce.short,
        messageClass: 'err',
        details: ce.raw,
      });
    }
  });

  es.addEventListener('done', (e) => {
    const d = JSON.parse(e.data);
    es.close();
    sendBtn.disabled = false;
    const sum = document.getElementById('summary');
    sum.replaceChildren();
    const tone = d.failed === 0 ? (fallbackCount ? 'partial' : 'success') : 'partial';
    sum.className = 'summary ' + tone;

    sum.appendChild(el('div', { class: 'sum-head' },
      d.failed === 0 && fallbackCount === 0 ? '✓ پخش کامل انجام شد' :
      d.failed === 0 ? '✓ پخش انجام شد (با جایگزینی تصویر→متن)' :
      '⚠ پخش با خطا همراه بود'
    ));
    const stats = el('div', { class: 'sum-stats' });
    stats.appendChild(el('span', { class: 'stat ok' }, '✓ موفق ', el('b', {}, String(okCount))));
    if (fallbackCount) stats.appendChild(el('span', { class: 'stat warn' }, '↻ متن جایگزین ', el('b', {}, String(fallbackCount))));
    stats.appendChild(el('span', { class: 'stat err' }, '✕ ناموفق ', el('b', {}, String(errCount))));
    stats.appendChild(el('span', { class: 'stat muted' }, 'از مجموع ', el('b', {}, String(d.total))));
    sum.appendChild(stats);
    sum.style.display = '';
  });

  es.onerror = () => {
    logLine({ icon: '!', iconClass: 'err', message: 'قطع ارتباط جریان رویدادها', messageClass: 'err' });
    es.close();
    sendBtn.disabled = false;
  };
});

document.getElementById('refreshChats')?.addEventListener('click', () => loadCounts(true));

loadCounts(false);
