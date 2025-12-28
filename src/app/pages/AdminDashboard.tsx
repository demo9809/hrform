import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, UserPlus, IdCard } from 'lucide-react';
import { supabase } from '../contexts/AuthContext';
import { SUPABASE_URL } from '../../utils/supabase/client';
import { AdminLayout } from '../components/AdminLayout';

interface DashboardStats {
  totalEmployees: number;
  newToday: number;
  pendingIdCards: number;
  recentEmployees: any[];
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        toast.error('Please log in again');
        navigate('/admin/login');
        return;
      }

      // 1. Total Employees
      const { count: totalEmployees, error: totalError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // 2. New Today
      const today = new Date().toISOString().split('T')[0];
      const { count: newToday, error: newError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .gte('submitted_at', today);

      if (newError) throw newError;

      // 3. Pending ID Cards
      const { count: pendingIdCards, error: pendingError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('id_card_prepared', false);

      if (pendingError) throw pendingError;

      // 4. Recent Employees
      // Fetch checks with current address to show city
      const { data: recentEmployees, error: recentError } = await supabase
        .from('employees')
        .select(`
          *,
          employee_addresses (
            city
          )
        `)
        .eq('employee_addresses.type', 'current')
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      setStats({
        totalEmployees: totalEmployees || 0,
        newToday: newToday || 0,
        pendingIdCards: pendingIdCards || 0,
        recentEmployees: recentEmployees || []
      });
    } catch (error) {
      console.error('Fetch stats error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Dashboard"
      description="Overview of employee onboarding activities"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Employees</p>
              <p className="text-3xl text-gray-900">{stats?.totalEmployees || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">New Today</p>
              <p className="text-3xl text-gray-900">{stats?.newToday || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending ID Cards</p>
              <p className="text-3xl text-gray-900">{stats?.pendingIdCards || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <IdCard className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recently Added Employees */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg text-gray-900">Recently Added Employees</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {stats?.recentEmployees && stats.recentEmployees.length > 0 ? (
            stats.recentEmployees.map((employee: any) => (
              <div
                key={employee.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/employees/${employee.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-gray-900">{employee.full_name}</p>
                      <p className="text-sm text-gray-600">
                        {/* Handle potential array or object structure depending on join */}
                        {Array.isArray(employee.employee_addresses)
                          ? employee.employee_addresses[0]?.city
                          : employee.employee_addresses?.city}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{employee.employee_id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(employee.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              No employees found. They will appear here once submitted.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}