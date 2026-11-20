export const VALID_ACTIONS = [
  'GOTO',
  'RELOAD',
  'GO_BACK',
  'FILL',
  'CLEAR_AND_FILL',
  'CLICK',
  'BLUR',
  'PRESS',
  'SELECT_OPTION',
  'CHECK',
  'UNCHECK',
  'HOVER',
  'WAIT_VISIBLE',
  'WAIT_HIDDEN',
  'WAIT_URL_CONTAINS',
  'WAIT_NETWORK_IDLE',
  'ASSERT_VISIBLE',
  'ASSERT_HIDDEN',
  'ASSERT_TEXT_CONTAINS',
  'ASSERT_TEXT_EQUALS',
  'ASSERT_VALUE',
  'ASSERT_URL_CONTAINS',
  'ASSERT_URL_REGEX',
  'ASSERT_COUNT_GTE',
  'ASSERT_COUNT_EQ',
  'ASSERT_ATTR_CONTAINS',
  'ASSERT_DISABLED',
  'ASSERT_ENABLED',
  'CLEAR_SESSION',
  'LOGIN_AS',
  'SCREENSHOT',
] as const;

export type ActionKeyword = (typeof VALID_ACTIONS)[number];

export const VALID_CATEGORIES = [
  'Normal',
  'Abnormal',
  'Boundary',
  'Security/Role',
  'BugCheck',
] as const;

export type TestCategory = (typeof VALID_CATEGORIES)[number];

export const VALID_PRIORITIES = ['P0', 'P1', 'P2'] as const;
export type TestPriority = (typeof VALID_PRIORITIES)[number];

export const VALID_AUTOMATION = ['Auto', 'Manual'] as const;
export type AutomationMode = (typeof VALID_AUTOMATION)[number];

export const ACTIONS_REQUIRING_TARGET = new Set<ActionKeyword>([
  'FILL',
  'CLEAR_AND_FILL',
  'CLICK',
  'BLUR',
  'PRESS',
  'SELECT_OPTION',
  'CHECK',
  'UNCHECK',
  'HOVER',
  'WAIT_VISIBLE',
  'WAIT_HIDDEN',
  'ASSERT_VISIBLE',
  'ASSERT_HIDDEN',
  'ASSERT_TEXT_CONTAINS',
  'ASSERT_TEXT_EQUALS',
  'ASSERT_VALUE',
  'ASSERT_COUNT_GTE',
  'ASSERT_COUNT_EQ',
  'ASSERT_ATTR_CONTAINS',
  'ASSERT_DISABLED',
  'ASSERT_ENABLED',
]);

export interface ActionReferenceDoc {
  action: ActionKeyword;
  targetRequired: 'Yes' | 'No' | 'Optional';
  inputFormat: string;
  description: string;
  example: string;
}

