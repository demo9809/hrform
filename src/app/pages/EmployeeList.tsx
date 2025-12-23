import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  LayoutDashboard,
  LogOut,
  IdCard as IdCardIcon,
} from 'lucide-react';
import { useAuth, supabase } from '../contexts/AuthContext';
import { SUPABASE_URL } from '../../utils/supabase/client';

export function EmployeeList() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/make-server-0e23869b/employees`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const data = await response.json();
      setEmployees(data.employees || []);
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
          emp.personalDetails?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.company?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by department
    if (filterDepartment) {
      filtered = filtered.filter((emp) => emp.company?.department === filterDepartment);
    }

    setFilteredEmployees(filtered);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl text-gray-900">HR Portal</h2>
            <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
          </div>

          {/* Navigation */}
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
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-900 bg-gray-100 rounded-lg"
            >
              <Users className="w-5 h-5" />
              Employees
            </button>
          </nav>

          {/* Logout */}
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
          <h1 className="text-3xl text-gray-900 mb-2">Employee Management</h1>
          <p className="text-gray-600">View and manage all employee records</p>
        </div>

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
                  <th className="text-left px-6 py-4 text-sm text-gray-700">Department</th>
                  <th className="text-left px-6 py-4 text-sm text-gray-700">Designation</th>
                  <th className="text-left px-6 py-4 text-sm text-gray-700">Joining Date</th>
                  <th className="text-left px-6 py-4 text-sm text-gray-700">Status</th>
                  <th className="text-left px-6 py-4 text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
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
                      <td className="px-6 py-4 text-gray-900">{employee.address?.city || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-900">{employee.governmentTax?.panNumber || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-900">
                        {new Date(employee.submittedAt).toLocaleDateString()}
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
                          <button
                            onClick={() => navigate(`/admin/employees/${employee.id}`)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {employee.signedUrls?.photograph && (
                            <a
                              href={employee.signedUrls.photograph}
                              download
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Download Photo"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {!employee.idCardPrepared && (
                            <button
                              onClick={() => navigate(`/admin/employees/${employee.id}`)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Prepare ID Card"
                            >
                              <IdCardIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                      {employee.signedUrls?.profilePhoto ? (
                        <img
                          src={employee.signedUrls.profilePhoto}
                          alt={employee.personalDetails?.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 truncate">{employee.personalDetails?.fullName}</p>
                      <p className="text-sm text-gray-600">{employee.company?.employeeId}</p>
                      <p className="text-sm text-gray-600">
                        {employee.company?.department} • {employee.company?.designation}
                      </p>
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
      </div>
    </div>
  );
}