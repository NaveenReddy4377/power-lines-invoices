'use server';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { InvoiceData, QuotationData, Client, InventoryItem, DeliveryChallanData, CashBillData, PendingBill, BillFollowUp } from '@/types';
import legacyCompanies from '@/data/companies.json';
import {
  syncInvoiceToSupabase,
  syncCashBillToSupabase,
  syncDeliveryChallanToSupabase,
  syncQuotationToSupabase,
  syncClientToSupabase,
  syncPendingBillToSupabase,
  fetchInvoiceFromSupabase,
  fetchQuotationFromSupabase,
  fetchDeliveryChallanFromSupabase,
  fetchCashBillFromSupabase,
  fetchInvoicesFromSupabase,
  fetchQuotationsFromSupabase,
  fetchDeliveryChallansFromSupabase,
  fetchCashBillsFromSupabase,
  fetchClientsFromSupabase,
  fetchPendingBillsFromSupabase,
  deletePendingBillFromSupabase,
  fetchDescriptionsFromSupabase,
  getLatestInvoiceNoFromSupabase,
  getLatestQuotationNoFromSupabase,
  getLatestDcNoFromSupabase,
  getLatestCashBillNoFromSupabase,
} from '@/lib/supabaseSync';
import { sendPendingBillEmail } from '@/lib/pendingBillEmail';

// Helper to get or create a named sheet tab
async function getOrCreateSheet(doc: GoogleSpreadsheet, title: string) {
  let sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    sheet = await doc.addSheet({ title, headerValues: ['Quotation No', 'Date', 'Valid Until', 'Billed To', 'GSTIN', 'RGP No', 'RGP Date', 'Grand Total (₹)', 'Status', 'RawData'] });
  } else {
    try { await sheet.loadHeaderRow(); } catch(e) {}
    await ensureStatusHeader(sheet, ['Quotation No', 'Date', 'Valid Until', 'Billed To', 'GSTIN', 'RGP No', 'RGP Date', 'Grand Total (₹)', 'Status', 'RawData']);
  }
  return sheet;
}

// Helper to ensure 'Status' column exists in headers
async function ensureStatusHeader(sheet: any, expectedHeaders: string[]) {
  try {
    const headers = sheet.headerValues;
    if (headers && !headers.includes('Status')) {
      const newHeaders = [...expectedHeaders];
      await sheet.setHeaderRow(newHeaders);
      console.log(`Added 'Status' header to sheet: ${sheet.title}`);
    }
  } catch (err) {
    console.error(`Failed to ensure Status header for ${sheet.title}:`, err);
  }
}

// In-memory cache for doc instance to avoid calling doc.loadInfo() on every single request
let cachedDoc: GoogleSpreadsheet | null = null;
let lastDocLoadTime = 0;
const DOC_CACHE_TTL = 30000; // 30 seconds

// Cache for last known sequence numbers to prevent 429 quota failures from breaking the app
let lastKnownInvoiceNo: string | null = null;
let lastKnownQuotationNo: string | null = null;
let lastKnownDcNo: string | null = null;

// In-memory cache for CRM clients and Inventory to protect Google Sheets read quota
let cachedClients: Client[] | null = null;
let lastClientsLoadTime = 0;
let cachedInventory: InventoryItem[] | null = null;
let lastInventoryLoadTime = 0;
const DATA_CACHE_TTL = 60000; // 60 seconds

// Connect to Google Sheets with caching and 429 rate limit resilience
const getSheet = async (forceFresh = false) => {
  if (cachedDoc && !forceFresh && (Date.now() - lastDocLoadTime < DOC_CACHE_TTL)) {
    return cachedDoc;
  }

  let creds;

  const credsFile = path.join(process.cwd(), 'credentials.json');
  if (fs.existsSync(credsFile)) {
    creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
  } else if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      if (typeof creds === 'string') {
        creds = JSON.parse(creds);
      }
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
      throw new Error('Invalid GOOGLE_CREDENTIALS_JSON format.');
    }
  } else {
    throw new Error('No Google credentials found!');
  }

  const sheetId = process.env.SPREADSHEET_ID;
  if (!sheetId) {
    throw new Error('SPREADSHEET_ID not defined in .env.local!');
  }

  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  try {
    await doc.loadInfo();
    cachedDoc = doc;
    lastDocLoadTime = Date.now();
    return doc;
  } catch (err: any) {
    // If rate-limited (429) and we already have a cached doc, keep using it
    if (cachedDoc) {
      console.warn('Google Sheets loadInfo rate-limited (429), reusing cached doc:', err.message);
      return cachedDoc;
    }
    throw err;
  }
};

// Safe wrapper with timeout
async function getSheetSafely(timeoutMs = 10000, forceFresh = false): Promise<GoogleSpreadsheet> {
  return Promise.race([
    getSheet(forceFresh),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SHEET_TIMEOUT')), timeoutMs))
  ]) as Promise<GoogleSpreadsheet>;
}

// Helper to increment ID strings like PLEW001231
function incrementId(lastId: string, defaultStart: string): string {
  const match = lastId.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const num = parseInt(numStr, 10) + 1;
    const paddedNum = num.toString().padStart(numStr.length, '0');
    return prefix + paddedNum;
  }
  const num = parseInt(lastId, 10);
  if (!isNaN(num)) return (num + 1).toString();
  return defaultStart;
}

// Helper to safely extract the last ID from the sheet (bottom-most non-empty row)
function getLastId(rows: any[], colName: string): string | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const val = rows[i].get(colName);
    if (val && typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
  }
  return null;
}

// Helper to compare alphanumeric IDs numerically (e.g., "ID10" > "ID9")
function compareIds(id1: string, id2: string): number {
  if (!id1) return -1;
  if (!id2) return 1;

  const m1 = id1.match(/^(.*?)(\d+)$/);
  const m2 = id2.match(/^(.*?)(\d+)$/);

  if (m1 && m2 && m1[1] === m2[1]) {
    const n1 = parseInt(m1[2], 10);
    const n2 = parseInt(m2[2], 10);
    return n1 - n2;
  }

  return id1.localeCompare(id2, undefined, { numeric: true, sensitivity: 'base' });
}

// Auto increment based on last row with 429 quota resilience and Supabase fallback
export async function getNextInvoiceNumber() {
  const defaultStart = "PLEW001231";
  try {
    const doc = await getSheetSafely();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const latestId = getLastId(rows, 'Invoice No');
    if (latestId) {
      lastKnownInvoiceNo = latestId;
      return incrementId(latestId, defaultStart);
    }
  } catch (error: any) {
    console.warn('getNextInvoiceNumber quota/connection issue, checking Supabase:', error.message);
  }

  try {
    const supaLatest = await getLatestInvoiceNoFromSupabase();
    if (supaLatest) {
      lastKnownInvoiceNo = supaLatest;
      return incrementId(supaLatest, defaultStart);
    }
  } catch {}

  if (lastKnownInvoiceNo) {
    return incrementId(lastKnownInvoiceNo, defaultStart);
  }
  return defaultStart;
}

export async function saveToSpreadsheet(data: InvoiceData) {
  try {
    const doc = await getSheetSafely();
    const sheet = doc.sheetsByIndex[0];

    const totalAmount = data.items.reduce((sum, item) => {
      let price = item.price * item.quantity;
      if (item.discountType === 'percentage') {
        price -= (price * item.discount / 100);
      } else {
        price -= item.discount;
      }
      return sum + price;
    }, 0);

    const cgstAmount = totalAmount * (data.taxes.cgst / 100);
    const sgstAmount = totalAmount * (data.taxes.sgst / 100);
    const grandTotal = totalAmount + cgstAmount + sgstAmount;

    await sheet.loadHeaderRow();
    await ensureStatusHeader(sheet, ['Invoice No', 'Date', 'Billed To', 'GSTIN', 'Sum Total (₹)', 'CGST (₹)', 'SGST (₹)', 'Grand Total (₹)', 'PO Number', 'PO Date', 'Status', 'RawData']);

    const rows = await sheet.getRows();
    let targetRow = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.get('Invoice No') === data.invoiceNo) { targetRow = row; }
      else if (data.poNumber && row.get('PO Number') === data.poNumber) {
        throw new Error(`PO Number ${data.poNumber} is already used in Invoice ${row.get('Invoice No')}!`);
      }
    }

    const rowObj = {
      'Invoice No': data.invoiceNo,
      'Date': data.invoiceDate,
      'Billed To': data.billTo.name,
      'GSTIN': data.billTo.gstin,
      'Sum Total (₹)': totalAmount,
      'CGST (₹)': cgstAmount,
      'SGST (₹)': sgstAmount,
      'Grand Total (₹)': grandTotal,
      'PO Number': data.poNumber,
      'PO Date': data.poDate,
      'Status': data.status || 'Pending',
      'RawData': JSON.stringify(data),
    };

    // Save to Google Sheets and Supabase concurrently, awaiting both!
    const sheetPromise = (async () => {
      if (targetRow) {
        targetRow.assign(rowObj);
        await targetRow.save();
      } else {
        await sheet.addRow(rowObj);
      }
    })();
    const supabasePromise = syncInvoiceToSupabase(data);

    const [sheetResult, supaResult] = await Promise.allSettled([sheetPromise, supabasePromise]);

    if (sheetResult.status === 'rejected') {
      console.error('Google Sheets save error for invoice:', sheetResult.reason);
      if (supaResult.status === 'fulfilled' && supaResult.value.success) {
        return { success: true, offline: true, note: 'Saved to Supabase database (Google Sheets write pending)' };
      }
      return { success: false, error: sheetResult.reason?.message || 'Failed to save invoice to Google Sheets' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('saveToSpreadsheet error:', error);
    return { success: false, error: error.message || 'Failed to save invoice to Google Sheets' };
  }
}

