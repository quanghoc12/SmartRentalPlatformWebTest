import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  ACTION_REFERENCE_DOCS,
  type RunResultsPayload,
  type WorkbookSpec,
} from './schema.js';

export const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};

export const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Segoe UI',
  size: 10,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

export const BODY_FONT: Partial<ExcelJS.Font> = {
  name: 'Segoe UI',
  size: 10,
  color: { argb: 'FF1F2937' },
};

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

export function styleHeaderRow(sheet: ExcelJS.Worksheet, columnWidths: number[]): void {
  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = THIN_BORDER;
  });

  columnWidths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

export function styleDataRow(
  row: ExcelJS.Row,
  fillArgb?: string
): void {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = BODY_FONT;
    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    cell.border = THIN_BORDER;
    if (fillArgb) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillArgb },
      };
    }
  });
}

export function applyStatusBadge(cell: ExcelJS.Cell, status: string): void {
  const styles: Record<string, { bg: string; fg: string }> = {
    PASS: { bg: 'FFDCFCE7', fg: 'FF166534' },
    FAIL: { bg: 'FFFEE2E2', fg: 'FF991B1B' },
    MANUAL: { bg: 'FFFEF3C7', fg: 'FF92400E' },
    SKIPPED: { bg: 'FFF3F4F6', fg: 'FF4B5563' },
  };
  const chosen = styles[status];
  if (!chosen) return;
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: chosen.bg },
  };
  cell.font = {
    name: 'Segoe UI',
    size: 10,
    bold: true,
    color: { argb: chosen.fg },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

export async function writeTestCasesWorkbook(
  outputPath: string,
  spec: WorkbookSpec
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = spec.overview.author || 'SmartRentalPlatformWebTest AI Pipeline';
  workbook.created = new Date();

  const overviewSheet = workbook.addWorksheet('Overview');
  overviewSheet.addRow(['Key', 'Value']);
  const overviewEntries: Array<[string, string]> = [
    ['Module', spec.overview.module],
    ['Version', spec.overview.version],
    ['Base_URL', spec.overview.baseUrl],
    ['Spec_Source', spec.overview.specSource],
    ['Author', spec.overview.author],
    ['Generated_At', spec.overview.generatedAt],
    ['Notes', spec.overview.notes],
  ];
  for (const [k, v] of overviewEntries) {
    const row = overviewSheet.addRow([k, v]);
    styleDataRow(row);
    row.getCell(1).font = { ...BODY_FONT, bold: true };
  }
  styleHeaderRow(overviewSheet, [24, 96]);

  const dataSheet = workbook.addWorksheet('TestData');
  dataSheet.addRow(['Key', 'Value', 'Env_Var', 'Description']);
  for (const entry of spec.testData) {
    const row = dataSheet.addRow([entry.key, entry.value, entry.envVar, entry.description]);
    styleDataRow(row);
  }
  styleHeaderRow(dataSheet, [28, 36, 26, 62]);

  const tcSheet = workbook.addWorksheet('TestCases');
  tcSheet.addRow([
    'TC_ID',
    'Module',
    'Screen_ID',
    'Title',
    'Category',
    'Priority',
    'Automation',
    'Role',
    'Tags',
    'Precondition',
    'Step_No',
    'Step_Desc',
    'Action',
    'Target',
    'Input_Data',
    'Expected_Result',
  ]);

  let tcIndex = 0;
  for (const tc of spec.testCases) {
    const rowBg = tcIndex % 2 === 1 ? 'FFF8FAFC' : undefined;
    tcIndex += 1;

    for (const step of tc.steps) {
      const row = tcSheet.addRow([
        tc.id,
        tc.module,
        tc.screenId,
        tc.title,
        tc.category,
        tc.priority,
        tc.automation,
        tc.role,
        tc.tags.join(', '),
        tc.precondition,
        step.stepNo,
        step.stepDesc,
        step.action,
        step.target,
        step.inputData,
        step.expectedResult,
      ]);
      styleDataRow(row, rowBg);
    }
  }
  styleHeaderRow(tcSheet, [14, 14, 15, 36, 15, 10, 13, 14, 22, 34, 9, 36, 22, 30, 32, 42]);
  tcSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, tcSheet.rowCount), column: 16 },
  };

  const refSheet = workbook.addWorksheet('ActionReference');
  refSheet.addRow(['Action', 'Target_Required', 'Input_Format', 'Description', 'Example']);
  for (const doc of ACTION_REFERENCE_DOCS) {
    const row = refSheet.addRow([
      doc.action,
      doc.targetRequired,
      doc.inputFormat,
      doc.description,
      doc.example,
    ]);
    styleDataRow(row);
  }
  styleHeaderRow(refSheet, [24, 18, 38, 46, 32]);

  await workbook.xlsx.writeFile(outputPath);
}

