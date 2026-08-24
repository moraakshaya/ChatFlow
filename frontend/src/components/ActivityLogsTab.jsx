import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const ActivityLogsTab = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await api.get('/activity-logs');
                if (res.data.success) {
                    setLogs(res.data.data);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load activity logs');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-700 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-100">Audit Logs</h3>
                <p className="text-sm text-gray-400">A chronological record of important events in your organization.</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
                {logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        No activity logs found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-gray-900/50 text-xs uppercase text-gray-400 border-b border-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">User</th>
                                    <th className="px-6 py-3 font-medium">Action</th>
                                    <th className="px-6 py-3 font-medium">Entity</th>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-700/20 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            {log.userId?.avatar ? (
                                                <img src={log.userId.avatar} alt="" className="w-8 h-8 rounded-full bg-gray-700" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">
                                                    {log.userId?.fullName?.charAt(0) || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-200">{log.userId?.fullName || 'Unknown User'}</div>
                                                <div className="text-xs text-gray-500">{log.userId?.email || ''}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-300 capitalize">{log.entity}</div>
                                            {log.metadata?.name && (
                                                <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                                                    {log.metadata.name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogsTab;
