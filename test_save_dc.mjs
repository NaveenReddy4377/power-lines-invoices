import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

async function run() {
  const credsFile = path.join(process.cwd(), 'credentials.json');
  const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
  const spreadsheetId = '1cyfPeMpOuxuN7czEWTUb4YjsmUB-o_wmzWO8U8Jt8hk';

  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();

  console.log('Connected to Google Spreadsheet:', doc.title);
  let sheet = doc.sheetsByTitle['Delivery Challans'];
  if (!sheet) {
    console.log('Tab Delivery Challans not found');
    return;
  }
  await sheet.loadHeaderRow();
  console.log('Headers in Sheet:', sheet.headerValues);
  const rows = await sheet.getRows();
  console.log('Total DC rows count:', rows.length);
  for (const r of rows) {
    console.log('Row DC No:', r.get('DC No'), '| Customer:', r.get('Customer Name'), '| RGP Photo URL:', r.get('RGP Photo URL') || '(none)');
  }
}

run().catch(console.error);
