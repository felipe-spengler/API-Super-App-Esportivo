import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export function AdminLayout() {
    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <Sidebar />

            {/* Main Content Area - Responsive padding */}
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                <Header />

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
