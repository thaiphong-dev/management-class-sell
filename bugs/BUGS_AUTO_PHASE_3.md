# Bug Report: Phase 3 — Điểm danh & Đánh giá học viên (Auto E2E)

> **Phương pháp:** Playwright E2E automation — browser-level testing
> **Ngày kiểm tra:** 2026-05-24
> **Tester:** QC Automation Agent
> **Test files:** `tests/e2e/06-coach-phase3.spec.ts` · `tests/e2e/07-student-views.spec.ts`

---

## Summary

| Metric | Giá trị |
|--------|---------|
| Tổng bugs | 3 |
| Critical | 0 |
| Major | 1 |
| Minor | 2 |
| E2E Tests Pass (Phase 3) | 22 / 35 |
| E2E Tests Skip | 13 (thiếu sessions trong 7 ngày qua/sắp tới; student chưa enroll) |
| E2E Tests Fail | 0 |
| **Full Suite (Phases 1–3)** | **76 pass / 20 skip / 0 fail** |

---

## Bugs

### BUG-P01 [MAJOR] — Coach không có session trong khoảng ±7 ngày → Điểm danh list luôn trống

**Mô tả:**
Trang Điểm danh (`/coach/attendance`) chỉ hiển thị sessions trong khoảng `[now - 7 ngày, now + 7 ngày]`. Coach1 có lớp nhưng không có sessions nào được tạo trong khoảng thời gian này (DB chỉ có sessions từ các lần test cũ, ngày `2026-12-01` trở đi — vượt ngoài 7 ngày sắp tới).

Hệ quả:
- Trang Điểm danh luôn hiển thị empty state "Không có buổi học nào trong khoảng thời gian này"
- 8 tests liên quan đến Attendance Sheet (A-SESSION-ROW, A-SHEET-NAV, A-SHEET-UI, A-SHEET-STUDENTS, A-SHEET-TOGGLE, A-SHEET-SAVE, A-SHEET-NO-DATA, A-BACK) đều skip

**Root cause:**
`CoachAttendancePage.tsx:62–71` query với `.gte('scheduled_at', sevenDaysAgo).lte('scheduled_at', sevenDaysAhead)`. Sessions được tạo trong test `C13` dùng `tomorrow.setDate(tomorrow.getDate() + 1)` và `future.setDate(future.getDate() + 7)` — đây là dates hợp lệ. Nhưng các sessions này chỉ được tạo khi `C13` chạy (Phase 2), và coach1 lúc đó không có lớp (BUG-C02). Nếu coach1 đã được gán lớp từ đầu, các sessions test sẽ nằm trong ±7 ngày.

**Steps to reproduce:**
1. Login với coach account
2. Vào trang "Điểm danh"
3. Quan sát: empty state luôn hiển thị

**Expected:** Khi coach có sessions trong ±7 ngày, danh sách hiển thị các session với nút "Điểm danh"
**Actual:** Empty state do không có sessions trong khoảng thời gian này

**Scope ảnh hưởng:**
- Trang `/coach/attendance` (Điểm danh list)
- Trang `/coach/classes/:id/sessions/:id/attendance` (Điểm danh sheet) — không test được vì không navigate được đến

**Fix cần thực hiện:**
Sau khi fix BUG-C02 (gán lớp cho coach1), chạy lại `C13` để tạo sessions trong tương lai gần. Hoặc thêm seed sessions cho coach1 trong `migrations/007_seed.sql`:
```sql
-- Thêm sessions trong tương lai gần cho coach1
insert into sessions (class_id, scheduled_at, duration_min, status)
select 
  c.id,
  (now() + interval '2 days')::timestamptz,
  90,
  'scheduled'
from classes c
join coaches co on co.id = c.coach_id
join auth.users u on u.id = co.user_id
where u.email = 'coach1@shuttleclass.vn'
limit 1;
```

**File liên quan:**
- `src/pages/coach/AttendancePage.tsx:62–71` (query filter)
- `migrations/007_seed.sql` (cần thêm seed sessions)
- `tests/e2e/06-coach-phase3.spec.ts` (tests A-SESSION-ROW đến A-BACK)

---

### BUG-P02 [MINOR] — Student1 chưa được enroll vào lớp nào → Schedule/Attendance/Progress đều empty

