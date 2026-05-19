export const vocab = {
  appTitle: 'پخش پیام',
  appSubtitle: 'بله و روبیکا',

  nav: {
    compose: 'ارسال',
    history: 'تاریخچه',
    help: 'راهنما',
    setup: 'تنظیمات',
  },

  compose: {
    cardTitle: 'پیام جدید',
    messageLabel: 'متن پیام',
    messagePlaceholder: 'متن خود را اینجا بنویسید…',
    mediaLabel: 'تصویر یا ویدیو (اختیاری)',
    mediaHint: 'تصویر تا ۱۰ مگابایت یا ویدیوی mp4 تا ۵۰ مگابایت',
    dropzone: 'فایل را اینجا بکشید یا کلیک کنید',
    targetsLabel: 'گیرندگان',
    targetsHint: 'گروه‌ها و کانال‌هایی که می‌خواهید پیام برایشان ارسال شود را انتخاب کنید.',
    selectAll: 'انتخاب همه',
    refresh: 'به‌روزرسانی',
    submit: 'ارسال',
    submitDisabled: 'گیرنده‌ای انتخاب نشده',
    selectedCount: (n: number) => `ارسال به ${toFa(n)} گیرنده`,
    needTarget: 'حداقل یک گیرنده انتخاب کنید.',
    needContent: 'متن یا فایل برای ارسال لازم است.',
    imageTooBig: 'حجم تصویر بیش از ۱۰ مگابایت است.',
    videoTooBig: 'حجم ویدیو بیش از ۵۰ مگابایت است.',
    videoWrongType: 'فقط ویدیوی mp4 پشتیبانی می‌شود.',
    baleVideoTooBig: 'برای ارسال در بله، حجم ویدیو نباید بیش از ۲۰ مگابایت باشد.',
    sending: 'در حال ایجاد ارسال…',
    started: (n: number) => `ارسال به ${toFa(n)} گیرنده آغاز شد`,
    streamLost: 'اتصال به جریان گزارش قطع شد',
  },

  results: {
    title: 'نتیجه ارسال',
    okBadge: 'ارسال شد',
    fallbackBadge: 'فقط متن ارسال شد',
    errorBadge: 'ارسال نشد',
    fallbackNote: 'متن ارسال شد — رسانه ناموفق بود',
    showRaw: 'نمایش جزئیات',
    totalLabel: (n: number) => `از مجموع ${toFa(n)}`,
    okCount: (n: number) => `${toFa(n)} موفق`,
    failCount: (n: number) => `${toFa(n)} ناموفق`,
    fallbackCount: (n: number) => `${toFa(n)} با روش جایگزین`,
    allOk: 'همه پیام‌ها با موفقیت ارسال شدند.',
    partial: 'ارسال با چند خطا تمام شد.',
    allFailed: 'ارسال ناموفق بود.',
  },

  presets: {
    label: 'گروه‌های ذخیره‌شده',
    empty: 'هنوز گروهی ذخیره نکرده‌اید — انتخاب فعلی را با کلیک «ذخیره گروه» نگه دارید.',
    create: 'ذخیره گروه',
    save: 'ذخیره',
    cancel: 'انصراف',
    rename: 'تغییر نام',
    overwrite: 'به‌روز کردن با انتخاب فعلی',
    delete: 'حذف',
    namePlaceholder: 'نام را وارد کنید…',
    newNameLabel: 'نام جدید',
    duplicate: 'گروهی با این نام قبلاً وجود دارد',
    nothingToSave: 'گیرنده‌ای انتخاب نشده.',
    saved: 'ذخیره شد',
    loaded: 'بارگذاری شد',
    deleted: 'حذف شد',
    confirmOverwrite: 'محتوای فعلی این گروه بازنویسی شود؟',
    confirmDelete: 'گروه ذخیره‌شده حذف شود؟',
  },

  chats: {
    emptyTitle: 'هنوز مخاطبی شناسایی نشده',
    emptyHint:
      'ربات را به گروه یا کانال اضافه کنید، در آن یک پیام بنویسید، سپس «به‌روزرسانی» را بزنید.',
    refresh: 'به‌روزرسانی',
    untitled: 'بدون عنوان',
    targets: (n: number) => `${toFa(n)} گیرنده`,
  },

  history: {
    title: 'تاریخچه',
    empty: 'هنوز پیامی ارسال نشده.',
    cols: {
      time: 'زمان',
      text: 'متن',
      media: 'فایل',
      total: 'مجموع',
      sent: 'موفق',
      failed: 'ناموفق',
    },
    media: { image: 'تصویر', video: 'ویدیو', none: '—' },
    expand: 'جزئیات',
    collapse: 'بستن',
    noResults: 'نتیجه‌ای ثبت نشده.',
  },

  setup: {
    title: 'کلید دسترسی ربات',
    intro:
      'برای ارسال پیام، باید کلید دسترسی ربات بله یا روبیکا را وارد کنید. اطلاعات روی این رایانه باقی می‌ماند.',
    cardTitle: (platform: 'bale' | 'rubika') =>
      platform === 'bale' ? 'کلید دسترسی بله' : 'کلید دسترسی روبیکا',
    placeholder: 'کلید را اینجا بچسبانید…',
    test: 'ذخیره',
    clear: 'پاک کردن',
    reveal: 'نمایش کلید',
    hide: 'مخفی کردن',
    unset: 'تنظیم نشده',
    set: 'تنظیم شده',
    saving: 'در حال بررسی…',
    saved: 'ذخیره شد',
    cleared: 'پاک شد',
    invalid: 'کلید نامعتبر است',
    enter: 'ورود به پنل',
    enterHint: 'بعد از ذخیره دست‌کم یک کلید، فعال می‌شود.',
    readyHint: 'دست‌کم یک پلتفرم فعال است — می‌توانید وارد پنل شوید.',
    confirmClear: 'پاک کردن این کلید قطعی است؟',
    guideTitle: 'راهنمای دریافت کلید',
    baleGuide: [
      'در اپ بله، @BotFather را باز کنید.',
      'دستور /newbot را بزنید و مراحل ساخت ربات را طی کنید.',
      'کلید (token) را که برایتان ارسال می‌شود همین‌جا بچسبانید.',
    ],
    rubikaGuide: [
      'در اپ روبیکا، BotFather را باز کنید.',
      'گزینهٔ «ساخت ربات جدید» را بزنید و نام و آی‌دی را انتخاب کنید.',
      'کلید ربات را که برایتان ارسال می‌شود همین‌جا بچسبانید.',
    ],
  },

  help: {
    title: 'راهنما',
    intro:
      'این برنامه برای ارسال هم‌زمان پیام (متن + تصویر یا ویدیو) به گروه‌ها و کانال‌های شما در بله و روبیکا ساخته شده است.',
  },

  errors: {
    unknown: 'خطای ناشناخته',
    notFound: 'یافت نشد',
    actionFailed: 'انجام نشد',
    networkLost: 'ارتباط با برنامه قطع شد',
  },
} as const;

export function toFa(n: number | string): string {
  return String(n);
}
