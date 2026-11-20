import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  VALID_CATEGORIES,
  type FindingItem,
  type RunResultsPayload,
  type TestCategory,
  type WorkbookSpec,
} from './schema.js';
import {
  applyStatusBadge,
  BODY_FONT,
  styleDataRow,
  styleHeaderRow,
} from './writer.js';

export interface AssessmentOptions {
  moduleName: string;
  workbook: WorkbookSpec;
  runPayload?: RunResultsPayload | null;
  blockerDecisions: Array<{ id: string; title: string; decision: string }>;
  findings: FindingItem[];
  xlsxOutputPath: string;
  mdOutputPath: string;
}

interface ScreenCoverageRow {
  screenId: string;
  total: number;
  autoCount: number;
  manualCount: number;
  countsByCategory: Record<TestCategory, number>;
}

function buildCoverageMatrix(workbook: WorkbookSpec): ScreenCoverageRow[] {
  const byScreen = new Map<string, ScreenCoverageRow>();

  for (const tc of workbook.testCases) {
    let entry = byScreen.get(tc.screenId);
    if (!entry) {
      entry = {
        screenId: tc.screenId,
        total: 0,
        autoCount: 0,
        manualCount: 0,
        countsByCategory: {
          Normal: 0,
          Abnormal: 0,
          Boundary: 0,
          'Security/Role': 0,
          BugCheck: 0,
        },
      };
      byScreen.set(tc.screenId, entry);
    }
    entry.total += 1;
    if (tc.automation === 'Auto') entry.autoCount += 1;
    else entry.manualCount += 1;
    if (entry.countsByCategory[tc.category] !== undefined) {
      entry.countsByCategory[tc.category] += 1;
    }
  }

  return Array.from(byScreen.values());
}

