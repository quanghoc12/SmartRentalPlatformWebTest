import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import ExcelJS from 'exceljs';
import type { RunResultsPayload, WorkbookSpec } from '../excel/schema.js';
import { writeTestCasesWorkbook } from '../excel/writer.js';

function spawnAsync(
  command: string,
  args: string[],
  cwd: string
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', cwd });
    child.on('error', reject);
    child.on('close', (code) => resolve(code));
  });
}

function startMockServer(): Promise<{ server: http.Server; baseUrl: string }> {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (reqUrl.pathname === '/login') {
      res.end(`<!doctype html>
<html>
<head><title>Mock Login</title></head>
<body>
  <form class="auth-form" onsubmit="event.preventDefault(); window.localStorage.setItem('mockUser', document.getElementById('login-email').value); window.location.href='/home';">
    <div class="form-field">
      <label for="login-email">Email</label>
      <input id="login-email" type="email" />
    </div>
    <div class="form-field">
      <label for="login-password">Mật khẩu</label>
      <input id="login-password" type="password" />
    </div>
    <button class="auth-submit-button" type="submit">Đăng nhập</button>
  </form>
</body>
</html>`);
      return;
    }

    if (reqUrl.pathname === '/search') {
      res.end(`<!doctype html>
<html>
<head><title>Mock Search</title></head>
<body>
  <div class="results-count">Có <strong>1</strong> khu trọ phù hợp</div>
  <button class="search-result-card" type="button">
    <span class="search-result-card__title">Khu trọ Mock</span>
    <span class="favorite-button" role="button" onclick="window.location.href='/login?returnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);">Lưu</span>
  </button>
</body>
</html>`);
      return;
    }

    res.end(`<!doctype html>
<html>
<head><title>Mock Home</title></head>
<body>
  <header class="home-header">
    <div id="auth-area"></div>
  </header>
  <article class="home-listing-card"><h3>Khu trọ Xuân Huân</h3></article>
  <script>
    const user = window.localStorage.getItem('mockUser');
    const area = document.getElementById('auth-area');
    if (user) {
      area.innerHTML = '<button class="avatar-btn"><span class="avatar-name">' + user + '</span></button>';
    } else {
      area.innerHTML = '<div class="auth-buttons"><button>Đăng nhập</button></div>';
    }
  </script>
</body>
</html>`);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        throw new Error('Không khởi tạo được port mock server.');
      }
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function buildSelfTestSpec(excelPath: string, baseUrl: string): WorkbookSpec {
  return {
    sourcePath: excelPath,
    overview: {
      module: 'SelfTest',
      version: '1.0.0',
      baseUrl,
      specSource: 'self-test',
      author: 'self-test',
      generatedAt: new Date().toISOString(),
      notes: 'Offline engine verification with mock server.',
    },
    testData: [
      { key: 'tenant_new_email', value: 'qa.mock@example.com', envVar: '', description: 'Mock email' },
      { key: 'demo_password', value: 'Demo@123456', envVar: '', description: 'Mock password' },
    ],
    testCases: [
      {
        id: 'SELF-001',
        module: 'Auth',
        screenId: 'SCR-AUTH-01',
        title: 'Mock login PASS + capture step PNG',
        category: 'Normal',
        priority: 'P0',
        automation: 'Auto',
        role: 'TenantNew',
        tags: ['selftest'],
        precondition: 'Mock server running.',
        steps: [
          { stepNo: 1, stepDesc: 'Mở trang /login', action: 'GOTO', target: '', inputData: '/login', expectedResult: 'Mở /login' },
          { stepNo: 2, stepDesc: 'Nhập email', action: 'FILL', target: 'auth.login.emailInput', inputData: '{{DATA.tenant_new_email}}', expectedResult: 'Đã nhập email' },
          { stepNo: 3, stepDesc: 'Nhập mật khẩu', action: 'FILL', target: 'auth.login.passwordInput', inputData: '{{DATA.demo_password}}', expectedResult: 'Đã nhập password' },
          { stepNo: 4, stepDesc: 'Bấm Đăng nhập', action: 'CLICK', target: 'auth.login.submitBtn', inputData: '', expectedResult: 'Chuyển sang /home' },
          { stepNo: 5, stepDesc: 'Kiểm tra Avatar hiển thị', action: 'ASSERT_VISIBLE', target: 'auth.header.avatarBtn', inputData: '', expectedResult: 'Avatar visible' },
        ],
      },
      {
        id: 'SELF-002',
        module: 'HomeSearch',
        screenId: 'SCR-HOME-02',
        title: 'Mock BugCheck intentional FAIL captures FAILED PNG',
        category: 'BugCheck',
        priority: 'P0',
        automation: 'Auto',
        role: 'Guest',
        tags: ['selftest'],
        precondition: 'Mock login intentionally ignores returnUrl.',
        steps: [
          { stepNo: 1, stepDesc: 'Mở /search?sortBy=newest', action: 'GOTO', target: '', inputData: '/search?sortBy=newest', expectedResult: 'Mở trang search' },
          { stepNo: 2, stepDesc: 'Bấm nút tim khi là Guest', action: 'CLICK', target: 'search.firstFavoriteBtn', inputData: '', expectedResult: 'Chuyển sang /login?returnUrl=...' },
          { stepNo: 3, stepDesc: 'Kiểm tra URL chứa returnUrl=', action: 'ASSERT_URL_CONTAINS', target: '', inputData: 'returnUrl=', expectedResult: 'Có returnUrl' },
          { stepNo: 4, stepDesc: 'Nhập email', action: 'FILL', target: 'auth.login.emailInput', inputData: '{{DATA.tenant_new_email}}', expectedResult: 'Đã nhập' },
          { stepNo: 5, stepDesc: 'Nhập password', action: 'FILL', target: 'auth.login.passwordInput', inputData: '{{DATA.demo_password}}', expectedResult: 'Đã nhập' },
          { stepNo: 6, stepDesc: 'Submit login', action: 'CLICK', target: 'auth.login.submitBtn', inputData: '', expectedResult: 'Login thành công' },
          { stepNo: 7, stepDesc: 'Chờ Avatar hiển thị', action: 'WAIT_VISIBLE', target: 'auth.header.avatarBtn', inputData: '5000', expectedResult: 'Đã login' },
          { stepNo: 8, stepDesc: 'Kiểm tra quay lại /search?sortBy=newest (expect FAIL)', action: 'ASSERT_URL_CONTAINS', target: '', inputData: '/search?sortBy=newest', expectedResult: 'Phải bắt được bug lệch URL' },
        ],
      },
      {
        id: 'SELF-003',
        module: 'Auth',
        screenId: 'SCR-AUTH-03',
        title: 'Mock Manual test case',
        category: 'Normal',
        priority: 'P2',
        automation: 'Manual',
        role: 'Guest',
        tags: ['selftest'],
        precondition: 'Manual skip verification.',
        steps: [
          { stepNo: 1, stepDesc: 'Manual step', action: 'SCREENSHOT', target: '', inputData: '', expectedResult: 'Marked MANUAL' },
        ],
      },
    ],
  };
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`[self-test assertion failed] ${message}`);
  }
}

