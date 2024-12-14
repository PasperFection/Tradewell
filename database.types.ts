import { SupabaseClient } from '@supabase/supabase-js';

interface Credentials {
    id: number;
    api_key: string;
    api_secret: string;
    updated_at: string;
}

interface DatabaseSchema {
    credentials: Credentials;
}

export type Database = SupabaseClient<DatabaseSchema>;
export type { Credentials, DatabaseSchema };