export async function loadInvoice(invoiceNo: string) {
  if (!invoiceNo || !invoiceNo.trim()) {
    return { success: false, error: 'Invoice number is required.' };
  }
  const cleanNo = invoiceNo.trim();

  // 1. Fast lookup from Supabase first
  try {
    const supaData = await fetchInvoiceFromSupabase(cleanNo);
    if (supaData) {
      return { success: true, data: supaData };
    }
  } catch (e) {
    console.warn('Supabase loadInvoice fallback:', e);
  }

  // 2. Fallback to Google Sheets
  try {
    const doc = await getSheetSafely();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    for (let i = 0; i < rows.length; i++) {
      const cellVal = rows[i].get('Invoice No') || '';
      if (cellVal.toString().trim().toUpperCase() === cleanNo.toUpperCase()) {
        const rawJson = rows[i].get('RawData');
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          syncInvoiceToSupabase(parsed).catch(() => {});
          return { success: true, data: parsed };
        }
      }
    }
    return { success: false, error: `Invoice "${cleanNo}" not found.` };
  } catch (error: any) {
    console.error('loadInvoice error:', error);
    return { success: false, error: 'Load failed: ' + error.message };
  }
}

export async function getItemSuggestions(): Promise<string[]> {
  const itemSet = new Set<string>();

  try {
    const doc = await getSheetSafely(5000);
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (const row of rows) {
      const rawJson = row.get('RawData');
      if (rawJson) {
        try {
          const parsed = JSON.parse(rawJson);
          if (parsed.items && Array.isArray(parsed.items)) {
            for (const item of parsed.items) {
              if (item.name?.trim()) itemSet.add(item.name.trim().toUpperCase());
            }
          }
        } catch { }
      }
    }
  } catch (error) {
    // Return empty if sheets unavailable
  }
  return Array.from(itemSet).sort();
}

export async function getDashboardStats() {
  // 1. Fast lookup from Supabase first
  try {
    const [supaInvoices, supaQuotations, deliveryChallans, cashBills] = await Promise.all([
      fetchInvoicesFromSupabase(),
      fetchQuotationsFromSupabase(),
      getDeliveryChallanList(),
      getCashBillList(),
    ]);

    if (supaInvoices && supaQuotations) {
      const customerSet = new Set<string>();
      let totalRevenue = 0;
      supaInvoices.forEach(inv => {
        totalRevenue += Number(inv.amount || 0);
        if (inv.customer) customerSet.add(inv.customer);
      });

      return {
        success: true,
        data: {
          totalRevenue,
          customers: customerSet.size,
          recentInvoices: supaInvoices,
          recentQuotations: supaQuotations,
          recentDeliveryChallans: deliveryChallans,
          recentCashBills: cashBills,
        }
      };
    }
  } catch (e) {
    console.warn('Supabase getDashboardStats fallback to sheets:', e);
  }

  // 2. Fallback to Google Sheets
  const totalRevenue = { value: 0 };
  const customerSet = new Set();
  const recentInvoices: any[] = [];
  const recentQuotations: any[] = [];

  try {
    const doc = await getSheetSafely(5000);
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const invNo = r.get('Invoice No') || '';
      const date = r.get('Date') || '';
      const billedTo = r.get('Billed To') || '';
      const grandTotal = parseFloat(r.get('Grand Total (₹)')) || 0;

      totalRevenue.value += grandTotal;
      if (billedTo) customerSet.add(billedTo);

      let parsedDueDate = '';
      const rawData = r.get('RawData');
      if (rawData) {
        try {
          const parsed = JSON.parse(rawData);
          if (parsed.dueDate) parsedDueDate = parsed.dueDate;
        } catch(e) {}
      }

      if (invNo) {
        const sumTot = parseFloat(r.get('Sum Total (₹)')) || (grandTotal > 0 ? Math.round((grandTotal / 1.18) * 100) / 100 : 0);
        const cgstVal = parseFloat(r.get('CGST (₹)')) || (grandTotal > 0 ? Math.round(((grandTotal / 1.18) * 0.09) * 100) / 100 : 0);
        const sgstVal = parseFloat(r.get('SGST (₹)')) || (grandTotal > 0 ? Math.round(((grandTotal / 1.18) * 0.09) * 100) / 100 : 0);

        recentInvoices.push({ 
          id: invNo, 
          date: date, 
          dueDate: parsedDueDate,
          customer: billedTo, 
          amount: grandTotal, 
          status: r.get('Status') || 'Pending',
          gstin: r.get('GSTIN') || '',
          sumTotal: sumTot,
          cgst: cgstVal,
          sgst: sgstVal,
          poNumber: r.get('PO Number') || '',
          poDate: r.get('PO Date') || '',
        });
      }
    }

    // Quotations sheet
    try {
      const quotSheet = doc.sheetsByTitle['Quotations'];
      if (quotSheet) {
        const qRows = await quotSheet.getRows();
        for (let i = qRows.length - 1; i >= 0; i--) {
          const r = qRows[i];
          const qNo = r.get('Quotation No') || '';
          if (qNo) {
            const qGrandTotal = parseFloat(r.get('Grand Total (₹)')) || 0;
            const qSumTot = Math.round((qGrandTotal / 1.18) * 100) / 100;
            const qTax = Math.round((qSumTot * 0.09) * 100) / 100;

            recentQuotations.push({
              id: qNo,
              date: r.get('Date') || '',
              validUntil: r.get('Valid Until') || '',
              customer: r.get('Billed To') || '',
              gstin: r.get('GSTIN') || '',
              rgpNo: r.get('RGP No') || '',
              rgpDate: r.get('RGP Date') || '',
              amount: qGrandTotal,
              sumTotal: qSumTot,
              cgst: qTax,
              sgst: qTax,
              status: r.get('Status') || 'Pending'
            });
          }
        }
      }
    } catch { }

    const merged = recentInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const mergedQ = recentQuotations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const deliveryChallans = await getDeliveryChallanList();
    const cashBills = await getCashBillList();

    return {
      success: true,
      data: { 
        totalRevenue: totalRevenue.value, 
        customers: customerSet.size, 
        recentInvoices: merged, 
        recentQuotations: mergedQ, 
        recentDeliveryChallans: deliveryChallans,
        recentCashBills: cashBills
      }
    };

  } catch (error: any) {
    return {
      success: false,
      error: 'Failed to load dashboard: ' + error.message,
      data: { totalRevenue: 0, customers: 0, recentInvoices: [], recentQuotations: [], recentDeliveryChallans: [], recentCashBills: [] }
    };
  }
}

// ────────────────────── QUOTATION ACTIONS ──────────────────────

export async function getNextQuotationNumber() {
  const defaultStart = 'PLEW-Q-001';
  try {
    const doc = await getSheetSafely();
    const sheet = await getOrCreateSheet(doc, 'Quotations');
    const rows = await sheet.getRows();
    const latestId = getLastId(rows, 'Quotation No');
    if (latestId) {
      lastKnownQuotationNo = latestId;
      return incrementId(latestId, defaultStart);
    }
  } catch (error: any) {
    console.warn('getNextQuotationNumber quota/connection issue, checking Supabase:', error.message);
  }

  try {
    const supaLatest = await getLatestQuotationNoFromSupabase();
    if (supaLatest) {
      lastKnownQuotationNo = supaLatest;
      return incrementId(supaLatest, defaultStart);
    }
  } catch {}

  if (lastKnownQuotationNo) {
    return incrementId(lastKnownQuotationNo, defaultStart);
  }
  return defaultStart;
}

