import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // Use environment variable if available (for production), otherwise default to localhost logic
    const defaultUrl = import.meta.env.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `http://${window.location.hostname}:3000`);

    const [serverUrl, setServerUrl] = useState(defaultUrl);

    const connect = () => {
        if (socket) return;

        const newSocket = io(serverUrl, {
            transports: ['websocket'],
            upgrade: false
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from socket server');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            setIsConnected(false);
        });

        setSocket(newSocket);
    };

    const updateServerUrl = (url) => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
        setServerUrl(url);
    };

    useEffect(() => {
        // cleanup on unmount
        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    const value = {
        socket,
        isConnected,
        connect,
        serverUrl,
        updateServerUrl
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
