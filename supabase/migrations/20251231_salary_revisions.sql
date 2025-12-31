-- Create salary_revisions table
CREATE TABLE IF NOT EXISTS salary_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    effective_date DATE NOT NULL,
    reason TEXT NOT NULL, -- 'Annual Hike', 'Promotion', 'Correction', 'Probation Confirmation', 'Other'
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) -- Optional: track who created it
);

-- Enable RLS
ALTER TABLE salary_revisions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON salary_revisions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" ON salary_revisions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON salary_revisions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON salary_revisions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Function to update employees.current_salary
CREATE OR REPLACE FUNCTION update_employee_current_salary()
RETURNS TRIGGER AS $$
DECLARE
    latest_salary NUMERIC;
BEGIN
    -- Find the salary with the most recent effective_date (that is <= CURRENT_DATE, or just latest?)
    -- Interpreting "Current Salary" as the active salary. 
    -- If we have future dates, they shouldn't be "Current" yet ideally, but usually HR wants to see the latest decided figure.
    -- However, technically "Current" means today. 
    -- Let's stick to: The record with the MAX effective_date provided it is <= CURRENT_DATE.
    -- If NO record <= CURRENT_DATE exists (e.g. only future), we might fall back to the absolute earliest future one? 
    -- Or just absolute latest effective_date to be simple and predictable?
    -- "Dynamic 'Current Salary': ...fetching the record with the most recent 'Effective Date'." -> This implies absolute latest.
    
    SELECT amount INTO latest_salary
    FROM salary_revisions
    WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id)
    ORDER BY effective_date DESC, created_at DESC
    LIMIT 1;

    -- If revisions exist, update employee. 
    -- If no revisions (deleted all?), we might want to leave it or set to 0. 
    -- Assuming manual entry in employees table is fallback? 
    -- Let's update only if we found a revision.
    IF latest_salary IS NOT NULL THEN
        UPDATE employees
        SET current_salary = latest_salary,
            -- Also helpful to sync these:
            salary_effective_date = (
                SELECT effective_date 
                FROM salary_revisions 
                WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id) 
                ORDER BY effective_date DESC, created_at DESC 
                LIMIT 1
            )
        WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_current_salary_trigger
AFTER INSERT OR UPDATE OR DELETE ON salary_revisions
FOR EACH ROW
EXECUTE FUNCTION update_employee_current_salary();
