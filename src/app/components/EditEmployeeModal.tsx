import { useState, useRef } from 'react';
import { X, Save, Building, User, MapPin, FileText, CreditCard, Phone, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useEnterNavigation } from '../../hooks/useEnterNavigation';
// import { SUPABASE_URL } from '../../utils/supabase/client'; // Removing to avoid shadowing/confusion

interface EditEmployeeModalProps {
    employee: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function EditEmployeeModal({ employee, isOpen, onClose, onUpdate }: EditEmployeeModalProps) {
    const { user } = useAuth();
    const modalRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(modalRef);

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(employee.signedUrls?.photograph || null);

    // Initialize state with employee data
    const [formData, setFormData] = useState({
        personalIdentity: {
            fullName: employee.personalIdentity?.fullName || '',
            dateOfBirth: employee.personalIdentity?.dateOfBirth || '',
            gender: employee.personalIdentity?.gender || '',
            bloodGroup: employee.personalIdentity?.bloodGroup || '',
            mobileNumber: employee.personalIdentity?.mobileNumber || '',
            personalEmail: employee.personalIdentity?.personalEmail || '',
        },

        address: {
            currentAddress: employee.address?.currentAddress || '',
            city: employee.address?.city || '',
            state: employee.address?.state || '',
            pincode: employee.address?.pincode || '',
            permanentAddress: employee.address?.permanentAddress || '',
        },
        governmentTax: {
            aadhaarNumber: employee.governmentTax?.aadhaarNumber || '',
            panNumber: employee.governmentTax?.panNumber || '',
            passportNumber: employee.governmentTax?.passportNumber || '',
        },
        bankDetails: {
            accountHolderName: employee.bankDetails?.accountHolderName || '',
            bankName: employee.bankDetails?.bankName || '',
            accountNumber: employee.bankDetails?.accountNumber || '',
            ifscCode: employee.bankDetails?.ifscCode || '',
        },
        emergencyContact: {
            name: employee.emergencyContact?.name || '',
            relationship: employee.emergencyContact?.relationship || '',
            phone: employee.emergencyContact?.phone || '',
        }
    });

    const handleChange = (section: string, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section as keyof typeof prev],
                [field]: value
            }
        }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                toast.error('Only JPG or PNG files are allowed');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Photo size must be less than 5MB');
                return;
            }

            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
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

            // 0. Upload Photo if changed
            let photoPath = null;
            if (photoFile) {
                const bucketName = 'make-0e23869b-employee-docs';
                const ext = photoFile.name.split('.').pop();
                const path = `${employee.employeeId}/photograph-${Date.now()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(path, photoFile, {
                        contentType: photoFile.type,
                        upsert: false
                    });

                if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
                photoPath = path;
            }

            // 1. Update Personal Identity (Employees Table)
            const employeeUpdates: any = {
                full_name: formData.personalIdentity.fullName,
                date_of_birth: formData.personalIdentity.dateOfBirth,
                gender: formData.personalIdentity.gender,
                blood_group: formData.personalIdentity.bloodGroup,
                mobile_number: formData.personalIdentity.mobileNumber,
                personal_email: formData.personalIdentity.personalEmail,
            };

            if (photoPath) {
                employeeUpdates.photograph_path = photoPath;
            }

            const { error: empError } = await supabase
                .from('employees')
                .update(employeeUpdates)
                .eq('id', employee.id);

            if (empError) throw empError;

            // 2. Update Government & Tax (Identities Table)
            const { error: identityError } = await supabase
                .from('employee_identities')
                .upsert({
                    employee_id: employee.id,
                    aadhaar_number: formData.governmentTax.aadhaarNumber,
                    pan_number: formData.governmentTax.panNumber,
                    passport_number: formData.governmentTax.passportNumber,
                }, { onConflict: 'employee_id' });

            if (identityError) throw identityError;

            // 3. Update Addresses
            // Current Address
            const { error: currAddrError } = await supabase
                .from('employee_addresses')
                .upsert({
                    employee_id: employee.id,
                    type: 'current',
                    address_line: formData.address.currentAddress,
                    city: formData.address.city,
                    state: formData.address.state,
                    pincode: formData.address.pincode
                }, { onConflict: 'employee_id, type' });

            if (currAddrError) throw currAddrError;

            // Permanent Address
            const { error: permAddrError } = await supabase
                .from('employee_addresses')
                .upsert({
                    employee_id: employee.id,
                    type: 'permanent',
                    address_line: formData.address.permanentAddress
                }, { onConflict: 'employee_id, type' });

            if (permAddrError) throw permAddrError;

            // 4. Update Bank Details
            const { error: bankError } = await supabase
                .from('employee_bank_details')
                .upsert({
                    employee_id: employee.id,
                    account_holder_name: formData.bankDetails.accountHolderName,
                    bank_name: formData.bankDetails.bankName,
                    account_number: formData.bankDetails.accountNumber,
                    ifsc_code: formData.bankDetails.ifscCode,
                }, { onConflict: 'employee_id' });

            if (bankError) throw bankError;

            // 5. Update Emergency Contact
            const { error: emergencyError } = await supabase
                .from('employee_emergency_contacts')
                .upsert({
                    employee_id: employee.id,
                    name: formData.emergencyContact.name,
                    relationship: formData.emergencyContact.relationship,
                    phone: formData.emergencyContact.phone,
                }, { onConflict: 'employee_id' });

            if (emergencyError) throw emergencyError;

            toast.success('Employee updated successfully');
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

    const tabs = [
        { id: 'personal', label: 'Personal', icon: User },
        { id: 'address', label: 'Address', icon: MapPin },
        { id: 'governmentTax', label: 'Legal & ID', icon: FileText },
        { id: 'bankDetails', label: 'Bank', icon: CreditCard },
        { id: 'emergency', label: 'Emergency', icon: Phone },
    ];

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Employee Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors min-w-[100px] ${activeTab === tab.id
                                ? 'border-teal-600 text-teal-600 bg-teal-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="edit-form" onSubmit={handleSubmit} className="space-y-4">

                        {/* Personal Details Tab */}
                        {activeTab === 'personal' && (
                            <div className="space-y-6">
                                {/* Photo Upload Section */}
                                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-200">
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <User className="w-12 h-12" />
                                                </div>
                                            )}
                                        </div>
                                        <label
                                            htmlFor="photo-upload"
                                            className="absolute bottom-0 right-0 p-1.5 bg-teal-600 text-white rounded-full cursor-pointer hover:bg-teal-700 transition-colors shadow-sm"
                                        >
                                            <Upload className="w-4 h-4" />
                                            <input
                                                id="photo-upload"
                                                type="file"
                                                accept="image/jpeg,image/png"
                                                className="hidden"
                                                onChange={handlePhotoChange}
                                            />
                                        </label>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-gray-900">Profile Photo</h3>
                                        <p className="text-xs text-gray-500 mt-1">Upload a clear photo. JPG or PNG, max 5MB.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Full Name"
                                        value={formData.personalIdentity.fullName}
                                        onChange={(v) => handleChange('personalIdentity', 'fullName', v)}
                                    />
                                    <InputField
                                        label="Date of Birth"
                                        type="date"
                                        value={formData.personalIdentity.dateOfBirth}
                                        onChange={(v) => handleChange('personalIdentity', 'dateOfBirth', v)}
                                    />
                                    <SelectField
                                        label="Gender"
                                        value={formData.personalIdentity.gender}
                                        onChange={(v) => handleChange('personalIdentity', 'gender', v)}
                                        options={['Male', 'Female', 'Other']}
                                    />
                                    <SelectField
                                        label="Blood Group"
                                        value={formData.personalIdentity.bloodGroup}
                                        onChange={(v) => handleChange('personalIdentity', 'bloodGroup', v)}
                                        options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
                                    />
                                    <InputField
                                        label="Mobile Number"
                                        value={formData.personalIdentity.mobileNumber}
                                        onChange={(v) => handleChange('personalIdentity', 'mobileNumber', v)}
                                    />
                                    <InputField
                                        label="Email"
                                        value={formData.personalIdentity.personalEmail}
                                        onChange={(v) => handleChange('personalIdentity', 'personalEmail', v)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Address Tab */}
                        {activeTab === 'address' && (
                            <div className="space-y-4">
                                <TextAreaField
                                    label="Current Address"
                                    value={formData.address.currentAddress}
                                    onChange={(v) => handleChange('address', 'currentAddress', v)}
                                />
                                <div className="grid grid-cols-3 gap-4">
                                    <InputField
                                        label="City"
                                        value={formData.address.city}
                                        onChange={(v) => handleChange('address', 'city', v)}
                                    />
                                    <InputField
                                        label="State"
                                        value={formData.address.state}
                                        onChange={(v) => handleChange('address', 'state', v)}
                                    />
                                    <InputField
                                        label="Pincode"
                                        value={formData.address.pincode}
                                        onChange={(v) => handleChange('address', 'pincode', v)}
                                    />
                                </div>
                                <TextAreaField
                                    label="Permanent Address"
                                    value={formData.address.permanentAddress}
                                    onChange={(v) => handleChange('address', 'permanentAddress', v)}
                                />
                            </div>
                        )}

                        {/* Tax Details Tab */}
                        {activeTab === 'governmentTax' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Aadhaar Number"
                                    value={formData.governmentTax.aadhaarNumber}
                                    onChange={(v) => handleChange('governmentTax', 'aadhaarNumber', v)}
                                />
                                <InputField
                                    label="PAN Number"
                                    value={formData.governmentTax.panNumber}
                                    onChange={(v) => handleChange('governmentTax', 'panNumber', v)}
                                />
                                <InputField
                                    label="Passport Number"
                                    value={formData.governmentTax.passportNumber}
                                    onChange={(v) => handleChange('governmentTax', 'passportNumber', v)}
                                />
                            </div>
                        )}

                        {/* Bank Details Tab */}
                        {activeTab === 'bankDetails' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Account Holder Name"
                                    value={formData.bankDetails.accountHolderName}
                                    onChange={(v) => handleChange('bankDetails', 'accountHolderName', v)}
                                />
                                <InputField
                                    label="Bank Name"
                                    value={formData.bankDetails.bankName}
                                    onChange={(v) => handleChange('bankDetails', 'bankName', v)}
                                />
                                <InputField
                                    label="Account Number"
                                    value={formData.bankDetails.accountNumber}
                                    onChange={(v) => handleChange('bankDetails', 'accountNumber', v)}
                                />
                                <InputField
                                    label="IFSC Code"
                                    value={formData.bankDetails.ifscCode}
                                    onChange={(v) => handleChange('bankDetails', 'ifscCode', v)}
                                />
                            </div>
                        )}

                        {/* Emergency Contact Tab */}
                        {activeTab === 'emergency' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Contact Name"
                                    value={formData.emergencyContact.name}
                                    onChange={(v) => handleChange('emergencyContact', 'name', v)}
                                />
                                <InputField
                                    label="Relationship"
                                    value={formData.emergencyContact.relationship}
                                    onChange={(v) => handleChange('emergencyContact', 'relationship', v)}
                                />
                                <InputField
                                    label="Phone Number"
                                    value={formData.emergencyContact.phone}
                                    onChange={(v) => handleChange('emergencyContact', 'phone', v)}
                                />
                            </div>
                        )}

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
                        form="edit-form"
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

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

const TextAreaField = ({ label, value, onChange }: TextAreaFieldProps) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
        />
    </div>
);

interface SelectFieldProps {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
}

const SelectField = ({ label, value, onChange, options }: SelectFieldProps) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
        >
            <option value="">Select {label}</option>
            {options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
);
