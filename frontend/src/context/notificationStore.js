import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  // Load from localStorage on init
  initNotifications: () => {
    try {
      const saved = localStorage.getItem('max_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        const unread = parsed.filter(n => !n.read).length;
        set({ notifications: parsed, unreadCount: unread });
      }
    } catch (e) {
    }
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notification,
    };

    const updated = [newNotif, ...notifications].slice(0, 50); // Keep last 50
    try {
      localStorage.setItem('max_notifications', JSON.stringify(updated));
    } catch (e) {}

    set({ 
      notifications: updated, 
      unreadCount: updated.filter(n => !n.read).length 
    });

    // Return the id for toast dismissal matching
    return newNotif;
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updated = notifications.map(n => ({ ...n, read: true }));
    try {
      localStorage.setItem('max_notifications', JSON.stringify(updated));
    } catch (e) {}
    set({ notifications: updated, unreadCount: 0 });
  },

  markAsRead: (id) => {
    const { notifications } = get();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    try {
      localStorage.setItem('max_notifications', JSON.stringify(updated));
    } catch (e) {}
    set({ 
      notifications: updated, 
      unreadCount: updated.filter(n => !n.read).length 
    });
  },

  removeNotification: (id) => {
    const { notifications } = get();
    const updated = notifications.filter(n => n.id !== id);
    try {
      localStorage.setItem('max_notifications', JSON.stringify(updated));
    } catch (e) {}
    set({ 
      notifications: updated, 
      unreadCount: updated.filter(n => !n.read).length 
    });
  },

  clearAll: () => {
    try {
      localStorage.removeItem('max_notifications');
    } catch (e) {}
    set({ notifications: [], unreadCount: 0 });
  }
}));

export default useNotificationStore;