async function main() {
  const { server, baseUrl } = await startMockServer();
  const tempInputDir = path.resolve('evidence', '_selftest');
  const tempExcel = path.join(tempInputDir, 'selftest.testcases.xlsx');
  const runId = '_selftest-run';
  const runDir = path.resolve('evidence', runId);

  try {
    fs.rmSync(tempInputDir, { recursive: true, force: true });
    fs.rmSync(runDir, { recursive: true, force: true });

    const spec = buildSelfTestSpec(tempExcel, baseUrl);
    await writeTestCasesWorkbook(tempExcel, spec);

    const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs');
    const exitCode = await spawnAsync(
      process.execPath,
      [
        tsxCli,
        'src/cli/run-excel.ts',
        '--file',
        tempExcel,
        '--run-id',
        runId,
        '--module',
        'selftest',
        '--base-url',
        baseUrl,
        '--no-reset-db',
        '--no-assessment',
      ],
      process.cwd()
    );

    assert(exitCode !== 0, 'Expected run-excel to exit non-zero because SELF-002 intentionally fails.');

    const summaryPath = path.join(runDir, 'run-summary.json');
    assert(fs.existsSync(summaryPath), 'run-summary.json was not created.');
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as RunResultsPayload;

    const byId = new Map(summary.results.map((r) => [r.id, r]));
    assert(byId.get('SELF-001')?.status === 'PASS', `Expected SELF-001 PASS, got ${byId.get('SELF-001')?.status}`);
    assert(byId.get('SELF-002')?.status === 'FAIL', `Expected SELF-002 FAIL, got ${byId.get('SELF-002')?.status}`);
    assert(byId.get('SELF-003')?.status === 'MANUAL', `Expected SELF-003 MANUAL, got ${byId.get('SELF-003')?.status}`);

    const self002Steps = byId.get('SELF-002')?.steps ?? [];
    const failedStep = self002Steps.find((s) => s.status === 'FAIL');
    assert(failedStep?.screenshotPath && fs.existsSync(failedStep.screenshotPath), 'Expected FAILED PNG screenshot for SELF-002.');

    const evidenceXlsx = path.join(runDir, 'Evidence_selftest.xlsx');
    assert(fs.existsSync(evidenceXlsx), 'Evidence_selftest.xlsx was not created.');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(evidenceXlsx);
    assert(Boolean(wb.getWorksheet('Summary')), 'Missing Summary sheet in Evidence_selftest.xlsx');
    assert(Boolean(wb.getWorksheet('TestCases_Result')), 'Missing TestCases_Result sheet in Evidence_selftest.xlsx');
    const stepSheet = wb.getWorksheet('Step_Evidence');
    assert(Boolean(stepSheet), 'Missing Step_Evidence sheet in Evidence_selftest.xlsx');
    const embeddedImages = stepSheet!.getImages();
    assert(embeddedImages.length >= 5, `Expected >= 5 embedded step PNG images, found ${embeddedImages.length}`);

    console.log('\n[self-test] ALL CHECKS PASSED:');
    console.log(`  - Mock PASS / FAIL / MANUAL statuses verified`);
    console.log(`  - Step PNGs + FAILED PNG captured and verified on disk`);
    console.log(`  - Evidence_selftest.xlsx verified (${embeddedImages.length} embedded screenshots)\n`);
  } finally {
    server.close();
    fs.rmSync(tempInputDir, { recursive: true, force: true });
    fs.rmSync(runDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
