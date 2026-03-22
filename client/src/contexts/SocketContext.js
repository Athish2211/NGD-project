import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/display';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('price-update', (data) => {
      toast.success(`Price updated for ${data.productName}: ${formatINR(data.newPrice)}`, {
        duration: 4000,
        icon: '💰',
      });
    });

    newSocket.on('global-price-update', (data) => {
      console.log('Global price update:', data);
    });

    newSocket.on('new-order', (data) => {
      toast.success(`New order #${data.orderNumber} received!`, {
        duration: 5000,
        icon: '📦',
      });
    });

    newSocket.on('order-status-update', (data) => {
      toast(`Order #${data.orderId} status: ${data.status}`, {
        duration: 4000,
        icon: data.status === 'completed' ? '✅' : '📋',
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinProductRoom = (productId) => {
    if (socket) {
      socket.emit('join-product-room', productId);
    }
  };

  const leaveProductRoom = (productId) => {
    if (socket) {
      socket.emit('leave-product-room', productId);
    }
  };

  const value = {
    socket,
    connected,
    joinProductRoom,
    leaveProductRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
