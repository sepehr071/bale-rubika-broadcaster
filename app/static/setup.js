const GUIDES = {
  bale: {
    label: 'بله',
    cls: 'plat-bale',
    steps: [
      'اپلیکیشن بله را باز کنید و کاربر @botfather را جست‌وجو کنید.',
      'دستور /newbot را ارسال کنید.',
      'یک نام نمایشی برای ربات انتخاب کنید (مثلاً «ربات اطلاع‌رسانی شرکت من»).',
      'یک نام کاربری منحصربه‌فرد وارد کنید که باید با bot پایان یابد (مثلاً company_news_bot).',
      'بله یک پیام تأیید همراه با توکن HTTP API ارسال می‌کند. متن کامل توکن را کپی کنید.',
      'توکن را در کادر زیر بچسبانید و دکمه «تست و ذخیره» را بزنید.',
    ],
  },
  rubika: {
    label: 'روبیکا',
    cls: 'plat-rubika',
    steps: [
      'اپلیکیشن روبیکا را باز کنید و کاربر BotFather را جست‌وجو کنید (نام دقیق آن در روبیکا).',
      'گزینهٔ ساخت ربات جدید را انتخاب کنید و طبق مراحل، نام و نام کاربری ربات را تعیین کنید.',
      'پس از تکمیل، BotFather توکن ربات را برای شما ارسال می‌کند. آن را کپی کنید.',
      'توکن را در کادر زیر بچسبانید و دکمه «تست و ذخیره» را بزنید.',
      'توجه: API روبیکا داخل ایران در دسترس است. اگر از خارج ایران اجرا می‌کنید، باید ترافیک به rubika.ir از داخل ایران مسیر شود.',
    ],
  },
};

const STATE = { bale: null, rubika: null };

function pill(platform, kind, text) {
  const map = {
    unset:   { cls: 'pill-muted', label: 'تنظیم نشده' },
    saved:   { cls: 'pill-ok',    label: 'ذخیره شده' },
    testing: { cls: 'pill-warn',  label: 'در حال بررسی…' },
    ok:      { cls: 'pill-ok',    label: 'تأیید شد' },
    invalid: { cls: 'pill-err',   label: 'نامعتبر' },
  };
  const m = map[kind] || map.unset;
  STATE[platform + '_pill_kind'] = kind;
  return window.el('span', { class: 'pill ' + m.cls, id: 'pill-' + platform }, text || m.label);
}

function renderPlatformCard(platform) {
  const g = GUIDES[platform];
  const tokenInput = window.el('input', {
    type: 'password',
    class: 'token-input',
    id: 'token-' + platform,
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: 'توکن را اینجا بچسبانید…',
  });
  const revealBtn = window.el('button', {
    type: 'button',
    class: 'reveal-btn ghost',
    onclick: () => {
      tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
      revealBtn.textContent = tokenInput.type === 'password' ? 'نمایش' : 'مخفی‌کردن';
    },
  }, 'نمایش');

  const saveBtn = window.el('button', {
    type: 'button',
    class: 'save-btn',
    onclick: () => saveToken(platform),
  }, 'تست و ذخیره');
  const clearBtn = window.el('button', {
    type: 'button',
    class: 'ghost clear-btn',
    onclick: () => clearToken(platform),
  }, 'حذف');

  const pillHolder = window.el('div', { class: 'pill-holder', id: 'pill-holder-' + platform }, pill(platform, 'unset'));
  const errorHolder = window.el('div', { class: 'error-holder', id: 'error-holder-' + platform });

  const guideList = window.el('ol', { class: 'setup-guide-list' },
    ...g.steps.map(s => window.el('li', {}, s)),
  );

  return window.el('div', { class: 'card setup-card' },
    window.el('div', { class: 'setup-head' },
      window.el('span', { class: 'log-plat ' + g.cls }, g.label),
      window.el('h2', { class: 'setup-title' }, 'توکن ربات ' + g.label),
      pillHolder,
    ),
    window.el('details', { class: 'setup-guide' },
      window.el('summary', {}, 'راهنمای دریافت توکن'),
      guideList,
    ),
    window.el('label', { for: 'token-' + platform }, 'توکن'),
    window.el('div', { class: 'token-row' },
      tokenInput,
      revealBtn,
    ),
    window.el('div', { class: 'row setup-actions' },
      saveBtn,
      clearBtn,
    ),
    errorHolder,
  );
}

