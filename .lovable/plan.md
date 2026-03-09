

## Vấn đề

Tài khoản `mvanminh45@gmail.com` tồn tại trong hệ thống (đã đăng ký ngày 24/02/2026, email đã xác nhận). Lỗi "Invalid login credentials" đơn giản là do **nhập sai mật khẩu**.

## Giải pháp

Có 2 cách:

### Cách 1: Đặt lại mật khẩu qua email
- Bấm "Quên mật khẩu?" trên trang đăng nhập
- Nhập email `mvanminh45@gmail.com`
- Kiểm tra hộp thư và bấm link đặt lại mật khẩu

### Cách 2: Reset mật khẩu từ backend (nhanh hơn)
- Dùng migration tool để chạy lệnh reset mật khẩu cho user thông qua edge function hoặc admin API
- Tuy nhiên cách đơn giản nhất là dùng tính năng "Quên mật khẩu" đã có sẵn

## Không cần thay đổi code
Đây không phải lỗi code - hệ thống đăng nhập hoạt động bình thường. Chỉ cần nhập đúng mật khẩu hoặc đặt lại mật khẩu.

