import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Upload, X, FileSpreadsheet, AlertCircle, Check, Loader2, Download } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedEmployee {
    fullName: string;
    personalEmail: string;
    mobileNumber: string;
    dateOfBirth: string;
    gender: string;
    department: string;
    designation: string;
    dateOfJoining: string;
    employeeId?: string;
    jobType?: string;
    salary?: number;
    status?: string;
    // Identities
    aadhaarNumber?: string;
    panNumber?: string;
    // Validation status
    isValid: boolean;
    errors: string[];
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.match(/\.(xlsx|csv)$/)) {
                toast.error('Please upload an Excel (.xlsx) or CSV file');
                return;
            }
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                const processedData: ParsedEmployee[] = jsonData.map((row: any) => {
                    const errors: string[] = [];

                    // Basic Validation
                    if (!row['Full Name']) errors.push('Missing Full Name');
                    if (!row['Personal Email']) errors.push('Missing Email');
                    if (!row['Mobile Number']) errors.push('Missing Mobile');
                    // Add more format checks here if needed (e.g. Email regex)

                    return {
                        fullName: row['Full Name'],
                        personalEmail: row['Personal Email'],
                        mobileNumber: row['Mobile Number']?.toString(),
                        dateOfBirth: row['Date of Birth'], // Assuming YYYY-MM-DD or parseable
                        gender: row['Gender'] || 'Other',
                        department: row['Department'] || 'Unassigned',
                        designation: row['Designation'] || 'Trainee',
                        dateOfJoining: row['Date of Joining'],
                        employeeId: row['Employee ID'], // Optional
                        jobType: row['Job Type'] || 'Permanent',
                        salary: row['Salary'],
                        status: row['Status'] || 'approved', // Auto-approve imported? or pending?
                        aadhaarNumber: row['Aadhaar Number']?.toString(),
                        panNumber: row['PAN Number'],
                        isValid: errors.length === 0,
                        errors,
                    };
                });

                setParsedData(processedData);
                setIsPreviewing(true);
            } catch (error) {
                console.error('Parse error:', error);
                toast.error('Failed to parse file. Please check format.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        const validRows = parsedData.filter(r => r.isValid);
        if (validRows.length === 0) {
            toast.error('No valid rows to import');
            return;
        }

        setIsImporting(true);
        try {
            let successCount = 0;
            let failCount = 0;

            // Process in batches or sequential loop
            // Using loop for better error handling per row
            for (const row of validRows) {
                try {
                    // 1. Generate IDs
                    const dbId = crypto.randomUUID();

                    // Generate Employee ID if missing
                    let empId = row.employeeId;
                    if (!empId) {
                        const timestamp = Date.now();
                        const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
                        empId = `EMP-${randomSuffix}-${timestamp}`; // Simplified generator
                    }

                    // 2. Insert Employee
                    const { error: empError } = await supabase.from('employees').insert({
                        id: dbId,
                        employee_id: empId,
                        full_name: row.fullName,
                        personal_email: row.personalEmail,
                        mobile_number: row.mobileNumber,
                        date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth).toISOString().split('T')[0] : null,
                        gender: row.gender,
                        department: row.department,
                        designation: row.designation,
                        date_of_joining: row.dateOfJoining ? new Date(row.dateOfJoining).toISOString().split('T')[0] : null,
                        job_type: row.jobType,
                        current_salary: row.salary,
                        status: 'approved', // Direct import usually implies active
                        created_at: new Date().toISOString(),
                        submitted_at: new Date().toISOString(),
                        // Defaults
                        blood_group: 'Unknown',
                        marital_status: 'Single',
                        nationality: 'Indian',
                        is_fresher: false,
                        id_card_prepared: false
                    });

                    if (empError) throw empError;

                    // 3. Insert Identities (Optional)
                    if (row.aadhaarNumber || row.panNumber) {
                        await supabase.from('employee_identities').insert({
                            employee_id: dbId,
                            aadhaar_number: row.aadhaarNumber || '',
                            pan_number: row.panNumber || '',
                        });
                    }

                    successCount++;
                } catch (err) {
                    console.error(`Failed to import ${row.personalEmail}:`, err);
                    failCount++;
                }
            }

            toast.success(`Import complete: ${successCount} successful, ${failCount} failed`);
            onSuccess();
            onClose();

        } catch (error) {
            console.error('Import process error:', error);
            toast.error('Critical error during import');
        } finally {
            setIsImporting(false);
        }
    };

    const downloadTemplate = () => {
        const headers = [
            'Full Name',
            'Personal Email',
            'Mobile Number',
            'Date of Birth',
            'Gender',
            'Department',
            'Designation',
            'Date of Joining',
            'Employee ID',
            'Job Type',
            'Salary',
            'Aadhaar Number',
            'PAN Number'
        ];

        const sampleRow = [
            'John Doe',
            'john.doe@example.com',
            '9876543210',
            '1990-01-01',
            'Male',
            'Engineering',
            'Software Engineer',
            '2023-01-01',
            '', // Employee ID optional
            'Permanent',
            '50000',
            '123412341234',
            'ABCDE1234F'
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'Employee_Import_Template.xlsx');
    };

    const validCount = parsedData.filter(r => r.isValid).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Import Employees</h2>
                        <p className="text-sm text-gray-500 mt-1">Upload an Excel or CSV file to bulk add employees</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!isPreviewing ? (
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-teal-500 hover:bg-teal-50/50 transition-all cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileSpreadsheet className="w-16 h-16 text-teal-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Click to upload spreadsheet</h3>
                            <p className="text-sm text-gray-500 mb-6">Supports .xlsx and .csv files</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".xlsx,.csv"
                                onChange={handleFileChange}
                            />
                            <div className="bg-gray-50 rounded-lg p-4 text-left text-xs text-gray-600 max-w-sm">
                                <p className="font-medium mb-2">Required Columns:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <span>• Full Name</span>
                                    <span>• Personal Email</span>
                                    <span>• Mobile Number</span>
                                    <span>• Date of Birth</span>
                                    <span>• Gender</span>
                                    <span>• Date of Joining</span>
                                    <span>• Department</span>
                                    <span>• Designation</span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    downloadTemplate();
                                }}
                                className="mt-4 text-sm text-teal-600 hover:text-teal-700 underline flex items-center gap-1"
                            >
                                <Download className="w-4 h-4" />
                                Download Excel Template
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900">Preview ({validCount} valid rows)</h3>
                                <button
                                    onClick={() => setIsPreviewing(false)}
                                    className="text-sm text-teal-600 hover:text-teal-700"
                                >
                                    Change File
                                </button>
                            </div>

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3">Email</th>
                                                <th className="px-4 py-3">Role</th>
                                                <th className="px-4 py-3">Dept</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {parsedData.slice(0, 10).map((row, i) => (
                                                <tr key={i} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                                                    <td className="px-4 py-3">
                                                        {row.isValid ? (
                                                            <Check className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <div className="group relative">
                                                                <AlertCircle className="w-4 h-4 text-red-500 cursor-help" />
                                                                <div className="absolute left-6 top-0 w-48 bg-gray-900 text-white text-xs p-2 rounded z-10 hidden group-hover:block">
                                                                    {row.errors.join(', ')}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-900">{row.fullName || '-'}</td>
                                                    <td className="px-4 py-3 text-gray-500">{row.personalEmail || '-'}</td>
                                                    <td className="px-4 py-3 text-gray-500">{row.designation || '-'}</td>
                                                    <td className="px-4 py-3 text-gray-500">{row.department || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {parsedData.length > 10 && (
                                    <div className="px-4 py-2 bg-gray-50 text-xs text-center text-gray-500 border-t border-gray-200">
                                        Showing first 10 of {parsedData.length} rows
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isImporting}
                    >
                        Cancel
                    </button>

                    {isPreviewing && (
                        <button
                            onClick={handleImport}
                            disabled={isImporting || validCount === 0}
                            className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Import {validCount} Employees
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
