// test-wa-instance-create.js - Simuler création instance WhatsApp
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-MACREA2025';

// Créer un JWT pour macrea
const token = jwt.sign(
  {
    userId: 'test-user-123',
    email: 'admin@macrea.local',
    role: 'admin',
    tenantId: 'macrea'
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('JWT Token pour macrea:');
console.log(token);
console.log('\nTest avec curl:');
console.log(`curl -X POST http://localhost:3005/api/wa/instance/create \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"idInstance": "7105440259", "apiTokenInstance": "test_token_abc123", "providerName": "WhatsApp Macrea Test"}'`);