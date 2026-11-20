import fs from 'node:fs';
import ExcelJS from 'exceljs';
import {
  ACTIONS_REQUIRING_TARGET,
  VALID_ACTIONS,
  VALID_AUTOMATION,
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  type ActionKeyword,
  type AutomationMode,
  type LocatorRegistry,
  type OverviewMeta,
  type TestCaseSpec,
  type TestCategory,
  type TestDataEntry,
  type TestPriority,
  type TestStepSpec,
  type WorkbookSpec,
} from './schema.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? '').join('').trim();
    }
    if ('result' in value && value.result !== undefined) {
      return cellToString(value.result as ExcelJS.CellValue);
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim();
    }
    if ('hyperlink' in value && typeof value.hyperlink === 'string') {
      return value.hyperlink.trim();
    }
  }
  return String(value).trim();
}

function getHeaderMap(headerRow: ExcelJS.Row): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const label = cellToString(cell.value);
    if (label) {
      map[label] = colNumber;
    }
  });
  return map;
}

function getRowValue(row: ExcelJS.Row, headerMap: Record<string, number>, columnName: string): string {
  const colIdx = headerMap[columnName];
  if (!colIdx) {
    return '';
  }
  return cellToString(row.getCell(colIdx).value);
}

export async function readTestCasesWorkbook(filePath: string): Promise<WorkbookSpec> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file Excel: ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const overviewSheet = workbook.getWorksheet('Overview');
  const testDataSheet = workbook.getWorksheet('TestData');
  const testCasesSheet = workbook.getWorksheet('TestCases');

  if (!overviewSheet || !testDataSheet || !testCasesSheet) {
    const missing = [
      !overviewSheet ? 'Overview' : null,
      !testDataSheet ? 'TestData' : null,
      !testCasesSheet ? 'TestCases' : null,
    ].filter(Boolean);
    throw new Error(`File Excel thiếu sheet bắt buộc: ${missing.join(', ')}`);
  }

  const overview: OverviewMeta = {
    module: '',
    version: '',
    baseUrl: '',
    specSource: '',
    author: '',
    generatedAt: '',
    notes: '',
  };

  const overviewHeaderMap = getHeaderMap(overviewSheet.getRow(1));
  const keyCol = overviewHeaderMap['Key'] ?? 1;
  const valCol = overviewHeaderMap['Value'] ?? 2;

  overviewSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const key = cellToString(row.getCell(keyCol).value);
    const val = cellToString(row.getCell(valCol).value);
    if (!key) return;
    const normalizedMap: Record<string, keyof OverviewMeta> = {
      Module: 'module',
      Version: 'version',
      Base_URL: 'baseUrl',
      Spec_Source: 'specSource',
      Author: 'author',
      Generated_At: 'generatedAt',
      Notes: 'notes',
    };
    const prop = normalizedMap[key] ?? key;
    overview[prop] = val;
  });

  const testData: TestDataEntry[] = [];
  const dataHeaderMap = getHeaderMap(testDataSheet.getRow(1));
  testDataSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const key = getRowValue(row, dataHeaderMap, 'Key');
    if (!key) return;
    testData.push({
      key,
      value: getRowValue(row, dataHeaderMap, 'Value'),
      envVar: getRowValue(row, dataHeaderMap, 'Env_Var'),
      description: getRowValue(row, dataHeaderMap, 'Description'),
    });
  });

  const requiredColumns = [
    'TC_ID',
    'Module',
    'Screen_ID',
    'Title',
    'Category',
    'Priority',
    'Automation',
    'Role',
    'Step_No',
    'Step_Desc',
    'Action',
    'Expected_Result',
  ];
  const tcHeaderMap = getHeaderMap(testCasesSheet.getRow(1));
  const missingColumns = requiredColumns.filter((col) => !tcHeaderMap[col]);
  if (missingColumns.length > 0) {
    throw new Error(`Sheet TestCases thiếu các cột bắt buộc: ${missingColumns.join(', ')}`);
  }

  const testCaseMap = new Map<string, TestCaseSpec>();
  let lastTcId = '';

  testCasesSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rawTcId = getRowValue(row, tcHeaderMap, 'TC_ID');
    const stepNoStr = getRowValue(row, tcHeaderMap, 'Step_No');
    const stepDesc = getRowValue(row, tcHeaderMap, 'Step_Desc');
    const actionRaw = getRowValue(row, tcHeaderMap, 'Action');

    if (!rawTcId && !stepNoStr && !stepDesc && !actionRaw) {
      return;
    }

    const tcId = rawTcId || lastTcId;
    if (!tcId) {
      throw new Error(`Dòng ${rowNumber} sheet TestCases có dữ liệu step nhưng không xác định được TC_ID.`);
    }
    lastTcId = tcId;

    let tc = testCaseMap.get(tcId);
    if (!tc) {
      const tagsRaw = getRowValue(row, tcHeaderMap, 'Tags');
      tc = {
        id: tcId,
        module: getRowValue(row, tcHeaderMap, 'Module'),
        screenId: getRowValue(row, tcHeaderMap, 'Screen_ID'),
        title: getRowValue(row, tcHeaderMap, 'Title'),
        category: getRowValue(row, tcHeaderMap, 'Category') as TestCategory,
        priority: getRowValue(row, tcHeaderMap, 'Priority') as TestPriority,
        automation: getRowValue(row, tcHeaderMap, 'Automation') as AutomationMode,
        role: getRowValue(row, tcHeaderMap, 'Role'),
        tags: tagsRaw
          ? tagsRaw
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        precondition: getRowValue(row, tcHeaderMap, 'Precondition'),
        steps: [],
      };
      testCaseMap.set(tcId, tc);
    }

    const stepNo = Number.parseInt(stepNoStr, 10);
    const step: TestStepSpec = {
      stepNo: Number.isFinite(stepNo) ? stepNo : tc.steps.length + 1,
      stepDesc,
      action: actionRaw.toUpperCase() as ActionKeyword,
      target: getRowValue(row, tcHeaderMap, 'Target'),
      inputData: getRowValue(row, tcHeaderMap, 'Input_Data'),
      expectedResult: getRowValue(row, tcHeaderMap, 'Expected_Result'),
      excelRow: rowNumber,
    };
    tc.steps.push(step);
  });

  return {
    sourcePath: filePath,
    overview,
    testData,
    testCases: Array.from(testCaseMap.values()),
  };
}

