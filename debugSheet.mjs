import 'dotenv/config';
import { loadEnvConfig } from '@next/env';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

loadEnvConfig(process.cwd());

async function run() {
  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const auth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
    await doc.loadInfo();
    console.log('Doc title:', doc.title);
    
    let sheet = doc.sheetsByTitle['Quotations'];
    if (!sheet) {
      console.log('Quotations sheet not found!');
      return;
    }
    
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    console.log(`Found ${rows.length} rows in Quotations sheet.`);
    
    for (const row of rows) {
      const qno = row.get('Quotation No');
      console.log(`QNo Found: [${qno}]`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
