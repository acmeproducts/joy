# Talk + Say · v3.4 — Test Scripts

**Dual Language: English / Thai · ภาษาอังกฤษ / ภาษาไทย**  
Cross-referenced to v3.4 Build Specification · March 2026

> **Actors:** Alice = Device A (Chrome desktop) · Joy = Device B (Safari mobile)  
> **Legend:** ✅ Pass · ❌ Fail · ➖ N/A · Ref = structured test ID cross-reference

---

## Part A — Structured Tests / การทดสอบแบบมีโครงสร้าง

Each test maps 1-to-1 with a requirement in the v3.4 Build Spec.

---

### A1 · Onboarding / การเริ่มต้นใช้งาน

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T101** | Clear localStorage. Open app. | ล้าง localStorage เปิดแอป | Full-screen overlay with name input + Continue button. No other UI visible behind it. | หน้าจอ overlay เต็มจอพร้อมช่องชื่อ + ปุ่มดำเนินการ ไม่มี UI อื่นด้านหลัง | ✅ ❌ ➖ |
| **T102** | Type "Alice". Tap Continue. | พิมพ์ "Alice" กดดำเนินการต่อ | Overlay closes. `prefs.globalName="Alice"`. Never shown again on reload. | Overlay ปิด `prefs.globalName="Alice"` ไม่แสดงอีกเมื่อโหลดใหม่ | ✅ ❌ ➖ |
| **T103** | Leave name empty. Tap Continue. | ปล่อยช่องชื่อว่าง กดดำเนินการต่อ | Nothing happens. Overlay stays. Inline validation shown. | ไม่มีอะไรเกิดขึ้น overlay ยังอยู่ แสดงการตรวจสอบ inline | ✅ ❌ ➖ |

---

### A2 · New Session Flow / การสร้างการสนทนาใหม่

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T201** | Tap + to create session. | แตะ + เพื่อสร้างเซสชัน | Name field pre-fills with "Alice". No edit required to proceed. | ช่องชื่อเติม "Alice" ล่วงหน้า ไม่ต้องแก้ไขเพื่อดำเนินการต่อ | ✅ ❌ ➖ |
| **T202** | Tap +. Start Chat without editing name. | แตะ + กด Start Chat โดยไม่แก้ไขชื่อ | No two-option prompt. Card: "Alice / Invite Pending — [datetime]". | ไม่มีหน้าต่างตัวเลือก การ์ด: "Alice / Invite Pending — [วันเวลา]" | ✅ ❌ ➖ |
| **T203** | Tap +. Change name to "Al". Start Chat → "this chat only". | แตะ + เปลี่ยนชื่อเป็น "Al" Start Chat → "เฉพาะแชทนี้" | `myHandle="Al"`. `prefs.globalName` still "Alice". Next session pre-fills "Alice". | `myHandle="Al"` `prefs.globalName` ยังเป็น "Alice" เซสชันถัดไปแสดง "Alice" | ✅ ❌ ➖ |
| **T204** | Tap +. Change name to "A". Start Chat → "also update default". | แตะ + เปลี่ยนชื่อเป็น "A" Start Chat → "อัปเดตค่าเริ่มต้นด้วย" | `myHandle="A"`. `prefs.globalName="A"`. Next session pre-fills "A". | `myHandle="A"` `prefs.globalName="A"` เซสชันถัดไปแสดง "A" | ✅ ❌ ➖ |

---