export async function saveQuotation(data: QuotationData) {
  try {
    const doc = await getSheetSafely();
    const sheet = await getOrCreateSheet(doc, 'Quotations');

    const itemsWithTots = data.items.map(item => {
      let tot = item.quantity * item.price;
      if (item.discount > 0) tot -= item.discountType === 'percentage' ? tot * (item.discount / 100) : item.discount;
      return tot;
    });
    const sumTotal = itemsWithTots.reduce((a, b) => a + b, 0);
    const cgst = sumTotal * (data.taxes.cgst / 100);
    const sgst = sumTotal * (data.taxes.sgst / 100);
    const grandTotal = sumTotal + cgst + sgst;

    const rowObj = {
      'Quotation No': data.quotationNo,
      'Date': data.quotationDate,
      'Valid Until': data.validUntil,
      'Billed To': data.billTo.name,
      'GSTIN': data.billTo.gstin,
      'RGP No': data.rgpNumber || '',
      'RGP Date': data.rgpDate || '',
      'Grand Total (₹)': grandTotal,
      'Status': data.status || 'Pending',
      'RawData': JSON.stringify(data),
    };

    const rows = await sheet.getRows();
    let targetRow = null;
    for (const row of rows) {
      if (row.get('Quotation No') === data.quotationNo) {
        targetRow = row; break;
      }
    }

    // Save to Google Sheets and Supabase concurrently, awaiting both!
    const sheetPromise = (async () => {
      if (targetRow) {
        targetRow.assign(rowObj);
        await targetRow.save();
      } else {
        await sheet.addRow(rowObj);
      }
    })();
    const supabasePromise = syncQuotationToSupabase(data);

    const [sheetResult, supaResult] = await Promise.allSettled([sheetPromise, supabasePromise]);

    if (sheetResult.status === 'rejected') {
      console.error('Google Sheets quotation save error:', sheetResult.reason);
      if (supaResult.status === 'fulfilled' && supaResult.value.success) {
        return { success: true, offline: true, note: 'Saved to Supabase database (Google Sheets write pending)' };
      }
      return { success: false, error: sheetResult.reason?.message || 'Failed to save quotation to Google Sheets' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('saveQuotation error:', error);
    return { success: false, error: error.message || 'Failed to save quotation to Google Sheets' };
  }
}

export async function loadQuotation(quotationNo: string) {
  if (!quotationNo || !quotationNo.trim()) {
    return { success: false, error: 'Quotation number is required.' };
  }
  const cleanNo = quotationNo.trim();

  // 1. Fast lookup from Supabase first
  try {
    const supaData = await fetchQuotationFromSupabase(cleanNo);
    if (supaData) {
      return { success: true, data: supaData };
    }
  } catch (e) {
    console.warn('Supabase loadQuotation fallback:', e);
  }

  // 2. Fallback to Google Sheets
  try {
    const doc = await getSheetSafely();
    const sheet = await getOrCreateSheet(doc, 'Quotations');
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    let foundRow = null;
    for (const row of rows) {
      const cellVal = row.get('Quotation No') || '';
      if (cellVal.toString().trim().toUpperCase() === cleanNo.toUpperCase()) {
        foundRow = row;
        break;
      }
    }

    if (!foundRow) {
      return { success: false, error: `Quotation "${cleanNo}" not found.` };
    }

    const raw = foundRow.get('RawData');
    if (!raw) {
      return { success: false, error: `Quotation "${cleanNo}" found but has no data stored.` };
    }

    const parsed = JSON.parse(raw) as QuotationData;
    syncQuotationToSupabase(parsed).catch(() => {});
    return { success: true, data: parsed };

  } catch (error: any) {
    console.error('loadQuotation error:', error);
    return { success: false, error: 'Load failed: ' + error.message };
  }
}

// ────────────────────── GST REPORTS ──────────────────────

export async function getAllInvoicesForGST() {
  const allInvoices: any[] = [];

  try {
    const doc = await getSheetSafely(8000);
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const invNo = r.get('Invoice No') || '';
      if (!invNo) continue;

      allInvoices.push({
        invoiceNo: invNo,
        date: r.get('Date') || '',
        billedTo: r.get('Billed To') || '',
        gstin: r.get('GSTIN') || '',
        sumTotal: parseFloat(r.get('Sum Total (₹)')) || 0,
        cgst: parseFloat(r.get('CGST (₹)')) || 0,
        sgst: parseFloat(r.get('SGST (₹)')) || 0,
        grandTotal: parseFloat(r.get('Grand Total (₹)')) || 0,
        status: r.get('Status') || 'SAVED'
      });
    }
  } catch (error) {
    console.error('getAllInvoicesForGST error:', error);
  }

  return allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ────────────────────── STAFF & PAYROLL (Google Sheets) ──────────────────────
import { StaffDBSchema } from '@/lib/staffDB';

async function getOrCreateStaffSheet(doc: GoogleSpreadsheet, title: string, headers: string[]) {
  let sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    sheet = await doc.addSheet({ title, headerValues: headers });
  }
  return sheet;
}

export async function getStaffData(): Promise<StaffDBSchema> {
  const fallback: StaffDBSchema = {
    settings: { enableReminder: true, reminderTime: '10:00', markPresentDefault: false, workingHours: { hrs: 8, mins: 0 }, weeklyOffs: ['Sun'] },
    staff: [],
    attendance: {}
  };

  try {
    const doc = await getSheetSafely(6000);

    const settingsSheet = await getOrCreateStaffSheet(doc, 'StaffSettings', ['enableReminder', 'reminderTime', 'markPresentDefault', 'workingHoursHrs', 'workingHoursMins', 'weeklyOffs']);
    const settingsRows = await settingsSheet.getRows();
    if (settingsRows.length > 0) {
      const r = settingsRows[0];
      fallback.settings = {
        enableReminder: r.get('enableReminder') === 'true',
        reminderTime: r.get('reminderTime') || '10:00',
        markPresentDefault: r.get('markPresentDefault') === 'true',
        workingHours: {
          hrs: parseInt(r.get('workingHoursHrs')) || 8,
          mins: parseInt(r.get('workingHoursMins')) || 0
        },
        weeklyOffs: r.get('weeklyOffs') ? r.get('weeklyOffs').split(',') : ['Sun']
      };
    }

    const staffSheet = await getOrCreateStaffSheet(doc, 'Staff', ['id', 'name', 'mobile', 'monthlySalary']);
    const staffRows = await staffSheet.getRows();
    const staffList = staffRows.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      mobile: r.get('mobile'),
      monthlySalary: parseFloat(r.get('monthlySalary')) || 0,
      advances: [] as { id: string; date: string; amount: number; description: string }[]
    })).filter(s => s.id);

    const advSheet = await getOrCreateStaffSheet(doc, 'StaffAdvances', ['id', 'staffId', 'date', 'amount', 'description']);
    const advRows = await advSheet.getRows();
    for (const r of advRows) {
      const sid = r.get('staffId');
      const s = staffList.find(x => x.id === sid);
      if (s) {
        s.advances.push({
          id: r.get('id'),
          date: r.get('date'),
          amount: parseFloat(r.get('amount')) || 0,
          description: r.get('description') || ''
        });
      }
    }
    fallback.staff = staffList;

    const attSheet = await getOrCreateStaffSheet(doc, 'Attendance', ['date', 'staffId', 'status', 'overtime']);
    const attRows = await attSheet.getRows();
    for (const r of attRows) {
      const date = r.get('date');
      const sid = r.get('staffId');
      const status = r.get('status') || null;
      const overtime = parseFloat(r.get('overtime')) || 0;
      if (date && sid) {
        if (!fallback.attendance[date]) fallback.attendance[date] = {};
        fallback.attendance[date][sid] = { status, overtime };
      }
    }

    return fallback;

  } catch (err) {
    console.error('getStaffData error:', err);
    return fallback;
  }
}

export async function saveStaffData(data: StaffDBSchema) {
  try {
    const doc = await getSheetSafely(6000);

    const settingsSheet = await getOrCreateStaffSheet(doc, 'StaffSettings', ['enableReminder', 'reminderTime', 'markPresentDefault', 'workingHoursHrs', 'workingHoursMins', 'weeklyOffs']);
    await settingsSheet.clearRows();
    await settingsSheet.addRow({
      enableReminder: String(data.settings.enableReminder),
      reminderTime: data.settings.reminderTime,
      markPresentDefault: String(data.settings.markPresentDefault),
      workingHoursHrs: String(data.settings.workingHours.hrs),
      workingHoursMins: String(data.settings.workingHours.mins),
      weeklyOffs: (data.settings.weeklyOffs || []).join(',')
    });

    const staffSheet = await getOrCreateStaffSheet(doc, 'Staff', ['id', 'name', 'mobile', 'monthlySalary']);
    await staffSheet.clearRows();
    const staffData = data.staff.map(s => ({
      id: s.id,
      name: s.name,
      mobile: s.mobile,
      monthlySalary: String(s.monthlySalary)
    }));
    if (staffData.length > 0) await staffSheet.addRows(staffData);

    const advSheet = await getOrCreateStaffSheet(doc, 'StaffAdvances', ['id', 'staffId', 'date', 'amount', 'description']);
    await advSheet.clearRows();
    const advancesData = [];
    for (const s of data.staff) {
      for (const adv of s.advances) {
        advancesData.push({
          id: adv.id,
          staffId: s.id,
          date: adv.date,
          amount: String(adv.amount),
          description: adv.description
        });
      }
    }
    if (advancesData.length > 0) await advSheet.addRows(advancesData);

    const attSheet = await getOrCreateStaffSheet(doc, 'Attendance', ['date', 'staffId', 'status', 'overtime']);
    await attSheet.clearRows();
    const attendanceRows = [];
    for (const [date, staffMap] of Object.entries(data.attendance)) {
      for (const [staffId, rec] of Object.entries(staffMap)) {
        if (rec.status || (rec.overtime && rec.overtime > 0)) {
          attendanceRows.push({
            date,
            staffId,
            status: rec.status || '',
            overtime: String(rec.overtime || 0)
          });
        }
      }
    }
    if (attendanceRows.length > 0) await attSheet.addRows(attendanceRows);

    return { success: true };

  } catch (err) {
    console.error('saveStaffData error:', err);
    return { success: false, error: 'Failed to save staff data to Google Sheets.' };
  }
}

// ────────────────────── MOTOR QUOTATION ACTIONS ──────────────────────

export async function saveMotorQuotation(data: any) {
  try {
    const doc = await getSheetSafely();
    let sheet = doc.sheetsByTitle['Motor Quotations'];
    if (!sheet) {
      sheet = await doc.addSheet({ 
        title: 'Motor Quotations', 
        headerValues: ['Quotation No', 'Date', 'Customer', 'Address', 'Rate Increase (%)', 'Status', 'RawData'] 
      });
    }

    const rowObj = {
      'Quotation No': data.quotationNo,
      'Date': data.quotationDate,
      'Customer': data.companyName,
      'Address': data.companyAddress,
      'Rate Increase (%)': data.percentageIncrease,
      'Status': data.status || 'Pending',
      'RawData': JSON.stringify(data),
    };

    const rows = await sheet.getRows();
    let targetRow = null;
    for (const row of rows) {
      if (row.get('Quotation No') === data.quotationNo) {
        targetRow = row;
        break;
      }
    }

    if (targetRow) {
      targetRow.assign(rowObj);
      await targetRow.save();
    } else {
      await sheet.addRow(rowObj);
    }

    return { success: true };
  } catch (error: any) {
    console.error('saveMotorQuotation error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateRecordStatus(type: 'invoices' | 'quotations', id: string, newStatus: string) {
  try {
    const doc = await getSheetSafely();
    const sheet = type === 'invoices' ? doc.sheetsByIndex[0] : doc.sheetsByTitle['Quotations'];
    const idCol = type === 'invoices' ? 'Invoice No' : 'Quotation No';
    
    const rows = await sheet.getRows();
    const row = rows.find((r: any) => r.get(idCol) === id);
    
    if (row) {
      await ensureStatusHeader(sheet, type === 'invoices' 
        ? ['Invoice No', 'Date', 'Billed To', 'GSTIN', 'Sum Total (₹)', 'CGST (₹)', 'SGST (₹)', 'Grand Total (₹)', 'PO Number', 'PO Date', 'Status', 'RawData']
        : ['Quotation No', 'Date', 'Valid Until', 'Billed To', 'GSTIN', 'RGP No', 'RGP Date', 'Grand Total (₹)', 'Status', 'RawData']
      );

      row.set('Status', newStatus);
      
      const raw = row.get('RawData');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          parsed.status = newStatus;
          row.set('RawData', JSON.stringify(parsed));
        } catch (e) {
          console.error('Failed to update RawData JSON:', e);
        }
      }
      
      await row.save();
      return { success: true };
    }
    return { success: false, error: 'Record not found' };
  } catch (error: any) {
    console.error('updateRecordStatus error:', error);
    return { success: false, error: error.message };
  }
}

