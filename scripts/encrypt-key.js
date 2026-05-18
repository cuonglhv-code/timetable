const { encrypt } = require('../src/lib/crypto');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const keyIndex = args.indexOf('--key');

if (inputIndex === -1 || keyIndex === -1) {
  console.log('Usage: node encrypt-key.js --input <file.json> --key <encryption-key>');
  process.exit(1);
}

const inputFile = args[inputIndex + 1];
const encryptionKey = args[keyIndex + 1];

try {
  const keyPath = path.resolve(inputFile);
  const keyContent = fs.readFileSync(keyPath, 'utf8');
  const encrypted = encrypt(keyContent, encryptionKey);
  console.log('Encrypted key:');
  console.log(encrypted);
  console.log('\nAdd to .env:');
  console.log(`GOOGLE_SERVICE_ACCOUNT_KEY_ENCRYPTED="${encrypted}"`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
