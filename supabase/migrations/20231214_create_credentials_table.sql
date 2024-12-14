-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE credential_status AS ENUM ('active', 'revoked', 'expired');

-- Create credentials table
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    encrypted_data TEXT,
    status credential_status DEFAULT 'active',
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_credentials_status ON credentials(status);
CREATE INDEX idx_credentials_last_used ON credentials(last_used);

-- Add Row Level Security (RLS)
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own credentials"
    ON credentials FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials"
    ON credentials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
    ON credentials FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
    ON credentials FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_credentials_updated_at
    BEFORE UPDATE ON credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update last_used timestamp
CREATE OR REPLACE FUNCTION update_last_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE credentials
    SET last_used = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for last_used
CREATE TRIGGER update_credentials_last_used
    AFTER SELECT ON credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_last_used();

-- Create view for active credentials
CREATE OR REPLACE VIEW active_credentials AS
    SELECT *
    FROM credentials
    WHERE status = 'active';

-- Create function to revoke credentials
CREATE OR REPLACE FUNCTION revoke_credentials(credential_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE credentials
    SET status = 'revoked'
    WHERE id = credential_id
    AND auth.uid() = user_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create function to expire old credentials
CREATE OR REPLACE FUNCTION expire_old_credentials()
RETURNS VOID AS $$
BEGIN
    UPDATE credentials
    SET status = 'expired'
    WHERE last_used < NOW() - INTERVAL '90 days'
    AND status = 'active';
END;
$$ language 'plpgsql';

-- Create scheduled task to expire old credentials (runs daily)
SELECT cron.schedule(
    'expire-old-credentials',
    '0 0 * * *',
    $$SELECT expire_old_credentials()$$
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON credentials TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_credentials TO authenticated;

-- Create audit log table
CREATE TABLE IF NOT EXISTS credential_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credential_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_status credential_status,
    new_status credential_status,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_credential FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create audit log trigger
CREATE OR REPLACE FUNCTION log_credential_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO credential_audit_log (
        credential_id,
        user_id,
        action,
        old_status,
        new_status,
        ip_address,
        user_agent
    )
    VALUES (
        NEW.id,
        auth.uid(),
        TG_OP,
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        NEW.status,
        inet_client_addr(),
        current_setting('request.headers')::json->>'user-agent'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger for audit logging
CREATE TRIGGER log_credential_changes
    AFTER INSERT OR UPDATE OR DELETE ON credentials
    FOR EACH ROW
    EXECUTE FUNCTION log_credential_changes();

-- Enable RLS for audit log
ALTER TABLE credential_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for audit log
CREATE POLICY "Users can view their own audit logs"
    ON credential_audit_log FOR SELECT
    USING (auth.uid() = user_id);

-- Grant permissions for audit log
GRANT SELECT ON credential_audit_log TO authenticated;
