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

  const sheet = doc.sheetsById[1410863415];
  await sheet.loadHeaderRow();
  console.log('Headers for gid 1410863415 ("Quotations"):', sheet.headerValues);

  const rows = await sheet.getRows();
  console.log(`Total rows in Quotations: ${rows.length}`);
  if (rows.length > 0) {
     console.log('Sample row 0:', rows[0]._rawData);
  }
}

run().catch(console.error);
