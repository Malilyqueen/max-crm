import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

console.log('ESPO_BASE_URL:', process.env.ESPO_BASE_URL);
console.log('ESPO_API_KEY:', process.env.ESPO_API_KEY ? `${process.env.ESPO_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('ESPO_ADMIN_API_KEY:', process.env.ESPO_ADMIN_API_KEY ? `${process.env.ESPO_ADMIN_API_KEY.substring(0, 10)}...` : 'NOT SET');
