import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, Gift, Award, Clock, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '../contexts/AuthContext';
import { AdminLayout } from '../components/AdminLayout';

interface DashboardStats {
  totalEmployees: number;
  upcomingBirthdays: any[];
  upcomingAnniversaries: any[];
  probationEndingSoon: any[];
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

      // 2. Fetch all active employees for Reminders
      const { data: allEmployees, error: allError } = await supabase
        .from('employees')
        .select('*')
        .neq('status', 'rejected'); // active/pending

      if (allError) throw allError;

      // 3. Process Reminders (Client-side)
      const upcomingBirthdays: any[] = [];
      const upcomingAnniversaries: any[] = [];
      const probationEndingSoon: any[] = [];
      const todayDate = new Date();
      const next30Days = new Date();
      next30Days.setDate(todayDate.getDate() + 30);

      allEmployees?.forEach((emp: any) => {
        // Birthday Checker
        if (emp.date_of_birth) {
          const dob = new Date(emp.date_of_birth);
          const currentYearBirthday = new Date(todayDate.getFullYear(), dob.getMonth(), dob.getDate());
          const nextYearBirthday = new Date(todayDate.getFullYear() + 1, dob.getMonth(), dob.getDate());

          if (currentYearBirthday >= todayDate && currentYearBirthday <= next30Days) {
            upcomingBirthdays.push(emp);
          } else if (nextYearBirthday >= todayDate && nextYearBirthday <= next30Days) {
            upcomingBirthdays.push(emp);
          }
        }

        // Anniversary Checker
        if (emp.date_of_joining) {
          const doj = new Date(emp.date_of_joining);
          // Only if joined in previous years
          if (doj.getFullYear() < todayDate.getFullYear()) {
            const currentYearAnniv = new Date(todayDate.getFullYear(), doj.getMonth(), doj.getDate());
            const nextYearAnniv = new Date(todayDate.getFullYear() + 1, doj.getMonth(), doj.getDate());

            if (currentYearAnniv >= todayDate && currentYearAnniv <= next30Days) {
              upcomingAnniversaries.push(emp);
            } else if (nextYearAnniv >= todayDate && nextYearAnniv <= next30Days) {
              upcomingAnniversaries.push(emp);
            }
          }
        }

        // Probation Checker
        if (emp.probation_end_date) {
          const probationDate = new Date(emp.probation_end_date);
          if (probationDate >= todayDate && probationDate <= next30Days) {
            probationEndingSoon.push(emp);
          }
        }
      });

      setStats({
        totalEmployees: totalEmployees || 0,
        upcomingBirthdays,
        upcomingAnniversaries,
        probationEndingSoon
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <AdminLayout title="" description="">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {currentDate}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Hero Card: Total Employees */}
        <div className="lg:col-span-3 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-teal-100 font-medium mb-1">Total Active Employees</p>
              <h2 className="text-5xl font-bold">{stats?.totalEmployees || 0}</h2>
              <p className="text-teal-100 mt-4 text-sm max-w-md">
                Manage your team members, track their progress, and handle extensive onboarding data efficiently.
              </p>
              <button
                onClick={() => navigate('/admin/employees')}
                className="mt-6 bg-white text-teal-700 px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-teal-50 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                View Directory <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="hidden md:block bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <Users className="w-24 h-24 text-white/90" />
            </div>
          </div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/5 rounded-full blur-3xl"></div>
        </div>

        {/* Reminders: Birthdays */}
        <ReminderCard
          title="Upcoming Birthdays"
          icon={<Gift className="w-5 h-5 text-pink-500" />}
          items={stats?.upcomingBirthdays || []}
          type="birthday"
          emptyText="No birthdays nearby"
        />

        {/* Reminders: Anniversaries */}
        <ReminderCard
          title="Work Anniversaries"
          icon={<Award className="w-5 h-5 text-amber-500" />}
          items={stats?.upcomingAnniversaries || []}
          type="anniversary"
          emptyText="No anniversaries nearby"
        />

        {/* Reminders: Probation */}
        <ReminderCard
          title="Probation Ending"
          icon={<Clock className="w-5 h-5 text-orange-500" />}
          items={stats?.probationEndingSoon || []}
          type="probation"
          emptyText="No probations ending soon"
        />

      </div>
    </AdminLayout>
  );
}

// Helper Component for Reminder Cards
function ReminderCard({ title, icon, items, type, emptyText }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${type === 'birthday' ? 'bg-pink-50' :
              type === 'anniversary' ? 'bg-amber-50' : 'bg-orange-50'
            }`}>
            {icon}
          </div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
          {items.length}
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {items.length > 0 ? (
          items.slice(0, 5).map((emp: any) => (
            <div key={emp.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-default">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                {emp.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{emp.full_name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 truncate">{emp.designation || 'N/A'}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xs font-medium px-2 py-1 rounded-md ${type === 'birthday' ? 'text-pink-700 bg-pink-50' :
                    type === 'anniversary' ? 'text-amber-700 bg-amber-50' : 'text-orange-700 bg-orange-50'
                  }`}>
                  {getDateLabel(emp, type)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
            <p>{emptyText}</p>
          </div>
        )}
      </div>

      {items.length > 5 && (
        <button className="mt-4 w-full py-2 text-xs font-medium text-gray-500 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors">
          View All ({items.length})
        </button>
      )}
    </div>
  );
}

function getDateLabel(emp: any, type: string) {
  const dateStr =
    type === 'birthday' ? emp.date_of_birth :
      type === 'anniversary' ? emp.date_of_joining :
        emp.probation_end_date;

  if (!dateStr) return 'N/A';

  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });
}