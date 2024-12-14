import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseKey
);

export const STORAGE_CONFIG = {
    CREDENTIALS_TABLE: 'credentials',
    COLUMNS: {
        ID: 'id',
        API_KEY: 'api_key',
        API_SECRET: 'api_secret',
        UPDATED_AT: 'updated_at'
    }
} as const;
