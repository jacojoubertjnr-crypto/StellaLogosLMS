import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LearnerHome } from '@/pages/LearnerHome'
import { TeacherHome } from '@/pages/TeacherHome'

// Role-based router for /home
export const HomePage: React.FC = () => {
  const { user } = useAuthStore()

  if (user?.role === 'Learner') return <LearnerHome />
  if (user?.role === 'Admin')   return <Navigate to="/admin" replace />
  return <TeacherHome />
}
