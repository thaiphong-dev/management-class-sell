# Handoff: Phase 6 — Gap Closing

## Tóm tắt
Review toàn bộ PLANNING.md so với 5 phase trước và implement tất cả tính năng còn thiếu: bảng buổi học hôm nay ở Admin Dashboard, Coach Dashboard với next-session card + lịch 7 ngày, cancel session có lý do + tự động notification, Student Dashboard với skill bars, Student Progress với LineChart điểm theo thời gian, và Admin Reports với 2 biểu đồ bổ sung.

---

## Tính năng đã implement

| Tính năng | File chính | Status |
|-----------|-----------|--------|
| DB triggers: `package_granted` + `session_cancelled` notifications | `migrations/010_notification_triggers.sql` | ✅ Done |
| Admin Dashboard: bảng buổi học hôm nay (class/coach/court/time/status) | `pages/admin/DashboardPage.tsx` | ✅ Done |
| Coach Dashboard: next-session card nổi bật + lịch 7 ngày nhóm theo ngày | `pages/coach/DashboardPage.tsx` | ✅ Done |
| Coach Dashboard: filter sessions đúng coach (theo class_ids) | `pages/coach/DashboardPage.tsx` | ✅ Fixed bug |
| Coach Sessions: cancel-with-reason dialog + toast thông báo học viên | `pages/coach/SessionsPage.tsx` | ✅ Done |
| Student Dashboard: skill bars từ latest `progress_evaluations` | `pages/student/DashboardPage.tsx` | ✅ Done |
| Student Progress: LineChart `overall_score` theo thời gian | `pages/student/ProgressPage.tsx` | ✅ Done |
| Admin Reports: tỷ lệ chuyên cần 6 tháng (LineChart) | `pages/admin/ReportsPage.tsx` | ✅ Done |
| Admin Reports: học viên mới theo tháng (BarChart) | `pages/admin/ReportsPage.tsx` | ✅ Done |

---

## Functions / Components / Hooks đã tạo

| Tên | File | Mô tả |
|-----|------|-------|
| `notify_package_granted()` trigger | `migrations/010_notification_triggers.sql` | Gửi notification khi admin gán gói học cho học viên |
| `notify_session_cancelled()` trigger | `migrations/010_notification_triggers.sql` | Gửi notification đến tất cả học viên trong lớp khi session bị hủy |
| `getDayLabel()` | `pages/coach/DashboardPage.tsx` | Format "Hôm nay" / "Ngày mai" / "T2, DD/MM" cho day header |
| `toDateKey()` | `pages/coach/DashboardPage.tsx` | Extract YYYY-MM-DD từ ISO string |
| `DayGroup` interface | `pages/coach/DashboardPage.tsx` | Group sessions theo ngày cho weekly grid |
| `LatestSkills` interface | `pages/student/DashboardPage.tsx` | Type cho latest progress evaluation skills |
| Skill bars section | `pages/student/DashboardPage.tsx` | 4 progress bars (technique/footwork/tactics/fitness) |
| LineChart component | `pages/student/ProgressPage.tsx` | Score over time với recharts LineChart |
| `AttendanceStatPoint` interface | `pages/admin/ReportsPage.tsx` | Monthly attendance rate aggregation |
| `NewStudentPoint` interface | `pages/admin/ReportsPage.tsx` | Monthly new students count |

---

## Database Changes

### `migrations/010_notification_triggers.sql` (MỚI)
- **Function** `notify_package_granted()`: AFTER INSERT on `student_packages` → gửi notification `package_grant` đến student
- **Function** `notify_session_cancelled()`: AFTER UPDATE on `sessions` → nếu status đổi thành `cancelled`, gửi notification `session_cancel` đến tất cả học viên active trong lớp đó
- Cả 2 functions đều `SECURITY DEFINER` để tránh RLS recursion khi query `students`, `classes`, `class_students`

---

## Patterns / Notes kỹ thuật

### Coach Dashboard weekly grid
- Fetch sessions trong 7 ngày tới **chỉ của lớp mình** (coach → class_ids → filter by class_id)
- Group by `YYYY-MM-DD` key từ `scheduled_at.slice(0, 10)`
- Day labels: "Hôm nay" / "Ngày mai" / "T2, DD/MM/YYYY"
- Bug fix: trước đây query `sessions_with_details` không filter theo class → coach thấy tất cả sessions

### Cancel session with reason
- Dialog cũ: 2 buttons (Hoàn thành / Đã hủy)
- Dialog mới: button Hoàn thành vẫn xử lý như cũ; thêm `<Input>` nhập lý do + button "Xác nhận hủy"
- Reason được lưu vào `sessions.notes`
- DB trigger `on_session_cancelled` tự động gửi notification có lý do cho học viên

### Student Dashboard skill bars
- Query `progress_evaluations` limit 1, newest first
- 4 bars: technique, footwork, tactics, fitness (mỗi cái từ 0–10 → width = `val * 10%`)
- Hiện overlay chỉ khi có ít nhất 1 evaluation

