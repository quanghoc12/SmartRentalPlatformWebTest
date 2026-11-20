import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import type {
  LocatorRegistry,
  StepExecutionResult,
  TestCaseExecutionResult,
  TestCaseSpec,
  TestDataEntry,
  TestStepSpec,
} from '../excel/schema.js';
import { resolveLocator } from './locatorResolver.js';

export interface StepRunnerOptions {
  baseUrl: string;
  evidenceRootDir: string;
  captureEvidence: boolean;
  highlightTarget: boolean;
  testData: TestDataEntry[];
}

export interface InterpolationContext {
  baseUrl: string;
  data: Record<string, string>;
  uniqueEmail: string;
  timestamp: string;
}

export function buildInterpolationContext(
  testData: TestDataEntry[],
  baseUrl: string
): InterpolationContext {
  const data: Record<string, string> = {};
  for (const entry of testData) {
    const envOverride = entry.envVar ? process.env[entry.envVar] : undefined;
    data[entry.key] = envOverride !== undefined && envOverride !== '' ? envOverride : entry.value;
  }

  const timestamp = String(Date.now());
  const rand = Math.random().toString(36).slice(2, 7);
  return {
    baseUrl,
    data,
    uniqueEmail: `qa.e2e.${timestamp}.${rand}@example.com`,
    timestamp,
  };
}

export function interpolateTemplate(raw: string, ctx: InterpolationContext): string {
  if (!raw) return '';
  return raw.replace(/\{\{([^}]+)\}\}/g, (_full, expr: string) => {
    const trimmed = expr.trim();
    if (trimmed === 'BASE_URL') return ctx.baseUrl;
    if (trimmed === 'UNIQUE_EMAIL') return ctx.uniqueEmail;
    if (trimmed === 'TIMESTAMP') return ctx.timestamp;
    if (trimmed.startsWith('DATA.')) {
      const key = trimmed.slice('DATA.'.length);
      if (ctx.data[key] === undefined) {
        throw new Error(`Placeholder {{DATA.${key}}} không tồn tại trong sheet TestData.`);
      }
      return ctx.data[key];
    }
    if (trimmed.startsWith('ENV.')) {
      const envName = trimmed.slice('ENV.'.length);
      return process.env[envName] ?? '';
    }
    throw new Error(`Placeholder không hợp lệ: {{${trimmed}}}`);
  });
}

function buildAbsoluteUrl(baseUrl: string, targetPathOrUrl: string): string {
  if (/^https?:\/\//i.test(targetPathOrUrl)) {
    return targetPathOrUrl;
  }
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = targetPathOrUrl.startsWith('/') ? targetPathOrUrl : `/${targetPathOrUrl}`;
  return `${cleanBase}${cleanPath}`;
}

async function applyTemporaryHighlight(locator: Locator): Promise<{ outline: string; boxShadow: string } | null> {
  try {
    const count = await locator.count();
    if (count === 0) return null;
    const first = locator.first();
    const visible = await first.isVisible();
    if (!visible) return null;

    return await first.evaluate((el) => {
      const htmlEl = el as HTMLElement;
      const previous = {
        outline: htmlEl.style.outline,
        boxShadow: htmlEl.style.boxShadow,
      };
      htmlEl.style.outline = '3px solid #ef4444';
      htmlEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
      return previous;
    });
  } catch {
    return null;
  }
}

async function restoreHighlight(
  locator: Locator,
  previous: { outline: string; boxShadow: string } | null
): Promise<void> {
  if (!previous) return;
  try {
    const count = await locator.count();
    if (count === 0) return;
    await locator.first().evaluate((el, prev) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.outline = prev.outline;
      htmlEl.style.boxShadow = prev.boxShadow;
    }, previous);
  } catch {
    // Page may have navigated or element unmounted; ignore safely.
  }
}

async function captureStepPng(
  page: Page,
  tcEvidenceDir: string,
  stepNo: number,
  suffix: string,
  locator?: Locator | null,
  highlightTarget = true
): Promise<string> {
  fs.mkdirSync(tcEvidenceDir, { recursive: true });
  const padded = String(stepNo).padStart(2, '0');
  const safeSuffix = suffix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const outPath = path.join(tcEvidenceDir, `step-${padded}_${safeSuffix}.png`);

  const previous = locator && highlightTarget ? await applyTemporaryHighlight(locator) : null;
  try {
    await page.screenshot({ path: outPath, fullPage: false });
  } finally {
    if (locator) {
      await restoreHighlight(locator, previous);
    }
  }
  return outPath;
}

