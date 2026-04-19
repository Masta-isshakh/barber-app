# White Beard – Complete Barbershop POS & Management System
## Full Build Plan, Hardware Guide & Bank Guide – Doha, Qatar

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [Day-by-Day Build Plan](#5-day-by-day-build-plan)
6. [API Routes & Data Operations](#6-api-routes--data-operations)
7. [POS Screen – Architecture](#7-pos-screen--architecture)
8. [POS Hardware Guide – Doha](#8-pos-hardware-guide--doha)
9. [Bank & Payment Provider Guide – Qatar](#9-bank--payment-provider-guide--qatar)
10. [Seeding Services in Production](#10-seeding-services-in-production)
11. [Deployment Checklist](#11-deployment-checklist)

---

## 1. Project Overview

**White Beard** is a full-stack barbershop management platform for a single shop in Doha with 6–10 barbers.

### Core Modules
| Module | Who uses it | Status |
|---|---|---|
| POS (Point of Sale) | Cashier / Admin | ✅ Built |
| Appointments | Admin / Barber | ✅ Built |
| Barber Management | Admin | ✅ Built |
| Reports & Analytics | Admin | ✅ Built |
| Customer CRM | Admin / Cashier | ✅ Built |
| Invite Barber flow | Admin | ✅ Built (existing) |
| Shift tracking | Barber | Schema ready |
| Service catalogue admin | Admin | Schema ready |

---

## 2. Tech Stack

```
Frontend : React Native (Expo) — iOS + Android + Web tablet
Backend  : AWS Amplify Gen2
Auth     : Amazon Cognito (groups: admins, barbers)
Database : AWS AppSync (GraphQL) → DynamoDB
Functions: AWS Lambda (Node.js / TypeScript)
Storage  : Amazon S3 (future: receipts, avatars)
Hosting  : EAS Build (iOS/Android) + Expo web (cashier tablet)
```

---

## 3. Folder Structure

```
barber_app/
├── amplify/
│   ├── backend.ts            ← Amplify Gen2 backend definition
│   ├── auth/resource.ts      ← Cognito config
│   ├── data/resource.ts      ← AppSync schema (ALL models here)
│   └── functions/
│       ├── invite-barber/    ← Lambda: invite barber to Cognito
│       ├── custom-message/   ← Lambda: branded Cognito emails
│       └── block-self-signup/← Lambda: prevent public sign-ups
│
├── src/
│   ├── context/
│   │   └── AuthContext.tsx   ← React context: auth state + logout
│   ├── navigation/
│   │   └── AppNavigator.tsx  ← Bottom tabs + Stack navigator
│   ├── screens/
│   │   ├── pos/
│   │   │   ├── POSScreen.tsx          ← Main POS (service grid + cart)
│   │   │   └── components/
│   │   │       ├── ServiceGrid.tsx    ← Service tiles by category
│   │   │       ├── CartPanel.tsx      ← Cart + barber selector + totals
│   │   │       ├── PaymentModal.tsx   ← Cash / Card / QR payment sheet
│   │   │       └── ReceiptModal.tsx   ← Digital receipt + share
│   │   ├── appointments/
│   │   │   └── AppointmentsScreen.tsx ← Daily calendar + booking form
│   │   ├── barbers/
│   │   │   └── BarbersScreen.tsx      ← Barber list + detail sheet
│   │   ├── reports/
│   │   │   └── ReportsScreen.tsx      ← KPIs + leaderboard + transactions
│   │   └── customers/
│   │       └── CustomersScreen.tsx    ← Customer CRM + search
│   ├── hooks/
│   │   ├── useBarbers.ts
│   │   ├── useServices.ts
│   │   ├── useTransactions.ts
│   │   └── useAppointments.ts
│   ├── constants/
│   │   ├── colors.ts         ← Brand color palette + spacing
│   │   └── services.ts       ← Default service catalogue
│   ├── types/
│   │   └── index.ts          ← All TypeScript types
│   └── lib/
│       └── amplify.ts        ← Amplify client config
│
├── App.tsx                   ← Auth shell: login → AppNavigator
├── scripts/
│   ├── bootstrap-admin.mjs   ← Seed admin user
│   └── seed-services.mjs     ← (to create) seed default services
└── BUILD_PLAN.md             ← This file
```

---

## 4. Database Schema

All models live in `amplify/data/resource.ts`.

### BarberProfile
| Field | Type | Notes |
|---|---|---|
| cognitoUsername | String | Links to Cognito |
| fullName | String | |
| email | Email | |
| role | ADMIN \| BARBER | |
| status | INVITED \| ACTIVE \| DISABLED | |
| specialty | String | e.g. "Fade & Beard" |
| shiftLabel | String | e.g. "Morning shift" |
| commissionRate | Float | e.g. 40 = 40% |

### ServiceItem *(new)*
| Field | Type | Notes |
|---|---|---|
| name | String | "Haircut" |
| nameAr | String | "قص شعر" |
| price | Float | QAR |
| durationMinutes | Integer | |
| category | HAIRCUT\|BEARD\|COMBO\|KIDS\|TREATMENT\|OTHER | |
| isActive | Boolean | |
| sortOrder | Integer | Display order |

### Customer *(new)*
| Field | Type | Notes |
|---|---|---|
| fullName | String | |
| phone | String | |
| totalVisits | Integer | Updated per transaction |
| totalSpent | Float | Running total |

### Appointment *(new)*
| Field | Type | Notes |
|---|---|---|
| barberId | ID | |
| customerName | String | |
| scheduledAt | DateTime | |
| status | SCHEDULED\|IN_PROGRESS\|COMPLETED\|CANCELLED\|NO_SHOW | |
| serviceIds | [String] | |
| totalAmount | Float | Pre-calculated |

### Transaction *(new)*
| Field | Type | Notes |
|---|---|---|
| receiptNumber | String | WB-YYYYMMDD-XXXX |
| barberId | ID | |
| subtotal | Float | |
| discountAmount | Float | |
| total | Float | |
| paymentMethod | CASH\|CARD\|QR\|SPLIT | |
| paymentStatus | PENDING\|PAID\|REFUNDED\|VOIDED | |
| cashReceived | Float | Cash payments |
| changeGiven | Float | Cash payments |

### TransactionItem *(new)*
| Field | Type | Notes |
|---|---|---|
| transactionId | ID | FK → Transaction |
| serviceId | ID | FK → ServiceItem |
| serviceName | String | Snapshot |
| price | Float | Snapshot at time of sale |
| quantity | Integer | |
| lineTotal | Float | price × quantity |

### Shift *(new)*
| Field | Type | Notes |
|---|---|---|
| barberId | ID | |
| cognitoUsername | String | For owner auth |
| startedAt | DateTime | |
| endedAt | DateTime | nullable = still open |
| totalRevenue | Float | Computed on close |
| totalClients | Integer | |

---

## 5. Day-by-Day Build Plan

### Week 1 — Foundation + POS ✅

| Day | Task | Status |
|---|---|---|
| 1 | Amplify Gen2 project setup, Cognito auth, admin bootstrap | ✅ Done |
| 2 | Barber invite Lambda + BarberProfile model | ✅ Done |
| 3 | Extend schema: ServiceItem, Customer, Transaction, Appointment | ✅ Done |
| 4 | POS Screen: ServiceGrid + CartPanel + PaymentModal + ReceiptModal | ✅ Done |
| 5 | Navigation (bottom tabs), Auth context, screen wiring | ✅ Done |

### Week 2 — Appointments + Barbers + Reports

| Day | Task | Status |
|---|---|---|
| 6 | AppointmentsScreen: day view, booking form, status updates | ✅ Done |
| 7 | BarbersScreen: list, detail sheet, enable/disable | ✅ Done |
| 8 | ReportsScreen: KPIs, payment method breakdown, barber leaderboard | ✅ Done |
| 9 | CustomersScreen: CRM, search, add customer | ✅ Done |
| 10 | Seed services script + test end-to-end POS flow | → Next |

### Week 3 — Advanced Features

| Day | Task |
|---|---|
| 11 | Shift management (open/close shift, daily summary per barber) |
| 12 | Service catalogue admin screen (add/edit/disable services) |
| 13 | Commission report: per barber daily/monthly with commission amounts |
| 14 | Appointment → POS flow: tap appointment → pre-fill cart |
| 15 | Customer visit history: tap customer → see all their transactions |

### Week 4 — Hardware Integration + Polish

| Day | Task |
|---|---|
| 16 | Bluetooth thermal printer integration (Sunmi / Star Micronics) |
| 17 | Cash drawer trigger via printer |
| 18 | Card terminal manual flow: print "process on terminal" prompt |
| 19 | Tablet-optimized layout (landscape POS mode for cashier station) |
| 20 | Production build + EAS + Play Store / App Store submission |

---

## 6. API Routes & Data Operations

All data access uses AWS AppSync (GraphQL via Amplify client). No REST API layer needed.

### Key operations

```typescript
// List active services
client.models.ServiceItem.list({ filter: { isActive: { eq: true } } })

// Create a transaction (POS sale)
client.models.Transaction.create({ ... })

// Create transaction line items
client.models.TransactionItem.create({ transactionId, serviceId, ... })

// List appointments for a day
client.models.Appointment.list()
// Then filter client-side by scheduledAt.startsWith('2026-04-19')

// Update appointment status
client.models.Appointment.update({ id, status: 'IN_PROGRESS' })

// List transactions for reports
client.models.Transaction.list()

// Real-time subscription (POS screen auto-refreshes)
client.models.Transaction.observeQuery().subscribe(...)
```

---

## 7. POS Screen – Architecture

```
POSScreen
├── ServiceGrid (left panel on tablet, top on phone)
│   ├── Category filter pills (ALL / HAIRCUT / BEARD / COMBO / KIDS…)
│   └── Service tiles (3-column grid, tap to add)
│
├── CartPanel (right panel on tablet, bottom on phone)
│   ├── Barber selector (horizontal scroll chips)
│   ├── Cart items list (qty +/-, remove)
│   ├── Discount selector (0 / 5 / 10 / 15 / 20 / 25 / 50%)
│   ├── Totals (subtotal, discount, TOTAL)
│   └── Charge button → PaymentModal
│
├── PaymentModal (bottom sheet)
│   ├── Method: CASH / CARD / QR / SPLIT
│   ├── Cash: received input + change calculation
│   ├── Card: "Process on terminal" instruction
│   └── Confirm → saves Transaction + TransactionItems to DynamoDB
│
└── ReceiptModal (overlay)
    ├── Formatted digital receipt
    ├── Share button (WhatsApp / SMS / Email via Share.share)
    └── "New Sale" resets cart
```

### Flow on a sale
1. Cashier selects **barber** (who cuts)
2. Taps **service tiles** to fill cart
3. Optionally applies **discount**
4. Taps **Charge QR {total}**
5. Selects **payment method**
6. For CARD: processes on physical VPOS, then taps Confirm
7. App writes `Transaction` + `TransactionItems` + legacy `RevenueEntry` to DynamoDB
8. **Digital receipt** shown — can share via WhatsApp
9. Cart resets — ready for next customer

---

## 8. POS Hardware Guide – Doha

### Option A – Windows Tablet as Cashier (Recommended for V1)

**What to buy:**

| Item | Where to buy | Approx. Price (QAR) |
|---|---|---|
| Windows tablet / laptop | Carrefour Doha, LuLu Hypermarket, Jarir Bookstore (Villaggio / Mall of Qatar) | 700–1,500 |
| USB thermal receipt printer (80mm) | POS suppliers (see below) | 300–600 |
| Cash drawer (RJ11 connected to printer) | POS suppliers | 150–250 |
| USB barcode scanner (optional) | Same POS suppliers | 100–200 |

**Run the app on a Windows tablet:** Use `expo start --web` in this project — the app runs as a PWA in Chrome. Pin it to the taskbar.

### Option B – Android Tablet as POS Terminal

**Recommended devices:**
- **Sunmi V2 Pro** – Android POS with built-in printer. Available from local POS dealers. ~QAR 1,200–1,800.
- **PAX A920** – Android POS with card reader + printer. Available from bank merchant services.
- **Generic Android tablet (Samsung/Lenovo)** + external Bluetooth printer: ~QAR 800–1,200 total.

### POS Suppliers in Doha (physical shops)

| Supplier | Area | Notes |
|---|---|---|
| **Gulf Business Machines (GBM)** | West Bay | Enterprise POS hardware |
| **Redington Gulf** | Industrial Area | Distributor, sells to dealers |
| **Al Jaber Electronics** | Multiple branches | Good for tablets + accessories |
| **Emax** | Mall of Qatar, Festival City | Samsung/Lenovo tablets |
| **Carrefour Business** | City Center, Mall of Qatar | Printers, accessories |
| **Local IT shops – Industrial Area** (near Electronics souk) | Salwa Road | Best prices for POS printers, cash drawers |

**Tip:** Search "POS system Qatar" on bayt.com or Qatar Living classifieds — local resellers offer full bundles (tablet + printer + drawer) for ~QAR 1,500–2,500.

### Thermal Printer Models (confirmed available in Qatar)

| Model | Connection | Price est. |
|---|---|---|
| Epson TM-T20III | USB / LAN | ~QAR 450 |
| Star TSP143 | USB / BT | ~QAR 500 |
| Sewoo LK-T212 | USB / BT | ~QAR 350 |
| Sunmi CloudPrinter | WiFi | ~QAR 400 |

For Bluetooth printing from the app, use the `expo-print` package (already installed) or `react-native-thermal-receipt-printer`.

### Configuring the printer with White Beard

Currently the receipt is digital (WhatsApp / Share). To add physical printing:

```bash
npm install react-native-thermal-receipt-printer-image-qr
```

Then in `ReceiptModal.tsx`, call `ThermalPrinterModule.printBluetooth({ payload: buildTextReceipt() })`.

---

## 9. Bank & Payment Provider Guide – Qatar

### Phase 1 (Now) — Manual card recording

No bank integration needed yet. Cashier:
1. Presents customer the bank's standalone VPOS terminal
2. Manually selects "CARD" in White Beard POS
3. Records the payment — the app writes the transaction

### Phase 2 — Integrated payments (after 3 months of stable operation)

---

### Provider 1: Commercial Bank of Qatar (CB)

**Products:** CB VPOS, CB SoftPOS (phone), CB e-Commerce

**Merchant onboarding contact:**
- Website: commercialbank.com.qa → "Business" → "Merchant Services"
- Phone: **+974 4449 0000** (main), ask for "Merchant Services / POS Department"
- Email: merchantservices@cbq.com.qa
- Walk-in: CB Business Centre, C-Ring Road, Doha

**Questions to ask:**
1. What is the MDR (Merchant Discount Rate) for QR / Visa / Mastercard?
2. Do you offer SoftPOS (tap phone to accept payment)?
3. What is the settlement period (T+1? T+2?)?
4. Do you provide an ECR/API integration for POS software?
5. Is there a monthly rental fee for the VPOS terminal or is it MDR only?
6. What documents are needed for merchant onboarding (CR, QID, bank statement)?
7. Do you support NAPS (Qatar e-Payment scheme)?
8. Can we get a sandbox/test environment before going live?

**Documents typically required:**
- Commercial Registration (CR) or trade licence
- QID / passport of owner
- 3-6 months bank statement
- Lease agreement or utility bill for shop address
- QCB compliance form

---

### Provider 2: Qatar Islamic Bank (QIB)

**Products:** QIB SoftPOS ("QIB SoftPOS" app on Android — no hardware needed!), QIB VPOS

**Why QIB SoftPOS is great for you:**
- Android phone becomes a contactless card terminal
- No hardware cost
- Supports Visa Contactless, Mastercard Contactless, Apple Pay, Samsung Pay, Google Pay

**Contact:**
- Website: qib.com.qa → "Business Banking" → "Merchant Solutions"
- Phone: **+974 4440 3000** → Business Banking department
- Walk-in: QIB main branch, Grand Hamad Street, Doha

**Questions to ask:**
1. How do I download and activate QIB SoftPOS for my business?
2. What Android version is required for SoftPOS?
3. What is the MDR for contactless vs chip & PIN?
4. How quickly are funds settled?
5. Is there an API or webhook to notify my POS software when a payment is approved?
6. What is the maximum transaction limit for SoftPOS?

---

### Provider 3: Dukhan Bank — D-Tap

**Product:** D-Tap (SoftPOS on Android/iOS)

**Contact:**
- Website: dukhanbank.com → "Business" → "Merchant Services"
- Phone: **+974 4406 6666**
- Email: businessbanking@dukhanbank.com

**Questions to ask:**
1. What is the onboarding process for D-Tap for a small barbershop?
2. What is the monthly/transaction fee structure?
3. Do you support QR code payments via NAPS CliQ?
4. Is there an API to integrate D-Tap approval notifications with my POS software?

---

### Provider 4: QNB (Qatar National Bank) — For ECR Integration (Phase 2)

QNB offers the most mature ECR (Electronic Cash Register) API integration in Qatar — this is what you want eventually to have the app directly confirm card payments without manual entry.

**Contact:**
- Website: qnb.com → "Business" → "POS Solutions"
- Phone: **+974 4440 7777** → "Business Banking" → "Merchant Services"
- Walk-in: QNB Tower, West Bay

**Questions to ask:**
1. Do you offer an ECR API or SDK for integrating VPOS approval status with third-party POS software?
2. What is your developer documentation / sandbox environment for ECR integration?
3. What communication protocol does the VPOS terminal use? (TCP/IP? Serial? REST?)
4. Is there a specific terminal model (Verifone, Ingenico, PAX) that supports API integration with your acquiring system?
5. What is the timeline from merchant application to live integration?
6. Do you have a technical account manager or integration team we can work with?

---

### NAPS (National Payment Systems) — Qatar's Domestic Scheme

NAPS is the Qatari interbank payment network (like UAE's Payit). All QAR card payments route through NAPS.

- Website: naps.com.qa  
- Contact: +974 4496 8888  
- All four banks above are NAPS members — no separate NAPS application needed

---

### Payment Flow Summary

```
Phase 1 (Now):
Customer → Physical VPOS terminal (bank's hardware) → Cashier taps CARD in app → Manual record

Phase 2 (3–6 months):
Customer → QIB SoftPOS / CB VPOS → App receives webhook → Auto-confirms Transaction

Phase 3 (6–12 months):
Customer taps phone at NFC reader → QNB ECR API notifies app → Transaction auto-completes + receipt prints
```

---

## 10. Seeding Services in Production

After deploying the backend (`npx ampx sandbox` or `npx ampx pipeline-deploy`), run:

```bash
# Create scripts/seed-services.mjs  (todo: implement this)
node scripts/seed-services.mjs
```

Or use the Admin dashboard once a Service management screen is built (Week 3, Day 12).

**Default services pre-coded** in `src/constants/services.ts`:
- Haircut — QR 50, 30 min
- Hair + Beard — QR 80, 45 min
- Beard Trim — QR 40, 20 min
- Kids Haircut — QR 35, 25 min
- Beard Shave — QR 45, 25 min
- Hair Wash — QR 20, 15 min
- Hair Colour — QR 120, 60 min
- Full Package — QR 150, 90 min

---

## 11. Deployment Checklist

### Backend
```bash
# 1. Deploy backend to AWS
npx ampx sandbox           # development
npx ampx pipeline-deploy   # production (CI/CD via amplify.yml)

# 2. Bootstrap admin user
npm run admin:bootstrap

# 3. Seed services (after seed script is created)
node scripts/seed-services.mjs
```

### Mobile App
```bash
# Android APK / AAB
eas build --platform android --profile production

# iOS IPA
eas build --platform ios --profile production
```

### Tablet POS (Web)
```bash
# Run as PWA on cashier tablet
expo start --web
# Or build static web
expo export --platform web
# Deploy to: S3 + CloudFront or Vercel
```

### Pre-launch checklist
- [ ] Admin user created in Cognito + added to `admins` group
- [ ] At least 2 barbers invited and in ACTIVE status
- [ ] Services seeded in DynamoDB
- [ ] Test a full POS cycle: add service → payment → receipt → reports
- [ ] VPOS terminal from bank is active and tested
- [ ] Thermal printer connected (optional for V1)
- [ ] Cash drawer connected to printer (optional for V1)
- [ ] Tablet/device mounted at cashier station
- [ ] QR code printed for QR Pay option (from bank merchant portal)
- [ ] WhatsApp Business number configured for receipt sharing
