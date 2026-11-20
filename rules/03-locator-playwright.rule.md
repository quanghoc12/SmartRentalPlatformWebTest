# Rule 03 — Locator Registry & Playwright Execution Rules (AI 3)

## 1. Nguồn chân lý Locator (`locators/*.locators.json`)
* Không hardcode selector CSS/XPath trực tiếp vào cột `Target` trong Excel.
* Cột `Target` trong `.xlsx` chỉ chứa **Locator Key** theo quy ước `<domain>.<screen>.<element>` (VD: `auth.login.emailInput`, `search.priceToggleBtn`).
* Toàn bộ selector thật nằm trong `locators/<domain>.locators.json`.

## 2. Thứ tự ưu tiên chọn Locator
Khi map selector từ source code React (`client/src/...`):
1. `testid` (`data-testid="..."`) — ưu tiên cao nhất nếu app đã gắn.
2. `id` (`#login-email`, `#occupants-select`, `#sort-select`) — ổn định và duy nhất.
3. `role` + `name` hoặc `label` (`getByRole`, `getByLabel`, `aria-label="..."`).
4. `placeholder` (`getByPlaceholder`).
5. Semantic CSS class + ngữ cảnh ổn định (`button.auth-submit-button`, `article.home-listing-card`) — kèm `nth` nếu là danh sách card lặp lại.
* **CẤM TUYỆT ĐỐI:** CSS class ngẫu nhiên/build hash, XPath tuyệt đối dài (`/html/body/div[1]/...`), hoặc bịa tên `data-testid` chưa từng tồn tại trong source.

## 3. Định dạng JSON chuẩn trong `locators/*.locators.json`
```json
{
  "auth.login.emailInput": {
    "strategy": "id",
    "value": "login-email",
    "description": "Input email trang đăng nhập (LoginForm.tsx)"
  },
  "home.firstFavoriteBtn": {
    "strategy": "css",
    "value": "article.home-listing-card .favorite-button",
    "nth": 0,
    "description": "Nút tim yêu thích trên card khu trọ đầu tiên ở /home"
  }
}
```
Các `strategy` được Engine hỗ trợ: `id`, `css`, `testid`, `role` (cần thêm `name`), `label`, `placeholder`, `text`. Tuỳ chọn `nth` (`0, 1, 2...`).

## 4. Quy tắc chạy Playwright sạch & ổn định
* **Không dùng sleep / `waitForTimeout` cứng:** Mọi kiểm tra hiển thị, chuyển trang, tải dữ liệu phải dùng Playwright auto-wait (`waitFor`, `expect(locator).toBeVisible()`, `expect(page).toHaveURL(...)`, `WAIT_NETWORK_IDLE`).
* **Cô lập Session giữa các Test Case:** Dùng `CLEAR_SESSION` ở đầu các case Guest hoặc case Login/Role mới để không dính `localStorage` / JWT token của case chạy trước.
* **Không phụ thuộc thứ tự ngẫu nhiên:** Mỗi Auto TC phải tự thiết lập trạng thái đầu vào (`CLEAR_SESSION` hoặc `LOGIN_AS`) để có thể chạy đơn lẻ (`--tc AUTH-006`) vẫn PASS độc lập.