export const ACTION_REFERENCE_DOCS: ActionReferenceDoc[] = [
  { action: 'GOTO', targetRequired: 'No', inputFormat: 'Relative path hoặc URL đầy đủ', description: 'Điều hướng tới URL', example: '/login' },
  { action: 'RELOAD', targetRequired: 'No', inputFormat: '(trống)', description: 'Tải lại trang hiện tại', example: '' },
  { action: 'GO_BACK', targetRequired: 'No', inputFormat: '(trống)', description: 'Quay lại trang trước trong browser history', example: '' },
  { action: 'FILL', targetRequired: 'Yes', inputFormat: 'Chuỗi cần nhập', description: 'Nhập giá trị vào input/textarea', example: '{{DATA.tenant_new_email}}' },
  { action: 'CLEAR_AND_FILL', targetRequired: 'Yes', inputFormat: 'Chuỗi cần nhập', description: 'Xóa trắng input rồi nhập lại', example: '2500000' },
  { action: 'CLICK', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Click vào phần tử Target', example: '' },
  { action: 'BLUR', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Rời focus khỏi input để kích hoạt validation onBlur', example: '' },
  { action: 'PRESS', targetRequired: 'Yes', inputFormat: 'Tên phím Playwright (Enter, Tab, Escape...)', description: 'Nhấn phím trên phần tử Target', example: 'Enter' },
  { action: 'SELECT_OPTION', targetRequired: 'Yes', inputFormat: 'Value hoặc label của option', description: 'Chọn giá trị trong thẻ <select>', example: 'priceAsc' },
  { action: 'CHECK', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Đánh dấu checkbox/radio', example: '' },
  { action: 'UNCHECK', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Bỏ đánh dấu checkbox', example: '' },
  { action: 'HOVER', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Di chuột lên phần tử Target', example: '' },
  { action: 'WAIT_VISIBLE', targetRequired: 'Yes', inputFormat: 'Timeout ms (tùy chọn)', description: 'Chờ phần tử hiển thị', example: '10000' },
  { action: 'WAIT_HIDDEN', targetRequired: 'Yes', inputFormat: 'Timeout ms (tùy chọn)', description: 'Chờ phần tử ẩn đi', example: '10000' },
  { action: 'WAIT_URL_CONTAINS', targetRequired: 'No', inputFormat: 'Đoạn chuỗi URL kỳ vọng', description: 'Chờ URL chứa chuỗi chỉ định', example: '/search' },
  { action: 'WAIT_NETWORK_IDLE', targetRequired: 'No', inputFormat: 'Timeout ms (tùy chọn)', description: 'Chờ mạng ổn định sau khi gọi API', example: '' },
  { action: 'ASSERT_VISIBLE', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Kiểm tra phần tử đang hiển thị', example: '' },
  { action: 'ASSERT_HIDDEN', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Kiểm tra phần tử không hiển thị', example: '' },
  { action: 'ASSERT_TEXT_CONTAINS', targetRequired: 'Yes', inputFormat: 'Chuỗi văn bản kỳ vọng', description: 'Kiểm tra text phần tử chứa chuỗi', example: 'Email không hợp lệ.' },
  { action: 'ASSERT_TEXT_EQUALS', targetRequired: 'Yes', inputFormat: 'Chuỗi văn bản chính xác', description: 'Kiểm tra text phần tử khớp chính xác', example: 'Đăng nhập' },
  { action: 'ASSERT_VALUE', targetRequired: 'Yes', inputFormat: 'Giá trị input kỳ vọng', description: 'Kiểm tra value của input/select', example: 'priceAsc' },
  { action: 'ASSERT_URL_CONTAINS', targetRequired: 'No', inputFormat: 'Đoạn chuỗi URL kỳ vọng', description: 'Kiểm tra URL hiện tại chứa chuỗi', example: '/home' },
  { action: 'ASSERT_URL_REGEX', targetRequired: 'No', inputFormat: 'Biểu thức regex (không kèm /.../)', description: 'Kiểm tra URL khớp regex', example: '\\/rooming-houses\\/[a-f0-9-]+' },
  { action: 'ASSERT_COUNT_GTE', targetRequired: 'Yes', inputFormat: 'Số nguyên >= 0', description: 'Kiểm tra số lượng phần tử >= N', example: '1' },
  { action: 'ASSERT_COUNT_EQ', targetRequired: 'Yes', inputFormat: 'Số nguyên >= 0', description: 'Kiểm tra số lượng phần tử == N', example: '0' },
  { action: 'ASSERT_ATTR_CONTAINS', targetRequired: 'Yes', inputFormat: 'tenAttr=giaTriKyVong', description: 'Kiểm tra giá trị thuộc tính HTML', example: 'type=text' },
  { action: 'ASSERT_DISABLED', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Kiểm tra phần tử đang bị disabled', example: '' },
  { action: 'ASSERT_ENABLED', targetRequired: 'Yes', inputFormat: '(trống)', description: 'Kiểm tra phần tử đang enabled', example: '' },
  { action: 'CLEAR_SESSION', targetRequired: 'No', inputFormat: '(trống)', description: 'Xóa cookies, localStorage và sessionStorage', example: '' },
  { action: 'LOGIN_AS', targetRequired: 'No', inputFormat: 'tenant_new | tenant_active | landlord | admin', description: 'Đăng nhập nhanh theo vai trò từ TestData/.env', example: 'tenant_new' },
  { action: 'SCREENSHOT', targetRequired: 'Optional', inputFormat: 'Nhãn ảnh (tùy chọn)', description: 'Chụp ảnh evidence thủ công tại bước này', example: 'after-filter' },
];

export interface OverviewMeta {
  module: string;
  version: string;
  baseUrl: string;
  specSource: string;
  author: string;
  generatedAt: string;
  notes: string;
  [key: string]: string;
}

export interface TestDataEntry {
  key: string;
  value: string;
  envVar: string;
  description: string;
}

export interface TestStepSpec {
  stepNo: number;
  stepDesc: string;
  action: ActionKeyword;
  target: string;
  inputData: string;
  expectedResult: string;
  excelRow?: number;
}

export interface TestCaseSpec {
  id: string;
  module: string;
  screenId: string;
  title: string;
  category: TestCategory;
  priority: TestPriority;
  automation: AutomationMode;
  role: string;
  tags: string[];
  precondition: string;
  steps: TestStepSpec[];
}

export interface WorkbookSpec {
  sourcePath: string;
  overview: OverviewMeta;
  testData: TestDataEntry[];
  testCases: TestCaseSpec[];
}

export type LocatorStrategy =
  | 'id'
  | 'css'
  | 'testid'
  | 'role'
  | 'label'
  | 'placeholder'
  | 'text';

export interface LocatorEntry {
  strategy: LocatorStrategy;
  value: string;
  name?: string;
  exact?: boolean;
  nth?: number;
  description?: string;
}

export type LocatorRegistry = Record<string, LocatorEntry>;

export type StepExecutionStatus = 'PASS' | 'FAIL' | 'SKIPPED';

export interface StepExecutionResult {
  stepNo: number;
  stepDesc: string;
  action: ActionKeyword;
  target: string;
  resolvedInput: string;
  expectedResult: string;
  status: StepExecutionStatus;
  durationMs: number;
  error?: string;
  screenshotPath?: string;
}

export type TestCaseExecutionStatus = 'PASS' | 'FAIL' | 'MANUAL' | 'SKIPPED';

export interface TestCaseExecutionResult {
  id: string;
  module: string;
  screenId: string;
  title: string;
  category: TestCategory;
  priority: TestPriority;
  automation: AutomationMode;
  role: string;
  status: TestCaseExecutionStatus;
  durationMs: number;
  errorSummary?: string;
  evidenceDir?: string;
  steps: StepExecutionResult[];
}

export interface RunResultsPayload {
  runId: string;
  moduleName: string;
  sourceFile: string;
  baseUrl: string;
  dbResetExecuted: boolean;
  startedAt: string;
  finishedAt: string;
  results: TestCaseExecutionResult[];
}

export interface FindingItem {
  id: string;
  type: 'Bug' | 'Risk' | 'Recommendation';
  severity: 'High' | 'Medium' | 'Low';
  relatedTc: string;
  summary: string;
  evidenceOrSource: string;
  recommendedAction: string;
}
