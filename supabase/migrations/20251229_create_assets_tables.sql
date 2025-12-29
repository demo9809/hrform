-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    purchase_date DATE,
    purchase_cost NUMERIC,
    warranty_expiry_date DATE,
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Assigned', 'Returned', 'Damaged', 'Lost', 'Retired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create asset_assignments table
CREATE TABLE IF NOT EXISTS asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    assigned_by UUID, -- Assuming this references auth.users or an admin table, strictly optional for now
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    condition_on_assignment TEXT,
    condition_on_return TEXT,
    remarks TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset_id ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_employee_id ON asset_assignments(employee_id);

-- Enable RLS (Row Level Security) - Optional but recommended. 
-- For now, assuming standard service role or authenticated access.
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users (admins) to do everything
CREATE POLICY "Enable all for authenticated users" ON assets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON asset_assignments FOR ALL USING (auth.role() = 'authenticated');
