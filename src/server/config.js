const fs = require('fs');
const path = require('path');

require('dotenv').config();

if (process.env.GOOGLE_CLOUD_KEY_JSON) {
  const credentialsPath = path.join(process.cwd(), 'gcp-key.json');
  fs.writeFileSync(credentialsPath, process.env.GOOGLE_CLOUD_KEY_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}