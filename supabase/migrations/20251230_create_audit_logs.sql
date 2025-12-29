CREATE TABLE IF NOT EXISTS job_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    changed_by TEXT, -- Stores email or name of the admin/user who made the change
    change_summary TEXT NOT NULL, -- Human readable summary of what changed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE job_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view logs
CREATE POLICY "Allow authenticated to view logs" ON job_audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert logs
CREATE POLICY "Allow authenticated to insert logs" ON job_audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
