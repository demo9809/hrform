-- Add new columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS resignation_date DATE,
ADD COLUMN IF NOT EXISTS job_type TEXT CHECK (job_type IN ('Permanent', 'Temporary', 'Intern', 'Trainee')),
ADD COLUMN IF NOT EXISTS current_salary NUMERIC,
ADD COLUMN IF NOT EXISTS salary_effective_date DATE,
ADD COLUMN IF NOT EXISTS last_increment_date DATE,
ADD COLUMN IF NOT EXISTS increment_cycle TEXT DEFAULT 'Yearly' CHECK (increment_cycle IN ('Yearly', 'Custom')),
ADD COLUMN IF NOT EXISTS stipend_amount NUMERIC,
ADD COLUMN IF NOT EXISTS stipend_start_date DATE,
ADD COLUMN IF NOT EXISTS stipend_end_date DATE,
ADD COLUMN IF NOT EXISTS is_new_joinee BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_increment_duration TEXT CHECK (first_increment_duration IN ('6 months', '12 months')),
ADD COLUMN IF NOT EXISTS next_increment_date DATE;

-- Create increment_history table
CREATE TABLE IF NOT EXISTS increment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    old_salary NUMERIC,
    new_salary NUMERIC,
    increment_date DATE,
    changed_by TEXT, -- potentially redundant if we track via logs, but good for explicit display
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for increment_history
ALTER TABLE increment_history ENABLE ROW LEVEL SECURITY;

-- Add policies for increment_history (assuming authenticated admins can view all)
CREATE POLICY "Enable read access for authenticated users" ON increment_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON increment_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
