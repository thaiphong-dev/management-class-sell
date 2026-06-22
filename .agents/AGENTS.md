# Quy tắc phát triển (Development Rules)

## 1. Dọn dẹp dữ liệu kiểm thử (Test Data Cleanup)
- **Nguyên tắc**: Luôn luôn dọn dẹp các dữ liệu kiểm thử (test data) được tạo ra sau khi thực hiện kiểm thử tự động (E2E) hoặc kiểm thử thủ công. Không được để lại dữ liệu rác trong cơ sở dữ liệu.
- **E2E Tests**: Tất cả các kịch bản kiểm thử E2E (Playwright) khi tạo ra tài khoản người dùng, lớp học, cơ sở hoặc bất kỳ dữ liệu mẫu nào phải có bước tự động xóa/dọn dẹp dữ liệu đó ở cuối kịch bản (trong khối `test` hoặc `afterEach`).
- **Database Cleanup Script**: Có thể sử dụng script dọn dẹp dữ liệu `scratch/cleanup_test_data.mjs` để đưa cơ sở dữ liệu về trạng thái sạch (chỉ giữ lại tài khoản quản trị `thaiphong.dev@gmail.com` và huấn luyện viên chính `tuthaiphong600@gmail.com`).