async function performLoginAs(
  page: Page,
  roleKey: string,
  ctx: InterpolationContext,
  baseUrl: string
): Promise<void> {
  const normalized = roleKey.trim().toLowerCase();
  const roleCredentialsMap: Record<string, { emailKey: string; passwordKey: string }> = {
    tenant_new: { emailKey: 'tenant_new_email', passwordKey: 'demo_password' },
    tenant_active: { emailKey: 'tenant_active_email', passwordKey: 'demo_password' },
    landlord: { emailKey: 'landlord_email', passwordKey: 'demo_password' },
    admin: { emailKey: 'admin_email', passwordKey: 'demo_password' },
  };

  const creds = roleCredentialsMap[normalized];
  if (!creds) {
    throw new Error(
      `Role "${roleKey}" không hợp lệ cho LOGIN_AS. Hỗ trợ: ${Object.keys(roleCredentialsMap).join(', ')}`
    );
  }

  const email = ctx.data[creds.emailKey];
  const password = ctx.data[creds.passwordKey];
  if (!email || !password) {
    throw new Error(`Thiếu thông tin đăng nhập cho role "${roleKey}" trong TestData hoặc .env.`);
  }

  await page.goto(buildAbsoluteUrl(baseUrl, '/login'), { waitUntil: 'domcontentloaded' });
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('button.auth-submit-button').click();
  await expect(page).not.toHaveURL(/\/login(?:$|\?)/, { timeout: 15_000 });
}

async function clearBrowserSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  if (page.url() !== 'about:blank') {
    await page.evaluate(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        // Ignore security error on non-origin pages
      }
    });
  }
}

async function runSingleStep(
  page: Page,
  step: TestStepSpec,
  registry: LocatorRegistry,
  ctx: InterpolationContext,
  baseUrl: string
): Promise<{ resolvedInput: string; targetLocator: Locator | null }> {
  const input = interpolateTemplate(step.inputData, ctx);
  let targetLocator: Locator | null = null;

  const getTarget = () => {
    if (!step.target) {
      throw new Error(`Step ${step.stepNo} (${step.action}) thiếu Target.`);
    }
    const { locator } = resolveLocator(page, registry, step.target);
    targetLocator = locator;
    return locator;
  };

  switch (step.action) {
    case 'GOTO':
      await page.goto(buildAbsoluteUrl(baseUrl, input), { waitUntil: 'domcontentloaded' });
      break;
    case 'RELOAD':
      await page.reload({ waitUntil: 'domcontentloaded' });
      break;
    case 'GO_BACK':
      await page.goBack({ waitUntil: 'domcontentloaded' });
      break;
    case 'FILL':
      await getTarget().fill(input);
      break;
    case 'CLEAR_AND_FILL': {
      const loc = getTarget();
      await loc.clear();
      await loc.fill(input);
      break;
    }
    case 'CLICK':
      await getTarget().click();
      break;
    case 'BLUR':
      await getTarget().blur();
      break;
    case 'PRESS':
      await getTarget().press(input || 'Enter');
      break;
    case 'SELECT_OPTION':
      await getTarget().selectOption(input);
      break;
    case 'CHECK':
      await getTarget().check();
      break;
    case 'UNCHECK':
      await getTarget().uncheck();
      break;
    case 'HOVER':
      await getTarget().hover();
      break;
    case 'WAIT_VISIBLE': {
      const timeout = input ? Number.parseInt(input, 10) : 10_000;
      await expect(getTarget()).toBeVisible({ timeout });
      break;
    }
    case 'WAIT_HIDDEN': {
      const timeout = input ? Number.parseInt(input, 10) : 10_000;
      await expect(getTarget()).toBeHidden({ timeout });
      break;
    }
    case 'WAIT_URL_CONTAINS':
      await page.waitForURL((url) => url.toString().includes(input), { timeout: 15_000 });
      break;
    case 'WAIT_NETWORK_IDLE': {
      const timeout = input ? Number.parseInt(input, 10) : 10_000;
      await page.waitForLoadState('networkidle', { timeout });
      break;
    }
    case 'ASSERT_VISIBLE':
      await expect(getTarget()).toBeVisible();
      break;
    case 'ASSERT_HIDDEN':
      await expect(getTarget()).toBeHidden();
      break;
    case 'ASSERT_TEXT_CONTAINS':
      await expect(getTarget()).toContainText(input);
      break;
    case 'ASSERT_TEXT_EQUALS':
      await expect(getTarget()).toHaveText(input);
      break;
    case 'ASSERT_VALUE':
      await expect(getTarget()).toHaveValue(input);
      break;
    case 'ASSERT_URL_CONTAINS':
      await expect(page).toHaveURL((url) => url.toString().includes(input));
      break;
    case 'ASSERT_URL_REGEX':
      await expect(page).toHaveURL(new RegExp(input));
      break;
    case 'ASSERT_COUNT_GTE': {
      const expectedMin = Number.parseInt(input, 10);
      const loc = getTarget();
      await expect
        .poll(async () => await loc.count(), {
          message: `Mong đợi số lượng "${step.target}" >= ${expectedMin}`,
        })
        .toBeGreaterThanOrEqual(expectedMin);
      break;
    }
    case 'ASSERT_COUNT_EQ': {
      const expectedExact = Number.parseInt(input, 10);
      await expect(getTarget()).toHaveCount(expectedExact);
      break;
    }
    case 'ASSERT_ATTR_CONTAINS': {
      const eqIndex = input.indexOf('=');
      if (eqIndex <= 0) {
        throw new Error(`Input_Data của ASSERT_ATTR_CONTAINS phải có dạng "attr=value", nhận được "${input}".`);
      }
      const attrName = input.slice(0, eqIndex).trim();
      const attrVal = input.slice(eqIndex + 1).trim();
      const loc = getTarget();
      await expect
        .poll(async () => (await loc.getAttribute(attrName)) ?? '', {
          message: `Mong đợi thuộc tính ${attrName} của "${step.target}" chứa "${attrVal}"`,
        })
        .toContain(attrVal);
      break;
    }
    case 'ASSERT_DISABLED':
      await expect(getTarget()).toBeDisabled();
      break;
    case 'ASSERT_ENABLED':
      await expect(getTarget()).toBeEnabled();
      break;
    case 'CLEAR_SESSION':
      await clearBrowserSession(page);
      break;
    case 'LOGIN_AS':
      await performLoginAs(page, input, ctx, baseUrl);
      break;
    case 'SCREENSHOT':
      if (step.target) {
        getTarget();
      }
      break;
    default:
      throw new Error(`Action chưa được triển khai: ${String(step.action)}`);
  }

  return { resolvedInput: input, targetLocator };
}

