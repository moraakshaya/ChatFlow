import React, { useState, useEffect } from 'react';
import { Key, Webhook as WebhookIcon, Plus, Trash2, Loader2, Copy, Check } from 'lucide-react';
import api from '../api/axios';
import { useWorkspace } from '../context/WorkspaceContext';

const DeveloperSettingsTab = () => {
    const { activeProject } = useWorkspace();
    const [apiKeys, setApiKeys] = useState([]);
    const [webhooks, setWebhooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // New Key State
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState('');
    const [copiedKey, setCopiedKey] = useState(false);

    // New Webhook State
    const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
    const [newWebhookName, setNewWebhookName] = useState('');
    const [newWebhookUrl, setNewWebhookUrl] = useState('');

    useEffect(() => {
        if (!activeProject) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [keysRes, hooksRes] = await Promise.all([
                    api.get(`/projects/${activeProject._id}/api-keys`),
                    api.get(`/projects/${activeProject._id}/webhooks`)
                ]);
                
                if (keysRes.data.success) setApiKeys(keysRes.data.data);
                if (hooksRes.data.success) setWebhooks(hooksRes.data.data);
            } catch (error) {
                console.error("Failed to fetch developer settings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [activeProject]);

    const handleCreateKey = async (e) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;
        
        setIsCreatingKey(true);
        setMessage({ type: '', text: '' });
        
        try {
            const res = await api.post(`/projects/${activeProject._id}/api-keys`, { name: newKeyName, scopes: ["read", "write"] });
            if (res.data.success) {
                setGeneratedKey(res.data.data.key);
                setApiKeys(prev => [res.data.data, ...prev]);
                setNewKeyName('');
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create API key.' });
        } finally {
            setIsCreatingKey(false);
        }
    };

    const handleRevokeKey = async (keyId) => {
        if (!window.confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
        
        try {
            const res = await api.patch(`/projects/${activeProject._id}/api-keys/${keyId}/revoke`);
            if (res.data.success) {
                setApiKeys(prev => prev.map(k => k._id === keyId ? { ...k, isRevoked: true } : k));
                setMessage({ type: 'success', text: 'API Key revoked.' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to revoke API key.' });
        }
    };

    const handleCreateWebhook = async (e) => {
        e.preventDefault();
        if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;
        
        setIsCreatingWebhook(true);
        setMessage({ type: '', text: '' });
        
        try {
            const res = await api.post(`/projects/${activeProject._id}/webhooks`, { 
                name: newWebhookName, 
                url: newWebhookUrl,
                events: ["message.created", "channel.created"]
            });
            if (res.data.success) {
                setWebhooks(prev => [res.data.data, ...prev]);
                setNewWebhookName('');
                setNewWebhookUrl('');
                setMessage({ type: 'success', text: 'Webhook created successfully.' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create Webhook.' });
        } finally {
            setIsCreatingWebhook(false);
        }
    };

    const handleDeleteWebhook = async (webhookId) => {
        if (!window.confirm("Are you sure you want to delete this Webhook?")) return;
        
        try {
            const res = await api.delete(`/projects/${activeProject._id}/webhooks/${webhookId}`);
            if (res.data.success) {
                setWebhooks(prev => prev.filter(w => w._id !== webhookId));
                setMessage({ type: 'success', text: 'Webhook deleted.' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete Webhook.' });
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    if (!activeProject) {
        return <div className="text-gray-400">Please select a project first.</div>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-white mb-6">Developer Settings</h3>
            
            {message.text && (
                <div className={`p-3 rounded-lg text-sm mb-6 ${
                    message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                    {message.text}
                </div>
            )}

            {/* API Keys Section */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                        <Key size={18} className="text-purple-400" />
                        API Keys
                    </h4>
                </div>
                
                {generatedKey && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <h5 className="text-yellow-400 font-medium mb-2">Save this key now!</h5>
                        <p className="text-xs text-yellow-500/80 mb-3">
                            You won't be able to see it again after closing this window.
                        </p>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                readOnly 
                                value={generatedKey} 
                                className="flex-1 bg-gray-950 border border-gray-700 text-gray-300 rounded px-3 py-2 text-sm font-mono"
                            />
                            <button 
                                onClick={() => copyToClipboard(generatedKey)}
                                className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded"
                            >
                                {copiedKey ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleCreateKey} className="flex gap-3 mb-6">
                    <input 
                        type="text" 
                        placeholder="New key name (e.g. Production App)" 
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                    />
                    <button 
                        type="submit"
                        disabled={isCreatingKey || !newKeyName.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isCreatingKey ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Create Key
                    </button>
                </form>

                <div className="bg-gray-950 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
                    {apiKeys.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">No API keys generated yet.</div>
                    ) : (
                        apiKeys.map(key => (
                            <div key={key._id} className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium ${key.isRevoked ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                            {key.name}
                                        </span>
                                        {key.isRevoked && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Revoked</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 font-mono">{key.keyHint || `${key.prefix}...`}</div>
                                </div>
                                {!key.isRevoked && (
                                    <button 
                                        onClick={() => handleRevokeKey(key._id)}
                                        className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1.5 rounded hover:bg-red-500/10 transition-colors"
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Webhooks Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                        <WebhookIcon size={18} className="text-green-400" />
                        Webhooks
                    </h4>
                </div>

                <form onSubmit={handleCreateWebhook} className="flex gap-3 mb-6">
                    <input 
                        type="text" 
                        placeholder="Webhook Name" 
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        className="w-1/3 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 text-sm"
                    />
                    <input 
                        type="url" 
                        placeholder="https://your-server.com/webhook" 
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 text-sm"
                    />
                    <button 
                        type="submit"
                        disabled={isCreatingWebhook || !newWebhookName.trim() || !newWebhookUrl.trim()}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isCreatingWebhook ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Add
                    </button>
                </form>

                <div className="bg-gray-950 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
                    {webhooks.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">No Webhooks configured yet.</div>
                    ) : (
                        webhooks.map(webhook => (
                            <div key={webhook._id} className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-200">{webhook.name}</span>
                                        <span className={`w-2 h-2 rounded-full ${webhook.isActive ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{webhook.url}</div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteWebhook(webhook._id)}
                                    className="text-gray-500 hover:text-red-400 p-2 rounded transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeveloperSettingsTab;
