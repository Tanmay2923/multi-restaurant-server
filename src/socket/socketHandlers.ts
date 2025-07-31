import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

// User role enum
enum UserRole {
  CUSTOMER = 'CUSTOMER',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN',
  ADMIN = 'ADMIN'
}

interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware for socket connections
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user?.email} connected`);

    // Join user to their personal room
    socket.join(`user_${socket.user?.id}`);

    // Join location rooms based on user role
    socket.on('joinLocation', (locationId: number) => {
      socket.join(`location_${locationId}`);
      console.log(`User ${socket.user?.email} joined location ${locationId}`);
    });

    // Leave location room
    socket.on('leaveLocation', (locationId: number) => {
      socket.leave(`location_${locationId}`);
      console.log(`User ${socket.user?.email} left location ${locationId}`);
    });

    // Kitchen staff update order status
    socket.on('updateOrderStatus', (data: { orderId: number; status: string; locationId: number }) => {
      if (socket.user?.role === UserRole.KITCHEN || socket.user?.role === UserRole.ADMIN) {
        // Broadcast to all users in the location
        io.to(`location_${data.locationId}`).emit('orderStatusUpdated', {
          orderId: data.orderId,
          status: data.status,
          updatedBy: socket.user.email
        });
      }
    });

    // Real-time typing indicator for chat/notes
    socket.on('typing', (data: { locationId: number; isTyping: boolean }) => {
      socket.to(`location_${data.locationId}`).emit('userTyping', {
        userId: socket.user?.id,
        email: socket.user?.email,
        isTyping: data.isTyping
      });
    });

    // Handle notification acknowledgments
    socket.on('notificationRead', (data: { notificationId: string }) => {
      // Could implement notification tracking here
      console.log(`Notification ${data.notificationId} read by ${socket.user?.email}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.email} disconnected`);
    });
  });
};
