import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileHeader from '../components/MobileHeader';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-close sidebar on mobile when navigating to a new channel
    useEffect(() => {
        if (window.innerWidth <= 768) {
            setIsSidebarOpen(false);
        }
    }, [location]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-white">
            {/* Mobile Header (Hidden on Desktop) */}
            <MobileHeader 
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Main Area Below Header */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Sidebar Container */}
                <div 
                    className={`transition-all duration-300 ease-in-out shrink-0 h-full z-40 shadow-2xl md:shadow-none
                        absolute md:relative top-0 left-0
                        ${isSidebarOpen ? 'w-64 md:w-72' : 'w-0'}
                    `}
                >
                    <div className={`w-64 md:w-72 h-full absolute top-0 left-0 bg-gray-900 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <Sidebar />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                    <Outlet />
                </div>
                
                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div 
                        className="absolute inset-0 bg-black/50 z-30 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default DashboardLayout;
