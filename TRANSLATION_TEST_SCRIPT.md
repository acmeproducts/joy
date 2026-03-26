# Translation Test Script
**App:** Talk + Say (`test.html`)
**Last updated:** 2026-03-26

---

## Devices Required
| Label | Device | Role |
|---|---|---|
| **Device A** | Laptop / Desktop | Initiator (creates invite) |
| **Device B** | S23 / Mobile | Responder (joins via invite) |

---

## Global Pre-conditions (both scripts)
1. Both devices have the app open and loaded fresh (hard-reload if needed)
2. No active session exists on either device
3. Network connectivity confirmed on both devices
4. Diagnostics panel available on both (for verification)

---

# Script 1 — Device A: English · Device B: Thai

### Script 1 Setup
| Step | Device | Action |
|---|---|---|
| S1.1 | Device A | Open left panel → tap gear → set Language to 🇺🇸 **English** |
| S1.2 | Device B | Open left panel → tap gear → set Language to 🇹🇭 **Thai** |
| S1.3 | Device A | Tap **+** to create new session → share invite to Device B |
| S1.4 | Device B | Open invite link — confirm "Partner joined" toast appears on both |

---

### T1.1 — English → Thai

| Field | Detail |
|---|---|
| **Test #** | T1.1 |
| **Scenario** | Device A sends English; Device B should receive Thai translation |
| **Pre-test** | Script 1 Setup complete. Both devices in active session. |
| **Input** | Device A types: `Hello, how are you?` → Send |
| **Expected — Device A** | Source (EN): `Hello, how are you?` / Target (TH): `สวัสดี คุณเป็นอย่างไรบ้าง?` |
| **Expected — Device B** | Bubble shows Thai text `สวัสดี คุณเป็นอย่างไรบ้าง?` with English back-translation available |
| **Diagnostics check** | Device A log shows `TX msg src=en tgt=th` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### T1.2 — English → English (no translation)

| Field | Detail |
|---|---|
| **Test #** | T1.2 |
| **Scenario** | Both devices set to English — no translation should occur |
| **Pre-test** | Device B: change Language to 🇺🇸 **English**. Allow 3 seconds for hello to propagate. |
| **Input** | Device A types: `This should not be translated` → Send |
| **Expected — Device A** | Source (EN): `This should not be translated` / Target (EN): `This should not be translated` |
| **Expected — Device B** | Same English text displayed, no translation label |
| **Diagnostics check** | Device A log shows `TX msg src=en tgt=en` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### T1.3 — Thai → English

| Field | Detail |
|---|---|
| **Test #** | T1.3 |
| **Scenario** | Device B sends Thai; Device A should receive English translation |
| **Pre-test** | Device B: change Language back to 🇹🇭 **Thai**. Allow 3 seconds for hello to propagate. |
| **Input** | Device B types: `ฉันชื่อ S23` → Send |
| **Expected — Device A** | Source (TH): `ฉันชื่อ S23` / Target (EN): `My name is S23` |
| **Expected — Device B** | Original Thai text displayed |
| **Diagnostics check** | Device A log shows `RX msg srcLang=th myLang=en` followed by `TRANSLATE ok th>en` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### T1.4 — Thai → Thai (no translation)

| Field | Detail |
|---|---|
| **Test #** | T1.4 |
| **Scenario** | Both devices set to Thai — no translation should occur |
| **Pre-test** | Device A: change Language to 🇹🇭 **Thai**. Allow 3 seconds for hello to propagate. |
| **Input** | Device A types: `สวัสดี` → Send |
| **Expected — Device A** | Source (TH): `สวัสดี` / Target (TH): `สวัสดี` |
| **Expected — Device B** | Thai text displayed, no translation label |
| **Diagnostics check** | Device A log shows `TX msg src=th tgt=th` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### T1.5 — English → Thai (confirm restoration)

| Field | Detail |
|---|---|
| **Test #** | T1.5 |
| **Scenario** | Restore original language settings; confirm translation resumes correctly |
| **Pre-test** | Device A: change Language back to 🇺🇸 **English**. Device B: confirm still 🇹🇭 **Thai**. Allow 3 seconds. |
| **Input** | Device A types: `See you tomorrow` → Send |
| **Expected — Device A** | Source (EN): `See you tomorrow` / Target (TH): `แล้วพบกันพรุ่งนี้` |
| **Expected — Device B** | Thai translation displayed |
| **Diagnostics check** | Device A log shows `TX msg src=en tgt=th` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

---

# Script 2 — Device A: Thai · Device B: English
*(Roles reversed from Script 1)*

