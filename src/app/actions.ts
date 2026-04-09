'use server';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { InvoiceData, QuotationData } from '@/types';
import {
  readOfflineDB,
  updateLastInvoiceNumber,
  updateLastQuotationNumber,
  addOfflineInvoice,
  addOfflineQuotation,
  writeOfflineDB
} from '@/lib/offlineDB';

// Helper to get or create a named sheet tab
async function getOrCreateSheet(doc: GoogleSpreadsheet, title: string) {
  let sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    sheet = await doc.addSheet({ title, headerValues: ['Quotation No', 'Date', 'Valid Until', 'Billed To', 'GSTIN', 'RGP No', 'RGP Date', 'Grand Total (₹)', 'RawData'] });
  }
  return sheet;
}

// Connect to Google Sheets
const getSheet = async () => {
  let creds;

  const credsFile = path.join(process.cwd(), 'credentials.json');
  if (fs.existsSync(credsFile)) {
    creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
  } else if (process.env.GOOGLE_CREDENTIALS_JSON) {
    creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
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
  await doc.loadInfo();
  return doc;
};

// Safe wrapper with timeout
async function getSheetSafely(timeoutMs = 4000): Promise<GoogleSpreadsheet> {
  return Promise.race([
    getSheet(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('OFFLINE_TIMEOUT')), timeoutMs))
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

// Helper to safely extract the highest ID by scanning all rows, handling blank rows natively
function getHighestId(rows: any[], colName: string): string | null {
    let maxNum = -1;
    let maxId: string | null = null;
    
    for (const row of rows) {
        const val = row.get(colName);
        if (val && typeof val === 'string' && val.trim() !== '') {
            const id = val.trim();
            const match = id.match(/^(.*?)(\d+)$/);
            if (match) {
                const num = parseInt(match[2], 10);
                if (num > maxNum) {
                    maxNum = num;
                    maxId = id;
                }
            } else if (!maxId) {
                maxId = id;
            }
        }
    }
    return maxId;
}

// Auto increment based on last row
export async function getNextInvoiceNumber() {
  const defaultStart = "PLEW001231";
  try {
    const doc = await getSheetSafely();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    let latestOnlineId = getHighestId(rows, 'Invoice No');
    
    // Check if offlineDB has an even newer one
    const db = readOfflineDB();
    if (db.lastInvoiceNumber) {
        if (!latestOnlineId || db.lastInvoiceNumber > latestOnlineId) {
            latestOnlineId = db.lastInvoiceNumber;
        }
    }
    
    if (!latestOnlineId) return defaultStart;

    updateLastInvoiceNumber(latestOnlineId);
    return incrementId(latestOnlineId, defaultStart);
  } catch (error: any) {
    console.log('Offline fallback for getNextInvoiceNumber');
    // Offline fallback
    const db = readOfflineDB();
    return incrementId(db.lastInvoiceNumber || defaultStart, defaultStart);
  }
}

export async function saveToSpreadsheet(data: InvoiceData, skipOfflineSave = false) {
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
    const grandTotal = Math.round(totalAmount + cgstAmount + sgstAmount);

    try { await sheet.setHeaderRow(['Invoice No', 'Date', 'Billed To', 'GSTIN', 'Sum Total (₹)', 'CGST (₹)', 'SGST (₹)', 'Grand Total (₹)', 'PO Number', 'PO Date', 'RawData']); } catch {}

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
      'RawData': JSON.stringify(data),
    };

    if (targetRow) {
      targetRow.assign(rowObj);
      await targetRow.save();
    } else {
      await sheet.addRow(rowObj);
    }
    
    updateLastInvoiceNumber(data.invoiceNo);
    return { success: true };
  } catch (error: any) {
    if (error.message.includes('PO Number')) throw error;
    console.log('Offline fallback for saveToSpreadsheet');
    if (!skipOfflineSave) {
        addOfflineInvoice(data);
    }
    return { success: true, offline: true };
  }
}

export async function loadInvoice(invoiceNo: string) {
  // First check offline DB
  const db = readOfflineDB();
  const offlineMatch = db.offlineInvoices.find(i => i.invoiceNo === invoiceNo);
  if (offlineMatch) {
      return { success: true, data: offlineMatch, offline: true };
  }

  try {
    const doc = await getSheetSafely();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].get('Invoice No') === invoiceNo) {
        const rawJson = rows[i].get('RawData');
        if (rawJson) return { success: true, data: JSON.parse(rawJson) };
      }
    }
    return { success: false, error: 'Invoice not found.' };
  } catch (error: any) {
    return { success: false, error: 'Cannot connect to database (offline) and invoice not found locally.' };
  }
}

