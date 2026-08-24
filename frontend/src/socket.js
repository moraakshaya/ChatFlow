import { io } from 'socket.io-client';

export const createSocketClient = (token) => {
  const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    auth: {
      token
    },
    transports: ['websocket', 'polling'], // Fallback options
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  return socket;
};
