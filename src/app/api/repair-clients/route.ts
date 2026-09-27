import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

async function getDoc() {
  let creds;
  const credsFile = path.join(process.cwd(), 'credentials.json');
  if (fs.existsSync(credsFile)) {
    creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
  } else {
    creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON!);
  }
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID!, auth);
  await doc.loadInfo();
  return doc;
}

export async function GET() {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Clients'];
    if (!sheet) return NextResponse.json({ error: 'No Clients sheet' });

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    const rows = await sheet.getRows();

    return NextResponse.json({
      headers,
      rowCount: rows.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}

export async function POST() {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Clients'];
    if (!sheet) return NextResponse.json({ error: 'No Clients sheet' });

    await sheet.loadHeaderRow();
    const currentHeaders = sheet.headerValues || [];

    // If headers are wrong (Quotation headers instead of Client headers)
    if (!currentHeaders.includes('Name') || !currentHeaders.includes('ID')) {
      // Get row count before we overwrite
      const rows = await sheet.getRows();
      const rowCount = rows.length;

      // Set correct headers
      await sheet.setHeaderRow(['ID', 'Name', 'GSTIN', 'Address', 'PlaceOfSupply']);

      return NextResponse.json({ 
        fixed: true, 
        oldHeaders: currentHeaders,
        rowCount,
        note: 'Headers were corrupt and have been fixed. Data rows preserved.'
      });
    }

    return NextResponse.json({ 
      ok: true, 
      headers: currentHeaders,
      note: 'Headers are already correct, no fix needed.'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