### A3 · In-Session Name Editing / การแก้ไขชื่อในเซสชัน

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T301** | Open session. Tap owner name in header. | เปิดเซสชัน แตะชื่อเจ้าของในส่วนหัว | Owner label becomes editable inline. Cursor appears. | ป้ายชื่อแก้ไขได้ inline ปรากฏเคอร์เซอร์ | ✅ ❌ ➖ |
| **T302** | Edit owner name to "Bob". Tap elsewhere → "this chat only". | แก้ไขชื่อเป็น "Bob" แตะที่อื่น → "เฉพาะแชทนี้" | Header shows "Bob". Card updates to "Bob / Joy". Other sessions unchanged. | ส่วนหัวแสดง "Bob" การ์ดอัปเดตเป็น "Bob / Joy" เซสชันอื่นไม่เปลี่ยน | ✅ ❌ ➖ |
| **T303** | Edit owner name → choose "also update default". | แก้ไขชื่อ → เลือก "อัปเดตค่าเริ่มต้นด้วย" | `prefs.globalName` updated. New sessions pre-fill with new name. | `prefs.globalName` อัปเดต เซสชันใหม่แสดงชื่อใหม่ล่วงหน้า | ✅ ❌ ➖ |
| **T304** | Have 2 sessions. In session 1 rename self so me/partner label matches session 2. | มี 2 เซสชัน ในเซสชัน 1 เปลี่ยนชื่อตัวเองให้ป้ายตรงกับเซสชัน 2 | Toast: "A session with this name already exists." Name reverts. | Toast: "มีเซสชันที่ใช้ชื่อนี้อยู่แล้ว" ชื่อกลับคืน | ✅ ❌ ➖ |
| **T305** | Open session with connected partner. Tap partner name in header. | เปิดเซสชัน แตะชื่อคู่สนทนาในส่วนหัว | Nothing. No cursor. Not editable. | ไม่มีอะไร ไม่มีเคอร์เซอร์ แก้ไขไม่ได้ | ✅ ❌ ➖ |
| **T306** | Begin editing name in header. Partner sends message (triggers hello). | เริ่มแก้ไขชื่อในส่วนหัว คู่สนทนาส่งข้อความ (ทริกเกอร์ hello) | Edit field stays active. In-progress edit not overwritten. | ช่องแก้ไขยังทำงาน ข้อความที่กำลังแก้ไขไม่ถูกเขียนทับ | ✅ ❌ ➖ |
| **T307** | Change name in header. Send new message. | เปลี่ยนชื่อในส่วนหัว ส่งข้อความใหม่ | New bubble shows updated name. Previous bubbles retain old name. | บับเบิลใหม่แสดงชื่อที่อัปเดต บับเบิลก่อนหน้าแสดงชื่อเดิม | ✅ ❌ ➖ |

---

### A4 · Session Card and Presence / การ์ดเซสชันและสถานะออนไลน์

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T401** | Create session. Partner joins as "Joy". | สร้างเซสชัน คู่สนทนาเข้าร่วมในชื่อ "Joy" | Session card shows "Alice / Joy". | การ์ดเซสชันแสดง "Alice / Joy" | ✅ ❌ ➖ |
| **T402** | Create session. Do not share invite. | สร้างเซสชัน ไม่แชร์ลิงก์เชิญ | Card: "Alice / Invite Pending — [datetime]". | การ์ด: "Alice / Invite Pending — [วันเวลา]" | ✅ ❌ ➖ |
| **T403** | Partner connects and sends message. Reload page. | คู่สนทนาเชื่อมต่อและส่งข้อความ โหลดหน้าใหม่ | Presence dot tooltip shows last seen time — not "Not seen yet". | Tooltip แสดงเวลาที่เห็นล่าสุด ไม่ใช่ "Not seen yet" | ✅ ❌ ➖ |
| **T404** | Partner joins session. | คู่สนทนาเข้าร่วมเซสชัน | System note reads "[PartnerName] joined", not "Partner joined". | ข้อความระบบแสดง "[ชื่อคู่สนทนา] joined" ไม่ใช่ "Partner joined" | ✅ ❌ ➖ |
| **T405** | Close and reopen app 3 times within 5 minutes. | ปิดและเปิดแอปใหม่ 3 ครั้งภายใน 5 นาที | At most one "You joined" system note in that 5-minute window. | มีข้อความ "You joined" ไม่เกิน 1 รายการในช่วง 5 นาที | ✅ ❌ ➖ |

---

