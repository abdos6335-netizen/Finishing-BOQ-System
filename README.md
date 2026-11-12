# Finishing BOQ & Cost Estimation System

**نظام حصر كميات ومقايسات وتسعير أعمال التشطيبات** — Residential Quantity Surveying & Estimating (Finishing Works)

## نظرة سريعة

برنامج احترافي يحصر كميات المشاريع السكنية (شقق وفيلات) من الرسومات، ويحسب الكميات والكلفة والتسعير، وينتج المقايسة الداخلية والعميلة، مع محرك حساب هندسي مستقل عن الذكاء الاصطناعي، ودعم الواجهات العربية والإنجليزية (RTL/LTR)، وعمل Offline مع مزامنة آمنة.

- **التطبيق:** Windows Desktop + Web
- **اللغات:** Arabic + English (RTL/LTR)
- **المحرك الحسابي:** Python (deterministic, offline-first)
- **الواجهة:** React + TypeScript (Tauri 2 desktop, Web)
- **قاعدة البيانات:** SQLite (local) + PostgreSQL (cloud sync)
- **مستودع البيانات:** https://github.com/abdos6335-netizen/Finishing-BOQ-System

---

## 1. معمارية المشروع

```
┌────────────────────────────────────────────────────────────┐
│                     Web (React + TS)                        │
│                     Desktop (Tauri 2 + React)               │
├─────────────────────────────────────────────────────────────┐│
│                      Presentation Layer                      │
│  Dashboard · Project · Drawing · BOQ · Cost · Schedule     │
├─────────────────────────────────────────────────────────────┐│
│                      Application Layer                       │
│  Projects · Drawings · BOQ · Cost · Schedule · Reports     │
├─────────────────────────────────────────────────────────────┐│
│                    Engineering Core (Python)                 │
│  Geometry · Quantity · Deductions · Verification · Currency  │
├─────────────────────────────────────────────────────────────┐│
│                    Drawing Engine                           │
│  CAD (DXF/PDF) · OCR · Recognition (images) · BIM          │
├─────────────────────────────────────────────────────────────┐│
│                   Data & Sync Layer                         │
│  SQLite (local) · PostgreSQL (cloud) · Backup · Versioning │
└─────────────────────────────────────────────────────────────┘
```

**الهدف:** محرك حساب هندسي Deterministic مستقل عن AI، ونظام مراجعة مزدوج، ونسخة مقايسة داخلية وعميلة منفصلتان، وعمل Offline مع مزامنة آمنة.

---

## 2. الهدف من المشروع

تحويل الرسومات الهندسية إلى حصر كميات ومقايسات (BOQ) قابلة للمراجعة والتدقيق والاعتماد، خاصة في أعمال التشطيبات (شقق وفيلات)، ثم توسيع النطاق للاستخدامات التجارية والإدارية.

---

## 3. ملفات المشروع

```
Finishing-BOQ-System/
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── .editorconfig
├── .gitignore
├── docs/
│   ├── PRODUCT-VISION.md
│   ├── SRS/
│   ├── ARCHITECTURE/
│   ├── ENGINEERING/
│   ├── QUALITY/
│   └── ROADMAP/
├── apps/
├── backend/
├── engineering/
├── drawing_engine/
├── boq/
├── costing/
├── scheduling/
├── reporting/
├── database/
└── tests/
```

---

## 4. التقنيات والبرمجة

| المكون | التقنية | السبب |
|--------|---------|-------|
| Surface Desktop | Tauri 2 + React + TypeScript | خفيف، WinterWG, ويب جميل |
| Backend API | Python + FastAPI | محرك حصور + خدمة واحدة |
| Engineering Core | Python | Deterministic، دقة، واختبارات |
| CAD Processing | ezdxf + PyMuPDF | DXF/PDF |
| OCR | PaddleOCR / Tesseract | نصوص ورموز |
| Web UI | React + TypeScript | تجربة مستخدم موحدة |
| Database | SQLite + PostgreSQL | محلي وسحابي |
| Tests | Pytest + Playwright | الوحدة والتكامل |

---

## 5. حالات الاستخدام

- إنشاء مشروع (شقة، فيلا)
- رفع الرسومات (DXF, PDF, صور)
- تصنيف اللوحات وإدارة الإصدارات
- استخراج الأبعاد والخامات
- حصر Room by Room وElement by Element
- حصر الكهرباء والصحي والتكييف
- إنشاء BOQ (داخلية + عميلة)
- تحليل التكاليف والتسعير
- الجدولة والانتاجية
- التقارير والتصدير
- المزامنة والتشفير والنسخ الاحتياطي

---

## 6. إرشادات المساهمة

راجع `CONTRIBUTING.md` للمزيد. قاعدة سريعة:

- **Specs قبل code.** لا تكتب إنتاجي قبل موافقة SRS والاختبارات.
- **دقة التقنية.** تابع القرارات المدونة في `docs/ARCHITECTURE/`.
- **محتوى لا شكلي.** كل ملف له هدف تقني.
- **اختبارات.** كل وحدة لها اختبار مفصّل.
- **وثيقة مستمرة.** `CHANGELOG.md` و `SECURITY.md` محدثان كل دورة.

---

## 7. التوثيق

```
docs/
├── PRODUCT-VISION.md
├── SRS/
│   └── SOFTWARE-REQUIREMENTS-SPECIFICATION.md
├── ARCHITECTURE/
│   ├── SYSTEM-ARCHITECTURE.md
│   ├── DATABASE-DESIGN.md
│   ├── ENGINEERING-CALCULATION-ENGINE.md
│   ├── AI-AND-VERIFICATION-ARCHITECTURE.md
│   └── SECURITY-AND-DATA-PROTECTION.md
├── ENGINEERING/
│   ├── QUANTITY-SURVEYING-RULES.md
│   ├── MATERIAL-LIBRARY.md
│   ├── ELECTRICAL-ESTIMATION-RULES.md
│   ├── PLUMBING-HVAC-ESTIMATION-RULES.md
│   └── TIME-AND-PRODUCTIVITY-RULES.md
├── QUALITY/
│   ├── TESTING-STRATEGY.md
│   ├── REFERENCE-TEST-PROJECT.md
│   └── ACCEPTANCE-CRITERIA.md
└── ROADMAP/
    ├── DEVELOPMENT-ROADMAP.md
    └── RELEASE-PLAN.md
```

---

## 8. المراحل المقبلة

| المرحلة | الهدف | الحالة |
|---------|-------|--------|
| 0 | المتطلبات والمعمارية | ✅ مكتملة |
| 1 | أساس المشروع وقاعدة البيانات | 🚧 قيد التنفيذ |
| 2 | إدارة المشاريع والرسومات | ⏳ متبقي |
| 3+ | محرك الحصور والتدقيق والمقايسة | ⏳ متبقي |

---

## 9. الروابط

- المستودع: https://github.com/abdos6335-netizen/Finishing-BOQ-System
- الوثائق التقنية: `docs/` (كل ملف في هذا المستودع)
- المستودع: https://github.com/abdos6335-netizen/Finishing-BOQ-System
- الوثائق التقنية: `docs/` (كل ملف في هذا المستودع)