export async function getItemSuggestions(): Promise<string[]> {
  const itemSet = new Set<string>();
  
  // Always include offline DB in suggestions
  const db = readOfflineDB();
  for (const inv of db.offlineInvoices) {
      for (const item of inv.items) {
          if (item.name?.trim()) itemSet.add(item.name.trim().toUpperCase());
      }
  }

  try {
    const doc = await getSheetSafely(2000); // Shorter timeout for suggestions
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
        } catch {}
      }
    }
  } catch (error) {
    // Ignore offline errors for suggestions
  }
  return Array.from(itemSet).sort();
}

export async function getDashboardStats() {
  let totalRevenue = 0;
  const customerSet = new Set();
  const recentInvoices: any[] = [];
  const recentQuotations: any[] = [];
  
  // Include offline stats natively
  const db = readOfflineDB();
  for (const inv of db.offlineInvoices) {
    const amount = inv.items.reduce((s, item) => {
        let price = item.price * item.quantity;
        if (item.discountType === 'percentage') {
          price -= (price * item.discount / 100);
        } else {
          price -= item.discount;
        }
        return s + price;
    }, 0);
    const cgst = amount * (inv.taxes.cgst / 100);
    const sgst = amount * (inv.taxes.sgst / 100);
    const grandTotal = Math.round(amount + cgst + sgst);

    totalRevenue += grandTotal;
    if (inv.billTo.name) customerSet.add(inv.billTo.name);
    recentInvoices.push({ id: inv.invoiceNo, date: inv.invoiceDate, customer: inv.billTo.name, amount: grandTotal });
  }
  for (const q of db.offlineQuotations) {
    recentQuotations.push({ id: q.quotationNo, date: q.quotationDate, customer: q.billTo?.name || '', amount: 0 });
  }

  try {
    const doc = await getSheetSafely(3000);
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (let i = rows.length - 1; i >= 0; i--) {
       const r = rows[i];
       const invNo = r.get('Invoice No') || '';
       const date = r.get('Date') || '';
       const billedTo = r.get('Billed To') || '';
       const grandTotal = parseFloat(r.get('Grand Total (₹)')) || 0;

       totalRevenue += grandTotal;
       if (billedTo) customerSet.add(billedTo);

       if (recentInvoices.length < 5 && invNo) {
         recentInvoices.push({ id: invNo, date: date, customer: billedTo, amount: grandTotal });
       }
    }

    // Quotations sheet
    try {
      const quotSheet = doc.sheetsByTitle['Quotations'];
      if (quotSheet) {
        const qRows = await quotSheet.getRows();
        for (let i = qRows.length - 1; i >= 0 && recentQuotations.length < 5; i--) {
          const r = qRows[i];
          const qNo = r.get('Quotation No') || '';
          if (qNo) {
            recentQuotations.push({
              id: qNo,
              date: r.get('Date') || '',
              customer: r.get('Billed To') || '',
              amount: parseFloat(r.get('Grand Total (₹)')) || 0
            });
          }
        }
      }
    } catch {}

    // Deduplicate and sort descending
    const merged = recentInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const mergedQ = recentQuotations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      data: { totalRevenue, customers: customerSet.size, recentInvoices: merged, recentQuotations: mergedQ }
    };

  } catch (error: any) {
    return { 
        success: true, 
        data: { totalRevenue, customers: customerSet.size, recentInvoices: recentInvoices, recentQuotations: recentQuotations },
        offline: true
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
    
    let latestOnlineId = getHighestId(rows, 'Quotation No');

    const db = readOfflineDB();
    if (db.lastQuotationNumber) {
        if (!latestOnlineId || db.lastQuotationNumber > latestOnlineId) {
            latestOnlineId = db.lastQuotationNumber;
        }
    }
    
    if (!latestOnlineId) return defaultStart;

    updateLastQuotationNumber(latestOnlineId);
    return incrementId(latestOnlineId, defaultStart);
  } catch (error) {
    console.log('Offline fallback for getNextQuotationNumber');
    const db = readOfflineDB();
    return incrementId(db.lastQuotationNumber || defaultStart, defaultStart);
  }
}

