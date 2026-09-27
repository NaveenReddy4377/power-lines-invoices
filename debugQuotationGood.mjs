import fs from 'fs';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

async function run() {
  const envStr = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envStr.split('\n').forEach(l => {
    const parts = l.split('=');
    if (parts.length > 1) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });

  const creds = JSON.parse(env.GOOGLE_CREDENTIALS_JSON);
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID, auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['Quotations'];
  if (!sheet) {
    console.log('NO "Quotations" SHEET FOUND!');
    return;
  }
  
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  console.log(`FOUND ${rows.length} ROWS IN "Quotations"`);
  
  rows.forEach((row, i) => {
    console.log(`[Row ${i}] Quotation No: "${row.get('Quotation No')}"`);
  });
}

run().catch(console.error);
