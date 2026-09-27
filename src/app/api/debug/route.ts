import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getClients, importExistingSheetsToSupabase } from '@/app/actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldSync = searchParams.get('sync') === 'true';

  let syncResult = null;
  if (shouldSync) {
    try {
      syncResult = await importExistingSheetsToSupabase();
    } catch (e: any) {
      syncResult = { success: false, error: e.message };
    }
  }

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null,
    syncTriggered: shouldSync,
    syncResult,
    supabaseTables: {},
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const [inv, cb, dc, q, cl] = await Promise.all([
        supabase.from('invoices').select('count', { count: 'exact', head: true }),
        supabase.from('cash_bills').select('count', { count: 'exact', head: true }),
        supabase.from('delivery_challans').select('count', { count: 'exact', head: true }),
        supabase.from('quotations').select('count', { count: 'exact', head: true }),
        supabase.from('clients').select('count', { count: 'exact', head: true }),
      ]);

      diagnostics.supabaseTables = {
        invoices: { count: inv.count ?? 0, status: inv.status, error: inv.error?.message || null },
        cash_bills: { count: cb.count ?? 0, status: cb.status, error: cb.error?.message || null },
        delivery_challans: { count: dc.count ?? 0, status: dc.status, error: dc.error?.message || null },
        quotations: { count: q.count ?? 0, status: q.status, error: q.error?.message || null },
        clients: { count: cl.count ?? 0, status: cl.status, error: cl.error?.message || null },
      };
      diagnostics.supabaseStatus = 'CONNECTED & READY';
    } catch (err: any) {
      diagnostics.supabaseStatus = 'ERROR';
      diagnostics.supabaseError = err.message;
    }
  } else {
    diagnostics.supabaseStatus = 'NOT CONFIGURED';
  }

  try {
    const clients = await getClients();
    diagnostics.googleSheets = {
      status: 'CONNECTED',
      clientsLoaded: clients.length,
    };
  } catch (err: any) {
    diagnostics.googleSheets = {
      status: 'ERROR',
      error: err.message,
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