// ────────────────────── CRM (CLIENTS) ──────────────────────

export async function getClients(): Promise<Client[]> {
  if (cachedClients && cachedClients.length > 0 && (Date.now() - lastClientsLoadTime < DATA_CACHE_TTL)) {
    return cachedClients;
  }

  // 1. Check Supabase first
  try {
    const supaClients = await fetchClientsFromSupabase();
    if (supaClients && supaClients.length > 0) {
      cachedClients = supaClients;
      lastClientsLoadTime = Date.now();
      return supaClients;
    }
  } catch (e) {
    console.warn('Supabase getClients fallback:', e);
  }

  // 2. Fallback to Google Sheets
  try {
    const doc = await getSheetSafely(4000);

    let sheet = doc.sheetsByTitle['Clients'];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Clients', headerValues: ['ID', 'Name', 'GSTIN', 'Address', 'PlaceOfSupply'] });
    } else {
      await sheet.loadHeaderRow();
    }

    const rows = await sheet.getRows();
    
    const clients: Client[] = rows.map(r => ({
      id: r.get('ID') || crypto.randomUUID(),
      name: r.get('Name') || '',
      gstin: r.get('GSTIN') || '',
      address: r.get('Address') || '',
      placeOfSupply: r.get('PlaceOfSupply') || 'Telangana'
    })).filter(c => c.name);

    if (clients.length > 0) {
      cachedClients = clients;
      lastClientsLoadTime = Date.now();
    }
    return clients;
  } catch (e) {
    if (cachedClients && cachedClients.length > 0) {
      return cachedClients;
    }
    console.error('getClients error, falling back to legacy companies.json:', e);
    try {
      return legacyCompanies.map((c: any) => ({
        id: crypto.randomUUID(),
        name: c.name,
        gstin: c.gstin,
        address: c.address || '',
        placeOfSupply: 'Telangana'
      }));
    } catch (err) {}
    return [];
  }
}

export async function saveClient(client: Client): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = await getSheetSafely(4000);
    let sheet = doc.sheetsByTitle['Clients'];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Clients', headerValues: ['ID', 'Name', 'GSTIN', 'Address', 'PlaceOfSupply'] });
    } else {
      await sheet.loadHeaderRow();
      const headers = sheet.headerValues || [];
      if (!headers.includes('ID')) await sheet.setHeaderRow(['ID', 'Name', 'GSTIN', 'Address', 'PlaceOfSupply']);
    }

    const rows = await sheet.getRows();
    let targetRow = rows.find(r => r.get('ID') === client.id || r.get('Name') === client.name);

    const data = {
      'ID': client.id,
      'Name': client.name,
      'GSTIN': client.gstin,
      'Address': client.address,
      'PlaceOfSupply': client.placeOfSupply
    };

    const sheetPromise = (async () => {
      if (targetRow) {
        targetRow.assign(data);
        await targetRow.save();
      } else {
        await sheet.addRow(data);
      }
    })();
    const supabasePromise = syncClientToSupabase(client);

    await Promise.allSettled([sheetPromise, supabasePromise]);
    cachedClients = null; // Invalidate cache
    return { success: true };
  } catch (e: any) {
    console.error('saveClient error:', e);
    // Even if Google Sheets fails, still save to Supabase
    await syncClientToSupabase(client).catch(() => {});
    return { success: false, error: e.message };
  }
}

export async function saveBulkClients(clientsJson: string) {
  try {
    let rawClients: any[];
    try {
      rawClients = JSON.parse(clientsJson);
      if (!Array.isArray(rawClients)) throw new Error("Parsed JSON is not an array");
    } catch(err) {
      return { success: false, error: 'Invalid JSON format. Please provide a valid JSON array.' };
    }

    const validClients: Client[] = rawClients.map(c => ({
      id: crypto.randomUUID(),
      name: c.name || 'Unnamed Client',
      gstin: c.gstin || '',
      address: c.address || '',
      placeOfSupply: c.placeOfSupply || 'Telangana'
    }));

    const doc = await getSheetSafely(6000);
    let sheet = doc.sheetsByTitle['Clients'];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Clients', headerValues: ['ID', 'Name', 'GSTIN', 'Address', 'PlaceOfSupply'] });
    } else {
      await sheet.loadHeaderRow();
      const headers = sheet.headerValues || [];
      if (!headers.includes('ID')) await sheet.setHeaderRow(['ID', 'Name', 'GSTIN', 'Address', 'PlaceOfSupply']);
    }

    const existingRows = await sheet.getRows();
    const existingNames = new Set(existingRows.map(r => r.get('Name')));

    const newRowsToInsert = validClients
      .filter(c => !existingNames.has(c.name))
      .map(client => ({
        'ID': client.id,
        'Name': client.name,
        'GSTIN': client.gstin,
        'Address': client.address,
        'PlaceOfSupply': client.placeOfSupply
      }));

    if (newRowsToInsert.length > 0) {
      await sheet.addRows(newRowsToInsert);
    }

    return { success: true, inserted: newRowsToInsert.length, skipped: validClients.length - newRowsToInsert.length };
  } catch (e: any) {
    console.error("Bulk save failed: ", e);
    return { success: false, error: e.message || 'Operation failed' };
  }
}

// ────────────────────── INVENTORY ──────────────────────

export async function getInventory(): Promise<InventoryItem[]> {
  if (cachedInventory && cachedInventory.length > 0 && (Date.now() - lastInventoryLoadTime < DATA_CACHE_TTL)) {
    return cachedInventory;
  }
  try {
    const doc = await getSheetSafely(4000);

    let sheet = doc.sheetsByTitle['Inventory'];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Inventory', headerValues: ['ID', 'Name', 'Description', 'HSN', 'Unit', 'Price'] });
    } else {
      await sheet.loadHeaderRow();
    }

    const rows = await sheet.getRows();
    
    const items: InventoryItem[] = rows.map(r => ({
      id: r.get('ID') || crypto.randomUUID(),
      name: r.get('Name') || '',
      description: r.get('Description') || '',
      hsn: r.get('HSN') || '',
      quantityUnit: r.get('Unit') || 'NOS',
      price: parseFloat(r.get('Price')) || 0
    })).filter(i => i.name);

    if (items.length > 0) {
      cachedInventory = items;
      lastInventoryLoadTime = Date.now();
    }
    return items;
  } catch (e) {
    if (cachedInventory && cachedInventory.length > 0) {
      return cachedInventory;
    }
    console.error('getInventory error:', e);
    return [];
  }
}

export async function saveInventoryItem(item: InventoryItem) {
  try {
    const doc = await getSheetSafely(4000);
    let sheet = doc.sheetsByTitle['Inventory'];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Inventory', headerValues: ['ID', 'Name', 'Description', 'HSN', 'Unit', 'Price'] });
    } else {
      const headers = sheet.headerValues || [];
      if (!headers.includes('ID')) await sheet.setHeaderRow(['ID', 'Name', 'Description', 'HSN', 'Unit', 'Price']);
    }

    const rows = await sheet.getRows();
    let targetRow = rows.find(r => r.get('ID') === item.id || r.get('Name') === item.name);

    const data = {
      'ID': item.id,
      'Name': item.name,
      'Description': item.description,
      'HSN': item.hsn,
      'Unit': item.quantityUnit,
      'Price': item.price
    };

    if (targetRow) {
      targetRow.assign(data);
      await targetRow.save();
    } else {
      await sheet.addRow(data);
    }
    return { success: true };
  } catch (e: any) {
    console.error('saveInventoryItem error:', e);
    return { success: false, error: e.message };
  }
}

// ───────────────────────────── DELIVERY CHALLAN ACTIONS ─────────────────────────────

async function uploadToGoogleDrive(fileName: string, base64Data: string, mimeType: string): Promise<string | null> {
  try {
    let creds;
    const credsFile = path.join(process.cwd(), 'credentials.json');
    if (fs.existsSync(credsFile)) {
      creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
    } else if (process.env.GOOGLE_CREDENTIALS_JSON) {
      creds = typeof process.env.GOOGLE_CREDENTIALS_JSON === 'string'
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        : process.env.GOOGLE_CREDENTIALS_JSON;
    } else {
      return null;
    }

    const auth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive'
      ],
    });

    const tokenObj = await auth.getAccessToken();
    const token = tokenObj.token;
    if (!token) return null;

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const metadata = {
      name: fileName,
      mimeType: mimeType || 'image/jpeg',
    };

    const boundary = 'drive_boundary_' + Date.now();
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const body = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + (mimeType || 'image/jpeg') + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      buffer.toString('base64') +
      close_delim;

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body
    });

    if (!uploadRes.ok) {
      console.warn('Google Drive upload status:', uploadRes.status);
      return null;
    }

    const fileData = await uploadRes.json();
    if (!fileData || !fileData.id) return null;

    // Set file permission to anyone with link can view (never expires)
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch (permErr) {
      console.warn('Could not set public permission on Drive file:', permErr);
    }

    // Direct permanent URL that never expires
    return `https://drive.google.com/uc?id=${fileData.id}&export=view`;
  } catch (err) {
    console.warn('Google Drive upload error, falling back:', err);
    return null;
  }
}

export async function getNextDeliveryChallanNumber() {
  const defaultStart = "PLEW-DC-00001";
  try {
    const doc = await getSheetSafely();
    let sheet = doc.sheetsByTitle['Delivery Challans'];
    if (sheet) {
      await sheet.loadHeaderRow();
      const rows = await sheet.getRows();
      const latestId = getLastId(rows, 'DC No');
      if (latestId) {
        lastKnownDcNo = latestId;
        return incrementId(latestId, defaultStart);
      }
    }
  } catch (error: any) {
    console.warn('getNextDeliveryChallanNumber quota/connection issue, checking Supabase:', error.message);
  }

  try {
    const supaLatest = await getLatestDcNoFromSupabase();
    if (supaLatest) {
      lastKnownDcNo = supaLatest;
      return incrementId(supaLatest, defaultStart);
    }
  } catch {}

  if (lastKnownDcNo) {
    return incrementId(lastKnownDcNo, defaultStart);
  }
  return defaultStart;
}

