import { useState } from 'react';
import { X, Save, Building } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
// import { SUPABASE_URL } from '../../utils/supabase/client'; // Removing to avoid shadowing/confusion

// Define Department & Designation Structure
const DEPARTMENTS: Record<string, string[]> = {
    "Strategy & Client Handling": [
        "CRM Manager",
        "Copywriter",
        "Senior Copywriter"
    ],
    "Creative & Design": [
        "Graphic Designer",
        "Senior Graphic Designer",
        "Web Designer"
    ],
    "Production & Editing": [
        "Motion Graphic Artist",
        "Senior Motion Graphic Artist",
        "Reel Creator",
        "Video Editor",
        "Cinematographer"
    ],
    "Digital Marketing": [
        "Digital Marketing Executive",
        "Digital Marketing Manager",
        "Performance Marketer"
    ],
    "Operations & Finance": [
        "Accountant",
        "HR"
    ]
};

interface UpdateCompanyModalProps {
    employee: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function UpdateCompanyModal({ employee, isOpen, onClose, onUpdate }: UpdateCompanyModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Initialize state (handle existing values that might not be in the list gracefully)
    // If existing department is not in our list, we keep it but it might not show selected if we enforce list
    const [formData, setFormData] = useState({
        department: employee.company?.department || '',
        designation: employee.company?.designation || '',
        dateOfJoining: employee.company?.dateOfJoining || '',
        officeLocation: employee.company?.officeLocation || '',
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDepartmentChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            department: value,
            designation: '' // Reset designation when department changes
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { createClient } = await import('@supabase/supabase-js');
            const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../../utils/supabase/client');
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            const session = await supabase.auth.getSession();
            const accessToken = session.data.session?.access_token;

            if (!accessToken) {
                toast.error('Session expired. Please login again.');
                return;
            }

            console.log('Updating Company for Employee ID:', employee.id);

            // Direct update to employees table columns
            const { error } = await supabase
                .from('employees')
                .update({
                    department: formData.department,
                    designation: formData.designation,
                    date_of_joining: formData.dateOfJoining || null,
                    office_location: formData.officeLocation
                })
                .eq('id', employee.id);

            if (error) {
                throw error;
            }

            toast.success('Company details updated successfully');
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('Update error:', error);
            toast.error(`Update failed: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const availableDesignations = formData.department ? (DEPARTMENTS[formData.department] || []) : [];

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <Building className="w-5 h-5 text-teal-600" />
                        Update Job Details
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="company-edit-form" onSubmit={handleSubmit} className="space-y-4">
                        <SelectField
                            label="Department"
                            value={formData.department}
                            onChange={handleDepartmentChange}
                            options={Object.keys(DEPARTMENTS)}
                            placeholder="Select Department"
                        />

                        <SelectField
                            label="Designation"
                            value={formData.designation}
                            onChange={(v) => handleChange('designation', v)}
                            options={availableDesignations}
                            placeholder="Select Designation"
                            disabled={!formData.department}
                        />

                        <InputField
                            label="Date of Joining"
                            type="date"
                            value={formData.dateOfJoining}
                            onChange={(v) => handleChange('dateOfJoining', v)}
                        />
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Work Mode</label>
                            <div className="flex gap-3">
                                {["Work from Home", "Work at Office"].map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => handleChange('officeLocation', mode)}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all border ${formData.officeLocation === mode
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="company-edit-form"
                        disabled={loading}
                        className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface InputFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}

const InputField = ({ label, value, onChange, type = "text" }: InputFieldProps) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
        />
    </div>
);

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
}

const SelectField = ({ label, value, onChange, options, placeholder = "Select", disabled = false }: SelectFieldProps) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white disabled:bg-gray-100 disabled:text-gray-400"
        >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
);