### Script 2 Setup
| Step | Device | Action |
|---|---|---|
| S2.1 | Device A | Open left panel → tap gear → set Language to 🇹🇭 **Thai** |
| S2.2 | Device B | Open left panel → tap gear → set Language to 🇺🇸 **English** |
| S2.3 | Device A | Close existing session. Tap **+** to create new session → share invite to Device B |
| S2.4 | Device B | Open invite link — confirm "Partner joined" toast appears on both |

---

### T2.1 — Thai → English

| Field | Detail |
|---|---|
| **Test #** | T2.1 |
| **Scenario** | Device A sends Thai; Device B should receive English translation |
| **Pre-test** | Script 2 Setup complete. Both devices in active session. |
| **Input** | Device A types: `สวัสดี คุณเป็นอย่างไรบ้าง?` → Send |
| **Expected — Device A** | Source (TH): `สวัสดี คุณเป็นอย่างไรบ้าง?` / Target (EN): `Hello, how are you?` |
| **Expected — Device B** | English text `Hello, how are you?` displayed |
| **Diagnostics check** | Device A log shows `TX msg src=th tgt=en` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### T2.2 — Thai → Thai (no translation)

| Field | Detail |
|---|---|
| **Test #** | T2.2 |
| **Scenario** | Both devices set to Thai — no translation should occur |
| **Pre-test** | Device B: change Language to 🇹🇭 **Thai**. Allow 3 seconds for hello to propagate. |
| **Input** | Device A types: `ทดสอบ` → Send |
| **Expected — Device A** | Source (TH): `ทดสอบ` / Target (TH): `ทดสอบ` |
| **Expected — Device B** | Same Thai text, no translation |
| **Diagnostics check** | Device A log shows `TX msg src=th tgt=th` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### T2.3 — English → Thai

| Field | Detail |
|---|---|
| **Test #** | T2.3 |
| **Scenario** | Device B sends English; Device A should receive Thai translation |
| **Pre-test** | Device B: change Language back to 🇺🇸 **English**. Allow 3 seconds for hello to propagate. |
| **Input** | Device B types: `My name is S23` → Send |
| **Expected — Device A** | Source (EN): `My name is S23` / Target (TH): `ฉันชื่อ S23` |
| **Expected — Device B** | Original English text displayed |
| **Diagnostics check** | Device A log shows `RX msg srcLang=en myLang=th` followed by `TRANSLATE ok en>th` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### T2.4 — English → English (no translation)

| Field | Detail |
|---|---|
| **Test #** | T2.4 |
| **Scenario** | Both devices set to English — no translation should occur |
| **Pre-test** | Device A: change Language to 🇺🇸 **English**. Allow 3 seconds for hello to propagate. |
| **Input** | Device B types: `This should not be translated` → Send |
| **Expected — Device A** | Source (EN): `This should not be translated` / Target (EN): `This should not be translated` |
| **Expected — Device B** | Same English text, no translation |
| **Diagnostics check** | Device A log shows `RX msg srcLang=en myLang=en` — no TRANSLATE call |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### T2.5 — Thai → English (confirm restoration)

| Field | Detail |
|---|---|
| **Test #** | T2.5 |
| **Scenario** | Restore original Script 2 language settings; confirm translation resumes correctly |
| **Pre-test** | Device A: change Language back to 🇹🇭 **Thai**. Device B: confirm still 🇺🇸 **English**. Allow 3 seconds. |
| **Input** | Device A types: `แล้วพบกันพรุ่งนี้` → Send |
| **Expected — Device A** | Source (TH): `แล้วพบกันพรุ่งนี้` / Target (EN): `See you tomorrow` |
| **Expected — Device B** | English translation displayed |
| **Diagnostics check** | Device A log shows `TX msg src=th tgt=en` |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## Summary Scorecard

| Test | Scenario | Result |
|---|---|---|
| T1.1 | EN → TH | ☐ Pass ☐ Fail |
| T1.2 | EN → EN (no translation) | ☐ Pass ☐ Fail |
| T1.3 | TH → EN | ☐ Pass ☐ Fail |
| T1.4 | TH → TH (no translation) | ☐ Pass ☐ Fail |
| T1.5 | EN → TH (restore) | ☐ Pass ☐ Fail |
| T2.1 | TH → EN | ☐ Pass ☐ Fail |
| T2.2 | TH → TH (no translation) | ☐ Pass ☐ Fail |
| T2.3 | EN → TH | ☐ Pass ☐ Fail |
| T2.4 | EN → EN (no translation) | ☐ Pass ☐ Fail |
| T2.5 | TH → EN (restore) | ☐ Pass ☐ Fail |

**Total: ___/10**