export async function writeAssessmentArtifacts(options: AssessmentOptions): Promise<void> {
  fs.mkdirSync(path.dirname(options.xlsxOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(options.mdOutputPath), { recursive: true });

  const { moduleName, workbook, runPayload, blockerDecisions, findings } = options;
  const coverageRows = buildCoverageMatrix(workbook);
  const totalTcs = workbook.testCases.length;
  const autoTcs = workbook.testCases.filter((tc) => tc.automation === 'Auto').length;
  const manualTcs = workbook.testCases.filter((tc) => tc.automation === 'Manual').length;

  const excel = new ExcelJS.Workbook();
  excel.creator = 'SmartRentalPlatformWebTest Assessment Generator';
  excel.created = new Date();

  const overviewSheet = excel.addWorksheet('Overview');
  overviewSheet.addRow(['Field', 'Value']);
  const overviewData: Array<[string, string | number]> = [
    ['Module', moduleName],
    ['Source_Spec', workbook.overview.specSource],
    ['Source_Excel', path.basename(workbook.sourcePath)],
    ['Total_TestCases', totalTcs],
    ['Auto_TestCases', autoTcs],
    ['Manual_TestCases', manualTcs],
    ['Auto_Coverage_%', totalTcs > 0 ? `${((autoTcs / totalTcs) * 100).toFixed(1)}%` : '0%'],
    ['Generated_At', new Date().toISOString()],
    ...blockerDecisions.map((b): [string, string] => [`Decision_${b.id} (${b.title})`, b.decision]),
  ];
  for (const [k, v] of overviewData) {
    const row = overviewSheet.addRow([k, v]);
    styleDataRow(row);
    row.getCell(1).font = { ...BODY_FONT, bold: true };
  }
  styleHeaderRow(overviewSheet, [36, 84]);

  const covSheet = excel.addWorksheet('Coverage_Matrix');
  covSheet.addRow([
    'Screen_ID',
    'Total_TCs',
    'Auto',
    'Manual',
    ...VALID_CATEGORIES,
  ]);
  for (const item of coverageRows) {
    const row = covSheet.addRow([
      item.screenId,
      item.total,
      item.autoCount,
      item.manualCount,
      ...VALID_CATEGORIES.map((cat) => item.countsByCategory[cat]),
    ]);
    styleDataRow(row);
  }
  const totalRow = covSheet.addRow([
    'TOTAL',
    totalTcs,
    autoTcs,
    manualTcs,
    ...VALID_CATEGORIES.map((cat) =>
      coverageRows.reduce((acc, r) => acc + r.countsByCategory[cat], 0)
    ),
  ]);
  styleDataRow(totalRow, 'FFE2E8F0');
  totalRow.eachCell((cell) => {
    cell.font = { ...BODY_FONT, bold: true };
  });
  styleHeaderRow(covSheet, [20, 12, 10, 10, 12, 12, 12, 15, 12]);

  const execSheet = excel.addWorksheet('Execution_Summary');
  execSheet.addRow([
    'TC_ID',
    'Screen_ID',
    'Title',
    'Category',
    'Priority',
    'Automation',
    'Latest_Status',
    'Duration_Ms',
    'Error_Summary',
  ]);
  const resultMap = new Map(
    (runPayload?.results ?? []).map((r) => [r.id, r])
  );
  for (const tc of workbook.testCases) {
    const res = resultMap.get(tc.id);
    const statusText = res ? res.status : tc.automation === 'Manual' ? 'MANUAL' : 'NOT_RUN';
    const row = execSheet.addRow([
      tc.id,
      tc.screenId,
      tc.title,
      tc.category,
      tc.priority,
      tc.automation,
      statusText,
      res?.durationMs ?? 0,
      res?.errorSummary ?? '',
    ]);
    styleDataRow(row);
    applyStatusBadge(row.getCell(7), statusText);
  }
  styleHeaderRow(execSheet, [14, 15, 40, 15, 10, 13, 14, 13, 48]);

  const findSheet = excel.addWorksheet('Findings_And_Risks');
  findSheet.addRow([
    'Finding_ID',
    'Type',
    'Severity',
    'Related_TC',
    'Summary',
    'Evidence_Or_Source',
    'Recommended_Action',
  ]);
  for (const f of findings) {
    const row = findSheet.addRow([
      f.id,
      f.type,
      f.severity,
      f.relatedTc,
      f.summary,
      f.evidenceOrSource,
      f.recommendedAction,
    ]);
    styleDataRow(row);
    if (f.type === 'Bug') {
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      row.getCell(2).font = { ...BODY_FONT, bold: true, color: { argb: 'FF991B1B' } };
    }
  }
  styleHeaderRow(findSheet, [14, 16, 11, 14, 42, 46, 48]);

  await excel.xlsx.writeFile(options.xlsxOutputPath);

  const passCount = (runPayload?.results ?? []).filter((r) => r.status === 'PASS').length;
  const failCount = (runPayload?.results ?? []).filter((r) => r.status === 'FAIL').length;
  const manualCountRun = (runPayload?.results ?? []).filter((r) => r.status === 'MANUAL').length;

  const mdLines: string[] = [
    `# Assessment Report — Module: ${moduleName}`,
    '',
    `- **Spec nguồn:** \`${workbook.overview.specSource}\``,
    `- **Excel đầu vào:** \`${path.relative(process.cwd(), workbook.sourcePath).replaceAll('\\', '/')}\``,
    `- **Tổng Test Cases:** **${totalTcs}** (Auto: **${autoTcs}**, Manual: **${manualTcs}**)`,
    '',
    '## 1. Các phương án Blocker đã chốt',
    '',
    '| Blocker | Hạng mục | Phương án đã chốt |',
    '| --- | --- | --- |',
    ...blockerDecisions.map((b) => `| ${b.id} | ${b.title} | ${b.decision} |`),
    '',
    '## 2. Ma trận độ phủ (Coverage Matrix)',
    '',
    '| Screen_ID | Total | Auto | Manual | Normal | Abnormal | Boundary | Security/Role | BugCheck |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...coverageRows.map(
      (r) =>
        `| ${r.screenId} | ${r.total} | ${r.autoCount} | ${r.manualCount} | ${r.countsByCategory.Normal} | ${r.countsByCategory.Abnormal} | ${r.countsByCategory.Boundary} | ${r.countsByCategory['Security/Role']} | ${r.countsByCategory.BugCheck} |`
    ),
    '',
    '## 3. Kết quả chạy gần nhất',
    '',
    runPayload
      ? `- **Run ID:** \`${runPayload.runId}\` (${runPayload.startedAt} → ${runPayload.finishedAt})\n- **Base URL:** \`${runPayload.baseUrl}\`\n- **DB Reset:** ${runPayload.dbResetExecuted ? 'Có' : 'Không'}\n- **Kết quả:** PASS=${passCount}, FAIL=${failCount}, MANUAL=${manualCountRun}`
      : '- *Chưa có lần chạy Playwright nào trên dữ liệu này (chỉ mới kiểm kê thiết kế). Hãy chạy `npm run test:auth-home` khi hệ thống local đang bật.*',
    '',
    '## 4. Findings, Bugs & Risks',
    '',
    '| ID | Loại | Mức độ | Liên quan TC | Tóm tắt | Khuyến nghị |',
    '| --- | --- | --- | --- | --- | --- |',
    ...findings.map(
      (f) => `| ${f.id} | ${f.type} | ${f.severity} | ${f.relatedTc} | ${f.summary} | ${f.recommendedAction} |`
    ),
    '',
  ];

  fs.writeFileSync(options.mdOutputPath, mdLines.join('\n'), 'utf-8');
}