export async function loadDeliveryChallan(dcNo: string) {
  if (!dcNo || !dcNo.trim()) {
    return { success: false, error: 'Delivery Challan number is required.' };
  }
  const cleanNo = dcNo.trim();

  // 1. Fast lookup from Supabase first
  try {
    const supaData = await fetchDeliveryChallanFromSupabase(cleanNo);
    if (supaData) {
      return { success: true, data: supaData };
    }
  } catch (e) {
    console.warn('Supabase loadDeliveryChallan fallback:', e);
  }

  // 2. Fallback to Google Sheets
  try {
    const doc = await getSheetSafely(5000);
    const sheet = doc.sheetsByTitle['Delivery Challans'];
    if (!sheet) {
      return { success: false, error: 'Delivery Challans tab not found in Google Sheets.' };
    }

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    for (let i = 0; i < rows.length; i++) {
      const cellVal = rows[i].get('DC No') || '';
      if (cellVal.toString().trim().toUpperCase() === dcNo.trim().toUpperCase()) {
        const rawJson = rows[i].get('RawData');
        if (rawJson) {
          try {
            const parsed = JSON.parse(rawJson);
            // Ensure rgpPhotoUrl is populated from either rawData or sheet column
            if (!parsed.rgpPhotoUrl && rows[i].get('RGP Photo URL')) {
              parsed.rgpPhotoUrl = rows[i].get('RGP Photo URL');
            }
            return { success: true, data: parsed as DeliveryChallanData };
          } catch (e) {
            console.error('Failed to parse DC RawData JSON:', e);
          }
        }

        // Reconstruct from sheet row columns if RawData missing
        const reconstructed: DeliveryChallanData = {
          dcNo: rows[i].get('DC No') || dcNo,
          dcDate: rows[i].get('DC Date') || new Date().toISOString().split('T')[0],
          challanType: (rows[i].get('Challan Type') || 'Returnable') as any,
          customerName: rows[i].get('Customer Name') || '',
          customerAddress: '',
          customerGstin: rows[i].get('GSTIN') || '',
          rgpNo: rows[i].get('RGP No') || '',
          rgpDate: rows[i].get('RGP Date') || '',
          poNo: '',
          poDate: '',
          vehicleNo: rows[i].get('Vehicle No') || '',
          modeOfTransport: 'BY ROAD',
          quotationRaised: (rows[i].get('Quotation Raised') || 'No') as any,
          items: [
            {
              id: crypto.randomUUID(),
              materialCode: '',
              description: '',
              uom: 'NOS',
              quantity: 1,
              weight: '',
              remarks: ''
            }
          ],
          remarks: '',
          rgpPhotoUrl: rows[i].get('RGP Photo URL') || '',
          status: (rows[i].get('Status') || 'Pending') as any
        };
        return { success: true, data: reconstructed };
      }
    }
    return { success: false, error: `Delivery Challan "${dcNo}" not found.` };
  } catch (error: any) {
    console.error('loadDeliveryChallan error:', error);
    return { success: false, error: 'Load failed: ' + error.message };
  }
}

