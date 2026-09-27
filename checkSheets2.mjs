import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';

async function run() {
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
  
  for (let i = 0; i < doc.sheetCount; i++) {
     const sheet = doc.sheetsByIndex[i];
     console.log(`Sheet found: "${sheet.title}"`);
  }
}

run().catch(console.error);
