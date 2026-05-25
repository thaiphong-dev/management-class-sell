# Handoff: Phase 3 — Điểm danh & Đánh giá tiến độ

## Tóm tắt
Fix toàn bộ 7 bugs Phase 2 (bao gồm 1 critical bug về Coach Dashboard), sau đó implement đầy đủ điểm danh (HLV), lịch học + lịch sử điểm danh (Học viên), và đánh giá tiến độ kỹ năng (HLV tạo / Học viên xem). DB triggers đã có sẵn từ Phase 1 tự động trừ buổi và kích hoạt thẻ khi lưu điểm danh.

---

## Tính năng đã implement

| Tính năng | File chính | Status |
|-----------|-----------|--------|
| **Bug Fix Phase 2 (7 bugs)** | Nhiều file | ✅ Done |
| Coach – Danh sách sessions cần điểm danh | `pages/coach/AttendancePage.tsx` | ✅ Done |
| Coach – Attendance sheet (toggle per student) | `pages/coach/AttendanceSheetPage.tsx` | ✅ Done |
| Coach – Điểm danh button trong Sessions list | `pages/coach/SessionsPage.tsx` | ✅ Done |
| Student – Lịch học sắp tới | `pages/student/SchedulePage.tsx` | ✅ Done |
| Student – Lịch sử điểm danh | `pages/student/AttendancePage.tsx` | ✅ Done |
| Coach – Đánh giá kỹ năng học viên | `pages/coach/ProgressPage.tsx` | ✅ Done |
| Student – Xem tiến độ kỹ năng (RadarChart) | `pages/student/ProgressPage.tsx` | ✅ Done |
| SkillRadar component (Recharts) | `components/progress/SkillRadar.tsx` | ✅ Done |
| Routing Phase 3 | `App.tsx` | ✅ Done |

---

## Functions / Components đã tạo

| Tên | File | Mô tả |
|-----|------|-------|
| `SkillRadar` | `components/progress/SkillRadar.tsx` | RadarChart 4 kỹ năng bằng Recharts |
| `CoachAttendancePage` | `pages/coach/AttendancePage.tsx` | List sessions 7 ngày qua/tới, nút điểm danh |
| `CoachAttendanceSheetPage` | `pages/coach/AttendanceSheetPage.tsx` | Sheet toggle per-student với package info |
| `StudentSchedulePage` | `pages/student/SchedulePage.tsx` | Lịch học sắp tới, nhóm theo ngày |
| `StudentAttendancePage` | `pages/student/AttendancePage.tsx` | Lịch sử điểm danh + stats (tổng, có mặt, tỷ lệ) |
| `CoachProgressPage` | `pages/coach/ProgressPage.tsx` | Flow 3 bước: class → student → eval form/history |
| `StudentProgressPage` | `pages/student/ProgressPage.tsx` | RadarChart kỹ năng + lịch sử đánh giá |

---

## Routes mới (đã thay ComingSoon)

| Route | Component | Ghi chú |
|-------|-----------|---------|
| `/coach/classes/:classId/sessions/:sessionId/attendance` | `CoachAttendanceSheetPage` | Mới hoàn toàn |
| `/coach/attendance` | `CoachAttendancePage` | Thay ComingSoon |
| `/coach/progress` | `CoachProgressPage` | Thay ComingSoon |
| `/student/schedule` | `StudentSchedulePage` | Thay ComingSoon |
| `/student/attendance` | `StudentAttendancePage` | Thay ComingSoon |
| `/student/progress` | `StudentProgressPage` | Thay ComingSoon |

---

## Database Changes
Không có migration mới. DB triggers đã có sẵn từ Phase 1 (`004_triggers.sql`):
- `before_attendance_activate_package` — tự kích hoạt thẻ `pending_activation` khi học viên điểm danh `present`/`late` lần đầu
- `after_attendance_deduct_session` — tự trừ buổi khi điểm danh `present`/`late`, gửi notification khi còn 3 hoặc 1 buổi

