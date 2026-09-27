import { supabase, isSupabaseConfigured } from './supabase';
import { InvoiceData, CashBillData, DeliveryChallanData, QuotationData, Client } from '@/types';

/**
 * Dual Storage Sync Helper for Supabase + Google Sheets.
 * If Supabase is configured and tables exist, updates are stored in PostgreSQL.
 * All errors are non-blocking so Google Sheets operations always continue smoothly.
 */

// 1. Invoices (Tax Invoices)
export async function syncInvoiceToSupabase(data: InvoiceData) {
  if (!isSupabaseConfigured() || !supabase || !data.invoiceNo) return;
  try {
    const totalAmount = data.items.reduce((sum, item) => {
      const lineNet = Number(item.quantity || 0) * Number(item.price || 0);
      return sum + lineNet;
    }, 0);

    const { error } = await supabase
      .from('invoices')
      .upsert(
        {
          invoice_no: data.invoiceNo.trim(),
          invoice_date: data.invoiceDate || null,
          customer_name: data.billTo?.name || '',
          customer_gstin: data.billTo?.gstin || '',
          total_amount: totalAmount,
          status: data.status || 'Pending',
          raw_data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'invoice_no' }
      );

    if (error) {
      console.warn('Supabase invoice sync notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase invoice sync error:', err);
  }
}

// 2. Cash Bills (Non-GST Cash Memo)
export async function syncCashBillToSupabase(data: CashBillData) {
  if (!isSupabaseConfigured() || !supabase || !data.billNo) return;
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
          bill_date: data.billDate || null,
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
    }
  } catch (err) {
    console.warn('Supabase cash bill sync error:', err);
  }
}

// 3. Delivery Challans
export async function syncDeliveryChallanToSupabase(data: DeliveryChallanData) {
  if (!isSupabaseConfigured() || !supabase || !data.dcNo) return;
  try {
    const { error } = await supabase
      .from('delivery_challans')
      .upsert(
        {
          dc_no: data.dcNo.trim(),
          dc_date: data.dcDate || null,
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
    }
  } catch (err) {
    console.warn('Supabase challan sync error:', err);
  }
}

// 4. Quotations
export async function syncQuotationToSupabase(data: QuotationData) {
  if (!isSupabaseConfigured() || !supabase || !data.quotationNo) return;
  try {
    const totalAmount = (data.items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );

    const { error } = await supabase
      .from('quotations')
      .upsert(
        {
          quotation_no: data.quotationNo.trim(),
          quotation_date: data.quotationDate || null,
          client_name: data.billTo?.name || '',
          total_amount: totalAmount,
          raw_data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'quotation_no' }
      );

    if (error) {
      console.warn('Supabase quotation sync notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase quotation sync error:', err);
  }
}

// 5. CRM Clients
export async function syncClientToSupabase(client: Client) {
  if (!isSupabaseConfigured() || !supabase || !client.name) return;
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
    }
  } catch (err) {
    console.warn('Supabase client sync error:', err);
  }
}

// 6. Fast Fetch Helpers (Used when Supabase is available)
export async function fetchInvoicesFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map((row) => ({
      invoiceNo: row.invoice_no,
      date: row.invoice_date,
      company: row.customer_name,
      gstin: row.customer_gstin,
      amount: Number(row.total_amount || 0),
      status: row.status,
      rawData: row.raw_data,
    }));
  } catch (e) {
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
      date: row.bill_date,
      customer: row.customer_name,
      phone: row.customer_phone,
      paymentMode: row.payment_mode,
      amount: Number(row.total_amount || 0),
      status: row.payment_status,
      rawData: row.raw_data,
    }));
  } catch (e) {
    return null;
  }
}