export async function saveQuotation(data: QuotationData, skipOfflineSave = false) {
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
    const grandTotal = Math.round(sumTotal + cgst + sgst);

    const rowObj = {
      'Quotation No': data.quotationNo,
      'Date': data.quotationDate,
      'Valid Until': data.validUntil,
      'Billed To': data.billTo.name,
      'GSTIN': data.billTo.gstin,
      'RGP No': data.rgpNumber || '',
      'RGP Date': data.rgpDate || '',
      'Grand Total (\u20b9)': grandTotal,
      'RawData': JSON.stringify(data),
    };

    const rows = await sheet.getRows();
    let targetRow = null;
    for (const row of rows) {
      if (row.get('Quotation No') === data.quotationNo) {
        targetRow = row; break;
      }
    }

    if (targetRow) {
      targetRow.assign(rowObj);
      await targetRow.save();
    } else {
      await sheet.addRow(rowObj);
    }

    updateLastQuotationNumber(data.quotationNo);
    return { success: true };
  } catch (error: any) {
    console.log('Offline fallback for saveQuotation');
    if (!skipOfflineSave) {
        addOfflineQuotation(data);
    }
    return { success: true, offline: true };
  }
}

export async function loadQuotation(quotationNo: string) {
  const db = readOfflineDB();
  const offlineMatch = db.offlineQuotations.find(q => q.quotationNo === quotationNo);
  if (offlineMatch) return { success: true, data: offlineMatch, offline: true };

  try {
    const doc = await getSheetSafely();
    const sheet = await getOrCreateSheet(doc, 'Quotations');
    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('Quotation No') === quotationNo) {
        const raw = row.get('RawData');
        if (raw) return { success: true, data: JSON.parse(raw) as QuotationData };
      }
    }
    return { success: false, error: 'Quotation not found.' };
  } catch (error: any) {
    return { success: false, error: 'Cannot connect to database (offline) and quotation not found locally.' };
  }
}

// ────────────────────── SYNC OFFLINE DATA ──────────────────────

export async function syncOfflineData() {
  const db = readOfflineDB();
  if (db.offlineInvoices.length === 0 && db.offlineQuotations.length === 0) {
    return { success: true, message: 'Nothing to sync.' };
  }

  try {
    // Attempt basic connect
    await getSheetSafely(5000);

    let invoicesSynced = 0;
    let quotationsSynced = 0;

    // Process invoices
    for (const inv of [...db.offlineInvoices]) {
        const res = await saveToSpreadsheet(inv, true); // skipOfflineSave = true to avoid duplicate appending if fails halfway
        if (!res.offline) {
             invoicesSynced++;
             db.offlineInvoices = db.offlineInvoices.filter(i => i.invoiceNo !== inv.invoiceNo);
             writeOfflineDB(db); 
        } else {
             throw new Error('Lost connection during sync');
        }
    }
    
    // Process quotations
    for (const q of [...db.offlineQuotations]) {
        const res = await saveQuotation(q, true);
        if (!res.offline) {
             quotationsSynced++;
             db.offlineQuotations = db.offlineQuotations.filter(i => i.quotationNo !== q.quotationNo);
             writeOfflineDB(db);
        } else {
             throw new Error('Lost connection during sync');
        }
    }

    return { 
        success: true, 
        message: `Successfully synced ${invoicesSynced} invoices and ${quotationsSynced} quotations to online database.` 
    };

  } catch (error: any) {
    return { success: false, error: 'Failed to connect to Google Sheets. ' + error.message };
  }
}

export async function getPendingOfflineCount() {
    const db = readOfflineDB();
    return db.offlineInvoices.length + db.offlineQuotations.length;
}

// ────────────────────── GST REPORTS ──────────────────────