### A5 · Ribbon and Header UI / แถบฟังก์ชันและส่วนหัว

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T501** | Open the app. | เปิดแอป | Ribbon contains exactly: hamburger · phrasebook · globe · spacer · auto-read icon+toggle. Nothing else. | แถบมีเพียง: hamburger · phrasebook · globe · spacer · ไอคอน auto-read + toggle เท่านั้น | ✅ ❌ ➖ |
| **T502** | Open hamburger panel. | เปิดแผงเมนู hamburger | No name input field. Gear icon is first element in top row. | ไม่มีช่องกรอกชื่อ ไอคอนฟันเฟืองเป็นองค์ประกอบแรกในแถวบน | ✅ ❌ ➖ |
| **T503** | Tap globe icon. | แตะไอคอนลูกโลก | Bottom sheet: 🌐 Auto-detect first. Then 21 languages with flag emoji + full name. No abbreviations. | Bottom sheet: 🌐 Auto-detect เป็นอันแรก จากนั้น 21 ภาษาพร้อมธงชาติ + ชื่อเต็ม ไม่มีตัวย่อ | ✅ ❌ ➖ |
| **T504** | Select Thai from language modal. | เลือกภาษาไทยจากหน้าต่างภาษา | Globe shows 🇹🇭. `prefs.myLang="th"`. Partner receives hello with `lang=th`. | Globe แสดง 🇹🇭 `prefs.myLang="th"` คู่สนทนารับ hello ที่มี `lang=th` | ✅ ❌ ➖ |
| **T505** | Tap auto-read toggle in ribbon. | แตะ toggle auto-read ในแถบ | Toggle on. Speaker icon turns teal. No autoread-bar strip anywhere. | Toggle เปิด ไอคอนลำโพงเปลี่ยนเป็นสีเทียล ไม่มีแถบ autoread | ✅ ❌ ➖ |
| **T506** | Enable auto-read. Look for dismiss strip. | เปิด auto-read มองหาแถบปิด | No bar with an X appears anywhere below the ribbon. | ไม่มีแถบที่มีปุ่ม X ปรากฏใต้แถบฟังก์ชัน | ✅ ❌ ➖ |
| **T507** | Tap phrasebook icon in ribbon. | แตะไอคอน phrasebook ในแถบ | Phrasebook screen opens correctly. | หน้าจอ phrasebook เปิดขึ้นอย่างถูกต้อง | ✅ ❌ ➖ |

---

### A6 · Delivery Status Tooltips / Tooltip สถานะการส่ง

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T601** | Send a message. Hover the single status dot on the bubble. | ส่งข้อความ วางเมาส์เหนือจุดสถานะเดียวบนบับเบิล | Tooltip shows "Sent [time]". | Tooltip แสดง "Sent [เวลา]" | ✅ ❌ ➖ |
| **T602** | Partner receives (ack arrives). Hover the double dot. | คู่สนทนารับข้อความ (ack มาถึง) วางเมาส์เหนือสองจุด | Tooltip shows "Delivered [time]". | Tooltip แสดง "Delivered [เวลา]" | ✅ ❌ ➖ |

---

### A7 · Multi-Device / หลายอุปกรณ์

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T701** | Open a session. Tap share icon on session card. | เปิดเซสชัน แตะไอคอนแชร์บนการ์ดเซสชัน | URL shown is `?devicejoin=…` — NOT `?invite=…` | URL ที่แสดงคือ `?devicejoin=…` — ไม่ใช่ `?invite=…` | ✅ ❌ ➖ |
| **T702** | Copy device-join URL. Open on second device (different browser). | คัดลอก device-join URL เปิดบนอุปกรณ์ที่สอง (เบราว์เซอร์ต่างกัน) | Session opens. PART_ID identical on both devices. Message history loads (up to 500 msgs). | เซสชันเปิด PART_ID เหมือนกันทั้งสองอุปกรณ์ โหลดประวัติข้อความ (สูงสุด 500) | ✅ ❌ ➖ |
| **T703** | Send message from Device A. Observe on Device B. | ส่งข้อความจากอุปกรณ์ A ดูบนอุปกรณ์ B | Message renders on the RIGHT side ("mine") on Device B. | ข้อความแสดงทางขวา ("ของฉัน") บนอุปกรณ์ B | ✅ ❌ ➖ |
| **T704** | Alter one character in the `?devicejoin=` URL. Open it. | แก้ไขหนึ่งอักขระใน URL `?devicejoin=` แล้วเปิด | Toast: "This link is not valid. Use the share icon on the session card." | Toast: "ลิงก์นี้ไม่ถูกต้อง ใช้ไอคอนแชร์บนการ์ดเซสชัน" | ✅ ❌ ➖ |
| **T705** | Copy address bar URL (no params). Open on second device. | คัดลอก URL จากแถบที่อยู่ (ไม่มี params) เปิดบนอุปกรณ์ที่สอง | App opens to empty shell. No error. No session bleed. | แอปเปิดหน้าว่าง ไม่มีข้อผิดพลาด ไม่มีข้อมูลรั่วข้ามเซสชัน | ✅ ❌ ➖ |

