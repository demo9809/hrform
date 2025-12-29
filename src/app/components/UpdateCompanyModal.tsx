import { useState, useEffect } from 'react';
import { X, Save, Building, FileText, History } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

// Define Department & Designation Structure
const DEPARTMENTS: Record<string, string[]> = {
    // ... (same as before, kept for brevity in this output, but needs to be in file)
    "Strategy & Client Handling": ["CRM Manager", "Copywriter", "Senior Copywriter"],
    "Creative & Design": ["Graphic Designer", "Senior Graphic Designer", "Web Designer"],
    "Production & Editing": ["Motion Graphic Artist", "Senior Motion Graphic Artist", "Reel Creator", "Video Editor", "Cinematographer"],
    "Digital Marketing": ["Digital Marketing Executive", "Digital Marketing Manager", "Performance Marketer"],
    "Operations & Finance": ["Accountant", "HR"]
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
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
    const [salaryLogs, setSalaryLogs] = useState<any[]>([]);
    const [editLogs, setEditLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const [formData, setFormData] = useState({
        department: '',
        designation: '',
        dateOfJoining: '',
        officeLocation: '',
        probationEndDate: '',
        resignationDate: '',
        jobType: 'Permanent',
        currentSalary: '',
        stipendAmount: '',
        stipendEndDate: '',
        isNewJoinee: false,
        firstIncrementDuration: '12 months',
        nextIncrementDate: '',
        lastIncrementDate: '',
    });

    // Reset/Sync State when employee changes or modal opens
    useEffect(() => {
        if (isOpen && employee) {
            setFormData({
                department: employee.company?.department || '',
                designation: employee.company?.designation || '',
                dateOfJoining: employee.company?.dateOfJoining || '',
                officeLocation: employee.company?.officeLocation || '',
                probationEndDate: employee.company?.probationEndDate || '',
                resignationDate: employee.company?.resignationDate || '',
                jobType: employee.company?.jobType || 'Permanent',
                currentSalary: employee.company?.currentSalary || '',
                stipendAmount: employee.company?.stipendAmount || '',
                stipendEndDate: employee.company?.stipendEndDate || '',
                isNewJoinee: employee.company?.isNewJoinee || false,
                firstIncrementDuration: employee.company?.firstIncrementDuration || '12 months',
                nextIncrementDate: employee.company?.nextIncrementDate || '',
                lastIncrementDate: employee.company?.lastIncrementDate || '',
            });
            setActiveTab('details'); // Reset tab to details
        }
    }, [isOpen, employee]);

    // Fetch Logs when History tab is active
    useEffect(() => {
        if (isOpen && activeTab === 'history') {
            fetchLogs();
        }
    }, [isOpen, activeTab]);

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../../utils/supabase/client');
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Fetch Salary Logs (Increment History)
            const { data: salaryHistory } = await supabase
                .from('increment_history')
                .select('*')
                .eq('employee_id', employee.id)
                .order('increment_date', { ascending: false });

            setSalaryLogs(salaryHistory || []);

            // Fetch Audit Logs (Edit Log)
            const { data: auditHistory } = await supabase
                .from('job_audit_logs')
                .select('*')
                .eq('employee_id', employee.id)
                .order('created_at', { ascending: false });

            setEditLogs(auditHistory || []);

        } catch (error) {
            console.error('Error fetching logs:', error);
            toast.error('Failed to load history');
        } finally {
            setLogsLoading(false);
        }
    };

    const handleChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Auto-calculate Next Increment Date logic
        if (field === 'dateOfJoining' || field === 'isNewJoinee' || field === 'firstIncrementDuration' || field === 'lastIncrementDate') {
            const doj = (field === 'dateOfJoining' ? value : formData.dateOfJoining) as string;
            const isNew = field === 'isNewJoinee' ? (value === true) : (formData.isNewJoinee === true);
            const duration = (field === 'firstIncrementDuration' ? value : formData.firstIncrementDuration) as string;
            const lastInc = (field === 'lastIncrementDate' ? value : formData.lastIncrementDate) as string;

            calculateNextIncrementDate(doj, isNew, duration, lastInc);
        }
    };

    const calculateNextIncrementDate = (doj: string, isNew: boolean, duration: string, lastInc: string) => {
        let date = null;

        if (isNew) {
            if (doj) {
                date = new Date(doj);
                const months = duration === '6 months' ? 6 : 12;
                date.setMonth(date.getMonth() + months);
            }
        } else {
            // For existing employees, if Last Increment Date is present, adding 1 year
            if (lastInc) {
                date = new Date(lastInc);
                date.setFullYear(date.getFullYear() + 1);
            }
        }

        setFormData(prev => ({
            ...prev,
            nextIncrementDate: date ? date.toISOString().split('T')[0] : ''
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
            // Get user email for "Changed By"
            const userEmail = session.data.session?.user?.email || 'Admin';

            if (!accessToken) {
                toast.error('Session expired. Please login again.');
                return;
            }

            // Calculate Changes
            const changes: string[] = [];
            // Helper to compare
            const compare = (label: string, oldVal: any, newVal: any) => {
                // strict check might fail on null vs undefined vs empty string, so loose check
                const v1 = oldVal || '';
                const v2 = newVal || '';
                if (v1 != v2) {
                    changes.push(`${label}: ${v1 || 'Empty'} -> ${v2 || 'Empty'}`);
                }
            };

            compare('Department', employee.company?.department, formData.department);
            compare('Designation', employee.company?.designation, formData.designation);
            compare('Date of Joining', employee.company?.dateOfJoining, formData.dateOfJoining);
            compare('Office Location', employee.company?.officeLocation, formData.officeLocation);
            compare('Probation End Date', employee.company?.probation_end_date, formData.probationEndDate);
            compare('Resignation Date', employee.resignation_date, formData.resignationDate);
            compare('Job Type', employee.job_type || 'Permanent', formData.jobType);

            if (formData.jobType === 'Intern') {
                compare('Stipend', employee.stipend_amount, formData.stipendAmount);
            } else {
                compare('Salary', employee.current_salary, formData.currentSalary);
            }

            // Direct update to employees table columns
            const { error } = await supabase
                .from('employees')
                .update({
                    department: formData.department,
                    designation: formData.designation,
                    date_of_joining: formData.dateOfJoining || null,
                    office_location: formData.officeLocation,
                    probation_end_date: formData.probationEndDate || null,
                    // Extended updates
                    resignation_date: formData.resignationDate || null,
                    job_type: formData.jobType,
                    // Salary/Stipend logic
                    current_salary: formData.jobType !== 'Intern' ? (formData.currentSalary || null) : null,
                    stipend_amount: formData.jobType === 'Intern' && formData.stipendAmount ? parseFloat(formData.stipendAmount) : null,
                    stipend_end_date: formData.jobType === 'Intern' ? formData.stipendEndDate : null,

                    is_new_joinee: formData.isNewJoinee,
                    first_increment_duration: formData.isNewJoinee ? formData.firstIncrementDuration : null,
                    next_increment_date: formData.nextIncrementDate || null,
                    last_increment_date: (!formData.isNewJoinee && formData.lastIncrementDate) ? formData.lastIncrementDate : null
                })
                .eq('id', employee.id);

            if (error) throw error;

            // Insert Audit Log if there are changes
            if (changes.length > 0) {
                const summary = changes.join(', ');
                const { error: logError } = await supabase
                    .from('job_audit_logs')
                    .insert({
                        employee_id: employee.id,
                        changed_by: userEmail,
                        change_summary: summary
                    });

                if (logError) console.error('Failed to create audit log', logError);
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

    // Designation Logic: Add "Intern" to every department list
    const getDesignations = (dept: string) => {
        const base = DEPARTMENTS[dept] || [];
        return [...base, "Intern"];
    };

    const availableDesignations = formData.department ? getDesignations(formData.department) : [];

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

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'details'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Job Details
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'history'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        History & Logs
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-white">
                    {activeTab === 'details' ? (
                        <form id="company-edit-form" onSubmit={handleSubmit} className="space-y-6">

                            {/* Step 1: Employee Status (New vs Existing) */}
                            <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-teal-900">Employment Status</h3>
                                    <p className="text-xs text-teal-700 mt-1">Is this a new employee joining the company?</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="newJoinee"
                                        checked={!!formData.isNewJoinee}
                                        onChange={(e) => handleChange('isNewJoinee', e.target.checked)}
                                        className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                    />
                                    <label htmlFor="newJoinee" className="text-sm font-medium text-gray-700">Yes, New Joinee</label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <SelectField
                                    label="Job Type"
                                    value={formData.jobType}
                                    onChange={(v) => handleChange('jobType', v)}
                                    options={['Permanent', 'Temporary', 'Intern', 'Trainee']}
                                />
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
                            </div>

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

                            {/* Conditional Section: Probation (Only for New Joinees AND Non-Interns) */}
                            {formData.isNewJoinee && formData.jobType !== 'Intern' && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-800">Probation Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <SelectField
                                            label="Duration"
                                            value={""}
                                            onChange={(v) => {
                                                if (!formData.dateOfJoining) {
                                                    toast.error('Select Date of Joining first');
                                                    return;
                                                }
                                                const months = parseInt(v);
                                                if (!isNaN(months)) {
                                                    const date = new Date(formData.dateOfJoining);
                                                    date.setMonth(date.getMonth() + months);
                                                    handleChange('probationEndDate', date.toISOString().split('T')[0]);
                                                }
                                            }}
                                            options={["1 Month", "2 Months", "3 Months", "6 Months"]}
                                            placeholder="Auto-calc"
                                        />
                                        <InputField
                                            label="Probation End Date"
                                            type="date"
                                            value={formData.probationEndDate}
                                            onChange={(v) => handleChange('probationEndDate', v)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Salary & Increment Section */}
                            <div className="border-t border-gray-100 pt-4 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-teal-500 rounded-full"></span>
                                    Compensation & Increment
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    {formData.jobType === 'Intern' ? (
                                        <div className="col-span-2 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField
                                                    label="Stipend Amount (Monthly)"
                                                    type="number"
                                                    value={formData.stipendAmount}
                                                    onChange={(v) => handleChange('stipendAmount', v)}
                                                />
                                                <SelectField
                                                    label="Internship Duration"
                                                    value={""}
                                                    onChange={(v) => {
                                                        if (!formData.dateOfJoining) {
                                                            toast.error('Select Date of Joining first');
                                                            return;
                                                        }
                                                        const months = parseInt(v);
                                                        if (!isNaN(months)) {
                                                            const date = new Date(formData.dateOfJoining);
                                                            date.setMonth(date.getMonth() + months);
                                                            handleChange('stipendEndDate', date.toISOString().split('T')[0]);
                                                        }
                                                    }}
                                                    options={["1 Month", "2 Months", "3 Months", "6 Months", "12 Months"]}
                                                    placeholder="Select Duration"
                                                />
                                            </div>
                                            <InputField
                                                label="Internship End Date"
                                                type="date"
                                                value={formData.stipendEndDate}
                                                onChange={(v) => handleChange('stipendEndDate', v)}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="col-span-2">
                                                <InputField
                                                    label="Current Salary (Monthly)"
                                                    type="number"
                                                    value={formData.currentSalary}
                                                    onChange={(v) => handleChange('currentSalary', v)}
                                                />
                                            </div>

                                            {formData.isNewJoinee ? (
                                                <>
                                                    <SelectField
                                                        label="First Increment After"
                                                        value={formData.firstIncrementDuration}
                                                        onChange={(v) => handleChange('firstIncrementDuration', v)}
                                                        options={['6 months', '12 months']}
                                                    />
                                                    <InputField
                                                        label="Next Increment Date (Auto)"
                                                        type="date"
                                                        value={formData.nextIncrementDate}
                                                        onChange={() => { }}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <InputField
                                                        label="Last Increment Date"
                                                        type="date"
                                                        value={formData.lastIncrementDate}
                                                        onChange={(v) => handleChange('lastIncrementDate', v)}
                                                    />
                                                    <InputField
                                                        label="Next Increment Date (Auto)"
                                                        type="date"
                                                        value={formData.nextIncrementDate}
                                                        onChange={() => { }}
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2">
                                <InputField
                                    label="Resignation Date (Optional)"
                                    type="date"
                                    value={formData.resignationDate}
                                    onChange={(v) => handleChange('resignationDate', v)}
                                />
                            </div>

                        </form>
                    ) : (
                        <div className="space-y-6">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                </div>
                            ) : (
                                <>
                                    {/* Salary Log Section */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Building className="w-4 h-4 text-teal-600" />
                                            Salary History
                                        </h3>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                            {salaryLogs.length > 0 ? (
                                                <table className="min-w-full text-xs text-left">
                                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                                        <tr>
                                                            <th className="px-4 py-2">Date</th>
                                                            <th className="px-4 py-2">Salary</th>
                                                            <th className="px-4 py-2">Changed By</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {salaryLogs.map((log: any) => (
                                                            <tr key={log.id}>
                                                                <td className="px-4 py-2">{new Date(log.increment_date).toLocaleDateString()}</td>
                                                                <td className="px-4 py-2 font-medium text-green-600">₹{log.new_salary}</td>
                                                                <td className="px-4 py-2 text-gray-500">{log.changed_by || 'System'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="p-4 text-xs text-gray-500 text-center italic bg-gray-50">No salary history available</p>
                                            )}
                                        </div>
                                    </section>

                                    {/* Edit Log Section */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-teal-600" />
                                            Edit Log
                                        </h3>
                                        <div className="space-y-3">
                                            {editLogs.length > 0 ? (
                                                editLogs.map((log: any) => (
                                                    <div key={log.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-medium text-gray-900 text-xs">{log.changed_by}</span>
                                                            <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-gray-600 text-xs leading-relaxed">{log.change_summary}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-xs text-gray-500 text-center italic border border-gray-200 rounded-lg bg-gray-50">
                                                    No edit history found
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        {activeTab === 'details' ? 'Cancel' : 'Close'}
                    </button>
                    {activeTab === 'details' && (
                        <button
                            type="submit"
                            form="company-edit-form"
                            disabled={loading}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
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