export async function uploadRGPPhoto(base64Data: string, originalFileName: string, mimeType: string = 'image/jpeg') {
  try {
    const ext = path.extname(originalFileName) || '.jpg';
    const safeName = `rgp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

    // 1. Try Google Drive permanent unexpiring upload
    const driveUrl = await uploadToGoogleDrive(safeName, base64Data, mimeType);
    if (driveUrl) {
      return { success: true, url: driveUrl, storage: 'drive' };
    }

    // 2. Persistent local public storage fallback
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'rgp');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

    const relativeUrl = `/uploads/rgp/${safeName}`;
    return { success: true, url: relativeUrl, storage: 'local' };
  } catch (error: any) {
    console.error('uploadRGPPhoto error:', error);
    return { success: false, error: error.message || 'Failed to save photo' };
  }
}

export async function saveDeliveryChallanToSpreadsheet(data: DeliveryChallanData) {
  try {
    const doc = await getSheetSafely(5000);

    let sheet = doc.sheetsByTitle['Delivery Challans'];
    const expectedHeaders = ['DC No', 'DC Date', 'Challan Type', 'Customer Name', 'GSTIN', 'RGP No', 'RGP Date', 'Quotation Raised', 'Vehicle No', 'RGP Photo URL', 'Status', 'RawData'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Delivery Challans', headerValues: expectedHeaders });
    } else {
      try { await sheet.loadHeaderRow(); } catch (e) {}
      try {
        const headers = sheet.headerValues || [];
        if (!headers.includes('Quotation Raised') || !headers.includes('RGP Photo URL')) {
          await sheet.setHeaderRow(expectedHeaders);
        }
      } catch (err) {}
    }

    const rows = await sheet.getRows();
    let targetRow = rows.find(r => r.get('DC No') === data.dcNo);

    const rowObj = {
      'DC No': data.dcNo,
      'DC Date': data.dcDate,
      'Challan Type': data.challanType || 'Returnable',
      'Customer Name': data.customerName,
      'GSTIN': data.customerGstin,
      'RGP No': data.rgpNo,
      'RGP Date': data.rgpDate,
      'Quotation Raised': data.quotationRaised || 'No',
      'Vehicle No': data.vehicleNo,
      'RGP Photo URL': data.rgpPhotoUrl || '',
      'Status': data.status || 'Pending',
      'RawData': JSON.stringify(data),
    };

    if (data.dcNo) {
      lastKnownDcNo = data.dcNo;
    }

    // Save to Google Sheets and Supabase concurrently, awaiting both!
    const sheetPromise = (async () => {
      if (targetRow) {
        targetRow.assign(rowObj);
        await targetRow.save();
      } else {
        await sheet.addRow(rowObj);
      }
    })();
    const supabasePromise = syncDeliveryChallanToSupabase(data);

    const [sheetResult, supaResult] = await Promise.allSettled([sheetPromise, supabasePromise]);

    if (sheetResult.status === 'rejected') {
      console.error('Google Sheets challan save error:', sheetResult.reason);
      if (supaResult.status === 'fulfilled' && supaResult.value.success) {
        return { success: true, offline: true, note: 'Saved to Supabase database (Google Sheets write pending)' };
      }
      return { success: false, error: sheetResult.reason?.message || 'Failed to save delivery challan' };
    }

    return { success: true, offline: false, error: undefined };
  } catch (error: any) {
    console.error('saveDeliveryChallanToSpreadsheet error:', error);
    return { success: false, error: error.message || 'Failed to save delivery challan' };
  }
}

export async function getDeliveryChallanList() {
  // 1. Fast lookup from Supabase first
  try {
    const supaList = await fetchDeliveryChallansFromSupabase();
    if (supaList && supaList.length > 0) {
      return supaList;
    }
  } catch (e) {
    console.warn('Supabase getDeliveryChallanList fallback:', e);
  }

  // 2. Fallback to Google Sheets
  const list: any[] = [];

  try {
    const doc = await getSheetSafely(5000);
    const sheet = doc.sheetsByTitle['Delivery Challans'];
    if (sheet) {
      const rows = await sheet.getRows();
      rows.forEach(r => {
        const dcNo = r.get('DC No');
        if (dcNo) {
          let rawData = null;
          try {
            if (r.get('RawData')) rawData = JSON.parse(r.get('RawData'));
          } catch(e) {}
          list.push({
            id: dcNo,
            date: r.get('DC Date') || '',
            customer: r.get('Customer Name') || '',
            rgpNo: r.get('RGP No') || '',
            rgpDate: r.get('RGP Date') || '',
            quotationRaised: r.get('Quotation Raised') || (rawData?.quotationRaised) || 'No',
            type: r.get('Challan Type') || 'Returnable',
            rgpPhotoUrl: r.get('RGP Photo URL') || rawData?.rgpPhotoUrl || '',
            status: r.get('Status') || 'Pending',
            rawData
          });
        }
      });
    }
  } catch (e) {
    console.error('getDeliveryChallanList error:', e);
  }
  return list;
}

// ────────────────────── CASH BILL ACTIONS (Non-GST) ──────────────────────
let lastKnownCashBillNo: string | null = null;

export async function getNextCashBillNumber() {
  const defaultStart = "PLEW-CB-00001";
  try {
    const doc = await getSheetSafely();
    let sheet = doc.sheetsByTitle['Cash Bills'];
    if (sheet) {
      await sheet.loadHeaderRow();
      const rows = await sheet.getRows();
      const latestId = getLastId(rows, 'Bill No');
      if (latestId) {
        lastKnownCashBillNo = latestId;
        return incrementId(latestId, defaultStart);
      }
    }
  } catch (error: any) {
    console.warn('getNextCashBillNumber error, checking Supabase:', error.message);
  }

  try {
    const supaLatest = await getLatestCashBillNoFromSupabase();
    if (supaLatest) {
      lastKnownCashBillNo = supaLatest;
      return incrementId(supaLatest, defaultStart);
    }
  } catch {}

  if (lastKnownCashBillNo) {
    return incrementId(lastKnownCashBillNo, defaultStart);
  }
  return defaultStart;
}

export async function saveCashBillToSpreadsheet(data: CashBillData) {
  try {
    const doc = await getSheetSafely(5000);

    const expectedHeaders = ['Bill No', 'Date', 'Customer Name', 'Phone', 'Payment Mode', 'Subtotal', 'Discount', 'Total Amount', 'Status', 'RawData'];
    let sheet = doc.sheetsByTitle['Cash Bills'];

    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Cash Bills', headerValues: expectedHeaders });
    } else {
      try { await sheet.loadHeaderRow(); } catch (e) {}
      try {
        const headers = sheet.headerValues || [];
        if (!headers.includes('Bill No') || !headers.includes('Total Amount')) {
          await sheet.setHeaderRow(expectedHeaders);
        }
      } catch (err) {}
    }

    const rows = await sheet.getRows();
    let targetRow = rows.find(r => r.get('Bill No') === data.billNo);

    const subtotal = (data.items || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
    const totalAmount = Math.max(0, subtotal - Number(data.discount || 0));

    const rowObj = {
      'Bill No': data.billNo,
      'Date': data.billDate,
      'Customer Name': data.customerName,
      'Phone': data.customerPhone || '',
      'Payment Mode': data.paymentMode || 'Cash',
      'Subtotal': subtotal.toFixed(2),
      'Discount': Number(data.discount || 0).toFixed(2),
      'Total Amount': totalAmount.toFixed(2),
      'Status': data.paymentStatus || data.status || 'Paid',
      'RawData': JSON.stringify(data),
    };

    if (targetRow) {
      targetRow.assign(rowObj);
      await targetRow.save();
    } else {
      await sheet.addRow(rowObj);
    }

    if (data.billNo) {
      lastKnownCashBillNo = data.billNo;
    }

    // Save to Google Sheets and Supabase concurrently, awaiting both!
    const sheetPromise = (async () => {
      if (targetRow) {
        targetRow.assign(rowObj);
        await targetRow.save();
      } else {
        await sheet.addRow(rowObj);
      }
    })();
    const supabasePromise = syncCashBillToSupabase(data);

    const [sheetResult, supaResult] = await Promise.allSettled([sheetPromise, supabasePromise]);

    if (sheetResult.status === 'rejected') {
      console.error('Google Sheets cash bill save error:', sheetResult.reason);
      if (supaResult.status === 'fulfilled' && supaResult.value.success) {
        return { success: true, offline: true, note: 'Saved to Supabase database (Google Sheets write pending)' };
      }
      return { success: false, error: sheetResult.reason?.message || 'Failed to save cash bill' };
    }

    return { success: true, offline: false, error: undefined };
  } catch (error: any) {
    console.error('saveCashBillToSpreadsheet error:', error);
    return { success: false, error: error.message || 'Failed to save cash bill' };
  }
}

export async function loadCashBill(billNo: string) {
  if (!billNo || !billNo.trim()) {
    return { success: false, error: 'Cash Bill number is required.' };
  }
  const cleanNo = billNo.trim();

  // 1. Fast lookup from Supabase first
  try {
    const supaData = await fetchCashBillFromSupabase(cleanNo);
    if (supaData) {
      return { success: true, data: supaData };
    }
  } catch (e) {
    console.warn('Supabase loadCashBill fallback:', e);
  }

  // 2. Fallback to Google Sheets
  try {
    const doc = await getSheetSafely(5000);
    const sheet = doc.sheetsByTitle['Cash Bills'];
    if (!sheet) {
      return { success: false, error: 'Cash Bills tab not found in Google Sheets.' };
    }

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    for (let i = 0; i < rows.length; i++) {
      const cellVal = rows[i].get('Bill No') || '';
      if (cellVal.toString().trim().toUpperCase() === cleanNo.toUpperCase()) {
        const rawJson = rows[i].get('RawData');
        if (rawJson) {
          try {
            const parsed = JSON.parse(rawJson);
            syncCashBillToSupabase(parsed).catch(() => {});
            return { success: true, data: parsed as CashBillData };
          } catch (e) {
            console.error('Failed to parse CashBill RawData JSON:', e);
          }
        }

        const reconstructed: CashBillData = {
          billNo: rows[i].get('Bill No') || cleanNo,
          billDate: rows[i].get('Date') || new Date().toISOString().split('T')[0],
          paymentMode: (rows[i].get('Payment Mode') || 'Cash') as any,
          paymentStatus: (rows[i].get('Status') || 'Paid') as any,
          customerName: rows[i].get('Customer Name') || '',
          customerPhone: rows[i].get('Phone') || '',
          customerAddress: '',
          items: [
            {
              id: 'cb-item-reconstructed',
              description: 'General Electrical Materials/Repair',
              quantity: 1,
              unit: 'NOS',
              rate: parseFloat(rows[i].get('Total Amount') || '0'),
              amount: parseFloat(rows[i].get('Total Amount') || '0')
            }
          ],
          discount: parseFloat(rows[i].get('Discount') || '0'),
          notes: '',
          status: (rows[i].get('Status') || 'Paid') as any
        };
        syncCashBillToSupabase(reconstructed).catch(() => {});
        return { success: true, data: reconstructed };
      }
    }
    return { success: false, error: `Cash Bill "${cleanNo}" not found.` };
  } catch (error: any) {
    console.error('loadCashBill error:', error);
    return { success: false, error: 'Load failed: ' + error.message };
  }
}

export async function getCashBillList() {
  // 1. Fast lookup from Supabase first
  try {
    const supaList = await fetchCashBillsFromSupabase();
    if (supaList && supaList.length > 0) {
      return supaList;
    }
  } catch (e) {
    console.warn('Supabase getCashBillList fallback:', e);
  }

  // 2. Fallback to Google Sheets
  const list: any[] = [];
  try {
    const doc = await getSheetSafely(5000);
    const sheet = doc.sheetsByTitle['Cash Bills'];
    if (sheet) {
      const rows = await sheet.getRows();
      rows.forEach(r => {
        const billNo = r.get('Bill No');
        if (billNo) {
          let rawData = null;
          try {
            if (r.get('RawData')) rawData = JSON.parse(r.get('RawData'));
          } catch(e) {}
          list.push({
            id: billNo,
            date: r.get('Date') || '',
            customer: r.get('Customer Name') || '',
            phone: r.get('Phone') || '',
            paymentMode: r.get('Payment Mode') || 'Cash',
            amount: parseFloat(r.get('Total Amount') || '0'),
            status: r.get('Status') || 'Paid',
            rawData
          });
        }
      });
    }
  } catch (e) {
    console.error('getCashBillList error:', e);
  }
  return list;
}

export interface DescriptionSuggestion {
  description: string;
  rate?: number;
  unit?: string;
  hsn?: string;
  source?: string;
}

const COMMON_ELECTRICAL_DESCRIPTIONS: DescriptionSuggestion[] = [
  { description: "Rewinding of 5 HP LT Horizontal Foot Mounted Induction Motor", rate: 4500, unit: "NOS", source: "Catalog" },
  { description: "Rewinding of 10 HP 3 Phase 415V 1440 RPM Induction Motor", rate: 8500, unit: "NOS", source: "Catalog" },
  { description: "Rewinding of 15 HP 3 Phase 415V 2900 RPM Induction Motor", rate: 12000, unit: "NOS", source: "Catalog" },
  { description: "Rewinding of 20 HP 3 Phase LT Motor with Dual Coat Copper Wire", rate: 16500, unit: "NOS", source: "Catalog" },
  { description: "Rewinding of 3 HP Single Phase Submersible Pump Motor", rate: 3800, unit: "NOS", source: "Catalog" },
  { description: "Rewinding of 7.5 HP Flange Mounted FLP Electric Motor", rate: 7200, unit: "NOS", source: "Catalog" },
  { description: "Replacement of Drive End & Non-Drive End Ball Bearings (SKF/FAG)", rate: 2200, unit: "SET", source: "Catalog" },
  { description: "Dynamic Rotor Balancing & Vibration Testing", rate: 1500, unit: "NOS", source: "Catalog" },
  { description: "Rotor Shaft Machining, Metal Spraying & Grinding", rate: 2800, unit: "NOS", source: "Catalog" },
  { description: "End Cover Housing Bushing & Precision Boring", rate: 1800, unit: "NOS", source: "Catalog" },
  { description: "Cooling Fan & Cast Iron Fan Cover Replacement", rate: 1400, unit: "NOS", source: "Catalog" },
  { description: "Replacement of 6-Pin Brass Terminal Block with Gland", rate: 850, unit: "NOS", source: "Catalog" },
  { description: "Stator Core Cleaning, Class H Varnishing & Oven Baking", rate: 1800, unit: "JOB", source: "Catalog" },
  { description: "Control Panel Contactor, Relay & Wiring Servicing", rate: 3500, unit: "JOB", source: "Catalog" }
];

export async function getPreviousDescriptions(): Promise<DescriptionSuggestion[]> {
  const map = new Map<string, DescriptionSuggestion>();

  // Add catalog defaults first
  COMMON_ELECTRICAL_DESCRIPTIONS.forEach(item => {
    map.set(item.description.toLowerCase(), item);
  });

  // Try fast fetching from Supabase first
  try {
    const supaDescs = await fetchDescriptionsFromSupabase();
    if (supaDescs && supaDescs.length > 0) {
      supaDescs.forEach(item => {
        map.set(item.description.toLowerCase(), item);
      });
      return Array.from(map.values());
    }
  } catch (e) {}

  try {
    const doc = await getSheetSafely(5000);

    // 1. Scan Cash Bills tab
    const cbSheet = doc.sheetsByTitle['Cash Bills'];
    if (cbSheet) {
      try {
        const rows = await cbSheet.getRows();
        rows.slice(-150).forEach(r => {
          const raw = r.get('RawData');
          if (raw) {
            try {
              const data = JSON.parse(raw);
              if (Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                  const desc = (item.description || item.name || '').trim();
                  if (desc) {
                    map.set(desc.toLowerCase(), {
                      description: desc,
                      rate: Number(item.rate || item.price) || undefined,
                      unit: item.unit || item.quantityUnit || 'NOS',
                      source: 'Cash Bill'
                    });
                  }
                });
              }
            } catch (e) {}
          }
        });
      } catch (e) {}
    }

    // 2. Scan Delivery Challans tab
    const dcSheet = doc.sheetsByTitle['Delivery Challans'];
    if (dcSheet) {
      try {
        const rows = await dcSheet.getRows();
        rows.slice(-150).forEach(r => {
          const raw = r.get('RawData');
          if (raw) {
            try {
              const data = JSON.parse(raw);
              if (Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                  const desc = (item.description || item.name || '').trim();
                  if (desc) {
                    map.set(desc.toLowerCase(), {
                      description: desc,
                      rate: Number(item.rate || item.price) || undefined,
                      unit: item.uom || item.unit || 'NOS',
                      source: 'Challan'
                    });
                  }
                });
              }
            } catch (e) {}
          }
        });
      } catch (e) {}
    }

    // 3. Scan Invoices (Sheet 1)
    const invSheet = doc.sheetsByIndex[0];
    if (invSheet) {
      try {
        const rows = await invSheet.getRows();
        rows.slice(-150).forEach(r => {
          const raw = r.get('RawData');
          if (raw) {
            try {
              const data = JSON.parse(raw);
              if (Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                  const desc = (item.name || item.description || '').trim();
                  if (desc) {
                    map.set(desc.toLowerCase(), {
                      description: desc,
                      rate: Number(item.price || item.rate) || undefined,
                      unit: item.quantityUnit || item.unit || 'NOS',
                      hsn: item.hsn,
                      source: 'Invoice'
                    });
                  }
                });
              }
            } catch (e) {}
          }
        });
      } catch (e) {}
    }

    // 4. Scan Quotations tab
    const qSheet = doc.sheetsByTitle['Quotations'];
    if (qSheet) {
      try {
        const rows = await qSheet.getRows();
        rows.slice(-150).forEach(r => {
          const raw = r.get('RawData');
          if (raw) {
            try {
              const data = JSON.parse(raw);
              if (Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                  const desc = (item.name || item.description || '').trim();
                  if (desc) {
                    map.set(desc.toLowerCase(), {
                      description: desc,
                      rate: Number(item.price || item.rate) || undefined,
                      unit: item.quantityUnit || item.unit || 'NOS',
                      source: 'Quotation'
                    });
                  }
                });
              }
            } catch (e) {}
          }
        });
      } catch (e) {}
    }
  } catch (err) {
    console.warn('getPreviousDescriptions error:', err);
  }

  return Array.from(map.values());
}

export async function extractDCFromImage(base64Data: string, mimeType: string = 'image/jpeg') {
  try {
    let rawKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!rawKey) {
      try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const match = envContent.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
          if (match) {
            rawKey = match[1].trim();
          }
        }
      } catch (e) {
        // ignore fallback read error
      }
    }

    const apiKey = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : '';
    if (!apiKey) {
      return {
        success: false,
        error: 'GEMINI_API_KEY is not configured in .env.local. Please set GEMINI_API_KEY to enable AI OCR extraction.'
      };
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

    const promptText = `You are an expert OCR AI specializing in Indian industrial Delivery Challans, Returnable Gate Passes (RGP), and Gate Passes.
Carefully analyze the provided document image or PDF page and extract all relevant fields into a strict JSON object with NO markdown formatting or additional commentary.

JSON schema requirement:
{
  "customerName": "Company/Party Name (e.g. APITORIA PHARMA PRIVATE LIMITED, VSP Ispat Pvt. Ltd.)",
  "customerAddress": "Full address including village, district, state, pincode if visible",
  "customerGstin": "GSTIN if present",
  "rgpNo": "RGP No or Gate Pass No (e.g. 360/RGP/26-27/00125, 1008)",
  "rgpDate": "Date of RGP/Gate Pass in YYYY-MM-DD format if possible",
  "poNo": "PO No if visible",
  "poDate": "PO Date if visible",
  "vehicleNo": "Vehicle No (e.g. TS 08UF 9062, TG15T6810)",
  "modeOfTransport": "Mode of transport (e.g. BY ROAD)",
  "challanType": "Returnable or Non-Returnable",
  "remarks": "Any notes or remarks written on paper (e.g., FOR REWINDING, Sending for Repair, Not for Sale)",
  "items": [
    {
      "materialCode": "Material code or S.No item code",
      "description": "Full description of material (e.g., USED MOTOR FLP HORIZONTAL FOOT MOUNTED 2.20 KW/3 HP 3 PH 415 V 3000 RPM, 18kW Stand mine motor)",
      "uom": "Unit of measurement (e.g. EA, NOS, SET, KG)",
      "quantity": 1,
      "weight": "Weight if visible",
      "remarks": "Item specific remarks"
    }
  ]
}

Return ONLY raw valid JSON text.`;

    const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let response: any = null;
    let lastError = '';

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: cleanBase64
                      }
                    },
                    { text: promptText }
                  ]
                }
              ]
            })
          }
        );

        if (res.ok) {
          response = res;
          break;
        } else {
          lastError = await res.text();
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Gemini API Error: ${lastError || 'Failed to call Gemini model'}`);
    }

    const resData = await response.json();
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanJsonStr = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const arrayMatch = cleanJsonStr.match(/\[[\s\S]*\]/);
    const objectMatch = cleanJsonStr.match(/\{[\s\S]*\}/);
    let jsonToParse = cleanJsonStr;
    if (arrayMatch && (!objectMatch || cleanJsonStr.indexOf('[') < cleanJsonStr.indexOf('{'))) {
      jsonToParse = arrayMatch[0];
    } else if (objectMatch) {
      jsonToParse = objectMatch[0];
    }

    const parsed = JSON.parse(jsonToParse);
    const extracted = Array.isArray(parsed) ? parsed[0] : parsed;

    return { success: true, data: extracted };
  } catch (error: any) {
    console.error('extractDCFromImage error:', error);
    return { success: false, error: error.message || 'Failed to extract text from document.' };
  }
}

