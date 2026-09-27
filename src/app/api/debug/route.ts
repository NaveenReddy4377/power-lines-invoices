import { NextResponse } from 'next/server';
import { getClients } from '@/app/actions';

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json({ 
      count: clients.length, 
      first3: clients.slice(0, 3),
      message: clients.length === 0 ? 'NO CLIENTS LOADED - sheet may have wrong headers' : 'OK'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.substring(0, 500) });
  }
}