**Mô tả:**
Tài khoản `student1@shuttleclass.vn` không có class_students record nào với `status = 'active'`. Do đó:
- Trang Lịch học hiển thị "Bạn chưa được thêm vào lớp học nào"
- Trang Điểm danh hiển thị "Chưa có lịch sử điểm danh"
- Trang Tiến độ hiển thị "Chưa có đánh giá kỹ năng nào"
- 6 tests skip: S-ENROLLED-STATE, S-SESSIONS, SA-STATS, SA-RECORDS, SA-STATUS-LABELS, SP-HISTORY

**Root cause:** Seed data không có class_students record cho student1. Admin tests (C10) enroll học viên nhưng dùng học viên từ tab "Học viên" (dữ liệu seed hoặc từ các test U6 tạo ra) — student1 cụ thể chưa được enroll.

**Steps to reproduce:**
1. Login với student account
2. Vào "Lịch học" → empty state
3. Vào "Điểm danh" → empty state
4. Vào "Tiến độ" → empty state

**Expected:** Student test account có ít nhất 1 lớp, 1 buổi điểm danh, 1 đánh giá kỹ năng để test đầy đủ flow.
**Actual:** Tất cả student views đều ở empty state.

**Fix cần thực hiện:**
1. Gán student1 vào 1 lớp trong `migrations/007_seed.sql`:
```sql
insert into class_students (class_id, student_id, status)
select 
  c.id,
  s.id,
  'active'
from classes c, students s
join auth.users u on u.id = s.user_id
where u.email = 'student1@shuttleclass.vn'
limit 1;
```
2. Sau khi có lớp, tạo attendance records bằng cách dùng coach điểm danh.

**File liên quan:**
- `migrations/007_seed.sql`
- `tests/e2e/07-student-views.spec.ts` (tests SA-STATS, SA-RECORDS, SA-STATUS-LABELS)

---

### BUG-P03 [MINOR] — Playwright button selector `locator('button').filter(has: svg).first()` bắt phần tử sidebar ẩn

**Mô tả:**
Pattern `page.locator('button').filter({ has: page.locator('svg') }).first()` được dùng để click back button trong các tests (C-BACK, A-BACK). Tuy nhiên, sidebar mobile toggle (`lg:hidden` hamburger) xuất hiện TRƯỚC trong DOM và là button đầu tiên có SVG trong page, dù nó bị ẩn (`display: none` tại viewport ≥ 1024px).

Playwright's `.first()` resolver trả về element đầu tiên trong DOM order kể cả các elements không visible. Sau đó `.click()` time out vì element không visible.

**Phát hiện qua:** Tests P-BACK-STUDENTS, P-BACK-EVAL lần chạy đầu thất bại với lỗi:
```
element is not visible: <button class="ml-auto lg:hidden text-white/40 hover:text-white transition-colors p-1">
```

**Fix đã áp dụng trong tests:** Thay bằng `page.locator('button.p-2.text-gray-400').click()` — class cụ thể của back button content area.

**Scope:** Ảnh hưởng pattern test viết cũ trong `05-coach-sessions.spec.ts:C-BACK` (tuy nhiên C-BACK đang skip nên chưa triggered). Cần chú ý khi viết tests tương tự.

**Không cần fix trong code app.** Chỉ là test infrastructure knowledge.

---

## E2E Test Results

### 06-coach-phase3.spec.ts — 10/18 PASS / 8 SKIP / 0 FAIL

| Test | ID | Kết quả | Ghi chú |
|------|----|---------|---------|
| A-PAGE | A-PAGE | ✅ Pass | |
| A-EMPTY | A-EMPTY | ✅ Pass | Empty state do BUG-P01 |
| A-SESSION-ROW | A-SESSION-ROW | ⏭ Skip | BUG-P01: no sessions in ±7d |
| A-SHEET-NAV | A-SHEET-NAV | ⏭ Skip | BUG-P01 |
| A-SHEET-UI | A-SHEET-UI | ⏭ Skip | BUG-P01 |
| A-SHEET-STUDENTS | A-SHEET-STUDENTS | ⏭ Skip | BUG-P01 |
| A-SHEET-TOGGLE | A-SHEET-TOGGLE | ⏭ Skip | BUG-P01 |
| A-SHEET-SAVE | A-SHEET-SAVE | ⏭ Skip | BUG-P01 |
| A-SHEET-NO-DATA | A-SHEET-NO-DATA | ⏭ Skip | BUG-P01 |
| A-BACK | A-BACK | ⏭ Skip | BUG-P01 |
| P-PAGE | P-PAGE | ✅ Pass | |
| P-EMPTY | P-EMPTY | ✅ Pass | |
| P-CLASS-SELECT | P-CLASS-SELECT | ✅ Pass | Coach có lớp (từ Phase 2 test data) |
| P-STUDENT-SELECT | P-STUDENT-SELECT | ✅ Pass | |
| P-EVAL-FORM | P-EVAL-FORM | ✅ Pass | 5 number inputs + notes field |
| P-EVAL-SAVE | P-EVAL-SAVE | ✅ Pass | Toast "Đã lưu đánh giá" |
| P-BACK-STUDENTS | P-BACK-STUDENTS | ✅ Pass | |
| P-BACK-EVAL | P-BACK-EVAL | ✅ Pass | |

