import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import type { LocatorEntry, LocatorRegistry } from '../excel/schema.js';

export function loadLocatorRegistry(locatorsDir: string): LocatorRegistry {
  if (!fs.existsSync(locatorsDir)) {
    throw new Error(`Không tìm thấy thư mục locators: ${locatorsDir}`);
  }

  const registry: LocatorRegistry = {};
  const files = fs
    .readdirSync(locatorsDir)
    .filter((file) => file.endsWith('.locators.json'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(locatorsDir, file);
    const raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Record<string, unknown>;
    flattenLocatorMap(raw, '', registry, file);
  }

  return registry;
}

function isLocatorEntry(node: unknown): node is LocatorEntry {
  return (
    typeof node === 'object' &&
    node !== null &&
    typeof (node as LocatorEntry).strategy === 'string' &&
    typeof (node as LocatorEntry).value === 'string'
  );
}

function flattenLocatorMap(
  obj: Record<string, unknown>,
  prefix: string,
  target: LocatorRegistry,
  fileName: string
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isLocatorEntry(value)) {
      if (target[fullKey]) {
        throw new Error(`Trùng locator key "${fullKey}" (phát hiện ở ${fileName}).`);
      }
      target[fullKey] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenLocatorMap(value as Record<string, unknown>, fullKey, target, fileName);
    }
  }
}

export function resolveLocator(
  page: Page,
  registry: LocatorRegistry,
  targetKey: string
): { locator: Locator; entry: LocatorEntry } {
  const entry = registry[targetKey];
  if (!entry) {
    const domainPrefix = targetKey.split('.')[0] ?? '';
    const suggestions = Object.keys(registry)
      .filter((key) => key.startsWith(domainPrefix))
      .slice(0, 8);
    const hint =
      suggestions.length > 0
        ? ` Gợi ý các key cùng nhóm: ${suggestions.join(', ')}`
        : '';
    throw new Error(`Không tìm thấy Locator Key "${targetKey}" trong locators/*.locators.json.${hint}`);
  }

  let locator: Locator;

  switch (entry.strategy) {
    case 'id':
      locator = page.locator(`#${entry.value}`);
      break;
    case 'css':
      locator = page.locator(entry.value);
      break;
    case 'testid':
      locator = page.getByTestId(entry.value);
      break;
    case 'role': {
      type RoleArg = Parameters<Page['getByRole']>[0];
      const options = entry.name !== undefined ? { name: entry.name, exact: entry.exact } : undefined;
      locator = page.getByRole(entry.value as RoleArg, options);
      break;
    }
    case 'label':
      locator = page.getByLabel(entry.value, { exact: entry.exact });
      break;
    case 'placeholder':
      locator = page.getByPlaceholder(entry.value, { exact: entry.exact });
      break;
    case 'text':
      locator = page.getByText(entry.value, { exact: entry.exact });
      break;
    default:
      throw new Error(`Strategy không được hỗ trợ "${String(entry.strategy)}" ở locator "${targetKey}".`);
  }

  if (typeof entry.nth === 'number' && entry.nth >= 0) {
    locator = locator.nth(entry.nth);
  }

  return { locator, entry };
}
