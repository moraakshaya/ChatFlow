import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connectError, setConnectError] = useState(null);
    const { isAuthenticated, isInitialized } = useAuth();

    useEffect(() => {
        // Only connect if the user is fully authenticated and initialized
        if (isInitialized && isAuthenticated) {
            const token = localStorage.getItem('accessToken');
            
            if (token) {
                // Initialize socket connection
                const newSocket = io('http://localhost:5000', {
                    auth: {
                        token
                    },
                    // Optional: automatically reconnect
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000
                });

                newSocket.on('connect', () => {
                    console.log('Socket connected:', newSocket.id);
                    setConnectError(null);
                });

                newSocket.on('disconnect', (reason) => {
                    console.log('Socket disconnected:', reason);
                });
                
                newSocket.on('connect_error', (error) => {
                    console.error('Socket connection error:', error.message);
                    setConnectError(error.message);
                });

                setSocket(newSocket);

                // Cleanup on unmount or when auth state changes
                return () => {
                    newSocket.disconnect();
                };
            }
        }
    }, [isAuthenticated, isInitialized]);

    return (
        <SocketContext.Provider value={{ socket, connectError }}>
            {children}
        </SocketContext.Provider>
    );
};
