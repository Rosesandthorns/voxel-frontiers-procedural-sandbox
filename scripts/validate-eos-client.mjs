import fs from 'node:fs';
import assert from 'node:assert/strict';

// This is the untrusted player client audited in EOS-CREDENTIALS.md.
// Never print credentials or accept a trusted-server configuration here.
const config = JSON.parse(fs.readFileSync('.env.eos.json', 'utf8'));
assert.deepEqual(Object.keys(config).sort(), ['clientId', 'clientSecret', 'deploymentId', 'productId', 'sandboxId']);
assert.equal(config.clientId, 'xyza7891wwZFLc1zJO59rxGfGJNUZ5uP', 'Unexpected EOS client: audit its portal policy before packaging');
for (const value of Object.values(config)) assert.ok(typeof value === 'string' && value.length > 0);
console.log('Validated audited, user-required EOS lobby client configuration.');
