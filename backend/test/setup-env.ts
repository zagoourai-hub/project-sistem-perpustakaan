// Jalan sebelum spec di-import: AppModule harus melihat DB test, bukan DB dev.
import 'dotenv/config';
import { testDatabaseUrl } from './global-setup.js';

process.env.DATABASE_URL = testDatabaseUrl();
