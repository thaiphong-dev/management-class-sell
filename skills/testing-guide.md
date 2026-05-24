# Skill: Testing Guide (dành cho QC)

## Môi trường test

- URL: `http://localhost:5173` (dev server)
- Trình duyệt: Chrome (desktop + mobile emulation)
- Viewport mobile: 375px × 812px (iPhone SE)

## Test accounts chuẩn

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@shuttleclass.vn | Admin@123 |
| HLV 1 | coach1@shuttleclass.vn | Coach@123 |
| HLV 2 | coach2@shuttleclass.vn | Coach@123 |
| Học viên 1 | student1@shuttleclass.vn | Student@123 |
| Học viên 2 | student2@shuttleclass.vn | Student@123 |

## Test cases chuẩn theo feature

### Auth
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| A1 | Login Admin | Email admin, đúng PW | Redirect /admin/dashboard |
| A2 | Login HLV | Email coach | Redirect /coach/dashboard |
| A3 | Login HV | Email student | Redirect /student/dashboard |
| A4 | Sai PW | Nhập PW sai | Hiện thông báo lỗi |
| A5 | Truy cập sai role | Student vào /admin/dashboard | Redirect về /student/dashboard |

### Gói học / Thẻ (Logic quan trọng)
| # | Scenario | Expected |
|---|----------|---------|
| P1 | Mua gói 12 buổi / 60 ngày | `status = pending_activation`, `sessions_remaining = 12` |
| P2 | Buổi học đầu tiên (present) | Thẻ tự kích hoạt: `status = active`, `activated_at` được set |
| P3 | Sau 12 lần `present` | `status = depleted`, `sessions_remaining = 0` |
| P4 | Hết 60 ngày (còn buổi) | `status = expired` — buổi còn lại bị mất |
| P5 | Gói monthly hết 30 ngày | `status = expired` |
| P6 | Còn 3 buổi | Notification "Thẻ sắp hết" cho học viên |
| P7 | Còn 7 ngày | Notification "Thẻ hết hạn sau 7 ngày" |

### Điểm danh
| # | Scenario | Expected |
|---|----------|---------|
| D1 | HLV toggle "Có mặt" → "Vắng" | Trạng thái đổi, highlight màu đỏ |
| D2 | Lưu điểm danh | Session → `completed`, buổi trừ đúng |
| D3 | HV vắng | Không trừ buổi trong thẻ |
| D4 | HV đi trễ | Trừ 1 buổi (same as present) |

## Checklist UI/UX
- [ ] Responsive: test 375px, 768px, 1280px
- [ ] Loading states: có skeleton khi đang load data
- [ ] Empty states: có message khi không có data
- [ ] Error states: hiện thông báo khi API fail
- [ ] Form validation: test submit form rỗng
- [ ] Toast messages: xác nhận sau mỗi action thành công/thất bại

## Bug report format

Khi phát hiện bug, ghi vào `/bugs/BUGS_PHASE_X.md`:

```markdown
### BUG-XXX [CRITICAL/MAJOR/MINOR]
**Mô tả ngắn:** ...
**Steps:**
1. Login bằng tài khoản ...
2. Vào trang ...
3. Click ...
**Expected:** ...
**Actual:** ...
**File/Component:** src/pages/...
```

### Mức độ bug
- **CRITICAL:** App crash, data sai (VD: trừ sai buổi)
- **MAJOR:** Tính năng không hoạt động (VD: không save được điểm danh)
- **MINOR:** UI sai, text lỗi, UX không tốt