export async function executeTestCase(
  page: Page,
  tc: TestCaseSpec,
  registry: LocatorRegistry,
  options: StepRunnerOptions
): Promise<TestCaseExecutionResult> {
  const tcEvidenceDir = path.join(options.evidenceRootDir, tc.id);
  const ctx = buildInterpolationContext(options.testData, options.baseUrl);
  const stepResults: StepExecutionResult[] = [];
  const tcStart = Date.now();
  let errorSummary = '';
  let failed = false;

  for (const step of tc.steps) {
    const stepStart = Date.now();
    let resolvedInput = '';
    let targetLocator: Locator | null = null;

    try {
      const exec = await runSingleStep(page, step, registry, ctx, options.baseUrl);
      resolvedInput = exec.resolvedInput;
      targetLocator = exec.targetLocator;

      let screenshotPath: string | undefined;
      if (options.captureEvidence) {
        const suffix = step.action === 'SCREENSHOT' && resolvedInput
          ? `SCREENSHOT_${resolvedInput}`
          : step.action;
        screenshotPath = await captureStepPng(
          page,
          tcEvidenceDir,
          step.stepNo,
          suffix,
          targetLocator,
          options.highlightTarget
        );
      }

      stepResults.push({
        stepNo: step.stepNo,
        stepDesc: step.stepDesc,
        action: step.action,
        target: step.target,
        resolvedInput,
        expectedResult: step.expectedResult,
        status: 'PASS',
        durationMs: Date.now() - stepStart,
        screenshotPath,
      });
    } catch (err) {
      failed = true;
      const message = err instanceof Error ? err.message : String(err);
      errorSummary = `Step ${step.stepNo} (${step.action}): ${message}`;

      if (!resolvedInput && step.inputData) {
        try {
          resolvedInput = interpolateTemplate(step.inputData, ctx);
        } catch {
          resolvedInput = step.inputData;
        }
      }
      if (!targetLocator && step.target && registry[step.target]) {
        try {
          targetLocator = resolveLocator(page, registry, step.target).locator;
        } catch {
          targetLocator = null;
        }
      }

      let failedScreenshot: string | undefined;
      if (options.captureEvidence) {
        try {
          failedScreenshot = await captureStepPng(
            page,
            tcEvidenceDir,
            step.stepNo,
            'FAILED',
            targetLocator,
            options.highlightTarget
          );
        } catch {
          failedScreenshot = undefined;
        }
      }

      stepResults.push({
        stepNo: step.stepNo,
        stepDesc: step.stepDesc,
        action: step.action,
        target: step.target,
        resolvedInput,
        expectedResult: step.expectedResult,
        status: 'FAIL',
        durationMs: Date.now() - stepStart,
        error: message,
        screenshotPath: failedScreenshot,
      });
      break;
    }
  }

  return {
    id: tc.id,
    module: tc.module,
    screenId: tc.screenId,
    title: tc.title,
    category: tc.category,
    priority: tc.priority,
    automation: tc.automation,
    role: tc.role,
    status: failed ? 'FAIL' : 'PASS',
    durationMs: Date.now() - tcStart,
    errorSummary: failed ? errorSummary : undefined,
    evidenceDir: options.captureEvidence ? tcEvidenceDir : undefined,
    steps: stepResults,
  };
}