---

### A8 · Transport Regression / การถดถอยของระบบส่ง

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T801** | Leave both devices idle 12 min. Send message. | ปล่อยทั้งสองอุปกรณ์ว่าง 12 นาที ส่งข้อความ | Delivers. No refresh needed. Dot briefly yellow → green. | ส่งถึง ไม่ต้อง refresh สัญญาณเหลืองชั่วขณะแล้วกลับเขียว | ✅ ❌ ➖ |
| **T802** | Disconnect one device (airplane). Send 3 messages from other. Reconnect. | ตัดการเชื่อมต่ออุปกรณ์หนึ่ง ส่ง 3 ข้อความจากอีกอุปกรณ์ เชื่อมต่อใหม่ | All 3 appear. Diag log shows BACKFILL with correct count. | ข้อความทั้ง 3 ปรากฏ บันทึก diag แสดง BACKFILL ถูกต้อง | ✅ ❌ ➖ |
| **T803** | Reconnect after 30-second disconnect. | เชื่อมต่อใหม่หลังตัดการเชื่อมต่อ 30 วินาที | Diag: exactly one TX hello. No message flood. No full-page repaint. | Diag: TX hello หนึ่งครั้งเท่านั้น ไม่มีข้อความท่วม ไม่แสดงผลใหม่ทั้งหน้า | ✅ ❌ ➖ |
| **T804** | Partner starts typing then stops. | คู่สนทนาเริ่มพิมพ์แล้วหยุด | Typing indicator disappears within 1.5 seconds of last keystroke. | ตัวบ่งชี้การพิมพ์หายไปภายใน 1.5 วินาที | ✅ ❌ ➖ |

---

### A9 · Feature Regression / การถดถอยของฟีเจอร์

| ID | Steps (EN) | Steps (TH) | Expected (EN) | Expected (TH) | Result |
|----|-----------|-----------|--------------|--------------|--------|
| **T901** | Receive a message. Tap Save on bubble. | รับข้อความ แตะ Save บนบับเบิล | Phrase saves. Toast confirms. Phrasebook shows entry. | บันทึกวลี Toast ยืนยัน phrasebook แสดงรายการ | ✅ ❌ ➖ |
| **T902** | Open back-translate panel on a bubble. | เปิดแผง back-translate บนบับเบิล | Translation renders. Quality label shown. Verdict buttons work. | การแปลแสดง ป้ายคุณภาพปรากฏ ปุ่ม verdict ทำงาน | ✅ ❌ ➖ |
| **T903** | Add clarify note to a received bubble. | เพิ่มหมายเหตุ clarify ในบับเบิลที่รับ | Note in thread. Partner sees it. | หมายเหตุอยู่ในเธรด คู่สนทนาเห็น | ✅ ❌ ➖ |
| **T904** | Tap export icon on session card. | แตะไอคอนส่งออกบนการ์ดเซสชัน | Text file downloads with correct session name and messages. | ดาวน์โหลดไฟล์ข้อความพร้อมชื่อและข้อความที่ถูกต้อง | ✅ ❌ ➖ |
| **T905** | Tap Use on a bubble. | แตะ Use บนบับเบิล | Text inserts into composer. Phrasebook closes if open. | ข้อความถูกแทรกในช่องพิมพ์ phrasebook ปิดหากเปิดอยู่ | ✅ ❌ ➖ |

---

## Part B — Use-Case Scripts / สคริปต์แบบกรณีใช้งาน

Narrative scenarios. Each step shows the action and expected outcome side-by-side in English and Thai. The **Ref** column maps each step back to its structured test ID(s) in Part A.

---

### UC-1 · Alice sets up the app for the first time
### UC-1 · Alice ตั้งค่าแอปเป็นครั้งแรก

> **Scenario:** Alice installs the app and starts a session with Joy.  
> **สถานการณ์:** Alice ติดตั้งแอปและเริ่มเซสชันกับ Joy

