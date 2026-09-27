import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

async function uploadToGoogleDrive(fileName, base64Data, mimeType) {
  const credsFile = path.join(process.cwd(), 'credentials.json');
  const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));

  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ],
  });

  const tokenObj = await serviceAccountAuth.getAccessToken();
  const token = tokenObj.token;

  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const metadata = {
    name: fileName,
    mimeType: mimeType,
  };

  const boundary = 'foo_bar_baz';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  let body = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + mimeType + '\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    buffer.toString('base64') +
    close_delim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive Upload Error ${res.status}: ${text}`);
  }

  const fileData = await res.json();
  console.log('Uploaded File:', fileData);

  // Set file permission to anyone with link can view
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone'
    })
  });

  // Direct viewable URL
  const publicUrl = `https://drive.google.com/uc?id=${fileData.id}&export=view`;
  console.log('Public Shareable URL:', publicUrl);
  return publicUrl;
}

run().catch(console.error);

async function run() {
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const url = await uploadToGoogleDrive("test_rgp_image.png", dummyBase64, "image/png");
  console.log('RESULT URL:', url);
}
