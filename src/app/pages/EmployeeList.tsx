import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
} from 'lucide-react';
import { supabase } from '../contexts/AuthContext';
import { SUPABASE_URL } from '../../utils/supabase/client';
import { AdminLayout } from '../components/AdminLayout';

export function EmployeeList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployeesList();
  }, [searchTerm, filterDepartment, employees]);

  const fetchEmployees = async () => {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        toast.error('Please log in again');
        navigate('/admin/login');
        return;
      }

      // Fetch employees from new relational tables
      const { data: employeesData, error } = await supabase
        .from('employees')
        .select(`
          *,
          employee_addresses (
            city
          ),
          employee_experience (
            organization,
            designation
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Process and sign URLs
      const processedEmployees = await Promise.all(
        (employeesData || []).map(async (emp: any) => {
          const signedUrls: any = {};

          // Generate signed URL for photograph if it exists
          if (emp.photograph_path) {
            const { data } = await supabase.storage
              .from('make-0e23869b-employee-docs')
              .createSignedUrl(emp.photograph_path, 3600); // 1 hour expiry

            if (data?.signedUrl) {
              signedUrls.photograph = data.signedUrl;
            }
          }

          // Map to UI expectation
          return {
            id: emp.id,
            employeeId: emp.employee_id,
            personalIdentity: {
              fullName: emp.full_name,
              personalEmail: emp.personal_email,
            },
            address: {
              city: emp.employee_addresses?.[0]?.city,
            },
            company: {
              // Taking the first experience entry as current/latest for list view
              department: 'N/A', // Schema doesn't have department yet, could be added later
              designation: emp.employee_experience?.[0]?.designation
            },
            submittedAt: emp.submitted_at,
            idCardPrepared: emp.id_card_prepared,
            signedUrls
          };
        })
      );

      setEmployees(processedEmployees);
    } catch (error) {
      console.error('Fetch employees error:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const filterEmployeesList = () => {
    let filtered = employees;

    // Search by name or ID
    if (searchTerm) {
      filtered = filtered.filter(
        (emp) =>
          emp.personalIdentity?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by department
    if (filterDepartment) {
      filtered = filtered.filter((emp) => emp.company?.department === filterDepartment);
    }

    setFilteredEmployees(filtered);
  };

  const handleDeleteEmployee = async (e: React.MouseEvent, employeeId: string, employeeName: string) => {
    e.stopPropagation(); // Prevent row click navigation

    if (!window.confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        toast.error('Please log in again');
        return;
      }

      // Delete from employees table (cascades to related tables)
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        throw error;
      }

      toast.success('Employee deleted successfully');
      fetchEmployees(); // Refresh list
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete employee');
    }
  };

  const departments = Array.from(
    new Set(employees.map((emp) => emp.company?.department).filter(Boolean))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading employees...</div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Employee Management"
      description="View and manage all employee records"
      actions={
        <button
          onClick={() => window.open('/', '_blank')}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
        >
          <Users className="w-4 h-4" />
          Add New
        </button>
      }
    >
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or employee ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Filter by Department */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition appearance-none"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm text-gray-700">Employee</th>
                <th className="text-left px-6 py-4 text-sm text-gray-700">Employee ID</th>
                <th className="text-left px-6 py-4 text-sm text-gray-700">Submission Date</th>
                <th className="text-left px-6 py-4 text-sm text-gray-700">Status</th>
                <th className="text-left px-6 py-4 text-sm text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/employees/${employee.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          {employee.signedUrls?.photograph ? (
                            <img
                              src={employee.signedUrls.photograph}
                              alt={employee.personalIdentity?.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-gray-900">{employee.personalIdentity?.fullName}</p>
                          <p className="text-sm text-gray-600">{employee.personalIdentity?.personalEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{employee.employeeId}</td>
                    <td className="px-6 py-4 text-gray-900">
                      {employee.submittedAt ? new Date(employee.submittedAt).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs ${employee.idCardPrepared
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                          }`}
                      >
                        {employee.idCardPrepared ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {employee.signedUrls?.photograph && (
                          <a
                            href={employee.signedUrls.photograph}
                            download
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Download Photo"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={(e) => handleDeleteEmployee(e, employee.id, employee.personalIdentity?.fullName)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/employees/${employee.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {employee.signedUrls?.photograph ? (
                      <img
                        src={employee.signedUrls.photograph}
                        alt={employee.personalIdentity?.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate">{employee.personalIdentity?.fullName}</p>
                    <p className="text-sm text-gray-600">{employee.employeeId}</p>
                    <p className="text-sm text-gray-600">
                      {employee.company?.department || 'N/A'} • {employee.company?.designation || 'N/A'}
                    </p>
                    <div className="mt-2 text-xs text-gray-400">
                      {employee.submittedAt ? new Date(employee.submittedAt).toLocaleDateString() : ''}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs ${employee.idCardPrepared
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                          }`}
                      >
                        {employee.idCardPrepared ? 'Active' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">No employees found</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}