| # | English — Action & Expectation | Thai — การกระทำ & ความคาดหวัง | Result | Ref |
|---|-------------------------------|------------------------------|--------|-----|
| 1 | Alice opens app. Full-screen prompt: "What's your name?" No other UI visible. | Alice เปิดแอป หน้าจอเต็มถาม "ชื่อของคุณคืออะไร?" ไม่มี UI อื่น | ✅ ❌ | T101 |
| 2 | Alice types "Alice", taps Continue. App shell appears. | Alice พิมพ์ "Alice" กด Continue หน้าหลักปรากฏ | ✅ ❌ | T102 |
| 3 | Alice taps +. Name field pre-shows "Alice". | Alice แตะ + ช่องชื่อแสดง "Alice" อยู่แล้ว | ✅ ❌ | T201 |
| 4 | Alice taps Start Chat without editing. Card: "Alice / Invite Pending — [datetime]". | Alice กด Start Chat โดยไม่แก้ไข การ์ด: "Alice / Invite Pending — [วันเวลา]" | ✅ ❌ | T202, T402 |
| 5 | Alice taps share icon on session card. A `?devicejoin=` URL appears. She sends it to Joy via LINE. | Alice แตะไอคอนแชร์ URL `?devicejoin=` ปรากฏ เธอส่งให้ Joy ทาง LINE | ✅ ❌ | T701 |
| 6 | Joy opens link. Card updates to "Alice / Joy". System note: "Joy joined". | Joy เปิดลิงก์ การ์ดอัปเดตเป็น "Alice / Joy" ข้อความระบบ: "Joy joined" | ✅ ❌ | T401, T404 |

---

### UC-2 · Alice changes her display name mid-conversation
### UC-2 · Alice เปลี่ยนชื่อที่แสดงระหว่างการสนทนา

> **Scenario:** Alice wants to go by "Ali" in this chat only, keeping "Alice" as her default.  
> **สถานการณ์:** Alice ต้องการให้เรียกว่า "Ali" ในแชทนี้เท่านั้น เก็บ "Alice" ไว้เป็นค่าเริ่มต้น

| # | English — Action & Expectation | Thai — การกระทำ & ความคาดหวัง | Result | Ref |
|---|-------------------------------|------------------------------|--------|-----|
| 1 | Alice and Joy connected. Alice has sent 3 messages shown as "Alice". | Alice และ Joy เชื่อมต่ออยู่ Alice ส่งข้อความ 3 รายการในชื่อ "Alice" | ✅ ❌ | T401 |
| 2 | Alice taps her name in the chat header. It becomes editable inline. | Alice แตะชื่อตัวเองในส่วนหัว กลายเป็นแก้ไขได้ inline | ✅ ❌ | T301 |
| 3 | Alice types "Ali" and taps elsewhere. A two-option prompt appears. | Alice พิมพ์ "Ali" แตะที่อื่น หน้าต่างสองตัวเลือกปรากฏ | ✅ ❌ | T302 |
| 4 | Alice chooses "this chat only". Header shows "Ali". Card: "Ali / Joy". | Alice เลือก "เฉพาะแชทนี้" ส่วนหัวแสดง "Ali" การ์ด: "Ali / Joy" | ✅ ❌ | T302, T401 |
| 5 | Alice sends new message. New bubble shows "Ali". Previous 3 still show "Alice". | Alice ส่งข้อความใหม่ บับเบิลใหม่แสดง "Ali" บับเบิล 3 รายการก่อนยังแสดง "Alice" | ✅ ❌ | T307 |
| 6 | Joy taps Alice's name in Joy's header. Nothing happens — display only. | Joy แตะชื่อ Alice ในส่วนหัวของ Joy ไม่มีอะไรเกิดขึ้น — แสดงเพียงอย่างเดียว | ✅ ❌ | T305 |
| 7 | Alice creates a new session. Name pre-fills "Alice" — global default unchanged. | Alice สร้างเซสชันใหม่ ช่องชื่อเติม "Alice" ล่วงหน้า — ค่าเริ่มต้นทั่วโลกไม่เปลี่ยน | ✅ ❌ | T201, T203 |

---

### UC-3 · Language switching mid-chat
### UC-3 · การเปลี่ยนภาษาระหว่างแชท

