# Rule 02 — Test Case Design & Excel `.xlsx` Schema (AI 2)

## 1. Phân loại kiểm thử bắt buộc (Test Design Matrix)
Khi thiết kế test case từ `specs/<module>.spec.md`, phải bao phủ đủ 5 nhóm `Category`:
1. **`Normal`**: Happy path chính theo từng vai trò (Guest, Tenant, Landlord, Admin).
2. **`Abnormal`**: Để trống trường bắt buộc, sai định dạng, sai mật khẩu/tài khoản, không tìm thấy dữ liệu.
3. **`Boundary`**: Độ dài biên (mật khẩu 7 vs 8 ký tự, giá min/max, diện tích min/max, bộ lọc không khớp kết quả).
4. **`Security/Role`**: Guard chưa đăng nhập bị chuyển `/login`, Admin vào trang riêng của Admin, Landlord vào dashboard Landlord, nút bảo vệ Guest.
5. **`BugCheck`**: Các case kiểm tra lỗi đã xác định từ bước phân tích Blocker (khi chọn Option B ở `B4`, Expected trong Excel phản ánh đúng spec chuẩn để Playwright bắt lỗi).

## 2. Cấu trúc file `.xlsx` chuẩn (4 Sheets bắt buộc)

Mọi file `.xlsx` nằm trong `inputs/` bắt buộc phải có đúng 4 sheet:

### Sheet 1: `Overview` (2 cột: `Key`, `Value`)
Chứa metadata của bộ test:
* `Module`, `Version`, `Base_URL`, `Spec_Source`, `Author`, `Generated_At`, `Notes`.

### Sheet 2: `TestData` (4 cột: `Key`, `Value`, `Env_Var`, `Description`)
Chứa dữ liệu test chuẩn hóa. Nếu `Env_Var` được điền và biến môi trường đó có giá trị khi chạy, Runner ưu tiên giá trị từ `.env`.

### Sheet 3: `TestCases` (16 cột cố định — viết chính xác từng chữ)
| Cột | Bắt buộc | Mô tả |
| --- | --- | --- |
| `TC_ID` | Có | Mã duy nhất, VD: `AUTH-001`, `HOME-009` |
| `Module` | Có | Tên module, VD: `Auth`, `HomeSearch` |
| `Screen_ID` | Có | Mã màn hình từ `specs/<module>.spec.md`, VD: `SCR-AUTH-01` |
| `Title` | Có | Tên ngắn gọn, rõ mục tiêu kiểm thử |
| `Category` | Có | Một trong: `Normal`, `Abnormal`, `Boundary`, `Security/Role`, `BugCheck` |
| `Priority` | Có | Một trong: `P0`, `P1`, `P2` |
| `Automation` | Có | `Auto` hoặc `Manual` |
| `Role` | Có | `Guest`, `TenantNew`, `TenantActive`, `Landlord`, `Admin` |
| `Tags` | Không | Phân tách bằng dấu phẩy, VD: `smoke,regression,validation` |
| `Precondition` | Không | Điều kiện tiên quyết để hiểu bối cảnh |
| `Step_No` | Có | Số thứ tự step (`1, 2, 3...`) tăng dần trong cùng `TC_ID` |
| `Step_Desc` | Có | Mô tả hành động tiếng Việt rõ ràng để xuất vào Excel Evidence |
| `Action` | Có | Từ khóa chuẩn trong bảng `ActionReference` (chữ IN HOA) |
| `Target` | Tùy action | Key locator nằm trong `locators/*.locators.json` (VD: `auth.login.emailInput`) |
| `Input_Data` | Tùy action | Giá trị nhập, URL, role, hoặc expected text. Hỗ trợ placeholder |
| `Expected_Result` | Có | Kết quả mong đợi của bước |

### Sheet 4: `ActionReference`
Bảng tra cứu toàn bộ Action hợp lệ, cú pháp `Target`, cú pháp `Input_Data` để Tester có thể tự thêm/sửa case trực tiếp bằng Excel.

## 3. Quy tắc Placeholder trong `Input_Data`
* `{{DATA.ten_key}}`: Lấy giá trị từ sheet `TestData` theo `Key`.
* `{{ENV.TEN_BIEN}}`: Lấy trực tiếp từ `.env` / `process.env`.
* `{{BASE_URL}}`: Base URL hiện tại.
* `{{UNIQUE_EMAIL}}`: Sinh 1 email duy nhất cho toàn bộ 1 Test Case run (VD: `qa.e2e.<timestamp>@example.com`).
* `{{TIMESTAMP}}`: Chuỗi timestamp duy nhất cho run.

## 4. Quy tắc an toàn bắt buộc
* **Không dùng tài khoản demo thật cho test sai mật khẩu lặp lại** khi chưa reset DB; dùng email không tồn tại (`notfound.qa@example.com`) để tránh trigger rule khóa tài khoản 5 lần.
* **Kiểm tra HTML5 native validation:** Với form không có `noValidate` mà input có `type="email"` (như `RegisterForm`, `ForgotPasswordForm`), dùng chuỗi có `@` nhưng thiếu domain (VD: `a@b`) hoặc action `BLUR` để test error message của React thay vì bị browser native tooltip chặn submit.
* Mọi file `.xlsx` tạo ra **phải pass** lệnh `npm run validate:xlsx -- --file <path>` không còn lỗi nào.
