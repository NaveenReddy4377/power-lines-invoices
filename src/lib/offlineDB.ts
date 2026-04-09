import fs from 'fs';
import path from 'path';
import { InvoiceData, QuotationData } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const DB_FILE = path.join(DATA_DIR, 'offline_db.json');

export interface OfflineDB {
  lastInvoiceNumber: string;
  lastQuotationNumber: string;
  offlineInvoices: InvoiceData[];
  offlineQuotations: QuotationData[];
}

const DEFAULT_DB: OfflineDB = {
  lastInvoiceNumber: 'PLEW001230',
  lastQuotationNumber: 'PLEW-Q-000',
  offlineInvoices: [],
  offlineQuotations: []
};

function ensureDBFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
  }
}

export function readOfflineDB(): OfflineDB {
  ensureDBFile();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data) as OfflineDB;
  } catch (error) {
    console.error('Failed to read offline DB, returning default:', error);
    return DEFAULT_DB;
  }
}

export function writeOfflineDB(db: OfflineDB) {
  ensureDBFile();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write offline DB:', error);
  }
}

// Helpers for caching last numbers
export function updateLastInvoiceNumber(num: string) {
  const db = readOfflineDB();
  db.lastInvoiceNumber = num;
  writeOfflineDB(db);
}

export function updateLastQuotationNumber(num: string) {
  const db = readOfflineDB();
  db.lastQuotationNumber = num;
  writeOfflineDB(db);
}

// Helpers for adding offline items
export function addOfflineInvoice(invoice: InvoiceData) {
  const db = readOfflineDB();
  db.offlineInvoices.push(invoice);
  // Also optimistically update last number
  db.lastInvoiceNumber = invoice.invoiceNo;
  writeOfflineDB(db);
}

export function addOfflineQuotation(quotation: QuotationData) {
  const db = readOfflineDB();
  db.offlineQuotations.push(quotation);
  db.lastQuotationNumber = quotation.quotationNo;
  writeOfflineDB(db);
}