> **Scenario:** Alice explicitly sets English; Joy sets Thai. Both receive correct translations.  
> **สถานการณ์:** Alice ตั้งภาษาอังกฤษ Joy ตั้งภาษาไทย ทั้งคู่รับการแปลที่ถูกต้อง

| # | English — Action & Expectation | Thai — การกระทำ & ความคาดหวัง | Result | Ref |
|---|-------------------------------|------------------------------|--------|-----|
| 1 | Alice taps the globe 🌐 in the ribbon. A language bottom sheet opens. | Alice แตะลูกโลก 🌐 ในแถบ หน้าต่าง bottom sheet เลือกภาษาเปิดขึ้น | ✅ ❌ | T503 |
| 2 | Sheet shows: 🌐 Auto-detect at top, then 21 languages — flag + full name, no codes. | Sheet แสดง: 🌐 Auto-detect ที่ด้านบน จากนั้น 21 ภาษา — ธงชาติ + ชื่อเต็ม ไม่มีรหัส | ✅ ❌ | T503 |
| 3 | Alice selects "English". Globe button now shows 🇺🇸. | Alice เลือก "อังกฤษ" ปุ่ม globe แสดง 🇺🇸 | ✅ ❌ | T504 |
| 4 | Joy opens her language sheet, selects Thai 🇹🇭. Joy's app translates Alice's English into Thai. | Joy เปิดหน้าต่างภาษา เลือกไทย 🇹🇭 แอปของ Joy แปลข้อความอังกฤษของ Alice เป็นไทย | ✅ ❌ | T504 |
| 5 | Alice sends "Where is the market?" Joy receives correct Thai translation. | Alice ส่ง "Where is the market?" Joy รับการแปลภาษาไทยได้ถูกต้อง | ✅ ❌ | T504 |

---

### UC-4 · Alice continues the conversation on her tablet
### UC-4 · Alice ดำเนินการสนทนาต่อบนแท็บเล็ต

> **Scenario:** Alice started a chat on her phone. She picks it up on her tablet using the device-join flow.  
> **สถานการณ์:** Alice เริ่มแชทบนโทรศัพท์ เธอดำเนินการต่อบนแท็บเล็ตผ่าน device-join

| # | English — Action & Expectation | Thai — การกระทำ & ความคาดหวัง | Result | Ref |
|---|-------------------------------|------------------------------|--------|-----|
| 1 | Alice taps share icon on "Alice / Joy" card. A `?devicejoin=` URL appears. | Alice แตะไอคอนแชร์บนการ์ด "Alice / Joy" URL `?devicejoin=` ปรากฏ | ✅ ❌ | T701 |
| 2 | Alice opens URL on tablet (different browser, fresh localStorage). | Alice เปิด URL บนแท็บเล็ต (เบราว์เซอร์ต่างกัน localStorage ใหม่) | ✅ ❌ | T702 |
| 3 | Tablet loads session. PART_ID from phone is now on tablet. History loads (up to 500 msgs). | แท็บเล็ตโหลดเซสชัน PART_ID จากโทรศัพท์อยู่บนแท็บเล็ต ประวัติโหลด (สูงสุด 500) | ✅ ❌ | T702 |
| 4 | Alice sends "Hello from tablet". On her phone the same message appears on the RIGHT (mine). | Alice ส่ง "Hello from tablet" บนโทรศัพท์ข้อความเดียวกันปรากฏทางขวา (ของฉัน) | ✅ ❌ | T703 |
| 5 | Joy sends a reply. It arrives on both of Alice's devices simultaneously. | Joy ส่งการตอบกลับ ข้อความมาถึงทั้งสองอุปกรณ์ของ Alice พร้อมกัน | ✅ ❌ | T702, T703 |
| 6 | Someone tampers with the URL. Shows: "This link is not valid. Use the share icon." | มีคนแก้ไข URL แสดง: "ลิงก์นี้ไม่ถูกต้อง ใช้ไอคอนแชร์บนการ์ดเซสชัน" | ✅ ❌ | T704 |

---

### UC-5 · Connection drops while phone sleeps — auto-recovery
### UC-5 · การเชื่อมต่อหลุดขณะโทรศัพท์สลีป — ฟื้นตัวอัตโนมัติ

