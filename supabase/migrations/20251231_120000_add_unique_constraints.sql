-- Add unique constraints to allow UPSERT operations

-- 1. Employee Identities (One record per employee)
-- Check if constraint exists before adding to avoid errors on re-runs (though standard SQL doesn't support IF NOT EXISTS for constraints easily without PL/pgSQL, strictly adding is fine for migrations)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_identities_employee_id_key') THEN
        ALTER TABLE employee_identities
        ADD CONSTRAINT employee_identities_employee_id_key UNIQUE (employee_id);
    END IF;
END $$;

-- 2. Employee Bank Details (One record per employee)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_bank_details_employee_id_key') THEN
        ALTER TABLE employee_bank_details
        ADD CONSTRAINT employee_bank_details_employee_id_key UNIQUE (employee_id);
    END IF;
END $$;

-- 3. Employee Emergency Contacts (One record per employee currently supported by UI)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_emergency_contacts_employee_id_key') THEN
        ALTER TABLE employee_emergency_contacts
        ADD CONSTRAINT employee_emergency_contacts_employee_id_key UNIQUE (employee_id);
    END IF;
END $$;

-- 4. Employee Addresses (Unique per employee + type)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_addresses_employee_id_type_key') THEN
        ALTER TABLE employee_addresses
        ADD CONSTRAINT employee_addresses_employee_id_type_key UNIQUE (employee_id, type);
    END IF;
END $$;