---

## Patterns / Notes kỹ thuật

- **Upsert attendance**: `supabase.from('attendance').upsert(records, { onConflict: 'session_id,student_id' })` — trigger chỉ fire trên INSERT nên deduction chỉ xảy ra lần đầu (correct behavior).
- **Limitation**: Nếu HLV thay đổi status từ `absent` → `present` (sau lần save đầu), trigger deduction **không fire lại** (UPDATE, không phải INSERT). Accepted limitation cho Phase 3.
- **`sessions_with_details` view**: Không có `coach_id` column nên dùng 2-step query (lấy class IDs trước, filter sessions sau).
- **ProgressPage**: Single-page flow với discriminated union state để tránh nested routing. Flow: Classes list → Students list → Eval form/history.

---

## Chưa xử lý / Known Issues

- [x] ~~Attendance UPDATE trigger: absent → present không deduct session~~ → **FIXED (bug-fix session sau Phase 6)**: `migrations/012_attendance_update_trigger.sql` thêm AFTER UPDATE trigger `after_attendance_update_deduct_session` với logic deduct + notification giống INSERT trigger
- [ ] Không có pagination ở attendance history và eval history — defer
- [x] ~~Student Progress không có line chart~~ → **FIXED Phase 6**: `ProgressPage.tsx` thêm Recharts `LineChart` overall_score theo thời gian
- [x] ~~`/student/packages`, `/admin/packages`, `/admin/reports` vẫn là ComingSoon~~ → **FIXED Phase 4**: tất cả 3 routes đã implement

---

## Hướng dẫn test (dành cho QC)

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@test.com | Test@123 |
| HLV | coach@test.com | Test@123 |
| Học viên | student@test.com | Test@123 |

### Test cases

#### Coach – Điểm danh

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Xem danh sách sessions cần điểm danh | HLV → Điểm danh | Danh sách sessions 7 ngày qua/tới với badge trạng thái |
| 2 | Mở sheet điểm danh từ danh sách | Click "Điểm danh" trên row session | Chuyển đến sheet điểm danh với danh sách học viên |
| 3 | Mở sheet từ Buổi học | HLV → Lớp → Chọn lớp → Click "Điểm danh" trên session | Sheet điểm danh |
| 4 | Điểm danh học viên | Toggle buttons Có mặt / Vắng / Trễ / Phép | Button active đổi màu |
| 5 | Lưu điểm danh | Click "Lưu điểm danh" | Toast thành công, count cập nhật |
| 6 | Package info hiển thị | Học viên có thẻ active → xem số buổi còn lại | Hiển thị "Còn X buổi · HH: dd/mm/yyyy" |
| 7 | Alert thẻ sắp hết | Học viên còn ≤ 3 buổi → icon ⚠️ màu đỏ/vàng | Icon cảnh báo xuất hiện kế tên |
| 8 | DB trigger deduct session | Điểm danh "Có mặt" → reload active_student_packages | sessions_remaining giảm 1 |

#### Coach – Đánh giá tiến độ

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 9 | Chọn lớp | HLV → Đánh giá → chọn lớp | Danh sách học viên |
| 10 | Chọn học viên | Click học viên | Form đánh giá + lịch sử (nếu có) |
| 11 | Tạo đánh giá | Điền điểm kỹ năng → "Lưu đánh giá" | Toast thành công, lịch sử cập nhật |
| 12 | Radar chart | Đã có đánh giá → xem chart | RadarChart 4 kỹ năng hiển thị đúng |

#### Student – Lịch học & Điểm danh

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 13 | Xem lịch học | Học viên → Lịch học | Danh sách buổi sắp tới nhóm theo ngày |
| 14 | Xem điểm danh | Học viên → Điểm danh | Lịch sử với tỷ lệ chuyên cần |
| 15 | Xem tiến độ | Học viên → Tiến độ | RadarChart kỹ năng từ đánh giá HLV gần nhất |