> **Scenario:** Alice's phone sleeps for 15 minutes. She wakes it and expects the chat to resume without a refresh.  
> **สถานการณ์:** โทรศัพท์ Alice สลีป 15 นาที เธอปลุกมันและคาดว่าแชทจะดำเนินต่อโดยไม่ต้อง refresh

| # | English — Action & Expectation | Thai — การกระทำ & ความคาดหวัง | Result | Ref |
|---|-------------------------------|------------------------------|--------|-----|
| 1 | Alice and Joy exchange messages. Both connections show green. | Alice และ Joy แลกเปลี่ยนข้อความ การเชื่อมต่อทั้งสองแสดงสีเขียว | ✅ ❌ | T801 |
| 2 | Alice's screen locks. 15 minutes pass. Joy sends 3 more messages. | หน้าจอ Alice ล็อค ผ่านไป 15 นาที Joy ส่งข้อความอีก 3 รายการ | ✅ ❌ | T801, T802 |
| 3 | Alice unlocks phone. App auto-reconnects. Diag: "VISIBILITY return — reconnecting". | Alice ปลุกโทรศัพท์ แอปเชื่อมต่อใหม่อัตโนมัติ Diag: "VISIBILITY return — reconnecting" | ✅ ❌ | T801 |
| 4 | Joy's 3 messages appear via backfill. Alice replies. No browser refresh needed. | ข้อความ 3 รายการของ Joy ปรากฏผ่าน backfill Alice ตอบกลับ ไม่ต้อง refresh | ✅ ❌ | T802 |
| 5 | Diag: exactly one TX hello post-reconnect. No message flood. No full-page repaint. | Diag: TX hello หนึ่งครั้งหลังเชื่อมต่อใหม่ ไม่มีข้อความท่วม ไม่แสดงผลใหม่ทั้งหน้า | ✅ ❌ | T803 |

---

### UC-6 · Joy saves a phrase, annotates it, and verifies translation quality
### UC-6 · Joy บันทึกวลี เพิ่มหมายเหตุ และตรวจสอบคุณภาพการแปล

> **Scenario:** Joy receives a useful English phrase, saves it, clarifies it, and back-translates to verify accuracy.  
> **สถานการณ์:** Joy ได้รับวลีอังกฤษที่มีประโยชน์ บันทึก เพิ่มหมายเหตุ และ back-translate เพื่อตรวจสอบ

| # | English — Action & Expectation | Thai — การกระทำ & ความคาดหวัง | Result | Ref |
|---|-------------------------------|------------------------------|--------|-----|
| 1 | Alice sends: "Where is the nearest BTS station?" Joy's bubble shows Thai translation. | Alice ส่ง: "Where is the nearest BTS station?" บับเบิลของ Joy แสดงการแปลภาษาไทย | ✅ ❌ | T901 |
| 2 | Joy taps Save on the bubble. Toast: "Saved to phrasebook". | Joy แตะ Save บนบับเบิล Toast: "Saved to phrasebook" | ✅ ❌ | T901 |
| 3 | Joy taps Clarify and types: "Use when asking taxi drivers." Thread shows the note. | Joy แตะ Clarify พิมพ์: "ใช้เมื่อถามคนขับแท็กซี่" เธรดแสดงหมายเหตุ | ✅ ❌ | T903 |
| 4 | Joy opens back-translate. Thai renders back to English. Quality label: "Good match". Verdict buttons respond. | Joy เปิด back-translate ภาษาไทยแปลกลับเป็นอังกฤษ ป้ายคุณภาพ: "Good match" ปุ่ม verdict ตอบสนอง | ✅ ❌ | T902 |
| 5 | Joy taps phrasebook icon in ribbon. Saved phrase appears with clarify note attached. | Joy แตะไอคอน phrasebook ในแถบ วลีที่บันทึกปรากฏพร้อมหมายเหตุ clarify | ✅ ❌ | T507, T901 |
| 6 | Joy taps Use. Phrase inserts into composer. Phrasebook screen closes. | Joy แตะ Use วลีถูกแทรกในช่องพิมพ์ หน้าจอ phrasebook ปิดลง | ✅ ❌ | T905 |

---

### UC-7 · Name collision is detected and blocked
### UC-7 · ตรวจพบและบล็อกการชนกันของชื่อ

