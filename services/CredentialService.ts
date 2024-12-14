import { createClient } from '@supabase/supabase-js';
import { SecurityService } from '../security/SecurityService';
import { Database } from '../database.types';
import { ApiCredentials } from '../types';
import { STORAGE_CONFIG } from '../config/supabase';

interface StoredCredentials {
    [STORAGE_CONFIG.COLUMNS.ID]: number;
    [STORAGE_CONFIG.COLUMNS.API_KEY]: string;
    [STORAGE_CONFIG.COLUMNS.API_SECRET]: string;
    [STORAGE_CONFIG.COLUMNS.UPDATED_AT]: string;
}

export class CredentialService {
    private static instance: CredentialService | null = null;
    private securityService: SecurityService;
    private supabase: ReturnType<typeof createClient<Database>>;

    private constructor() {
        this.securityService = SecurityService.getInstance();
        const supabaseUrl = process.env.SUPABASE_URL as string;
        const supabaseKey = process.env.SUPABASE_KEY as string;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration is missing');
        }
        
        this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    }

    public static getInstance(): CredentialService {
        if (!CredentialService.instance) {
            CredentialService.instance = new CredentialService();
        }
        return CredentialService.instance;
    }

    public async storeCredentials(apiKey: string, apiSecret: string): Promise<void> {
        try {
            const encryptedKey = await this.securityService.encryptData(apiKey);
            const encryptedSecret = await this.securityService.encryptData(apiSecret);
            
            const { error } = await this.supabase
                .from(STORAGE_CONFIG.CREDENTIALS_TABLE)
                .upsert({
                    [STORAGE_CONFIG.COLUMNS.ID]: 1, // Single row for credentials
                    [STORAGE_CONFIG.COLUMNS.API_KEY]: encryptedKey,
                    [STORAGE_CONFIG.COLUMNS.API_SECRET]: encryptedSecret,
                    [STORAGE_CONFIG.COLUMNS.UPDATED_AT]: new Date().toISOString()
                });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Failed to store credentials:', error);
            throw new Error('Failed to store API credentials');
        }
    }

    public async getCredentials(): Promise<ApiCredentials> {
        try {
            const { data, error } = await this.supabase
                .from(STORAGE_CONFIG.CREDENTIALS_TABLE)
                .select(`
                    ${STORAGE_CONFIG.COLUMNS.API_KEY},
                    ${STORAGE_CONFIG.COLUMNS.API_SECRET}
                `)
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error('No credentials found');
            }

            const apiKey = await this.securityService.decryptData(data[STORAGE_CONFIG.COLUMNS.API_KEY]);
            const apiSecret = await this.securityService.decryptData(data[STORAGE_CONFIG.COLUMNS.API_SECRET]);

            return { apiKey, apiSecret };
        } catch (error) {
            console.error('Failed to retrieve credentials:', error);
            throw new Error('Failed to retrieve API credentials');
        }
    }

    public async deleteCredentials(): Promise<void> {
        try {
            const { error } = await this.supabase
                .from(STORAGE_CONFIG.CREDENTIALS_TABLE)
                .delete()
                .eq(STORAGE_CONFIG.COLUMNS.ID, 1);

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Failed to delete credentials:', error);
            throw new Error('Failed to delete API credentials');
        }
    }
}
