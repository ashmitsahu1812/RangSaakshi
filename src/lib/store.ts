/**
 * IndexedDB Store for RangSaakshi
 * Handles offline storage of test records, videos, and evidence
 */

import { TestRecord } from './types';

const DB_NAME = 'RangSaakshiDB';
const DB_VERSION = 1;

const STORES = {
  records: 'testRecords',
  videos: 'videoBlobs',
  calibrations: 'calibrations',
  intelligence: 'intelligence',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.records)) {
        db.createObjectStore(STORES.records, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.videos)) {
        db.createObjectStore(STORES.videos, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.calibrations)) {
        db.createObjectStore(STORES.calibrations, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.intelligence)) {
        const store = db.createObjectStore(STORES.intelligence, { keyPath: 'id', autoIncrement: true });
        store.createIndex('drugGroup', 'drugGroup', { unique: false });
        store.createIndex('district', 'district', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTestRecord(record: TestRecord): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.records, 'readwrite');
  const store = tx.objectStore(STORES.records);
  
  // Don't store the blob directly — store it in the videos store
  const { videoBlob, ...recordWithoutBlob } = record;
  store.put(recordWithoutBlob);
  
  if (videoBlob) {
    const videoTx = db.transaction(STORES.videos, 'readwrite');
    videoTx.objectStore(STORES.videos).put({ id: record.id, blob: videoBlob });
  }
}

export async function getTestRecord(id: string): Promise<TestRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.records, 'readonly');
    const request = tx.objectStore(STORES.records).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.videos, 'readonly');
    const request = tx.objectStore(STORES.videos).get(id);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllTestRecords(): Promise<TestRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.records, 'readonly');
    const request = tx.objectStore(STORES.records).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTestRecord(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORES.records, STORES.videos], 'readwrite');
  tx.objectStore(STORES.records).delete(id);
  tx.objectStore(STORES.videos).delete(id);
}
