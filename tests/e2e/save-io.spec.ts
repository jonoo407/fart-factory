import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

test('Save section renders inside the notebook with export + import buttons', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  await expect(page.locator('#saveExportBtn')).toBeVisible();
  await expect(page.locator('#saveImportBtn')).toBeVisible();
});

test('Export triggers a JSON download containing the player save', async ({ page }) => {
  await loadStory(page);
  // Seed something distinctive.
  await page.evaluate(() => localStorage.setItem('fart_gold', '99'));
  await page.click('#notebookBtn');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#saveExportBtn'),
  ]);
  expect(download.suggestedFilename()).toMatch(/^fart-factory-save-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  const fs = await import('fs/promises');
  const content = await fs.readFile(path, 'utf8');
  const parsed = JSON.parse(content);
  expect(parsed.version).toBe(1);
  expect(parsed.keys.fart_gold).toBe('99');
  await expect(page.locator('#saveIoStatus')).toHaveText('Save exported.');
});

test('Import replaces existing state and reloads', async ({ page }) => {
  await loadStory(page);
  // Open notebook so the import file input is in the DOM.
  await page.click('#notebookBtn');
  const blob = JSON.stringify({
    version: 1,
    exportedAt: '2026-05-22T00:00:00Z',
    keys: {
      fart_gold: '777',
      fart_onboarding_seen: 'true',
    },
  });
  // Drive the hidden file input directly with an in-memory buffer.
  await page.setInputFiles('#saveImportInput', {
    name: 'save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(blob),
  });
  // The import writes the keys then reloads after a short delay — poll for the
  // imported state instead of sleeping a fixed amount. The catch() absorbs the
  // "execution context destroyed" race while the reload is in flight.
  await expect
    .poll(
      () => page.evaluate(() => localStorage.getItem('fart_gold')).catch(() => null),
      { timeout: 5000 },
    )
    .toBe('777');
});
