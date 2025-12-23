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
  LayoutDashboard,
  LogOut,
  Calendar,
  Building,
  Edit,
  FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EditEmployeeModal } from '../components/EditEmployeeModal';
import { useAuth, supabase } from '../contexts/AuthContext';
import { SUPABASE_URL } from '../../utils/supabase/client';

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markingPrepared, setMarkingPrepared] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/make-server-0e23869b/employees/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch employee');
      }

      const data = await response.json();
      setEmployee(data.employee);
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

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/make-server-0e23869b/employees/${id}/id-card-prepared`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark ID card as prepared');
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
    if (employee?.signedUrls?.profilePhoto) {
      window.open(employee.signedUrls.profilePhoto, '_blank');
    }
  };

  const handleDownloadAllDocs = async () => {
    const docs = [
      { url: employee?.signedUrls?.profilePhoto, name: 'profile-photo' },
      { url: employee?.signedUrls?.aadhaarDoc, name: 'aadhaar-document' },
      { url: employee?.signedUrls?.panDoc, name: 'pan-document' },
      { url: employee?.signedUrls?.passportDoc, name: 'passport-document' },
    ];

    for (const doc of docs) {
      if (doc.url) {
        window.open(doc.url, '_blank');
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
      }
    }

    toast.success('Opening all documents...');
  };

  const handleExportPDF = () => {
    if (!employee) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136); // Teal 600
    doc.text('Employee Profile', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Employee Summary
    doc.setFillColor(240, 253, 250); // Teal 50
    doc.rect(14, 35, pageWidth - 28, 40, 'F');

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(employee.personalIdentity?.fullName || '', 20, 48);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Employee ID: ${employee.employeeId || 'N/A'}`, 20, 56);
    doc.text(`Designation: ${employee.company?.designation || 'N/A'}`, 20, 62);
    doc.text(`Department: ${employee.company?.department || 'N/A'}`, 20, 68);

    let finalY = 85;

    // Personal Details
    autoTable(doc, {
      startY: finalY,
      head: [['Personal Details', '']],
      body: [
        ['Full Name', employee.personalIdentity?.fullName || 'N/A'],
        ['Date of Birth', employee.personalIdentity?.dateOfBirth || 'N/A'],
        ['Gender', employee.personalIdentity?.gender || 'N/A'],
        ['Email', employee.personalIdentity?.personalEmail || 'N/A'],
        ['Phone', employee.personalIdentity?.mobileNumber || 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: 255 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Company Details
    autoTable(doc, {
      startY: finalY,
      head: [['Company Details', '']],
      body: [
        ['Date of Joining', employee.company?.dateOfJoining || 'N/A'],
        ['Office Location', employee.company?.officeLocation || 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: 255 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Banking Details (Sensitive)
    autoTable(doc, {
      startY: finalY,
      head: [['Banking Details', '']],
      body: [
        ['Account Holder', employee.bankDetails?.accountHolderName || 'N/A'],
        ['Bank Name', employee.bankDetails?.bankName || 'N/A'],
        ['Account Number', employee.bankDetails?.accountNumber || 'N/A'],
        ['IFSC Code', employee.bankDetails?.ifscCode || 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: 255 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    doc.save(`${employee.personalIdentity?.fullName || 'employee'}-profile.pdf`);
    toast.success('PDF downloaded successfully');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading employee details...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Employee not found</p>
          <button
            onClick={() => navigate('/admin/employees')}
            className="text-teal-600 hover:text-teal-700"
          >
            ← Back to Employee List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl text-gray-900">HR Portal</h2>
            <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => navigate('/admin/employees')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
              Employees
            </button>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <button
                onClick={() => navigate('/admin/employees')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Employee List
              </button>
              <h1 className="text-3xl text-gray-900 mb-2">Employee Details</h1>
              <p className="text-gray-600">Complete employee information and ID card preparation</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Details
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Export PDF
              </button>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden mb-4">
                  {employee.signedUrls?.profilePhoto ? (
                    <img
                      src={employee.signedUrls.profilePhoto}
                      alt={employee.personalDetails?.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-16 h-16 text-gray-600" />
                  )}
                </div>
                <h2 className="text-xl text-gray-900 text-center mb-1">
                  {employee.personalIdentity?.fullName}
                </h2>
                <p className="text-gray-600 text-center mb-1">{employee.company?.designation || 'Designation N/A'}</p>
                <p className="text-sm text-gray-500 text-center">{employee.employeeId}</p>

                <div className="mt-4 w-full">
                  <span
                    className={`inline-flex w-full justify-center px-3 py-2 rounded-lg text-sm ${employee.idCardPrepared
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                      }`}
                  >
                    {employee.idCardPrepared ? (
                      <><CheckCircle className="w-4 h-4 mr-2" /> ID Card Prepared</>
                    ) : (
                      <><IdCardIcon className="w-4 h-4 mr-2" /> ID Card Pending</>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleDownloadPhoto}
                  disabled={!employee.signedUrls?.profilePhoto}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download DP
                </button>

                <button
                  onClick={handleDownloadAllDocs}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Download All Documents
                </button>

                {!employee.idCardPrepared && (
                  <button
                    onClick={handleMarkIdCardPrepared}
                    disabled={markingPrepared}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {markingPrepared ? 'Marking...' : 'Mark ID as Prepared'}
                  </button>
                )}
              </div>
            </div>

            {/* Image Info */}
            {employee.signedUrls?.profilePhoto && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p className="text-sm text-gray-600">
                  <strong>Photo Resolution:</strong> Original Quality
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Download for ID card printing workflow
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Details */}
            <DetailCard
              title="Personal Details"
              icon={<Users className="w-5 h-5" />}
              items={[
                { label: 'Full Name', value: employee.personalIdentity?.fullName },
                { label: 'Date of Birth', value: employee.personalIdentity?.dateOfBirth ? new Date(employee.personalIdentity.dateOfBirth).toLocaleDateString() : 'N/A' },
                { label: 'Gender', value: employee.personalIdentity?.gender },
                { label: 'Blood Group', value: employee.personalIdentity?.bloodGroup },
                { label: 'Phone', value: employee.personalIdentity?.mobileNumber, icon: <Phone className="w-4 h-4 text-gray-400" /> },
                { label: 'Email', value: employee.personalIdentity?.personalEmail, icon: <Mail className="w-4 h-4 text-gray-400" /> },
                { label: 'Emergency Contact', value: employee.emergencyContact?.name },
                { label: 'Emergency Phone', value: employee.emergencyContact?.phone },
              ]}
            />

            {/* Address Details */}
            <DetailCard
              title="Address Details"
              icon={<MapPin className="w-5 h-5" />}
              items={[
                { label: 'Current Address', value: employee.address?.currentAddress, fullWidth: true },
                { label: 'Permanent Address', value: employee.address?.permanentAddress, fullWidth: true },
              ]}
            />

            {/* ID & Legal Details */}
            <DetailCard
              title="ID & Legal Details"
              icon={<IdCardIcon className="w-5 h-5" />}
              items={[
                { label: 'Aadhaar Number', value: employee.governmentTax?.aadhaarNumber },
                { label: 'PAN Number', value: employee.governmentTax?.panNumber },
                { label: 'Passport Number', value: employee.governmentTax?.passportNumber || 'Not Provided' },
              ]}
              documents={[
                { label: 'Aadhaar Document', url: employee.signedUrls?.aadhaarDoc },
                { label: 'PAN Document', url: employee.signedUrls?.panDoc },
                { label: 'Passport Document', url: employee.signedUrls?.passportDoc },
              ]}
            />

            {/* Education & Experience */}
            <DetailCard
              title="Education & Experience"
              icon={<GraduationCap className="w-5 h-5" />}
              items={[
                { label: 'Highest Qualification', value: employee.education?.[0]?.qualification },
                { label: 'Institution', value: employee.education?.[0]?.institution },
                { label: 'Year of Completion', value: employee.education?.[0]?.yearOfCompletion },
                { label: 'Experience Type', value: employee.workExperience?.isFresher ? 'Fresher' : 'Experienced' },
                ...(!employee.workExperience?.isFresher ? [
                  // Mapping first experience entry if available
                  { label: 'Previous Company', value: employee.workExperience?.entries?.[0]?.companyName },
                  { label: 'Previous Role', value: employee.workExperience?.entries?.[0]?.role },
                  { label: 'Years of Experience', value: employee.workExperience?.entries?.length ? `${employee.workExperience.entries.length} entries` : 'N/A' },
                ] : []),
              ]}
            />

            {/* Company Details */}
            <DetailCard
              title="Company Details"
              icon={<Briefcase className="w-5 h-5" />}
              items={[
                { label: 'Employee ID', value: employee.employeeId },
                { label: 'Department', value: employee.company?.department || 'N/A' },
                { label: 'Designation', value: employee.company?.designation || 'N/A' },
                { label: 'Date of Joining', value: employee.company?.dateOfJoining ? new Date(employee.company.dateOfJoining).toLocaleDateString() : 'N/A', icon: <Calendar className="w-4 h-4 text-gray-400" /> },
                { label: 'Office Location', value: employee.company?.officeLocation || 'N/A', icon: <Building className="w-4 h-4 text-gray-400" /> },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Detail Card Component
function DetailCard({ title, icon, items, documents }: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ label: string; value: any; icon?: React.ReactNode; fullWidth?: boolean }>;
  documents?: Array<{ label: string; url?: string }>;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="text-teal-600">{icon}</div>
        <h3 className="text-lg text-gray-900">{title}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, index) => (
          <div key={index} className={item.fullWidth ? 'md:col-span-2' : ''}>
            <p className="text-sm text-gray-600 mb-1">{item.label}</p>
            <div className="flex items-center gap-2">
              {item.icon}
              <p className="text-gray-900">{item.value || 'N/A'}</p>
            </div>
          </div>
        ))}
      </div>

      {documents && documents.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-700 mb-3">Uploaded Documents:</p>
          <div className="space-y-2">
            {documents.map((doc, index) => (
              doc.url && (
                <a
                  key={index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm text-gray-700">{doc.label}</span>
                  <Download className="w-4 h-4 text-gray-600" />
                </a>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