export async function getAllInvoicesForGST() {
  const allInvoices: any[] = [];
  
  // Include offline invoices as well
  const db = readOfflineDB();
  for (const inv of db.offlineInvoices) {
    const amount = inv.items.reduce((s, item) => {
        let price = item.price * item.quantity;
        if (item.discountType === 'percentage') price -= (price * item.discount / 100);
        else price -= item.discount;
        return s + price;
    }, 0);
    const cgst = amount * (inv.taxes.cgst / 100);
    const sgst = amount * (inv.taxes.sgst / 100);
    const grandTotal = Math.round(amount + cgst + sgst);
    
    allInvoices.push({
      invoiceNo: inv.invoiceNo,
      date: inv.invoiceDate,
      billedTo: inv.billTo.name,
      gstin: inv.billTo.gstin || '',
      sumTotal: amount,
      cgst: cgst,
      sgst: sgst,
      grandTotal: grandTotal,
      status: 'OFFLINE (Pending)'
    });
  }

  try {
    const doc = await getSheetSafely(5000);
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (let i = rows.length - 1; i >= 0; i--) {
       const r = rows[i];
       const invNo = r.get('Invoice No') || '';
       if (!invNo) continue; // Skip empty rows
       
       allInvoices.push({
         invoiceNo: invNo,
         date: r.get('Date') || '',
         billedTo: r.get('Billed To') || '',
         gstin: r.get('GSTIN') || '',
         sumTotal: parseFloat(r.get('Sum Total (₹)')) || 0,
         cgst: parseFloat(r.get('CGST (₹)')) || 0,
         sgst: parseFloat(r.get('SGST (₹)')) || 0,
         grandTotal: parseFloat(r.get('Grand Total (₹)')) || 0,
         status: 'SAVED'
       });
    }
  } catch (error) {
    console.log('Offline fallback for GST returns');
  }

  // Sort descending by date
  return allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 STAFF & PAYROLL (Google Sheets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
import { StaffDBSchema } from '@/lib/staffDB';

// ---- Sheet helpers ----
async function getOrCreateStaffSheet(doc: GoogleSpreadsheet, title: string, headers: string[]) {
    let sheet = doc.sheetsByTitle[title];
    if (!sheet) {
        sheet = await doc.addSheet({ title, headerValues: headers });
    }
    return sheet;
}

// ---- READ from Google Sheets ----
export async function getStaffData(): Promise<StaffDBSchema> {
    const fallback: StaffDBSchema = {
        settings: { enableReminder: true, reminderTime: '10:00', markPresentDefault: false, workingHours: { hrs: 8, mins: 0 }, weeklyOffs: ['Sun'] },
        staff: [],
        attendance: {}
    };

    try {
        const doc = await getSheetSafely(6000);

        // --- Settings ---
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

        // --- Staff ---
        const staffSheet = await getOrCreateStaffSheet(doc, 'Staff', ['id', 'name', 'mobile', 'monthlySalary']);
        const staffRows = await staffSheet.getRows();
        const staffList = staffRows.map(r => ({
            id: r.get('id'),
            name: r.get('name'),
            mobile: r.get('mobile'),
            monthlySalary: parseFloat(r.get('monthlySalary')) || 0,
            advances: [] as { id: string; date: string; amount: number; description: string }[]
        })).filter(s => s.id);

        // --- Advances ---
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

        // --- Attendance ---
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
        console.error('getStaffData error (falling back to defaults):', err);
        return fallback;
    }
}

// ---- WRITE to Google Sheets ----
export async function saveStaffData(data: StaffDBSchema) {
    try {
        const doc = await getSheetSafely(6000);

        // --- Settings ---
        const settingsSheet = await getOrCreateStaffSheet(doc, 'StaffSettings', ['enableReminder', 'reminderTime', 'markPresentDefault', 'workingHoursHrs', 'workingHoursMins', 'weeklyOffs']);
        const existingSettings = await settingsSheet.getRows();
        for (const r of existingSettings) await r.delete();
        await settingsSheet.addRow({
            enableReminder: String(data.settings.enableReminder),
            reminderTime: data.settings.reminderTime,
            markPresentDefault: String(data.settings.markPresentDefault),
            workingHoursHrs: String(data.settings.workingHours.hrs),
            workingHoursMins: String(data.settings.workingHours.mins),
            weeklyOffs: (data.settings.weeklyOffs || []).join(',')
        });

        // --- Staff ---
        const staffSheet = await getOrCreateStaffSheet(doc, 'Staff', ['id', 'name', 'mobile', 'monthlySalary']);
        const existingStaff = await staffSheet.getRows();
        for (const r of existingStaff) await r.delete();
        for (const s of data.staff) {
            await staffSheet.addRow({ id: s.id, name: s.name, mobile: s.mobile, monthlySalary: String(s.monthlySalary) });
        }

        // --- Advances ---
        const advSheet = await getOrCreateStaffSheet(doc, 'StaffAdvances', ['id', 'staffId', 'date', 'amount', 'description']);
        const existingAdv = await advSheet.getRows();
        for (const r of existingAdv) await r.delete();
        for (const s of data.staff) {
            for (const adv of s.advances) {
                await advSheet.addRow({ id: adv.id, staffId: s.id, date: adv.date, amount: String(adv.amount), description: adv.description });
            }
        }

        // --- Attendance ---
        const attSheet = await getOrCreateStaffSheet(doc, 'Attendance', ['date', 'staffId', 'status', 'overtime']);
        const existingAtt = await attSheet.getRows();
        for (const r of existingAtt) await r.delete();
        for (const [date, staffMap] of Object.entries(data.attendance)) {
            for (const [staffId, rec] of Object.entries(staffMap)) {
                if (rec.status) {
                    await attSheet.addRow({ date, staffId, status: rec.status || '', overtime: String(rec.overtime || 0) });
                }
            }
        }

        return { success: true };

    } catch (err) {
        console.error('saveStaffData error:', err);
        // Fallback: write to local JSON as backup
        const { writeStaffDB } = await import('@/lib/staffDB');
        writeStaffDB(data);
        return { success: false, fallback: true };
    }
}
