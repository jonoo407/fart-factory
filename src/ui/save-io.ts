/**
 * Save-export / save-import UI wiring. Lives inside the Notebook modal.
 *
 * Export: serializes localStorage (fart_* keys) and triggers a JSON
 * download named fart-factory-save-YYYY-MM-DD.json.
 * Import: reads a user-picked file, validates, replaces storage, then
 * reloads so all in-memory state matches the new save.
 */

import { exportSaveString, importSave, SAVE_FORMAT_VERSION } from '../state/save-io';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function setStatus(msg: string, kind: 'ok' | 'err' | 'info' = 'info'): void {
  const el = $('saveIoStatus');
  if (!el) return;
  el.textContent = msg;
  el.dataset.kind = kind;
}

function triggerDownload(filename: string, body: string): void {
  const blob = new Blob([body], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function onExport(): void {
  try {
    const json = exportSaveString();
    triggerDownload(`fart-factory-save-${todayStamp()}.json`, json);
    setStatus('Save exported.', 'ok');
  } catch (e) {
    setStatus(e instanceof Error ? `Export failed: ${e.message}` : 'Export failed.', 'err');
  }
}

function onImportClicked(): void {
  $('saveImportInput')?.click();
}

function onImportFile(ev: Event): void {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result ?? '');
    const result = importSave(text);
    if (!result.ok) {
      setStatus(`Import failed: ${result.reason ?? 'unknown error'}`, 'err');
      input.value = '';
      return;
    }
    setStatus(`Imported ${result.importedKeys ?? 0} keys. Reloading…`, 'ok');
    // Give the status a tick to render, then reload so in-memory state syncs.
    setTimeout(() => window.location.reload(), 600);
  };
  reader.onerror = () => {
    setStatus('Could not read the file.', 'err');
    input.value = '';
  };
  reader.readAsText(file);
}

let wired = false;

export function wireSaveIo(): void {
  if (wired) return;
  $('saveExportBtn')?.addEventListener('click', onExport);
  $('saveImportBtn')?.addEventListener('click', onImportClicked);
  $('saveImportInput')?.addEventListener('change', onImportFile);
  wired = true;
}

// Re-export for tests that want to know what format we ship.
export { SAVE_FORMAT_VERSION };
