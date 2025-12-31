-- Enable RLS and add policies for employee detail tables

-- 1. Bank Details
ALTER TABLE employee_bank_details ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_bank_details' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON employee_bank_details
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 2. Identities
ALTER TABLE employee_identities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_identities' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON employee_identities
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 3. Addresses
ALTER TABLE employee_addresses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_addresses' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON employee_addresses
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 4. Emergency Contacts
ALTER TABLE employee_emergency_contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_emergency_contacts' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON employee_emergency_contacts
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
