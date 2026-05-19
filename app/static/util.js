window.PLATFORM_LABEL = { bale: 'بله', rubika: 'روبیکا' };

window.el = function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};

window.cleanError = function cleanError(raw) {
  if (!raw) return { short: 'خطای ناشناخته', kind: 'unknown' };
  const s = String(raw);
  if (/502/.test(s) && /rubika/i.test(s)) return { short: 'سرور آپلود روبیکا در دسترس نیست (502)', kind: 'rubika_upload_down', raw: s };
  if (/non-json/i.test(s)) return { short: 'پاسخ نامعتبر از سرور', kind: 'bad_response', raw: s };
  if (/network/i.test(s) || /getaddrinfo/i.test(s)) return { short: 'خطای شبکه — احتمالاً مسدودسازی منطقه‌ای', kind: 'network', raw: s };
  if (/timeout/i.test(s)) return { short: 'اتمام مهلت پاسخ', kind: 'timeout', raw: s };
  if (/401|403|unauthorized|forbidden|invalid.?token/i.test(s)) return { short: 'احراز هویت رد شد — توکن را بررسی کنید', kind: 'auth', raw: s };
  if (/429|rate.?limit|too.?many/i.test(s)) return { short: 'محدودیت نرخ — کمی بعد دوباره تلاش کنید', kind: 'ratelimit', raw: s };
  const oneLine = s.replace(/\s+/g, ' ').trim();
  return { short: oneLine.length > 90 ? oneLine.slice(0, 90) + '…' : oneLine, kind: 'generic', raw: s };
};