> **Scenario:** Alice has "Alice / Joy" and "Alice / Bob". She tries to create a second session with Joy, triggering a collision.  
> **สถานการณ์:** Alice มี "Alice / Joy" และ "Alice / Bob" เธอพยายามสร้างเซสชันที่สองกับ Joy ทำให้เกิดการชน

| # | English — Action & Expectation | Thai — การกระทำ & ความคาดหวัง | Result | Ref |
|---|-------------------------------|------------------------------|--------|-----|
| 1 | Alice has two session cards: "Alice / Joy" and "Alice / Bob". | Alice มีการ์ดเซสชันสอง: "Alice / Joy" และ "Alice / Bob" | ✅ ❌ | T401 |
| 2 | Alice taps + and creates a third session. Joy joins. Card would be "Alice / Joy" — same as session 1. | Alice แตะ + สร้างเซสชันที่สาม Joy เข้าร่วม การ์ดจะเป็น "Alice / Joy" — เหมือนเซสชันที่ 1 | ✅ ❌ | T304 |
| 3 | App detects collision. Toast: "A session with this name already exists. Choose a different name." | แอปตรวจพบการชน Toast: "มีเซสชันที่ใช้ชื่อนี้อยู่แล้ว เลือกชื่ออื่น" | ✅ ❌ | T304 |
| 4 | Alice renames herself "Alice2" in the new session. Card: "Alice2 / Joy". No conflict. | Alice เปลี่ยนชื่อเป็น "Alice2" ในเซสชันใหม่ การ์ด: "Alice2 / Joy" ไม่มีการขัดแย้ง | ✅ ❌ | T302, T304 |
| 5 | Alice tries to rename back to "Alice" in session 3. Collision detected again. Name reverts. | Alice พยายามเปลี่ยนชื่อกลับเป็น "Alice" ในเซสชัน 3 ตรวจพบการชนอีกครั้ง ชื่อกลับคืน | ✅ ❌ | T304 |

---

### UC-8 · Joy uses auto-read while cooking — no hands needed
### UC-8 · Joy ใช้ auto-read ขณะทำอาหาร — ไม่ต้องใช้มือ

> **Scenario:** Joy is cooking and cannot look at her phone. She enables auto-read from the ribbon and gets all incoming messages spoken aloud.  
> **สถานการณ์:** Joy กำลังทำอาหารและไม่สามารถดูโทรศัพท์ได้ เธอเปิด auto-read จากแถบและรับข้อความทางเสียง

| # | English — Action & Expectation | Thai — การกระทำ & ความคาดหวัง | Result | Ref |
|---|-------------------------------|------------------------------|--------|-----|
| 1 | Joy taps speaker toggle in ribbon. Icon turns teal. Toggle switches on. | Joy แตะ toggle ลำโพงในแถบ ไอคอนเปลี่ยนเป็นสีเทียล Toggle เปิดขึ้น | ✅ ❌ | T505 |
| 2 | No "Auto-read" bar with X button appears below the ribbon. Toggle is the only control. | ไม่มีแถบ "Auto-read" พร้อมปุ่ม X ใต้แถบ Toggle เป็นตัวควบคุมเดียว | ✅ ❌ | T505, T506 |
| 3 | Alice sends: "Dinner ready?" Joy's phone reads aloud: "อาหารเย็นพร้อมหรือยัง?" | Alice ส่ง: "Dinner ready?" โทรศัพท์ Joy อ่านออกเสียง: "อาหารเย็นพร้อมหรือยัง?" | ✅ ❌ | T505 |
| 4 | Alice sends another message. Also spoken aloud without Joy touching the phone. | Alice ส่งข้อความอีกรายการ ถูกอ่านออกเสียงโดยที่ Joy ไม่ต้องแตะโทรศัพท์ | ✅ ❌ | T505 |
| 5 | Joy finishes cooking. Taps toggle again. Off. Speaker icon returns to grey. Next message is silent. | Joy ทำอาหารเสร็จ แตะ toggle อีกครั้ง ปิด ไอคอนลำโพงกลับเป็นสีเทา ข้อความถัดไปเงียบ | ✅ ❌ | T505 |

---

*Talk + Say v3.4 · Test Scripts: Structured & Use-Case · English / Thai · March 2026*
