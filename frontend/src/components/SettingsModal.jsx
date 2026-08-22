import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Lock, Bell, Check, Loader2, Eye, EyeOff, Building, Terminal, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import OrganizationSettingsTab from './OrganizationSettingsTab';
import DeveloperSettingsTab from './DeveloperSettingsTab';

const SettingsModal = ({ isOpen, onClose }) => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    
    // Profile State
    const [fullName, setFullName] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    // Security State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isSavingSecurity, setIsSavingSecurity] = useState(false);
    const [securityMessage, setSecurityMessage] = useState({ type: '', text: '' });

    // Preferences State
    const [preferences, setPreferences] = useState({
        messages: true,
        mentions: true,
        reactions: true,
        conversationAlerts: true
    });
    const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);
    const [preferencesMessage, setPreferencesMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen && user) {
            setFullName(user.fullName || '');
            setProfileMessage({ type: '', text: '' });
            setSecurityMessage({ type: '', text: '' });
            setPreferencesMessage({ type: '', text: '' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            
            // Fetch preferences
            const fetchPreferences = async () => {
                setIsLoadingPreferences(true);
                try {
                    const res = await api.get('/users/me/notification-preferences');
                    if (res.data.success && res.data.data) {
                        setPreferences(res.data.data);
                    }
                } catch (error) {
                    console.error("Failed to load preferences:", error);
                } finally {
                    setIsLoadingPreferences(false);
                }
            };
            fetchPreferences();
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setProfileMessage({ type: '', text: '' });
        setIsSavingProfile(true);

        try {
            const res = await api.patch(`/users/${user._id}`, { fullName });
            if (res.data.success) {
                updateUser({ fullName });
                setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
                setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
            }
        } catch (error) {
            setProfileMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'Failed to update profile.' 
            });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleSaveSecurity = async (e) => {
        e.preventDefault();
        setSecurityMessage({ type: '', text: '' });
        
        if (newPassword !== confirmNewPassword) {
            setSecurityMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (newPassword.length < 6) {
            setSecurityMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setIsSavingSecurity(true);

        try {
            const res = await api.patch('/auth/change-password', { currentPassword, newPassword });
            if (res.data.success) {
                setSecurityMessage({ type: 'success', text: 'Password changed successfully.' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setTimeout(() => setSecurityMessage({ type: '', text: '' }), 3000);
            }
        } catch (error) {
            setSecurityMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'Failed to change password.' 
            });
        } finally {
            setIsSavingSecurity(false);
        }
    };

    const handleTogglePreference = async (key) => {
        const newPreferences = { ...preferences, [key]: !preferences[key] };
        setPreferences(newPreferences); // Optimistic update
        setPreferencesMessage({ type: '', text: '' });
        setIsSavingPreferences(true);

        try {
            await api.patch('/users/me/notification-preferences', newPreferences);
            setPreferencesMessage({ type: 'success', text: 'Preferences saved.' });
            setTimeout(() => setPreferencesMessage({ type: '', text: '' }), 2000);
        } catch (error) {
            setPreferencesMessage({ type: 'error', text: 'Failed to save preferences.' });
            // Revert optimistic update
            setPreferences({ ...preferences, [key]: !newPreferences[key] });
        } finally {
            setIsSavingPreferences(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl flex overflow-hidden max-h-[85vh] border border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Left Sidebar Menu */}
                <div className="w-64 bg-gray-950 border-r border-gray-800 p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-white mb-4 px-2">Settings</h2>
                    
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'profile' 
                            ? 'bg-blue-600/10 text-blue-400' 
                            : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                        }`}
                    >
                        <UserIcon size={18} />
                        Profile
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('preferences')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'preferences' 
                            ? 'bg-blue-600/10 text-blue-400' 
                            : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                        }`}
                    >
                        <Bell size={18} />
                        Notifications
                    </button>

                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'security' 
                            ? 'bg-blue-600/10 text-blue-400' 
                            : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                        }`}
                    >
                        <Lock size={18} />
                        Security
                    </button>

                    {(user?.role === 'admin' || user?.role === 'owner') && (
                        <>
                            <div className="h-px bg-gray-800 my-2 mx-2"></div>
                            
                            <button 
                                onClick={() => setActiveTab('organization')}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === 'organization' 
                                    ? 'bg-blue-600/10 text-blue-400' 
                                    : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                                }`}
                            >
                                <Building size={18} />
                                Organization
                            </button>

                            <button 
                                onClick={() => setActiveTab('developer')}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === 'developer' 
                                    ? 'bg-blue-600/10 text-blue-400' 
                                    : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                                }`}
                            >
                                <Terminal size={18} />
                                Developer
                            </button>
                        </>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-900 relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 flex-1 overflow-y-auto">
                        
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white mb-6">Profile Settings</h3>
                                
                                <form onSubmit={handleSaveProfile} className="space-y-6">
                                    {profileMessage.text && (
                                        <div className={`p-3 rounded-lg text-sm ${
                                            profileMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                            {profileMessage.text}
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed sm:text-sm"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSavingProfile || !fullName.trim() || fullName === user?.fullName}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSavingProfile ? (
                                            <><Loader2 size={16} className="animate-spin" /> Saving...</>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'preferences' && (
                            <div className="max-w-lg animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white mb-6">Notification Preferences</h3>
                                
                                {isLoadingPreferences ? (
                                    <div className="flex items-center gap-3 text-gray-400 text-sm py-4">
                                        <Loader2 size={18} className="animate-spin" /> Loading preferences...
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {preferencesMessage.text && (
                                            <div className={`p-3 rounded-lg text-sm ${
                                                preferencesMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                                {preferencesMessage.text}
                                            </div>
                                        )}
                                        
                                        <div className="bg-gray-950 border border-gray-800 rounded-xl divide-y divide-gray-800">
                                            {[
                                                { id: 'messages', title: 'New Messages', desc: 'Receive notifications for new messages in channels you have joined.' },
                                                { id: 'mentions', title: 'Mentions & Replies', desc: 'Get notified when someone @mentions you or replies to your messages.' },
                                                { id: 'reactions', title: 'Reactions', desc: 'Get notified when someone reacts to your messages.' },
                                                { id: 'conversationAlerts', title: 'Conversation Alerts', desc: 'Receive alerts when you are added to a new conversation or group.' }
                                            ].map((pref) => (
                                                <div key={pref.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-900/50 transition-colors">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-200">{pref.title}</h4>
                                                        <p className="text-xs text-gray-500 mt-0.5">{pref.desc}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleTogglePreference(pref.id)}
                                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            preferences[pref.id] ? 'bg-blue-600' : 'bg-gray-700'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                preferences[pref.id] ? 'translate-x-4' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white mb-6">Security Settings</h3>
                                
                                <form onSubmit={handleSaveSecurity} className="space-y-5">
                                    {securityMessage.text && (
                                        <div className={`p-3 rounded-lg text-sm ${
                                            securityMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                            {securityMessage.text}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                required
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm pr-10"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-400"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm pr-10"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-400"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            required
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSavingSecurity || !currentPassword || !newPassword || !confirmNewPassword}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isSavingSecurity ? (
                                                <><Loader2 size={16} className="animate-spin" /> Updating Password...</>
                                            ) : (
                                                'Update Password'
                                            )}
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-12 pt-6 border-t border-gray-800">
                                    <h4 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h4>
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-200">Session Management</div>
                                            <div className="text-xs text-gray-500 mt-1">Log out of all other active sessions across devices.</div>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if (window.confirm("Are you sure you want to log out all other sessions?")) {
                                                    try {
                                                        await api.post('/auth/logout-all');
                                                        setSecurityMessage({ type: 'success', text: 'All other sessions have been logged out.' });
                                                    } catch (error) {
                                                        setSecurityMessage({ type: 'error', text: 'Failed to logout sessions.' });
                                                    }
                                                }
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <LogOut size={16} />
                                            Logout All Sessions
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Organization Tab */}
                        {activeTab === 'organization' && (user?.role === 'admin' || user?.role === 'owner') && (
                            <OrganizationSettingsTab />
                        )}

                        {/* Developer Tab */}
                        {activeTab === 'developer' && (user?.role === 'admin' || user?.role === 'owner') && (
                            <DeveloperSettingsTab />
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
