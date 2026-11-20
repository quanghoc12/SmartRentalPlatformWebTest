import type { FindingItem } from '../excel/schema.js';

export const AUTH_HOME_BLOCKER_DECISIONS = [
  {
    id: 'B1',
    title: 'Môi trường chạy Playwright (BASE_URL)',
    decision: 'Phương án A — Chạy local (http://localhost:5173 + API http://localhost:5294 + Docker Postgres)',
  },
  {
    id: 'B2',
    title: 'Side-effect khóa tài khoản / dữ liệu bẩn DB',
    decision: 'Phương án B — Tích hợp hook chạy scripts/reset-demo-data.ps1 trước khi chạy full suite (--reset-db)',
  },
  {
    id: 'B3',
    title: 'Phụ thuộc bên ngoài (Email OTP, Google OAuth, AI Chatbot)',
    decision: 'Phương án A — Auto luồng UI/Validation/Guard; các bước cần OTP email thật / Google OAuth / AI Chat gắn Automation=Manual',
  },
  {
    id: 'B4',
    title: 'Lệch hành vi returnUrl trong LoginPage.tsx',
    decision: 'Phương án B — HOME-009 khẳng định đúng Expected chuẩn (quay lại returnUrl sau login) để Playwright chủ động bắt FAIL lỗi thật',
  },
  {
    id: 'B5',
    title: 'Chiến lược Locator (data-testid)',
    decision: 'Phương án A — Giữ nguyên D:\\Github\\SmartRentalPlatform (không sửa code app); quản lý tập trung trong locators/*.locators.json',
  },
];

export const AUTH_HOME_FINDINGS: FindingItem[] = [
  {
    id: 'BUG-001',
    type: 'Bug',
    severity: 'High',
    relatedTc: 'HOME-009',
    summary: 'LoginPage.finishLogin() bỏ qua query param returnUrl sau khi đăng nhập thành công, luôn redirect về /home (hoặc /admin).',
    evidenceOrSource: 'FavoriteButton.tsx (gửi ?returnUrl=...) vs LoginPage.tsx dòng 21-41 (chỉ navigate về ROUTE_PATHS.ME.ROOT).',
    recommendedAction: 'Đọc searchParams.get("returnUrl") trong LoginPage.tsx và validate relative path nội bộ trước khi điều hướng.',
  },
  {
    id: 'RISK-001',
    type: 'Risk',
    severity: 'Medium',
    relatedTc: 'AUTH-012, AUTH-017',
    summary: 'RegisterForm.tsx và ForgotPasswordForm.tsx không có thuộc tính noValidate trên <form> trong khi dùng input type="email".',
    evidenceOrSource: 'RegisterForm.tsx dòng 100 & ForgotPasswordForm.tsx dòng 36 (so với LoginForm.tsx dòng 56 đã có noValidate).',
    recommendedAction: 'Thêm noValidate cho RegisterForm và ForgotPasswordForm nếu muốn thông báo lỗi tiếng Việt đồng bộ thay vì native browser tooltip.',
  },
  {
    id: 'RISK-002',
    type: 'Risk',
    severity: 'Medium',
    relatedTc: 'AUTH-007',
    summary: 'AuthService.LoginAsync khóa tài khoản sau 5 lần nhập sai mật khẩu liên tiếp.',
    evidenceOrSource: 'TESTING_SCENARIOS.md dòng 30.',
    recommendedAction: 'Test sai mật khẩu bằng email không tồn tại (notfound.qa@example.com) và bật --reset-db khi chạy full suite.',
  },
  {
    id: 'REC-001',
    type: 'Recommendation',
    severity: 'Low',
    relatedTc: 'AUTH-016, AUTH-019, HOME-010',
    summary: '3 test case phụ thuộc Email OTP thật, Google Login và AI Chatbot rate-limit đang để Manual.',
    evidenceOrSource: 'AuthController.cs ([EnableRateLimiting("AiChat")]), GoogleLoginButton.tsx, VerifyEmailOtpPage.tsx.',
    recommendedAction: 'Phase 2 nếu cần tự động hóa OTP, bổ sung endpoint/helper đọc OTP trong môi trường Test hoặc query Postgres local.',
  },
  {
    id: 'REC-002',
    type: 'Recommendation',
    severity: 'Low',
    relatedTc: 'ALL',
    summary: 'Repo chính hiện có 0 thuộc tính data-testid ở Frontend.',
    evidenceOrSource: 'Quét client/src/**/*.tsx trả về 0 kết quả data-testid.',
    recommendedAction: 'Khi sang Phase 2 sửa/thêm màn hình, quy chuẩn AI Gen Source gắn data-testid theo Screen_ID để locator bền vững tuyệt đối.',
  },
];