function setPill(platform, kind, text) {
  const holder = document.getElementById('pill-holder-' + platform);
  if (!holder) return;
  holder.replaceChildren(pill(platform, kind, text));
}

function setError(platform, message, raw) {
  const holder = document.getElementById('error-holder-' + platform);
  if (!holder) return;
  if (!message) { holder.replaceChildren(); return; }
  const details = raw ? window.el('details', { class: 'log-details' },
    window.el('summary', {}, 'جزئیات فنی'),
    window.el('pre', {}, raw),
  ) : null;
  holder.replaceChildren(
    window.el('div', { class: 'log-msg err' }, message),
    details,
  );
}

function updateEnterButton(snapshot) {
  const btn = document.getElementById('enterPanel');
  const hint = document.getElementById('enterHint');
  if (!btn || !hint) return;
  const anyConfigured = snapshot.bale.configured || snapshot.rubika.configured;
  btn.disabled = !anyConfigured;
  if (anyConfigured) {
    hint.textContent = 'حداقل یک پلتفرم تنظیم شده — می‌توانید وارد پنل شوید.';
    btn.onclick = () => { window.location.href = '/'; };
  } else {
    hint.textContent = 'پس از ذخیره دست‌کم یک توکن، فعال می‌شود.';
  }
}

function applySnapshot(snapshot) {
  STATE.bale = snapshot.bale;
  STATE.rubika = snapshot.rubika;
  for (const p of ['bale', 'rubika']) {
    const s = snapshot[p];
    const input = document.getElementById('token-' + p);
    if (input) input.placeholder = s.configured && s.masked ? s.masked : 'توکن را اینجا بچسبانید…';
    setPill(p, s.configured ? 'saved' : 'unset');
    setError(p, null);
  }
  updateEnterButton(snapshot);
}

async function saveToken(platform) {
  const input = document.getElementById('token-' + platform);
  const raw = (input.value || '').trim();
  if (!raw) { setError(platform, 'توکن خالی است.', null); return; }

  setPill(platform, 'testing');
  setError(platform, null);

  try {
    const r = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [platform + '_token']: raw }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = (body && body.detail) || body;
      const rawDetail = (detail && detail.detail) || JSON.stringify(detail);
      const ce = window.cleanError(rawDetail);
      setPill(platform, 'invalid');
      setError(platform, ce.short, ce.raw);
      return;
    }
    input.value = '';
    applySnapshot(body);
    setPill(platform, 'ok');
  } catch (err) {
    const ce = window.cleanError(err && err.message);
    setPill(platform, 'invalid');
    setError(platform, ce.short, ce.raw);
  }
}

async function clearToken(platform) {
  if (!confirm('توکن ' + GUIDES[platform].label + ' حذف شود؟')) return;
  setPill(platform, 'testing');
  try {
    const r = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [platform + '_token']: '' }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(body));
    const input = document.getElementById('token-' + platform);
    if (input) input.value = '';
    applySnapshot(body);
  } catch (err) {
    const ce = window.cleanError(err && err.message);
    setPill(platform, 'invalid');
    setError(platform, ce.short, ce.raw);
  }
}

async function init() {
  const root = document.getElementById('setup-root');
  root.replaceChildren(
    renderPlatformCard('bale'),
    renderPlatformCard('rubika'),
  );
  try {
    const r = await fetch('/api/settings');
    const body = await r.json();
    applySnapshot(body);
  } catch (e) {
    for (const p of ['bale', 'rubika']) setError(p, 'دریافت وضعیت ناموفق بود.', String(e && e.message));
  }
}

init();
