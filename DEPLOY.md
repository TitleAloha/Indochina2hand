# คู่มือ Deploy ReViet (ฟรีทั้งหมด)

เว็บนี้เป็น static HTML + CDN (ไม่มี build step) เลยใช้ฐานข้อมูล/Auth ฟรีจาก
**Supabase** และ host แบบ static ฟรีจาก **Vercel** หรือ **Cloudflare Pages** ได้เลย

---

## ขั้นที่ 1 — สร้างฐานข้อมูล (Supabase, ฟรี)

1. สมัคร/เข้าสู่ระบบที่ <https://supabase.com> → **New project** (เลือก plan Free)
2. รอจน project พร้อม (1-2 นาที) → เปิดเมนู **SQL Editor** → **New query**
3. เปิดไฟล์ [`supabase/schema.sql`](supabase/schema.sql) ในโปรเจกต์นี้ → copy ทั้งไฟล์ →
   paste ลงใน SQL Editor → กด **Run**
   - จะได้ตาราง, RLS policies, ฟังก์ชัน (`checkout`, `match_product`, ...), และข้อมูลตัวอย่างครบ
4. ไปที่ **Settings → API** → copy ค่า:
   - **Project URL**
   - **anon public** key
5. เปิดไฟล์ [`js/supabase-client.jsx`](js/supabase-client.jsx) แล้วแก้ 2 บรรทัดนี้:

   ```js
   const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
   ```

   แทนด้วยค่าจริงที่ copy มา (key นี้เปิดเผยได้ — RLS ใน schema.sql คือสิ่งที่ป้องกันข้อมูลจริงๆ
   **ห้าม** ใช้ค่า `service_role` key เด็ดขาด)

---

## ขั้นที่ 2 — ทดสอบบนเครื่องตัวเอง

```powershell
.\serve.ps1
```

เปิด <http://localhost:8000/> → ลองสมัครสมาชิก (เลือกเป็น Seller หรือ Buyer) →
ลองลงขายสินค้า / ช้อปสินค้า / checkout

**ตั้งบัญชีแอดมิน**: ไปที่ Supabase → **Table Editor** → ตาราง `profiles` →
หาแถวของบัญชีที่สมัครไว้ → แก้คอลัมน์ `role` เป็น `admin` → กลับมาเข้าเว็บใหม่
(sign out แล้ว sign in ใหม่) จะเห็นเมนู Admin (Matching, Finance ฯลฯ)

---

## ขั้นที่ 3 — Push โค้ดขึ้น GitHub

1. ไปที่ <https://github.com/new> → ตั้งชื่อ repo (เช่น `reviet`) → **ห้ามติ๊ก**
   "Add a README" (เรามีไฟล์อยู่แล้ว) → **Create repository**
2. ในโฟลเดอร์โปรเจกต์ รันคำสั่งต่อไปนี้ (แทน `<URL>` ด้วย URL ของ repo ที่สร้าง):

   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <URL>
   git push -u origin main
   ```

---

## ขั้นที่ 4 — Deploy ฟรีด้วย Vercel (หรือ Cloudflare Pages)

### Vercel
1. เข้า <https://vercel.com> → Sign up / Login ด้วย GitHub
2. **Add New… → Project** → เลือก repo `reviet`
3. ตั้งค่า:
   - **Framework Preset**: Other
   - **Build Command**: เว้นว่าง (ไม่ต้องมี)
   - **Output Directory**: `./` (root)
4. กด **Deploy** → รอประมาณ 30 วินาที → ได้ลิงก์ฟรีทันที เช่น
   `https://reviet.vercel.app`

### หรือ Cloudflare Pages
1. เข้า <https://dash.cloudflare.com> → **Workers & Pages** → **Create application → Pages
   → Connect to Git** → เลือก repo `reviet`
2. ตั้งค่า:
   - **Build command**: เว้นว่าง
   - **Build output directory**: `/`
3. กด **Save and Deploy** → ได้ลิงก์ เช่น `https://reviet.pages.dev`

ทั้งสองตัวจะ **deploy ใหม่อัตโนมัติทุกครั้งที่ `git push`** ขึ้น branch `main`

---

## ขั้นที่ 5 — อัปเดตเว็บในอนาคต

แก้โค้ด → commit → push:

```powershell
git add .
git commit -m "อธิบายสิ่งที่แก้"
git push
```

แค่นี้เว็บที่ deploy ไว้จะอัปเดตอัตโนมัติ
