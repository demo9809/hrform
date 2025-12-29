import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Users,
    LayoutDashboard,
    LogOut,
    Menu,
    X,
    ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
    actions?: React.ReactNode;
    onBack?: () => void;
}

export function AdminLayout({ children, title, description, actions, onBack }: AdminLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/admin/login');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: Users, label: 'Employees', path: '/admin/employees' },
        { icon: Menu, label: 'Assets', path: '/admin/assets' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold text-gray-900">HR Portal</span>
                </div>
                <div className="text-sm text-gray-500 truncate max-w-[150px]">{user?.email}</div>
            </div>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl text-gray-900">HR Portal</h2>
                            <p className="text-sm text-gray-600 mt-1 truncate max-w-[200px]">{user?.email}</p>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'text-gray-900 bg-gray-100'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
                                    {item.label}
                                </button>
                            );
                        })}
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

            <div className="lg:ml-64 min-h-screen flex flex-col">
                {/* Top Bar / Page Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-6 sticky top-0 z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                            )}
                            <div>
                                <h1 className="text-xl md:text-2xl font-semibold text-gray-900">{title}</h1>
                                {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                            </div>
                        </div>
                        {actions && (
                            <div className="flex items-center gap-3">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>

                {/* Page Content */}
                <div className="flex-1 p-4 md:p-8 bg-gray-50">
                    {children}
                </div>
            </div>
        </div>
    );
}
