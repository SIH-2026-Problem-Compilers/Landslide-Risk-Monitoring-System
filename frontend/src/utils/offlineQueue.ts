/**
 * Offline citizen-report queue backed by IndexedDB.
 *
 * When the browser is offline, reports are stored here. Once connectivity
 * returns, the queue is flushed automatically.  The UI reads the queue to
 * show pending/queued counts.
 */

const DB_NAME = 'ner-lew-offline';
const STORE_NAME = 'reports';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'queueId', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface QueuedReport {
  queueId?: number;
  reporterName: string;
  type: string;
  district: string;
  description: string;
  latitude: number;
  longitude: number;
  mediaUrls: string[];
  queuedAt: string;
}

/** Add a report to the offline queue. */
export async function enqueueReport(report: Omit<QueuedReport, 'queueId' | 'queuedAt'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry: QueuedReport = {
      ...report,
      queuedAt: new Date().toISOString(),
    };
    const req = store.add(entry);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Return all queued reports (for display). */
export async function getQueuedReports(): Promise<QueuedReport[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedReport[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Count queued reports. */
export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Remove a report from the queue by its queueId. */
export async function dequeueReport(queueId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(queueId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Flush the queue: POST each report to the API and remove on success. */
export async function flushQueue(
  apiPost: (report: QueuedReport) => Promise<unknown>,
): Promise<{ sent: number; failed: number }> {
  const reports = await getQueuedReports();
  let sent = 0;
  let failed = 0;
  for (const report of reports) {
    try {
      await apiPost(report);
      await dequeueReport(report.queueId!);
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
