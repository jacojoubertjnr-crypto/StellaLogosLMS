import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { gql } from '@apollo/client'
import { AppHeader } from '@/components/AppHeader'
import { TeacherChatBar } from '@/components/TeacherChatBar'
import { DevNav } from '@/components/DevNav'
import { useBackgroundPreloader } from '@/hooks/useBackgroundPreloader'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { apolloClient } from '@/lib/apolloClient'
import { applySkinsFromInventory, type SkinItem } from '@/lib/skinInjection'

const LESSON_ROUTES = ['/learningtask', '/task', '/submit']

const MY_INVENTORY_SKINS = gql`
  query MyInventorySkins {
    myInventory { name itemType assetPath active }
  }
`

export const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useBackgroundPreloader()
  const user = useAuthStore(s => s.user)
  const { pathname } = useLocation()
  const { setTheme } = useThemeStore()

  const isLearner = user?.role === 'Learner'
  const isLessonRoute = LESSON_ROUTES.some(r => pathname.startsWith(r))

  useEffect(() => {
    if (!isLearner) return
    apolloClient
      .query<{ myInventory: SkinItem[] }>({ query: MY_INVENTORY_SKINS, fetchPolicy: 'network-only' })
      .then(({ data }) => applySkinsFromInventory(data.myInventory, setTheme))
      .catch(() => {})
  }, [isLearner])

  return (
    <>
      <AppHeader />
      {isLearner && isLessonRoute && <TeacherChatBar />}
      {children}
      {import.meta.env.DEV && <DevNav />}
    </>
  )
}
