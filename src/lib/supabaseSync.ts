import { supabase, isSupabaseConfigured } from './supabase';
import { InvoiceData, CashBillData, DeliveryChallanData, QuotationData, Client, PendingBill } from '@/types';

/**
 * Normalizes date inputs to standard YYYY-MM-DD for PostgreSQL DATE type.
 * Returns null if invalid or blank to avoid Postgres date syntax errors.
 */
export function normalizeDateForSupabase(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try native date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Invoices (Tax Invoices)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncInvoiceToSupabase(data: InvoiceData): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }
  if (!data.invoiceNo) {
    return { success: false, error: 'Invoice number is missing' };
  }

  try {
    const netTotal = (data.items || []).reduce((sum, item) => {
      const lineNet = Number(item.quantity || 0) * Number(item.price || 0);
      return sum + lineNet;
    }, 0);

    const isInterState = Boolean(
      data.billTo?.placeOfSupply &&
      !data.billTo.placeOfSupply.toLowerCase().includes('telangana')
    );
    const taxRate = isInterState
      ? 18
      : (Number(data.taxes?.cgst ? 9 : 9) + Number(data.taxes?.sgst ? 9 : 9));
    const grandTotal = Math.round((netTotal + (netTotal * taxRate / 100)) * 100) / 100;

    const { error } = await supabase
      .from('invoices')
      .upsert(
        {
          invoice_no: data.invoiceNo.trim(),
          invoice_date: normalizeDateForSupabase(data.invoiceDate),
          customer_name: data.billTo?.name || '',
          customer_gstin: data.billTo?.gstin || '',
          total_amount: grandTotal,
          status: data.status || 'Pending',
          raw_data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'invoice_no' }
      );

    if (error) {
      console.warn('Supabase invoice sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase invoice sync error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchInvoiceFromSupabase(invoiceNo: string): Promise<InvoiceData | null> {
  if (!isSupabaseConfigured() || !supabase || !invoiceNo) return null;
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('raw_data')
      .ilike('invoice_no', invoiceNo.trim())
      .maybeSingle();

    if (error || !data || !data.raw_data) return null;
    return data.raw_data as InvoiceData;
  } catch {
    return null;
  }
}

export async function fetchInvoicesFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map((row) => ({
      id: row.invoice_no,
      date: row.invoice_date || '',
      dueDate: row.raw_data?.dueDate || '',
      customer: row.customer_name || '',
      gstin: row.customer_gstin || '',
      amount: Number(row.total_amount || 0),
      sumTotal: row.raw_data?.items ? (row.raw_data.items.reduce((s: number, i: any) => s + (Number(i.quantity||0)*Number(i.price||0)), 0)) : Number(row.total_amount || 0),
      cgst: Math.round(((Number(row.total_amount || 0) / 1.18) * 0.09) * 100) / 100,
      sgst: Math.round(((Number(row.total_amount || 0) / 1.18) * 0.09) * 100) / 100,
      status: row.status || 'Pending',
      poNumber: row.raw_data?.poNumber || '',
      poDate: row.raw_data?.poDate || '',
      rawData: row.raw_data,
    }));
  } catch {
    return null;
  }
}

export async function getLatestInvoiceNoFromSupabase(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data } = await supabase
      .from('invoices')
      .select('invoice_no')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.invoice_no || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cash Bills (Non-GST Cash Memo)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncCashBillToSupabase(data: CashBillData): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }
  if (!data.billNo) {
    return { success: false, error: 'Bill number is missing' };
  }

  try {
    const subtotal = (data.items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0),
      0
    );
    const totalAmount = Math.max(0, subtotal - Number(data.discount || 0));

    const { error } = await supabase
      .from('cash_bills')
      .upsert(
        {
          bill_no: data.billNo.trim(),
          bill_date: normalizeDateForSupabase(data.billDate),
          customer_name: data.customerName || '',
          customer_phone: data.customerPhone || '',
          payment_mode: data.paymentMode || 'Cash',
          payment_status: data.paymentStatus || data.status || 'Paid',
          total_amount: totalAmount,
          raw_data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'bill_no' }
      );

    if (error) {
      console.warn('Supabase cash bill sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase cash bill sync error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchCashBillFromSupabase(billNo: string): Promise<CashBillData | null> {
  if (!isSupabaseConfigured() || !supabase || !billNo) return null;
  try {
    const { data, error } = await supabase
      .from('cash_bills')
      .select('raw_data')
      .ilike('bill_no', billNo.trim())
      .maybeSingle();

    if (error || !data || !data.raw_data) return null;
    return data.raw_data as CashBillData;
  } catch {
    return null;
  }
}

export async function fetchCashBillsFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('cash_bills')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map((row) => ({
      id: row.bill_no,
      date: row.bill_date || '',
      customer: row.customer_name || '',
      phone: row.customer_phone || '',
      paymentMode: row.payment_mode || 'Cash',
      amount: Number(row.total_amount || 0),
      status: row.payment_status || 'Paid',
      rawData: row.raw_data,
    }));
  } catch {
    return null;
  }
}