### LineChart tiến độ
- Chỉ hiện khi có ≥ 2 evaluations VÀ ít nhất 1 có `overall_score !== null`
- Data được reverse để oldest trên trái
- Domain Y: [0, 100], stroke màu primary (#b91c1c)

### Admin Reports thêm charts
- **Attendance rate**: aggregate `attendance` trong 6 tháng ở client (không cần DB view mới)
  - `rate = (present + late) / total * 100`
- **New students**: aggregate `students.created_at` trong 6 tháng ở client

---

## Known Issues / Chưa xử lý

- [ ] Email notifications (Edge Functions) — defer, cần SMTP + Edge Function setup
- [ ] Không có line chart tiến độ kỹ năng từng môn riêng lẻ — defer (overall_score đủ dùng)
- [x] ~~Coach Sessions: nút "Đã hủy" không có action, UX confusing~~ → **FIXED (bug-fix session sau Phase 6)**: Dialog đã redesign — chỉ còn 1 button "Hoàn thành" + section "Hủy buổi học" riêng với input lý do + confirm button rõ ràng
- [ ] PWA icons `pwa-192x192.png` / `pwa-512x512.png` — cần file thực trước khi deploy production

## Thêm trong bug-fix session (sau Phase 6)

| Fix | File | Mô tả |
|-----|------|-------|
| Notification khi thêm học viên vào lớp | `migrations/011_enrollment_trigger.sql` | Trigger `on_class_enrolled` → notify student |
| Schedule empty state cải thiện | `pages/student/SchedulePage.tsx` | Hiện danh sách lớp đã enroll khi chưa có sessions |
| Student PackagesPage: catalog gói học | `pages/student/PackagesPage.tsx` | Section "Gói học có thể đăng ký" với giá và thông tin |
| Attendance UPDATE trigger | `migrations/012_attendance_update_trigger.sql` | Deduct session khi đổi absent→present |
| Monthly package progress bar | `pages/student/PackagesPage.tsx` | Days remaining bar cho gói theo tháng |
| Header dynamic PAGE_TITLES | `components/layout/Header.tsx` | `useMatch` cho `/coach/classes/:id/sessions*` |
| Coach Sessions cancel UX | `pages/coach/SessionsPage.tsx` | Redesign dialog tách rõ Hoàn thành vs Hủy |
| Mobile scroll reset | `components/layout/AppLayout.tsx` | scroll to top khi route thay đổi |

---

## Hướng dẫn test (dành cho QC)

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@shuttleclass.vn | (xem .env.local) |
| HLV | coach@test.com | Test@123 |
| Học viên | student@test.com | Test@123 |

### Test cases

#### Admin Dashboard — Today's sessions
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Bảng hôm nay có dữ liệu | Tạo session với scheduled_at = hôm nay | Hiện trong bảng với đúng class/coach/court/time/status |
| 2 | Bảng hôm nay trống | Không có session hôm nay | "Không có buổi học nào hôm nay" |
| 3 | Status badge màu đúng | Completed session hôm nay | Badge xanh lá |

#### Coach Dashboard — Weekly grid
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 4 | Next session card | HLV có session sắp tới | Card gradient đỏ hiện tên lớp + giờ |
| 5 | Lịch 7 ngày | Có sessions trong tuần | Nhóm theo ngày, "Hôm nay" / "Ngày mai" / "T2, DD/MM" |
| 6 | Filter đúng | Coach A không thấy lớp của Coach B | Chỉ thấy lớp mình phụ trách |
| 7 | Nút Điểm danh | Click nút trong weekly grid | Navigate đến attendance page đúng session |

#### Coach Sessions — Cancel with reason
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 8 | Cancel có lý do | Click Cập nhật → nhập lý do → Xác nhận hủy | Session chuyển cancelled, toast "Học viên đã được thông báo" |
| 9 | Cancel không lý do | Bỏ trống reason → Xác nhận hủy | Session chuyển cancelled, notification không có "Lý do:" |
| 10 | Notification thực | Xem notifications của học viên sau khi hủy | Nhận notification loại session_cancel với lý do đúng |

#### Student Dashboard — Skill bars
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 11 | Có evaluation | Học viên đã được đánh giá | Skill bars hiện với 4 bars màu sắc khác nhau |
| 12 | Chưa có evaluation | Học viên mới | Skill bars section không hiện |

#### Student Progress — LineChart
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 13 | Đủ dữ liệu | ≥ 2 evaluations có overall_score | LineChart hiện với dots + line |
| 14 | 1 evaluation | Chỉ có 1 điểm | LineChart không hiện (chỉ có radar + text) |

#### Admin Reports — New charts
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 15 | Tỷ lệ chuyên cần | Có attendance records | LineChart % với Y axis 0–100% |
| 16 | Học viên mới | Có students tạo trong 6 tháng | BarChart bars xanh dương |

#### Notification triggers
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 17 | Package granted | Admin gán gói học cho học viên | Học viên nhận notification "Gói học mới" |
| 18 | Session cancelled | Coach hủy buổi học | Tất cả học viên active trong lớp nhận notification "Buổi học bị hủy" |