export async function extractDCFromUrl(photoUrl: string) {
  try {
    if (!photoUrl) {
      return { success: false, error: 'No URL provided' };
    }

    let base64 = '';
    let mimeType = 'image/jpeg';

    if (photoUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', photoUrl.replace(/^\//, ''));
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Local file not found on server' };
      }
      const buffer = fs.readFileSync(filePath);
      base64 = buffer.toString('base64');
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
    } else if (photoUrl.startsWith('http')) {
      const resp = await fetch(photoUrl);
      if (!resp.ok) {
        return { success: false, error: `Failed to download image from URL (${resp.status})` };
      }
      const arrayBuf = await resp.arrayBuffer();
      base64 = Buffer.from(arrayBuf).toString('base64');
      const ct = resp.headers.get('content-type');
      if (ct) mimeType = ct;
    } else {
      return { success: false, error: 'Unsupported URL format' };
    }

    return await extractDCFromImage(base64, mimeType);
  } catch (error: any) {
    console.error('extractDCFromUrl error:', error);
    return { success: false, error: error.message || 'Failed to extract document from URL' };
  }
}

export async function importExistingSheetsToSupabase() {
  const summary = {
    invoices: 0,
    cashBills: 0,
    challans: 0,
    quotations: 0,
    clients: 0,
    errors: [] as string[]
  };

  try {
    const doc = await getSheetSafely(10000);

    // 1. Sync Invoices from Sheet 1
    const invSheet = doc.sheetsByIndex[0];
    if (invSheet) {
      try {
        const rows = await invSheet.getRows();
        for (const r of rows) {
          const raw = r.get('RawData');
          if (raw) {
            try {
              const data = JSON.parse(raw);
              await syncInvoiceToSupabase(data);
              summary.invoices++;
            } catch (e) {}
          }
        }
      } catch (e: any) {
        summary.errors.push(`Invoices tab: ${e.message}`);
      }
    }

    // 2. Sync Cash Bills
    const cbSheet = doc.sheetsByTitle['Cash Bills'];
    if (cbSheet) {
      try {
        const rows = await cbSheet.getRows();
        for (const r of rows) {
          const raw = r.get('RawData');
          if (raw) {
            try {
              const data = JSON.parse(raw);
              await syncCashBillToSupabase(data);
              summary.cashBills++;
            } catch (e) {}
          }
        }
      } catch (e: any) {
        summary.errors.push(`Cash Bills tab: ${e.message}`);
      }
    }

    // 3. Sync Delivery Challans
    const dcSheet = doc.sheetsByTitle['Delivery Challans'];
    if (dcSheet) {
      try {
        const rows = await dcSheet.getRows();
        for (const r of rows) {
          const raw = r.get('RawData');
          if (raw) {
            try {
              const data = JSON.parse(raw);
              await syncDeliveryChallanToSupabase(data);
              summary.challans++;
            } catch (e) {}
          }
        }
      } catch (e: any) {
        summary.errors.push(`Challans tab: ${e.message}`);
      }
    }

    // 4. Sync Quotations
    const qSheet = doc.sheetsByTitle['Quotations'];
    if (qSheet) {
      try {
        const rows = await qSheet.getRows();
        for (const r of rows) {
          const raw = r.get('RawData');
          if (raw) {
            try {
              const data = JSON.parse(raw);
              await syncQuotationToSupabase(data);
              summary.quotations++;
            } catch (e) {}
          }
        }
      } catch (e: any) {
        summary.errors.push(`Quotations tab: ${e.message}`);
      }
    }

    // 5. Sync Clients
    const clSheet = doc.sheetsByTitle['Clients'];
    if (clSheet) {
      try {
        const rows = await clSheet.getRows();
        for (const r of rows) {
          const name = r.get('Name');
          if (name) {
            await syncClientToSupabase({
              id: r.get('ID') || crypto.randomUUID(),
              name: name.trim(),
              gstin: r.get('GSTIN') || '',
              address: r.get('Address') || '',
              placeOfSupply: r.get('PlaceOfSupply') || 'Telangana'
            });
            summary.clients++;
          }
        }
      } catch (e: any) {
        summary.errors.push(`Clients tab: ${e.message}`);
      }
    }

    return { success: true, summary };
  } catch (error: any) {
    return { success: false, error: error.message, summary };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ────────────────── PENDING BILLS & FOLLOW-UPS ACTIONS ───────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const PENDING_BILLS_HEADERS = [
  'ID',
  'Bill Name',
  'Bill No',
  'Bill Type',
  'Pending Amount (₹)',
  'Total Amount (₹)',
  'Bill Date',
  'Due Date',
  'Contact Person',
  'Phone',
  'Email',
  'Status',
  'Promised Date',
  'Last Follow Up',
  'Next Follow Up',
  'Follow Up Count',
  'RawData'
];

async function getOrCreatePendingBillsSheet(doc: GoogleSpreadsheet) {
  let sheet = doc.sheetsByTitle['Pending Bills'];
  if (!sheet) {
    sheet = await doc.addSheet({ title: 'Pending Bills', headerValues: PENDING_BILLS_HEADERS });
  } else {
    try { await sheet.loadHeaderRow(); } catch (e) {}
    try {
      const headers = sheet.headerValues || [];
      if (!headers.includes('ID') || !headers.includes('Bill Name')) {
        await sheet.setHeaderRow(PENDING_BILLS_HEADERS);
      }
    } catch (e) {}
  }
  return sheet;
}

export async function getPendingBills(): Promise<PendingBill[]> {
  // 1. Try Supabase first (lightning fast)
  try {
    const supaBills = await fetchPendingBillsFromSupabase();
    if (supaBills && supaBills.length > 0) {
      return supaBills;
    }
  } catch (e) {
    console.warn('Supabase getPendingBills fallback:', e);
  }

  // 2. Fallback to Google Sheets
  const bills: PendingBill[] = [];
  try {
    const doc = await getSheetSafely(6000);
    const sheet = await getOrCreatePendingBillsSheet(doc);
    const rows = await sheet.getRows();

    rows.forEach(r => {
      const id = r.get('ID');
      const billName = r.get('Bill Name');
      if (id && billName) {
        const rawJson = r.get('RawData');
        if (rawJson) {
          try {
            const parsed = JSON.parse(rawJson);
            bills.push(parsed);
            return;
          } catch (e) {}
        }

        // Reconstruct from columns
        bills.push({
          id,
          billName,
          billNo: r.get('Bill No') || '',
          billType: (r.get('Bill Type') || 'Invoice') as any,
          pendingAmount: parseFloat(r.get('Pending Amount (₹)') || '0'),
          totalAmount: parseFloat(r.get('Total Amount (₹)') || '0'),
          billDate: r.get('Bill Date') || '',
          dueDate: r.get('Due Date') || '',
          contactPerson: r.get('Contact Person') || '',
          contactPhone: r.get('Phone') || '',
          contactEmail: r.get('Email') || '',
          status: (r.get('Status') || 'Pending') as any,
          promisedDate: r.get('Promised Date') || '',
          lastFollowUpDate: r.get('Last Follow Up') || '',
          nextFollowUpDate: r.get('Next Follow Up') || '',
          notes: '',
          followUps: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    console.error('getPendingBills error:', err);
  }
  return bills.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

export async function savePendingBill(
  bill: PendingBill,
  triggerEmail: boolean = false
): Promise<{ success: boolean; error?: string; bill?: PendingBill }> {
  try {
    const finalBill: PendingBill = {
      ...bill,
      id: bill.id || `PB-${Date.now().toString(36).toUpperCase()}`,
      updatedAt: new Date().toISOString(),
      createdAt: bill.createdAt || new Date().toISOString(),
      followUps: bill.followUps || [],
    };

    const rowObj = {
      'ID': finalBill.id,
      'Bill Name': finalBill.billName,
      'Bill No': finalBill.billNo || '',
      'Bill Type': finalBill.billType || 'Invoice',
      'Pending Amount (₹)': Number(finalBill.pendingAmount || 0).toFixed(2),
      'Total Amount (₹)': Number(finalBill.totalAmount || finalBill.pendingAmount || 0).toFixed(2),
      'Bill Date': finalBill.billDate || '',
      'Due Date': finalBill.dueDate || '',
      'Contact Person': finalBill.contactPerson || '',
      'Phone': finalBill.contactPhone || '',
      'Email': finalBill.contactEmail || '',
      'Status': finalBill.status || 'Pending',
      'Promised Date': finalBill.promisedDate || '',
      'Last Follow Up': finalBill.lastFollowUpDate || '',
      'Next Follow Up': finalBill.nextFollowUpDate || '',
      'Follow Up Count': String(finalBill.followUps.length),
      'RawData': JSON.stringify(finalBill),
    };

    // 1. Google Sheets write
    const doc = await getSheetSafely(6000);
    const sheet = await getOrCreatePendingBillsSheet(doc);
    const rows = await sheet.getRows();
    let targetRow = rows.find(r => r.get('ID') === finalBill.id);

    const sheetPromise = targetRow ? (targetRow.assign(rowObj), targetRow.save()) : sheet.addRow(rowObj);

    // 2. Supabase upsert
    const supaPromise = syncPendingBillToSupabase(finalBill);

    // 3. Optional Email trigger
    const emailPromise = triggerEmail
      ? sendPendingBillEmail({ bill: finalBill, actionType: 'new_bill' })
      : Promise.resolve({ success: true });

    await Promise.allSettled([sheetPromise, supaPromise, emailPromise]);

    return { success: true, bill: finalBill };
  } catch (err: any) {
    console.error('savePendingBill error:', err);
    // Still try Supabase
    await syncPendingBillToSupabase(bill).catch(() => {});
    return { success: false, error: err.message || 'Failed to save pending bill' };
  }
}

export async function addBillFollowUp(
  billId: string,
  followUp: Omit<BillFollowUp, 'id'>,
  triggerEmail: boolean = true
): Promise<{ success: boolean; error?: string; bill?: PendingBill }> {
  try {
    const allBills = await getPendingBills();
    const existing = allBills.find(b => b.id === billId);

    if (!existing) {
      return { success: false, error: 'Pending bill not found' };
    }

    const newFollowUp: BillFollowUp = {
      ...followUp,
      id: `fu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emailTriggered: triggerEmail,
    };

    const updatedFollowUps = [newFollowUp, ...(existing.followUps || [])];

    let newStatus = existing.status;
    if (followUp.promisedDate) {
      newStatus = 'Promised Payment';
    } else if (newStatus === 'Pending') {
      newStatus = 'Follow-up Done';
    }

    const updatedBill: PendingBill = {
      ...existing,
      status: newStatus,
      lastFollowUpDate: followUp.date,
      promisedDate: followUp.promisedDate || existing.promisedDate,
      nextFollowUpDate: followUp.nextFollowUpDate || existing.nextFollowUpDate,
      followUps: updatedFollowUps,
      updatedAt: new Date().toISOString(),
    };

    // Save to Google Sheets and Supabase
    await savePendingBill(updatedBill, false);

    // Trigger email notification to gsaireddy@powerlineselectricalwork.com
    if (triggerEmail) {
      await sendPendingBillEmail({
        bill: updatedBill,
        followUp: newFollowUp,
        actionType: followUp.promisedDate ? 'promised' : 'followup',
      });
    }

    return { success: true, bill: updatedBill };
  } catch (err: any) {
    console.error('addBillFollowUp error:', err);
    return { success: false, error: err.message || 'Failed to add follow up' };
  }
}

export async function deletePendingBill(billId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sheetPromise = (async () => {
      try {
        const doc = await getSheetSafely(5000);
        const sheet = doc.sheetsByTitle['Pending Bills'];
        if (sheet) {
          const rows = await sheet.getRows();
          const target = rows.find(r => r.get('ID') === billId);
          if (target) await target.delete();
        }
      } catch (e) {}
    })();

    const supaPromise = deletePendingBillFromSupabase(billId);

    await Promise.allSettled([sheetPromise, supaPromise]);
    return { success: true };
  } catch (err: any) {
    console.error('deletePendingBill error:', err);
    return { success: false, error: err.message };
  }
}

export async function triggerPendingBillAlertEmail(
  billId: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const bills = await getPendingBills();
    const bill = bills.find(b => b.id === billId);
    if (!bill) {
      return { success: false, error: 'Bill not found' };
    }

    const res = await sendPendingBillEmail({
      bill,
      actionType: 'reminder',
      customNote: customMessage,
    });
    return res;
  } catch (err: any) {
    console.error('triggerPendingBillAlertEmail error:', err);
    return { success: false, error: err.message };
  }
}

export async function importUnpaidBillsFromSystem(): Promise<{ success: boolean; importedCount: number; error?: string }> {
  try {
    const [existingBills, invoices, cashBills] = await Promise.all([
      getPendingBills(),
      fetchInvoicesFromSupabase().then(res => res || []),
      fetchCashBillsFromSupabase().then(res => res || []),
    ]);

    const existingBillNos = new Set(
      existingBills
        .map(b => (b.billNo || '').trim().toUpperCase())
        .filter(Boolean)
    );

    let count = 0;

    // 1. Scan Invoices where status is not Cleared
    for (const inv of invoices) {
      const invNo = (inv.id || '').trim().toUpperCase();
      const status = (inv.status || 'Pending').toLowerCase();
      if (invNo && !existingBillNos.has(invNo) && status !== 'cleared') {
        const newBill: PendingBill = {
          id: `PB-INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          billName: inv.customer || 'Customer',
          billNo: inv.id,
          billType: 'Invoice',
          pendingAmount: Number(inv.amount || 0),
          totalAmount: Number(inv.amount || 0),
          billDate: inv.date || '',
          dueDate: inv.dueDate || '',
          contactPerson: inv.customer || '',
          contactPhone: '',
          status: 'Pending',
          notes: `Auto-imported from Tax Invoice #${inv.id}`,
          followUps: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await savePendingBill(newBill, false);
        existingBillNos.add(invNo);
        count++;
      }
    }

    // 2. Scan Cash Bills where status is not Paid
    for (const cb of cashBills) {
      const billNo = (cb.id || '').trim().toUpperCase();
      const status = (cb.status || 'Pending').toLowerCase();
      if (billNo && !existingBillNos.has(billNo) && status !== 'paid' && status !== 'cleared') {
        const newBill: PendingBill = {
          id: `PB-CB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          billName: cb.customer || 'Cash Customer',
          billNo: cb.id,
          billType: 'Cash Bill',
          pendingAmount: Number(cb.amount || 0),
          totalAmount: Number(cb.amount || 0),
          billDate: cb.date || '',
          dueDate: '',
          contactPerson: cb.customer || '',
          contactPhone: cb.phone || '',
          status: 'Pending',
          notes: `Auto-imported from Cash Bill #${cb.id}`,
          followUps: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await savePendingBill(newBill, false);
        existingBillNos.add(billNo);
        count++;
      }
    }

    return { success: true, importedCount: count };
  } catch (err: any) {
    console.error('importUnpaidBillsFromSystem error:', err);
    return { success: false, importedCount: 0, error: err.message };
  }
}
