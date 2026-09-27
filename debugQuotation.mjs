import fs from 'fs';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

async function run() {
  try {
    const envStr = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envStr.split('\n').forEach(l => {
      const parts = l.split('=');
      if (parts.length > 1) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
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
