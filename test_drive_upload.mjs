import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

async function run() {
  const credsFile = path.join(process.cwd(), 'credentials.json');
  const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));

  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ],
  });

  const drive = google.drive({ version: 'v3', auth });

  // Test uploading a dummy file
  const fileMetadata = {
    name: 'test_rgp.txt',
    mimeType: 'text/plain',
  };
  const media = {
    mimeType: 'text/plain',
    body: 'Test RGP File Upload',
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  console.log('File uploaded to Drive successfully!');
  console.log('File ID:', response.data.id);
  console.log('webViewLink:', response.data.webViewLink);

  // Make file publicly viewable
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  console.log('File set to public access.');
}

run().catch(console.error);
