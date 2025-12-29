export interface Employee {
    id: string;
    employee_id: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    date_of_birth: string;
    gender: string;
    blood_group: string;
    marital_status: string;
    nationality: string;
    personal_email: string;
    mobile_number: string;
    status: 'pending' | 'approved' | 'rejected';
    id_card_prepared: boolean;
    is_fresher: boolean;
    submitted_at: string;
    created_at: string;
    updated_at: string;
    photograph_path?: string;
    digital_signature_path?: string;
    department?: string;
    designation?: string;
    date_of_joining?: string;
    office_location?: string;
    probation_end_date?: string;
    // New Extended Fields
    resignation_date?: string;
    job_type?: 'Permanent' | 'Temporary' | 'Intern' | 'Trainee';
    current_salary?: number;
    salary_effective_date?: string;
    last_increment_date?: string;
    increment_cycle?: 'Yearly' | 'Custom';
    stipend_amount?: number;
    stipend_start_date?: string;
    stipend_end_date?: string;
    is_new_joinee?: boolean;
    first_increment_duration?: '6 months' | '12 months';
    next_increment_date?: string;
}

export interface IncrementHistory {
    id: string;
    employee_id: string;
    old_salary: number;
    new_salary: number;
    increment_date: string;
    changed_by?: string;
    created_at: string;
}

export interface EmployeeIdentity {
    id: string;
    employee_id: string;
    aadhaar_number: string;
    pan_number: string;
    passport_number?: string;
    passport_expiry?: string;
}

export interface EmployeeAddress {
    id: string;
    employee_id: string;
    type: 'current' | 'permanent';
    address_line: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
}

export interface EmployeeBankDetails {
    id: string;
    employee_id: string;
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
}

export interface EmployeeEducation {
    id: string;
    employee_id: string;
    qualification: string;
    course_specialization: string;
    institution: string;
    year_of_completion: string;
    certificate_path?: string;
}

export interface EmployeeExperience {
    id: string;
    employee_id: string;
    organization: string;
    designation: string;
    end_date: string;
    reason_for_leaving: string;
    experience_letter_path?: string;
    relieving_letter_path?: string;
}

export interface EmployeeEmergencyContact {
    id: string;
    employee_id: string;
    name: string;
    relationship: string;
    phone: string;
}

// Composite type for full employee profile views
export interface FullEmployeeProfile extends Employee {
    identities?: EmployeeIdentity[];
    addresses?: EmployeeAddress[];
    bank_details?: EmployeeBankDetails[];
    education?: EmployeeEducation[];
    experience?: EmployeeExperience[];
    emergency_contacts?: EmployeeEmergencyContact[];
    signedUrls?: {
        photograph?: string;
        educationCertificates?: string[];
        experienceLetters?: string[];
        relievingLetters?: string[];
        [key: string]: any;
    };
}

export type AssetStatus = 'Available' | 'Assigned' | 'Returned' | 'Damaged' | 'Lost' | 'Retired';

export interface Asset {
    id: string;
    asset_code: string;
    name: string;
    category: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    purchase_date?: string;
    purchase_cost?: number;
    warranty_expiry_date?: string;
    condition?: string;
    status: AssetStatus;
    created_at: string;
    updated_at: string;
    assigned_to?: string | null; // For direct UI convenience, though strictly in assignments
    // Helper to join current assignment
    current_assignment?: AssetAssignment;
}

export interface AssetAssignment {
    id: string;
    asset_id: string;
    employee_id: string;
    assigned_by?: string;
    assigned_at: string;
    returned_at?: string;
    condition_on_assignment?: string;
    condition_on_return?: string;
    remarks?: string;
    // Helper for joins
    employee?: Employee;
    asset?: Asset;
}

