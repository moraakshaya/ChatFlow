import React, { useState, useEffect } from 'react';
import { Building, Loader2, Save } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const OrganizationSettingsTab = () => {
    const { user } = useAuth();
    const [organization, setOrganization] = useState(null);
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchOrg = async () => {
            if (!user?.organizationId) return;
            try {
                const res = await api.get(`/organizations/${user.organizationId}`);
                if (res.data.success) {
                    setOrganization(res.data.data);
                    setName(res.data.data.name);
                }
            } catch (error) {
                console.error("Failed to load organization:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrg();
    }, [user?.organizationId]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await api.patch(`/organizations/${organization._id}`, { name });
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Organization updated successfully.' });
                setOrganization(res.data.data);
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update organization.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
            </div>
        );
    }

    if (!organization) {
        return <div className="text-red-400">Organization not found.</div>;
    }

    return (
        <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Building size={20} className="text-blue-500" />
                Organization Settings
            </h3>
            
            <form onSubmit={handleSave} className="space-y-6">
                {message.text && (
                    <div className={`p-3 rounded-lg text-sm ${
                        message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {message.text}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Organization Slug (URL)
                    </label>
                    <input
                        type="text"
                        value={organization.slug}
                        disabled
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">The slug is used for system routing and cannot be changed.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Organization Name
                    </label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSaving || !name.trim() || name === organization.name}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSaving ? (
                        <><Loader2 size={16} className="animate-spin" /> Saving...</>
                    ) : (
                        <><Save size={16} /> Save Changes</>
                    )}
                </button>
            </form>
        </div>
    );
};

export default OrganizationSettingsTab;