export function validateWorkbook(
  workbook: WorkbookSpec,
  registry: LocatorRegistry
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!workbook.overview.module) {
    errors.push('Sheet Overview thiếu giá trị cho Key "Module".');
  }

  const seenDataKeys = new Set<string>();
  for (const entry of workbook.testData) {
    if (seenDataKeys.has(entry.key)) {
      errors.push(`Sheet TestData bị trùng Key "${entry.key}".`);
    }
    seenDataKeys.add(entry.key);
  }

  if (workbook.testCases.length === 0) {
    errors.push('Sheet TestCases không có Test Case nào.');
  }

  const validActionSet = new Set<string>(VALID_ACTIONS);
  const validCategorySet = new Set<string>(VALID_CATEGORIES);
  const validPrioritySet = new Set<string>(VALID_PRIORITIES);
  const validAutomationSet = new Set<string>(VALID_AUTOMATION);

  for (const tc of workbook.testCases) {
    if (!tc.title) {
      errors.push(`[${tc.id}] Thiếu Title.`);
    }
    if (!tc.screenId) {
      errors.push(`[${tc.id}] Thiếu Screen_ID.`);
    }
    if (!validCategorySet.has(tc.category)) {
      errors.push(`[${tc.id}] Category "${tc.category}" không hợp lệ. Cho phép: ${VALID_CATEGORIES.join(', ')}`);
    }
    if (!validPrioritySet.has(tc.priority)) {
      errors.push(`[${tc.id}] Priority "${tc.priority}" không hợp lệ. Cho phép: ${VALID_PRIORITIES.join(', ')}`);
    }
    if (!validAutomationSet.has(tc.automation)) {
      errors.push(`[${tc.id}] Automation "${tc.automation}" không hợp lệ. Cho phép: ${VALID_AUTOMATION.join(', ')}`);
    }
    if (tc.steps.length === 0) {
      errors.push(`[${tc.id}] Không có bước (step) nào.`);
      continue;
    }

    let previousStepNo = 0;
    for (const step of tc.steps) {
      const rowInfo = step.excelRow ? ` (row ${step.excelRow})` : '';
      if (step.stepNo <= previousStepNo) {
        errors.push(`[${tc.id}] Step_No=${step.stepNo}${rowInfo} phải tăng dần.`);
      }
      previousStepNo = step.stepNo;

      if (!step.stepDesc) {
        warnings.push(`[${tc.id} step ${step.stepNo}${rowInfo}] Thiếu Step_Desc.`);
      }

      if (tc.automation === 'Auto') {
        if (!validActionSet.has(step.action)) {
          errors.push(
            `[${tc.id} step ${step.stepNo}${rowInfo}] Action "${step.action}" không nằm trong danh sách Action chuẩn.`
          );
          continue;
        }

        if (ACTIONS_REQUIRING_TARGET.has(step.action) && !step.target) {
          errors.push(
            `[${tc.id} step ${step.stepNo}${rowInfo}] Action "${step.action}" bắt buộc phải có Target locator key.`
          );
        }

        if (step.target && !registry[step.target]) {
          errors.push(
            `[${tc.id} step ${step.stepNo}${rowInfo}] Target "${step.target}" không tồn tại trong locators/*.locators.json.`
          );
        }

        if (step.action === 'GOTO' && !step.inputData) {
          errors.push(`[${tc.id} step ${step.stepNo}${rowInfo}] Action GOTO bắt buộc có Input_Data là URL/path.`);
        }

        if (step.action === 'LOGIN_AS' && !step.inputData) {
          errors.push(`[${tc.id} step ${step.stepNo}${rowInfo}] Action LOGIN_AS bắt buộc có Input_Data là tên role.`);
        }
      } else {
        if (step.target && !registry[step.target] && step.target !== '-') {
          warnings.push(
            `[${tc.id} step ${step.stepNo}${rowInfo}] Manual case tham chiếu Target "${step.target}" chưa có trong locators.`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