export async function getLatestCashBillNoFromSupabase(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data } = await supabase
      .from('cash_bills')
      .select('bill_no')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.bill_no || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Delivery Challans
// ─────────────────────────────────────────────────────────────────────────────

export async function syncDeliveryChallanToSupabase(data: DeliveryChallanData): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }
  if (!data.dcNo) {
    return { success: false, error: 'DC number is missing' };
  }

  try {
    const { error } = await supabase
      .from('delivery_challans')
      .upsert(
        {
          dc_no: data.dcNo.trim(),
          dc_date: normalizeDateForSupabase(data.dcDate),
          client_name: data.customerName || '',
          challan_type: data.challanType || 'Returnable',
          vehicle_no: data.vehicleNo || '',
          raw_data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'dc_no' }
      );

    if (error) {
      console.warn('Supabase challan sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase challan sync error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchDeliveryChallanFromSupabase(dcNo: string): Promise<DeliveryChallanData | null> {
  if (!isSupabaseConfigured() || !supabase || !dcNo) return null;
  try {
    const { data, error } = await supabase
      .from('delivery_challans')
      .select('raw_data')
      .ilike('dc_no', dcNo.trim())
      .maybeSingle();

    if (error || !data || !data.raw_data) return null;
    return data.raw_data as DeliveryChallanData;
  } catch {
    return null;
  }
}

export async function fetchDeliveryChallansFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('delivery_challans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map((row) => ({
      id: row.dc_no,
      date: row.dc_date || '',
      customer: row.client_name || '',
      rgpNo: row.raw_data?.rgpNo || '',
      rgpDate: row.raw_data?.rgpDate || '',
      quotationRaised: row.raw_data?.quotationRaised || 'No',
      type: row.challan_type || 'Returnable',
      rgpPhotoUrl: row.raw_data?.rgpPhotoUrl || '',
      status: row.raw_data?.status || 'Pending',
      rawData: row.raw_data,
    }));
  } catch {
    return null;
  }
}

export async function getLatestDcNoFromSupabase(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data } = await supabase
      .from('delivery_challans')
      .select('dc_no')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.dc_no || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Quotations
// ─────────────────────────────────────────────────────────────────────────────

export async function syncQuotationToSupabase(data: QuotationData): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }
  if (!data.quotationNo) {
    return { success: false, error: 'Quotation number is missing' };
  }

  try {
    const subtotal = (data.items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );
    const taxRate = Number(data.taxes?.cgst ? 9 : 9) + Number(data.taxes?.sgst ? 9 : 9);
    const grandTotal = Math.round((subtotal + (subtotal * taxRate / 100)) * 100) / 100;

    const { error } = await supabase
      .from('quotations')
      .upsert(
        {
          quotation_no: data.quotationNo.trim(),
          quotation_date: normalizeDateForSupabase(data.quotationDate),
          client_name: data.billTo?.name || '',
          total_amount: grandTotal,
          raw_data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'quotation_no' }
      );

    if (error) {
      console.warn('Supabase quotation sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase quotation sync error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchQuotationFromSupabase(quotationNo: string): Promise<QuotationData | null> {
  if (!isSupabaseConfigured() || !supabase || !quotationNo) return null;
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('raw_data')
      .ilike('quotation_no', quotationNo.trim())
      .maybeSingle();

    if (error || !data || !data.raw_data) return null;
    return data.raw_data as QuotationData;
  } catch {
    return null;
  }
}

export async function fetchQuotationsFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map((row) => ({
      id: row.quotation_no,
      date: row.quotation_date || '',
      validUntil: row.raw_data?.validUntil || '',
      customer: row.client_name || '',
      gstin: row.raw_data?.billTo?.gstin || '',
      rgpNo: row.raw_data?.rgpNumber || '',
      rgpDate: row.raw_data?.rgpDate || '',
      amount: Number(row.total_amount || 0),
      sumTotal: Math.round(((Number(row.total_amount || 0)) / 1.18) * 100) / 100,
      cgst: Math.round(((Number(row.total_amount || 0) / 1.18) * 0.09) * 100) / 100,
      sgst: Math.round(((Number(row.total_amount || 0) / 1.18) * 0.09) * 100) / 100,
      status: row.raw_data?.status || 'Pending',
      rawData: row.raw_data,
    }));
  } catch {
    return null;
  }
}

export async function getLatestQuotationNoFromSupabase(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data } = await supabase
      .from('quotations')
      .select('quotation_no')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.quotation_no || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CRM Clients
// ─────────────────────────────────────────────────────────────────────────────

