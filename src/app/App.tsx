import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { OnboardingForm } from './pages/OnboardingForm';
import { AdminLogin } from './pages/AdminLogin';
import { AdminSignup } from './pages/AdminSignup';
import { AdminDashboard } from './pages/AdminDashboard';
import { EmployeeList } from './pages/EmployeeList';
import { EmployeeDetail } from './pages/EmployeeDetail';
import { AssetList } from './pages/AssetList';
import { AssetDetail } from './pages/AssetDetail';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<OnboardingForm />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute>
                <EmployeeList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees/:id"
            element={
              <ProtectedRoute>
                <EmployeeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assets"
            element={
              <ProtectedRoute>
                <AssetList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assets/:id"
            element={
              <ProtectedRoute>
                <AssetDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}