import React, { createContext, useContext, useState, type ReactNode } from 'react'

interface Notification {
  id: string
  type: "achievement" | "poll" | "system" | "social" | "reminder"
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  priority: "low" | "medium" | "high"
  actionUrl?: string
  metadata?: {
    pollId?: string
    achievementType?: string
    points?: number
  }
}

interface NotificationContextType {
  unreadCount: number
  setUnreadCount: (count: number) => void
  updateUnreadCount: (change: number) => void
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Mock notifications data (in a real app, this would come from an API)
const initialNotifications: Notification[] = [
  {
    id: "1",
    type: "achievement",
    title: "New Achievement Unlocked! 🏆",
    message: 'Congratulations! You\'ve earned the "Quiz Master" badge for answering 50 questions correctly.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false,
    priority: "high",
    metadata: { achievementType: "Quiz Master", points: 100 },
  },
  {
    id: "2",
    type: "poll",
    title: "New Poll Available",
    message: 'Your instructor has created a new poll: "Understanding React Hooks". Join now to participate!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: false,
    priority: "medium",
    actionUrl: "/student/join-poll",
    metadata: { pollId: "poll-123" },
  },
  {
    id: "3",
    type: "social",
    title: "Leaderboard Update",
    message: "You've moved up to 3rd place on the class leaderboard! Keep up the great work!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    isRead: true,
    priority: "medium",
  },
  {
    id: "4",
    type: "system",
    title: "System Maintenance",
    message: "Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM EST. Some features may be temporarily unavailable.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    isRead: true,
    priority: "low",
  },
  {
    id: "5",
    type: "reminder",
    title: "Poll Reminder",
    message: 'Don\'t forget to complete the "JavaScript Fundamentals" poll. It closes in 2 hours!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    isRead: false,
    priority: "high",
  },
  {
    id: "6",
    type: "achievement",
    title: "Streak Achievement! 🔥",
    message: "Amazing! You've maintained a 7-day participation streak. You're on fire!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    isRead: true,
    priority: "medium",
    metadata: { achievementType: "Streak Master", points: 75 },
  },
]

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialNotifications.filter(n => !n.isRead).length)

  const updateUnreadCount = (change: number) => {
    setUnreadCount(prev => Math.max(0, prev + change))
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)
      const newUnreadCount = updated.filter(n => !n.isRead).length
      setUnreadCount(newUnreadCount)
      return updated
    })
  }

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(notif => ({ ...notif, isRead: true }))
      setUnreadCount(0)
      return updated
    })
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(notif => notif.id !== id)
      const newUnreadCount = updated.filter(n => !n.isRead).length
      setUnreadCount(newUnreadCount)
      return updated
    })
  }

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      setUnreadCount, 
      updateUnreadCount,
      notifications,
      setNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotificationContext = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}
