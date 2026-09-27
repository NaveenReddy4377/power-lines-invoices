import fs from 'fs';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { resolve } from 'path';

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  let spreadsheetId = "";
  let credsJsonStr = "";
  
  for (const line of envContent.split('\n')) {
    if (line.startsWith('SPREADSHEET_ID=')) {
      spreadsheetId = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
    }
    if (line.startsWith('GOOGLE_CREDENTIALS_JSON=')) {
      credsJsonStr = line.substring('GOOGLE_CREDENTIALS_JSON='.length).trim();
      if (credsJsonStr.startsWith("'") && credsJsonStr.endsWith("'")) {
          credsJsonStr = credsJsonStr.slice(1, -1);
      }
    }
  }

  const creds = JSON.parse(credsJsonStr);
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  
  console.log('Doc Loaded:', doc.title);
  
  const sheet = doc.sheetsByTitle['Quotations'];
  if (!sheet) {
    console.log('CRITICAL: NO Quotations sheet found!');
    return;
  }
  
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  console.log(`Found ${rows.length} records.`);
  rows.forEach(r => {
    console.log(`=> Found: [${r.get('Quotation No')}]`);
  });
}
run();
