import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const DashboardLayout = () => {
    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <Sidebar />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Outlet />
            </div>
        </div>
    );
};

export default DashboardLayout;
