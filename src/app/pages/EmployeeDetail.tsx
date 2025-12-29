import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Users,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  IdCard as IdCardIcon,
  Calendar,
  Building,
  Edit,
  FileDown,
  Globe,
  CreditCard,
  User,
  Clock,
  Monitor,
  History as HistoryIcon,
  Laptop,
  Smartphone,
  HardDrive,
  MousePointer
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EditEmployeeModal } from '../components/EditEmployeeModal';
import { UpdateCompanyModal } from '../components/UpdateCompanyModal';
import { useAuth, supabase } from '../contexts/AuthContext';
import { SUPABASE_URL } from '../../utils/supabase/client';
import { AssetService } from '../../utils/assetService';
import { AssetAssignment } from '../../types/database';
import { Badge } from '../components/ui/badge';
import { AdminLayout } from '../components/AdminLayout';

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markingPrepared, setMarkingPrepared] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [assignedAssets, setAssignedAssets] = useState<AssetAssignment[]>([]);
  const [incrementHistory, setIncrementHistory] = useState<any[]>([]);

  // Helper to format date as DD-MM-YYYY
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    // en-GB returns DD/MM/YYYY. We replace slashes with dashes.
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  };

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        toast.error('Please log in again');
        navigate('/admin/login');
        return;
      }

      // Fetch full employee profile from relational tables
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          employee_identities (*),
          employee_addresses (*),
          employee_bank_details (*),
          employee_education (*),
          employee_experience (*),
          employee_emergency_contacts (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Employee not found');
      }

      // Process Signed URLs
      const signedUrls: any = {};
      const getSignedUrl = async (path: string | null) => {
        if (!path) return '';
        const { data } = await supabase.storage
          .from('make-0e23869b-employee-docs')
          .createSignedUrl(path, 3600);
        return data?.signedUrl || '';
      };

      // 1. Photograph
      if (data.photograph_path) {
        signedUrls.photograph = await getSignedUrl(data.photograph_path);
      }

      // 2. Education Certificates
      if (data.employee_education) {
        signedUrls.educationCertificates = await Promise.all(
          data.employee_education.map((edu: any) => getSignedUrl(edu.certificate_path))
        );
      }

      // 3. Experience Letters & Relieving Letters
      if (data.employee_experience) {
        signedUrls.experienceLetters = await Promise.all(
          data.employee_experience.map((exp: any) => getSignedUrl(exp.experience_letter_path))
        );
        signedUrls.relievingLetters = await Promise.all(
          data.employee_experience.map((exp: any) => getSignedUrl(exp.relieving_letter_path))
        );
      }

      // Map relational data back to the nested structure expected by the UI
      const mappedEmployee = {
        id: data.id,
        employeeId: data.employee_id,
        submittedAt: data.submitted_at,
        idCardPrepared: data.id_card_prepared,

        personalIdentity: {
          fullName: data.full_name,
          dateOfBirth: data.date_of_birth,
          gender: data.gender,
          bloodGroup: data.blood_group,
          maritalStatus: data.marital_status,
          nationality: data.nationality,
          personalEmail: data.personal_email,
          mobileNumber: data.mobile_number,
        },

        address: {
          currentAddress: data.employee_addresses?.find((a: any) => a.type === 'current')?.address_line,
          city: data.employee_addresses?.find((a: any) => a.type === 'current')?.city,
          district: data.employee_addresses?.find((a: any) => a.type === 'current')?.district,
          state: data.employee_addresses?.find((a: any) => a.type === 'current')?.state,
          pincode: data.employee_addresses?.find((a: any) => a.type === 'current')?.pincode,
          permanentAddress: data.employee_addresses?.find((a: any) => a.type === 'permanent')?.address_line,
        },

        governmentTax: {
          aadhaarNumber: data.employee_identities?.[0]?.aadhaar_number,
          panNumber: data.employee_identities?.[0]?.pan_number,
          passportNumber: data.employee_identities?.[0]?.passport_number,
          passportExpiry: data.employee_identities?.[0]?.passport_expiry,
        },

        bankDetails: {
          accountHolderName: data.employee_bank_details?.[0]?.account_holder_name,
          bankName: data.employee_bank_details?.[0]?.bank_name,
          accountNumber: data.employee_bank_details?.[0]?.account_number,
          ifscCode: data.employee_bank_details?.[0]?.ifsc_code,
        },

        education: data.employee_education?.map((edu: any) => ({
          qualification: edu.qualification,
          courseSpecialization: edu.course_specialization,
          institution: edu.institution,
          yearOfCompletion: edu.year_of_completion,
        })),

        workExperience: {
          isFresher: data.is_fresher,
          entries: data.employee_experience?.map((exp: any) => ({
            organization: exp.organization,
            designation: exp.designation,
            endDate: exp.end_date, // Using end_date as simpler proxy for UI for now
            startDate: exp.created_at, // Placeholder as schema lacked start_date in simple version, can be added later
            reasonForLeaving: exp.reason_for_leaving
          }))
        },

        emergencyContact: {
          name: data.employee_emergency_contacts?.[0]?.name,
          relationship: data.employee_emergency_contacts?.[0]?.relationship,
          phone: data.employee_emergency_contacts?.[0]?.phone,
        },

        company: {
          department: data.department,
          designation: data.designation,
          dateOfJoining: data.date_of_joining,
          officeLocation: data.office_location,
          probationEndDate: data.probation_end_date,
          // Extended
          resignationDate: data.resignation_date,
          jobType: data.job_type,
          currentSalary: data.current_salary,
          stipendAmount: data.stipend_amount,
          stipendEndDate: data.stipend_end_date,
          nextIncrementDate: data.next_increment_date,
          isNewJoinee: data.is_new_joinee,
          firstIncrementDuration: data.first_increment_duration,
          lastIncrementDate: data.last_increment_date
        },

        signedUrls
      };

      setEmployee(mappedEmployee);

      // Fetch assigned assets
      if (id) {
        const assets = await AssetService.getEmployeeAssets(id);
        setAssignedAssets(assets || []);

        // Fetch Increment History
        const { data: increments } = await supabase
          .from('increment_history')
          .select('*')
          .eq('employee_id', id)
          .order('increment_date', { ascending: false });
        setIncrementHistory(increments || []);
      }

    } catch (error) {
      console.error('Fetch employee error:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkIdCardPrepared = async () => {
    setMarkingPrepared(true);

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        toast.error('Please log in again');
        navigate('/admin/login');
        return;
      }

      // Direct update to employees table
      const { error } = await supabase
        .from('employees')
        .update({ id_card_prepared: true })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success('ID card marked as prepared!');
      fetchEmployee(); // Refresh employee data
    } catch (error) {
      console.error('Mark ID card prepared error:', error);
      toast.error('Failed to mark ID card as prepared');
    } finally {
      setMarkingPrepared(false);
    }
  };

  const handleDownloadPhoto = () => {
    if (employee?.signedUrls?.photograph) {
      window.open(employee.signedUrls.photograph, '_blank');
    }
  };

  const handleDownloadAllDocs = async () => {
    const docs = [
      { url: employee?.signedUrls?.photograph, name: 'profile-photo' },
      { url: employee?.signedUrls?.aadhaarDoc, name: 'aadhaar-document' },
      { url: employee?.signedUrls?.panDoc, name: 'pan-document' },
      { url: employee?.signedUrls?.passportDoc, name: 'passport-document' },
      ...(employee?.signedUrls?.educationCertificates || []).map((url: string, index: number) => ({
        url, name: `education-certificate-${index + 1}`
      }))
    ];

    for (const doc of docs) {
      if (doc.url) {
        window.open(doc.url, '_blank');
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
      }
    }

    toast.success('Opening all documents...');
  };

  // Helper to load image for PDF with CORS handling
  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = (e) => reject(e);
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'laptop': return <Laptop className="w-5 h-5 text-gray-500" />;
      case 'mobile': return <Smartphone className="w-5 h-5 text-gray-500" />;
      case 'peripheral': return <MousePointer className="w-5 h-5 text-gray-500" />;
      default: return <HardDrive className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleExportPDF = async () => {
    if (!employee) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    try {
      toast.info('Generating PDF...');

      let photoBase64 = null;
      // 1. Add Photo if available (Pre-load)
      if (employee.signedUrls?.photograph) {
        try {
          const response = await fetch(employee.signedUrls.photograph);
          const blob = await response.blob();
          photoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.error('Error loading image for PDF', err);
        }
      }

      // 2. Header
      doc.setFontSize(22);
      doc.setTextColor(244, 122, 94); // Brand Color (Coral)
      doc.text('Employee Profile', 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);

      // 3. Employee Summary Layout
      doc.setFillColor(255, 246, 244); // Brand 50
      doc.rect(14, 40, pageWidth - 28, 40, 'F'); // Full width box

      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55); // Gray 800
      doc.text(employee.personalIdentity?.fullName || 'Unknown Name', 24, 62);

      // Add Photo with Aspect Ratio Lock
      if (photoBase64) {
        try {
          const imgProps = doc.getImageProperties(photoBase64);
          const ratio = imgProps.width / imgProps.height;

          const maxH = 36; // Max height in mm
          const maxW = 36; // Max width in mm

          let w = maxW;
          let h = w / ratio;

          if (h > maxH) {
            h = maxH;
            w = h * ratio;
          }

          // Align right inside the box (Box ends at 14 + (pageWidth - 28) = pageWidth - 14)
          const xPos = (pageWidth - 14) - w - 2;
          const yPos = 40 + (40 - h) / 2; // Center vertically in 40mm high box

          doc.addImage(photoBase64, 'JPEG', xPos, yPos, w, h);
        } catch (e) {
          console.log('Error adding image', e);
        }
      }

      let finalY = 85;

      // 4. Job Details Table
      autoTable(doc, {
        startY: finalY,
        head: [['Job Details', '']],
        body: [
          ['Department', employee.company?.department || 'N/A'],
          ['Designation', employee.company?.designation || 'N/A'],
          ['Job Type', employee.company?.jobType || 'Permanent'],
          ['Date of Joining', formatDate(employee.company?.dateOfJoining)],
          ['Probation End Date', formatDate(employee.company?.probationEndDate)],
          ['Work Mode', employee.company?.officeLocation || 'N/A'],
          ['Work Email', employee.company?.workEmail || '-'],
          ['Resignation Date', employee.company?.resignationDate ? formatDate(employee.company.resignationDate) : '-'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [244, 122, 94], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: 50 } },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;

      // 4.5 Compensation (New Table)
      const salaryLabel = employee.company?.jobType === 'Intern' ? 'Monthly Stipend' : 'Current Salary';
      const salaryValue = employee.company?.jobType === 'Intern'
        ? (employee.company?.stipendAmount ? `Rs. ${employee.company.stipendAmount}` : '-')
        : (employee.company?.currentSalary ? `Rs. ${employee.company.currentSalary}` : '-');

      autoTable(doc, {
        startY: finalY,
        head: [['Compensation & Increment', '']],
        body: [
          [salaryLabel, salaryValue],
          ['Last Increment Date', employee.company?.lastIncrementDate ? formatDate(employee.company.lastIncrementDate) : '-'],
          ['Next Increment Due', employee.company?.nextIncrementDate ? formatDate(employee.company.nextIncrementDate) : '-'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [244, 122, 94], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: 50 } },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;

      // 5. Personal Details Table
      autoTable(doc, {
        startY: finalY,
        head: [['Personal Details', '']],
        body: [
          ['Full Name', employee.personalIdentity?.fullName || 'N/A'],
          ['Date of Birth', formatDate(employee.personalIdentity?.dateOfBirth)],
          // Date of Joining moved to Job Details
          ['Gender', employee.personalIdentity?.gender || 'N/A'],
          ['Blood Group', employee.personalIdentity?.bloodGroup || 'N/A'],
          ['Personal Email', employee.personalIdentity?.personalEmail || 'N/A'],
          ['Mobile Number', employee.personalIdentity?.mobileNumber || 'N/A'],
          ['Emergency Contact', `${employee.emergencyContact?.name || ''} (${employee.emergencyContact?.phone || ''})`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [244, 122, 94], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: 50 } },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;


      // 6. Address Details Table
      autoTable(doc, {
        startY: finalY,
        head: [['Address Details', '']],
        body: [
          ['Current Address', employee.address?.currentAddress || 'N/A'],
          ['Permanent Address', employee.address?.permanentAddress || 'N/A'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [244, 122, 94], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: 50 } },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;

      // 7. Identity & Bank Details
      const idRows = [
        ['Aadhaar Number', employee.governmentTax?.aadhaarNumber || 'N/A'],
        ['PAN Number', employee.governmentTax?.panNumber || 'N/A'],
        ['Passport Number', employee.governmentTax?.passportNumber || 'N/A'],
      ];
      const bankRows = [
        ['Bank Name', employee.bankDetails?.bankName || 'N/A'],
        ['Account Holder', employee.bankDetails?.accountHolderName || 'N/A'],
        ['Account Number', employee.bankDetails?.accountNumber || 'N/A'],
        ['IFSC Code', employee.bankDetails?.ifscCode || 'N/A'],
      ];

      autoTable(doc, {
        startY: finalY,
        head: [['Identity Details', '']],
        body: idRows,
        theme: 'grid',
        headStyles: { fillColor: [244, 122, 94], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: 50 } },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: finalY,
        head: [['Bank Details', '']],
        body: bankRows,
        theme: 'grid',
        headStyles: { fillColor: [244, 122, 94], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: 50 } },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;

      // 8. Education History (Multiple Entries)
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Education History', 14, finalY);
      finalY += 5;

      const eduRows = employee.education?.map((edu: any) => [
        edu.qualification,
        edu.institution,
        edu.yearOfCompletion,
      ]) || [['N/A', 'N/A', 'N/A']];

      autoTable(doc, {
        startY: finalY,
        head: [['Qualification', 'Institution', 'Year']],
        body: eduRows,
        theme: 'striped',
        headStyles: { fillColor: [244, 122, 94] },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;

      // 9. Work Experience (Multiple Entries)
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Work Experience', 14, finalY);
      finalY += 5;

      let expRows = [['Fresher', '-', '-']];
      if (!employee.workExperience?.isFresher && employee.workExperience?.entries) {
        expRows = employee.workExperience.entries.map((exp: any) => [
          exp.organization || 'N/A',
          exp.designation || 'N/A',
          `${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}`
        ]);
      }

      autoTable(doc, {
        startY: finalY,
        head: [['Company', 'Role', 'Duration']],
        body: expRows,
        theme: 'striped',
        headStyles: { fillColor: [244, 122, 94] },
      });

      doc.save(`${employee.personalIdentity?.fullName || 'employee'}_profile.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4 text-lg">Employee not found</p>
          <button
            onClick={() => navigate('/admin/employees')}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            ← Back to Employee List
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Employee Profile"
      onBack={() => navigate('/admin/employees')}
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            Job Details
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      }
    >

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-teal-500 to-teal-600"></div>
              <div className="px-6 pb-6">
                <div className="relative -mt-16 mb-4 flex justify-center">
                  <div className="w-32 h-32 bg-white rounded-full p-1 shadow-md">
                    <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      {employee.signedUrls?.photograph ? (
                        <img
                          src={employee.signedUrls.photograph}
                          alt={employee.personalIdentity?.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">{employee.personalIdentity?.fullName}</h2>
                  <p className="text-sm text-gray-500 mt-1">{employee.company?.designation || 'Designation N/A'}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{employee.employeeId}</p>

                  <div className="mt-4 flex justify-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${employee.idCardPrepared ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                      {employee.idCardPrepared ? 'ID Active' : 'ID Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleDownloadPhoto}
                  disabled={!employee.signedUrls?.photograph}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-gray-500" />
                    Download Photo
                  </span>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={handleDownloadAllDocs}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Download All Docs
                  </span>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                {!employee.idCardPrepared && (
                  <button
                    onClick={handleMarkIdCardPrepared}
                    disabled={markingPrepared}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 mt-4"
                  >
                    {markingPrepared ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Mark ID as Prepared
                  </button>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Contact</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">Email</p>
                    <a href={`mailto:${employee.personalIdentity?.personalEmail}`} className="text-gray-900 hover:text-teal-600 truncate block">
                      {employee.personalIdentity?.personalEmail || 'N/A'}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">Phone</p>
                    <p className="text-gray-900">{employee.personalIdentity?.mobileNumber || 'N/A'}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">Emergency</p>
                    <p className="text-gray-900">{employee.emergencyContact?.name || 'N/A'}</p>
                    <p className="text-gray-500 text-xs">{employee.emergencyContact?.phone}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Content - Right Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Job Details - New Section */}
            <SectionCard title="Job Details" icon={<Briefcase className="w-5 h-5" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem label="Department" value={employee.company?.department} />
                <InfoItem label="Designation" value={employee.company?.designation} />
                <InfoItem label="Job Type" value={employee.company?.jobType || 'Permanent'} />
                <InfoItem label="Date of Joining" value={formatDate(employee.company?.dateOfJoining)} />
                <InfoItem label="Probation End Date" value={formatDate(employee.company?.probationEndDate)} />
                <InfoItem label="Work Mode" value={employee.company?.officeLocation} />

                {employee.company?.resignationDate && (
                  <div className="md:col-span-2 bg-red-50 p-3 rounded-lg border border-red-100">
                    <InfoItem label="Resignation Date" value={formatDate(employee.company?.resignationDate)} className="text-red-700" />
                  </div>
                )}

                {employee.company?.jobType === 'Intern' ? (
                  <InfoItem label="Monthly Stipend" value={employee.company?.stipendAmount ? `₹${employee.company?.stipendAmount}` : 'No Stipend'} />
                ) : (
                  <>
                    <InfoItem label="Current Salary" value={employee.company?.currentSalary ? `₹${employee.company?.currentSalary}` : 'N/A'} />
                    <InfoItem label="Next Increment Due" value={formatDate(employee.company?.nextIncrementDate)} />
                  </>
                )}
              </div>
            </SectionCard>

            {/* Increment History Section */}
            {incrementHistory.length > 0 && (
              <SectionCard title="Increment History" icon={<Clock className="w-5 h-5" />}>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Old Salary</th>
                        <th className="px-4 py-2">New Salary</th>
                        <th className="px-4 py-2">Changed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {incrementHistory.map((inc: any) => (
                        <tr key={inc.id}>
                          <td className="px-4 py-2 text-gray-900">{formatDate(inc.increment_date)}</td>
                          <td className="px-4 py-2 text-gray-600">₹{inc.old_salary}</td>
                          <td className="px-4 py-2 text-green-600 font-medium">₹{inc.new_salary}</td>
                          <td className="px-4 py-2 text-gray-500">{inc.changed_by || 'System'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* Personal Details */}
            <SectionCard title="Personal Information" icon={<User className="w-5 h-5" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem label="Full Name" value={employee.personalIdentity?.fullName} />
                <InfoItem label="Date of Birth" value={formatDate(employee.personalIdentity?.dateOfBirth)} />
                <InfoItem label="Gender" value={employee.personalIdentity?.gender} />
                <InfoItem label="Blood Group" value={employee.personalIdentity?.bloodGroup} />
                <InfoItem label="Marital Status" value={employee.personalIdentity?.maritalStatus} />
                <InfoItem label="Nationality" value={employee.personalIdentity?.nationality} />
                <InfoItem label="Email" value={employee.personalIdentity?.personalEmail} />
                <InfoItem label="Phone" value={employee.personalIdentity?.mobileNumber} />
              </div>
            </SectionCard>


            {/* Address */}
            <SectionCard title="Address" icon={<MapPin className="w-5 h-5" />}>
              <div className="space-y-4">
                <InfoItem label="Current Address" value={employee.address?.currentAddress} fullWidth />
                <div className="border-t border-gray-100"></div>
                <InfoItem label="Permanent Address" value={employee.address?.permanentAddress} fullWidth />
              </div>
            </SectionCard>


            {/* Assigned Assets & History */}
            <SectionCard title="Asset Management" icon={<Monitor className="w-5 h-5" />}>
              <div className="space-y-6">
                {/* Active Assets */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Currently Assigned
                  </h4>
                  {assignedAssets.filter(a => !a.returned_at).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assignedAssets.filter(a => !a.returned_at).map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-teal-100 hover:bg-teal-50 transition-colors">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(assignment.asset?.category || '')}
                              <span className="font-medium text-gray-900">{assignment.asset?.name || 'Unknown Asset'}</span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{assignment.asset?.asset_code}</span>
                            </div>
                            <p className="text-xs text-gray-500 pl-8">Assigned: {formatDate(assignment.assigned_at)}</p>
                          </div>
                          <a
                            href={`/admin/assets/${assignment.asset_id}`}
                            className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic pl-4 border-l-2 border-gray-200">No assets currently assigned.</p>
                  )}
                </div>

                {/* Returned Assets History */}
                {assignedAssets.filter(a => a.returned_at).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2 pt-4 border-t border-gray-100">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      Return History
                    </h4>
                    <div className="space-y-3">
                      {assignedAssets.filter(a => a.returned_at).map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 opacity-75">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                              <HistoryIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">{assignment.asset?.name} <span className="text-xs text-gray-400">({assignment.asset?.asset_code})</span></p>
                              <p className="text-xs text-gray-500">
                                Returned: {formatDate(assignment.returned_at)} • Used for {Math.ceil((new Date(assignment.returned_at!).getTime() - new Date(assignment.assigned_at).getTime()) / (1000 * 60 * 60 * 24))} days
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-gray-500 border-gray-200">Returned</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Documents - Added as requested */}
            <SectionCard title="Documents" icon={<FileText className="w-5 h-5" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <IDItem
                  label="Profile Photo"
                  value={employee.personalIdentity?.fullName ? `${employee.personalIdentity?.fullName}.jpg` : 'Photo.jpg'}
                  docUrl={employee.signedUrls?.photograph}
                  icon={<Users className="w-5 h-5 text-teal-600" />}
                />
                <IDItem
                  label="Aadhaar Card"
                  value={employee.governmentTax?.aadhaarNumber ? `Aadhaar - ${employee.governmentTax?.aadhaarNumber}` : 'Aadhaar Document'}
                  docUrl={employee.signedUrls?.aadhaarDoc}
                  icon={<IdCardIcon className="w-5 h-5 text-teal-600" />}
                />
                <IDItem
                  label="PAN Card"
                  value={employee.governmentTax?.panNumber ? `PAN - ${employee.governmentTax?.panNumber}` : 'PAN Document'}
                  docUrl={employee.signedUrls?.panDoc}
                  icon={<CreditCard className="w-5 h-5 text-teal-600" />}
                />
                <IDItem
                  label="Passport"
                  value={employee.governmentTax?.passportNumber ? `Passport - ${employee.governmentTax?.passportNumber}` : 'Passport Document'}
                  docUrl={employee.signedUrls?.passportDoc}
                  icon={<Globe className="w-5 h-5 text-teal-600" />}
                />
                {employee.signedUrls?.educationCertificates?.map((url: string, index: number) => (
                  <IDItem
                    key={index}
                    label={`Education Certificate ${index + 1}`}
                    value={`Certificate-${index + 1}.pdf`}
                    docUrl={url}
                    icon={<GraduationCap className="w-5 h-5 text-teal-600" />}
                  />
                ))}
              </div>
            </SectionCard>

            {/* Education & Experience */}
            <SectionCard title="Education & Experience" icon={<GraduationCap className="w-5 h-5" />}>
              <div className="space-y-8">
                {/* Education */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-teal-600" /> Education
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {employee.education?.map((edu: any, index: number) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-gray-900">{edu.qualification}</p>
                          <p className="text-sm text-gray-600">{edu.institution}</p>
                        </div>
                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                          {edu.yearOfCompletion}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" /> Work Experience
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {employee.workExperience?.isFresher ? (
                      <p className="text-sm text-gray-500 italic">Fresher / No prior experience</p>
                    ) : (
                      <div className="space-y-4">
                        {employee.workExperience?.entries?.map((exp: any, index: number) => (
                          <div key={index} className="gap-2 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900">{exp.designation}</p>
                                <p className="text-sm text-gray-600">{exp.organization}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-gray-500 block">
                                  {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                                </span>
                              </div>
                            </div>

                            {/* Experience Documents */}
                            <div className="flex gap-3 mt-2">
                              {employee.signedUrls?.experienceLetters?.[index] && (
                                <a
                                  href={employee.signedUrls.experienceLetters[index]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-100 transition-colors"
                                >
                                  <FileText className="w-3 h-3" />
                                  Exp. Certificate
                                </a>
                              )}
                              {employee.signedUrls?.relievingLetters?.[index] && (
                                <a
                                  href={employee.signedUrls.relievingLetters[index]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-100 transition-colors"
                                >
                                  <FileText className="w-3 h-3" />
                                  Relieving Letter
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Identity & Bank - Condensed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identity - Removed duplicated card wrapper as it's inside the main layout already or needs proper structure */}
              {/* Actually, it seems I messed up the nesting in previous edits. Let's fix the Identity part. */}

              {/* Bank Details */}
              <SectionCard title="Bank Details" icon={<CreditCard className="w-5 h-5" />}>
                <div className="space-y-3">
                  <InfoItem label="Bank Name" value={employee.bankDetails?.bankName} />
                  <InfoItem label="Account Number" value={employee.bankDetails?.accountNumber} />
                  <InfoItem label="IFSC Code" value={employee.bankDetails?.ifscCode} />
                  <InfoItem label="Holder Name" value={employee.bankDetails?.accountHolderName} />
                </div>
              </SectionCard>
            </div>

          </div>
        </div>
      </div>

      {employee && (
        <EditEmployeeModal
          employee={employee}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={fetchEmployee}
        />
      )}

      {employee && (
        <UpdateCompanyModal
          employee={employee}
          isOpen={isCompanyModalOpen}
          onClose={() => setIsCompanyModalOpen(false)}
          onUpdate={fetchEmployee}
        />
      )}
    </AdminLayout>
  );
}


// Subcomponents for cleaner code
function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
        <div className="text-teal-600 bg-teal-50 p-1.5 rounded-lg">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

function InfoItem({ label, value, icon, fullWidth = false, className = '' }: { label: string; value: string; icon?: React.ReactNode; fullWidth?: boolean; className?: string }) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 opacity-80">{label}</p>
      <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
        {icon}
        <span>{value || 'N/A'}</span>
      </div>
    </div>
  )
}

function IDItem({ label, value, docUrl, icon }: { label: string; value: string; docUrl?: string, icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors border border-gray-100">
      <div className="flex items-center gap-3">
        {icon && <div className="p-2 bg-white rounded-md shadow-sm">{icon}</div>}
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-xs">{value || 'N/A'}</p>
        </div>
      </div>
      {docUrl && (
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 p-2 hover:bg-white rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          title="View/Download Document"
        >
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}