export async function writeEvidenceWorkbook(
  outputPath: string,
  sourceWorkbook: WorkbookSpec,
  runPayload: RunResultsPayload
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartRentalPlatformWebTest Runner';
  workbook.created = new Date();

  const totalTcs = runPayload.results.length;
  const autoResults = runPayload.results.filter((r) => r.automation === 'Auto');
  const manualResults = runPayload.results.filter((r) => r.automation === 'Manual');
  const passCount = autoResults.filter((r) => r.status === 'PASS').length;
  const failCount = autoResults.filter((r) => r.status === 'FAIL').length;
  const skippedCount = runPayload.results.filter((r) => r.status === 'SKIPPED').length;
  const passRate = autoResults.length > 0 ? ((passCount / autoResults.length) * 100).toFixed(1) : '0.0';

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Metric', 'Value']);
  const summaryRows: Array<[string, string | number]> = [
    ['Run_ID', runPayload.runId],
    ['Module', runPayload.moduleName || sourceWorkbook.overview.module],
    ['Source_Excel', runPayload.sourceFile],
    ['Base_URL', runPayload.baseUrl],
    ['DB_Reset_Executed', runPayload.dbResetExecuted ? 'Yes' : 'No'],
    ['Started_At', runPayload.startedAt],
    ['Finished_At', runPayload.finishedAt],
    ['Total_TestCases', totalTcs],
    ['Auto_TestCases', autoResults.length],
    ['Manual_TestCases', manualResults.length],
    ['Auto_PASS', passCount],
    ['Auto_FAIL', failCount],
    ['Skipped', skippedCount],
    ['Auto_Pass_Rate_%', `${passRate}%`],
  ];
  for (const [k, v] of summaryRows) {
    const row = summarySheet.addRow([k, v]);
    styleDataRow(row);
    row.getCell(1).font = { ...BODY_FONT, bold: true };
  }
  styleHeaderRow(summarySheet, [26, 72]);

  const tcResultSheet = workbook.addWorksheet('TestCases_Result');
  tcResultSheet.addRow([
    'TC_ID',
    'Screen_ID',
    'Title',
    'Category',
    'Priority',
    'Automation',
    'Role',
    'Status',
    'Steps_Passed',
    'Total_Steps',
    'Duration_Ms',
    'Error_Summary',
    'Evidence_Folder',
  ]);
  for (const res of runPayload.results) {
    const stepsPassed = res.steps.filter((s) => s.status === 'PASS').length;
    const row = tcResultSheet.addRow([
      res.id,
      res.screenId,
      res.title,
      res.category,
      res.priority,
      res.automation,
      res.role,
      res.status,
      stepsPassed,
      res.steps.length,
      res.durationMs,
      res.errorSummary ?? '',
      res.evidenceDir ?? '',
    ]);
    styleDataRow(row);
    applyStatusBadge(row.getCell(8), res.status);
  }
  styleHeaderRow(tcResultSheet, [14, 15, 38, 15, 10, 12, 13, 12, 13, 12, 13, 46, 42]);
  tcResultSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, tcResultSheet.rowCount), column: 13 },
  };

  const stepSheet = workbook.addWorksheet('Step_Evidence');
  stepSheet.addRow([
    'TC_ID',
    'Step_No',
    'Step_Desc',
    'Action',
    'Target',
    'Input_Data',
    'Expected_Result',
    'Status',
    'Duration_Ms',
    'Error',
    'Screenshot_File',
    'Screenshot_Preview',
  ]);

  for (const res of runPayload.results) {
    if (res.automation === 'Manual') {
      continue;
    }
    for (const step of res.steps) {
      const hasImage = Boolean(step.screenshotPath && fs.existsSync(step.screenshotPath));
      const row = stepSheet.addRow([
        res.id,
        step.stepNo,
        step.stepDesc,
        step.action,
        step.target,
        step.resolvedInput,
        step.expectedResult,
        step.status,
        step.durationMs,
        step.error ?? '',
        step.screenshotPath ? path.basename(step.screenshotPath) : '',
        hasImage ? '' : '(Không có ảnh)',
      ]);
      styleDataRow(row);
      applyStatusBadge(row.getCell(8), step.status);

      if (hasImage && step.screenshotPath) {
        row.height = 250;
        const imageId = workbook.addImage({
          filename: step.screenshotPath,
          extension: 'png',
        });
        const zeroBasedRow = row.number - 1;
        stepSheet.addImage(imageId, {
          tl: { col: 11, row: zeroBasedRow + 0.05 },
          ext: { width: 480, height: 300 },
        });
      }
    }
  }

  styleHeaderRow(stepSheet, [14, 9, 34, 20, 28, 28, 36, 11, 12, 36, 26, 68]);

  await workbook.xlsx.writeFile(outputPath);
}
