# 🚀 سایت معین تاش - فایل‌های پروژه

## 📁 فایل‌ها

```
├── index.html              ← صفحه اصلی (همون قبلی، تغییری نکرده)
├── dashboard.html          ← داشبورد ویرایش چت‌بات
├── chatbot.js              ← مغز چت‌بات (آپدیت شد - با Cloudflare Worker)
├── cloudflare-worker.js    ← 🆕 کد Worker (روی Cloudflare آپلود می‌شه، نه GitHub)
├── data.json               ← دیتای چت‌بات
└── SETUP-GUIDE.md          ← 🌟 راهنمای کامل قدم به قدم
```

---

## ⚡ شروع کار

### اگه می‌خوای AI با Gemini فعال کنی:
👉 برو به فایل **`SETUP-GUIDE.md`** و قدم به قدم دنبال کن (۱۵ دقیقه)

### اگه فقط می‌خوای rule-based کار کنه (بدون AI):
1. این ۴ فایل رو روی GitHub آپلود کن: `index.html`, `dashboard.html`, `chatbot.js`, `data.json`
2. تموم! چت‌بات با rule-based کار می‌کنه

---

## 🎯 خلاصه‌ی کار

| فایل | کجا می‌ره |
|------|-----------|
| `index.html` | GitHub Repo |
| `dashboard.html` | GitHub Repo |
| `chatbot.js` | GitHub Repo |
| `data.json` | GitHub Repo |
| `cloudflare-worker.js` | **Cloudflare Workers** (نه GitHub!) |

⚠️ **مهم:** فایل `cloudflare-worker.js` رو **روی GitHub نذار**! این فایل فقط برای کپی کردن تو Cloudflare ساخته شده.

---

## 🔐 امنیت

✅ API Key فقط تو Cloudflare's Secrets ذخیره می‌شه  
✅ هیچ‌جای کد عمومی API Key نیست  
✅ فقط دامنه‌ی `moeintash.github.io` اجازه استفاده داره  
✅ اگه AI قطع شد، rule-based خودکار جایگزین می‌شه  

---

## 💡 می‌خوای پسورد داشبورد رو عوض کنی؟

تو فایل `dashboard.html`، خط زیر رو پیدا کن:
```javascript
const ADMIN_PASSWORD = "moein2026";
```
به یه پسورد قوی تغییر بده.

---

موفق باشی! 🚀
