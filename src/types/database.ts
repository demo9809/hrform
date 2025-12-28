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