export async function syncClientToSupabase(client: Client): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase || !client.name) {
    return { success: false, error: 'Supabase not configured or client name missing' };
  }
  try {
    const { error } = await supabase
      .from('clients')
      .upsert(
        {
          name: client.name.trim(),
          gstin: client.gstin || '',
          phone: client.phone || '',
          address: client.address || '',
          place_of_supply: client.placeOfSupply || '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'name' }
      );

    if (error) {
      console.warn('Supabase client sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase client sync error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchClientsFromSupabase(): Promise<Client[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) return null;
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      gstin: row.gstin || '',
      phone: row.phone || '',
      address: row.address || '',
      placeOfSupply: row.place_of_supply || 'Telangana',
    }));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Fast Description Suggestions from Supabase
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchDescriptionsFromSupabase(): Promise<{ description: string; rate?: number; unit?: string; source: string }[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const map = new Map<string, { description: string; rate?: number; unit?: string; source: string }>();

    // Fetch latest 100 rows from each
    const [invRows, cbRows, qRows, dcRows] = await Promise.all([
      supabase.from('invoices').select('raw_data').order('created_at', { ascending: false }).limit(100),
      supabase.from('cash_bills').select('raw_data').order('created_at', { ascending: false }).limit(100),
      supabase.from('quotations').select('raw_data').order('created_at', { ascending: false }).limit(100),
      supabase.from('delivery_challans').select('raw_data').order('created_at', { ascending: false }).limit(100),
    ]);

    const addItems = (rows: any[], defaultSource: string) => {
      if (!rows) return;
      for (const row of rows) {
        const raw = row.raw_data;
        if (raw && Array.isArray(raw.items)) {
          for (const item of raw.items) {
            const desc = (item.description || item.name || '').trim();
            if (desc && desc.length > 2) {
              const key = desc.toLowerCase();
              if (!map.has(key)) {
                map.set(key, {
                  description: desc,
                  rate: Number(item.rate || item.price) || undefined,
                  unit: item.unit || item.quantityUnit || 'NOS',
                  source: defaultSource,
                });
              }
            }
          }
        }
      }
    };

    addItems(cbRows.data || [], 'Cash Bill');
    addItems(dcRows.data || [], 'Delivery Challan');
    addItems(invRows.data || [], 'Invoice');
    addItems(qRows.data || [], 'Quotation');

    return Array.from(map.values());
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Pending Bills & Payment Follow-ups
// ─────────────────────────────────────────────────────────────────────────────

export async function syncPendingBillToSupabase(bill: PendingBill): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }
  if (!bill.id || !bill.billName) {
    return { success: false, error: 'Missing bill id or bill name' };
  }

  try {
    const { error } = await supabase
      .from('pending_bills')
      .upsert(
        {
          id: bill.id,
          bill_name: bill.billName.trim(),
          bill_no: bill.billNo || '',
          bill_type: bill.billType || 'Invoice',
          pending_amount: Number(bill.pendingAmount || 0),
          total_amount: Number(bill.totalAmount || bill.pendingAmount || 0),
          bill_date: normalizeDateForSupabase(bill.billDate),
          due_date: normalizeDateForSupabase(bill.dueDate),
          contact_person: bill.contactPerson || '',
          contact_phone: bill.contactPhone || '',
          contact_email: bill.contactEmail || '',
          status: bill.status || 'Pending',
          promised_date: normalizeDateForSupabase(bill.promisedDate),
          last_follow_up_date: normalizeDateForSupabase(bill.lastFollowUpDate),
          next_follow_up_date: normalizeDateForSupabase(bill.nextFollowUpDate),
          notes: bill.notes || '',
          follow_ups: bill.followUps || [],
          raw_data: bill,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('Supabase pending_bills sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase pending_bills sync error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchPendingBillsFromSupabase(): Promise<PendingBill[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('pending_bills')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map((row) => {
      if (row.raw_data) {
        return row.raw_data as PendingBill;
      }
      return {
        id: row.id,
        billName: row.bill_name,
        billNo: row.bill_no || '',
        billType: row.bill_type || 'Invoice',
        pendingAmount: Number(row.pending_amount || 0),
        totalAmount: Number(row.total_amount || 0),
        billDate: row.bill_date || '',
        dueDate: row.due_date || '',
        contactPerson: row.contact_person || '',
        contactPhone: row.contact_phone || '',
        contactEmail: row.contact_email || '',
        status: row.status || 'Pending',
        promisedDate: row.promised_date || '',
        lastFollowUpDate: row.last_follow_up_date || '',
        nextFollowUpDate: row.next_follow_up_date || '',
        notes: row.notes || '',
        followUps: Array.isArray(row.follow_ups) ? row.follow_ups : [],
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
      };
    });
  } catch {
    return null;
  }
}

export async function deletePendingBillFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || !id) return false;
  try {
    const { error } = await supabase.from('pending_bills').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