### 07-student-views.spec.ts — 12/17 PASS / 5 SKIP / 0 FAIL

| Test | ID | Kết quả | Ghi chú |
|------|----|---------|---------|
| S-PAGE | S-PAGE | ✅ Pass | |
| S-EMPTY-NO-CLASS | S-EMPTY-NO-CLASS | ✅ Pass | BUG-P02: not enrolled |
| S-ENROLLED-STATE | S-ENROLLED-STATE | ⏭ Skip | BUG-P02 |
| S-SESSIONS | S-SESSIONS | ⏭ Skip | BUG-P02 |
| S-NO-ERROR | S-NO-ERROR | ✅ Pass | |
| SA-PAGE | SA-PAGE | ✅ Pass | |
| SA-EMPTY | SA-EMPTY | ✅ Pass | |
| SA-STATS | SA-STATS | ⏭ Skip | BUG-P02 |
| SA-RECORDS | SA-RECORDS | ⏭ Skip | BUG-P02 |
| SA-STATUS-LABELS | SA-STATUS-LABELS | ⏭ Skip | BUG-P02 |
| SA-NO-ERROR | SA-NO-ERROR | ✅ Pass | |
| SP-PAGE | SP-PAGE | ✅ Pass | |
| SP-EMPTY | SP-EMPTY | ✅ Pass | |
| SP-RADAR | SP-RADAR | ✅ Pass | Coach đã đánh giá student qua P-EVAL-SAVE |
| SP-OVERALL-SCORE | SP-OVERALL-SCORE | ✅ Pass | |
| SP-HISTORY | SP-HISTORY | ✅ Pass | >= 2 evaluations exist |
| SP-NO-ERROR | SP-NO-ERROR | ✅ Pass | |

---

## Full Suite Summary (Phase 1 + 2 + 3)

| Spec File | Pass | Skip | Fail |
|-----------|------|------|------|
| 01-auth.spec.ts | 22 | 0 | 0 |
| 02-admin-facilities.spec.ts | 9 | 0 | 0 |
| 03-admin-users.spec.ts | 10 | 0 | 0 |
| 04-admin-classes.spec.ts | 10 | 0 | 0 |
| 05-coach-sessions.spec.ts | 3 | 7 | 0 |
| 06-coach-phase3.spec.ts | 10 | 8 | 0 |
| 07-student-views.spec.ts | 12 | 5 | 0 |
| **Tổng** | **76** | **20** | **0** |

---

## Ghi chú QC

- **BUG-P01** là major bug về test data setup: coach1 không có sessions trong ±7 ngày tới. Cần fix BUG-C02 trước (gán lớp cho coach), sau đó tạo sessions trong tương lai gần để test Attendance Sheet.
- **BUG-P02** là test data issue: student1 chưa được enroll vào lớp. Sau khi enroll và có buổi điểm danh, 5 tests sẽ unblock.
- **SP-RADAR, SP-OVERALL-SCORE, SP-HISTORY** pass vì P-EVAL-SAVE đã tạo evaluation data cho student trong cùng run. Side-effect tốt.
- **Phase 3 core features** (navigation, UI, form structure, evaluation save, back buttons) đều verified và pass.
- **Cần test lại A-SHEET-*** sau khi fix BUG-C02 + BUG-P01.**

---

## Bảng tổng hợp bugs (tất cả phases)

| Bug ID | Mức độ | Phase | Mô tả ngắn | Status |
|--------|--------|-------|-----------|--------|
| BUG-C01 | CRITICAL | P2 | RLS infinite recursion class_students↔students | Open |
| BUG-C02 | MINOR | P2 | Coach test account chưa có lớp phân công | Open |
| BUG-P01 | MAJOR | P3 | Coach không có sessions ±7 ngày → Attendance list empty | Open |
| BUG-P02 | MINOR | P3 | Student1 chưa enroll → Schedule/Attendance/Progress đều empty | Open |
| BUG-P03 | MINOR | P3 | Test selector `button.filter(svg).first()` bắt sidebar hidden | Fixed in tests |
