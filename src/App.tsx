import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { MedievalLoginScreen } from '@/components/MedievalLoginScreen'
import { ThemeMusicController } from '@/components/ThemeMusicController'
import { ProtectedLayout } from '@/components/ProtectedLayout'
import { HomePage } from '@/pages/HomePage'
import { QuestScreen } from '@/pages/QuestScreen'
import { CurriculumNavigator } from '@/pages/CurriculumNavigator'
import { ShopUI } from '@/pages/ShopUI'
import { SocialUI } from '@/pages/SocialUI'
import { AttendenceUI } from '@/pages/AttendenceUI'
import { TeacherRegisterUI } from '@/pages/TeacherRegisterUI'
import { TeacherDashboard } from '@/pages/TeacherDashboard'
import { TeacherClassesOverview } from '@/pages/TeacherClassesOverview'
import { StaffroomUI } from '@/pages/StaffroomUI'
import { AssignmentSubmitUI } from '@/pages/AssignmentSubmitUI'
import { LearningTaskUI } from '@/pages/LearningTaskUI'
import { LearningTaskCreator } from '@/pages/LearningTaskCreator'
import { LearningTaskManager } from '@/pages/LearningTaskManager'
import { AdminUI } from '@/pages/AdminUI'
import { LedgerUI } from '@/pages/LedgerUI'
import { ThemeAdderUI } from '@/pages/ThemeAdderUI'
import '@/styles/globals.css'

const CUSTOM_THEMES_QUERY = gql`
  query CustomThemes {
    customThemes {
      name colorPrimary colorSecondary colorAccent colorText colorBgOverlay
    }
  }
`

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/" replace />
  return <ProtectedLayout>{children}</ProtectedLayout>
}

function App() {
  const { currentTheme, performanceTier, setPerformanceTier } = useThemeStore()

  // Inject CSS variables for all active custom themes
  const { data: customThemesData } = useQuery(CUSTOM_THEMES_QUERY, { fetchPolicy: 'network-only' })
  useEffect(() => {
    const themes = customThemesData?.customThemes ?? []
    const css = themes.map((t: {
      name: string; colorPrimary: string; colorSecondary: string;
      colorAccent: string; colorText: string; colorBgOverlay: string;
    }) => {
      const base = `/assets/themes/${t.name}`
      return `
      :root[data-theme='${t.name}'] {
        --color-primary:          ${t.colorPrimary};
        --color-secondary:        ${t.colorSecondary};
        --color-accent:           ${t.colorAccent};
        --color-text:             ${t.colorText};
        --color-bg-overlay:       ${t.colorBgOverlay};
        --theme-bg:               url('${base}/login/background.png');
        --theme-banner:           url('${base}/banner_top.png');
        --theme-banner-home:      url('${base}/banner_top.png');
        --theme-btn-primary:      url('${base}/btn_primary.png');
        --theme-btn-primary-sq:   url('${base}/btn_primary_sq.png');
        --button-plank:           url('${base}/btn_primary_sq.png');
        --primary-glow-effect:    portal-pulse 5s ease-in-out infinite;
      }
      [data-theme='${t.name}'] .btn-9slice {
        background-image: url('${base}/btn_primary.png') !important;
      }
      [data-theme='${t.name}'] .btn-portal {
        background-image: none !important;
        background-color: rgba(30, 58, 95, 0.75) !important;
        border: 1px solid rgba(74, 158, 255, 0.3) !important;
        box-shadow: 0 0 0 1px rgba(74, 158, 255, 0.08) !important;
      }
      [data-theme='${t.name}'] .btn-portal:hover {
        filter: none !important;
        background-color: rgba(30, 58, 95, 0.95) !important;
        border-color: rgba(74, 158, 255, 0.65) !important;
        box-shadow: 0 0 16px rgba(74, 158, 255, 0.2) !important;
      }
      [data-theme='${t.name}'] .tile-item {
        background-image: url('${base}/btn_primary_sq.png'), url('${base}/btn_primary.png') !important;
        background-size: 100% 100%, 100% 100% !important;
        background-color: transparent !important;
        border: none !important;
      }
      `
    }).join('\n')
    let styleEl = document.getElementById('dynamic-themes') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'dynamic-themes'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css
  }, [customThemesData])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
    document.documentElement.setAttribute('data-performance', performanceTier)

    const updatePerformanceTier = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        const effectiveType = connection?.effectiveType || '4g'
        const saveData = connection?.saveData || false
        setPerformanceTier(effectiveType === '4g' && !saveData ? 'High' : 'Low')
      }
    }

    updatePerformanceTier()

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updatePerformanceTier)
    }
  }, [currentTheme, performanceTier, setPerformanceTier])

  return (
    <BrowserRouter>
      <ThemeMusicController />
      <Routes>
        {/* Level 0: LoginPortal [The Mystic Gate] */}
        <Route
          path="/"
          element={
            <div className="w-screen h-screen overflow-hidden">
              <MedievalLoginScreen />
            </div>
          }
        />

        {/* Learner home / Teacher hub — role-switched inside HomePage */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* Level 3: LearningTaskEngine [The Quest Path] — direct from PrimaryAction */}
        <Route
          path="/learningtask"
          element={
            <ProtectedRoute>
              <QuestScreen />
            </ProtectedRoute>
          }
        />

        {/* Level 2: CurriculumNavigator [The Royal Library] */}
        <Route
          path="/subjects"
          element={
            <ProtectedRoute>
              <CurriculumNavigator />
            </ProtectedRoute>
          }
        />

        {/* Level 2: MarketplaceEntry [The Merchant's Stall] */}
        <Route
          path="/shop"
          element={
            <ProtectedRoute>
              <ShopUI />
            </ProtectedRoute>
          }
        />

        {/* Level 2: SocialHub [The Messenger Bird] */}
        <Route
          path="/social"
          element={
            <ProtectedRoute>
              <SocialUI />
            </ProtectedRoute>
          }
        />

        {/* Level 2: AttendanceModule [The Town Gathering] */}
        <Route
          path="/attendence"
          element={
            <ProtectedRoute>
              <AttendenceUI />
            </ProtectedRoute>
          }
        />

        {/* Teacher: All classes overview */}
        <Route
          path="/classes"
          element={
            <ProtectedRoute>
              <TeacherClassesOverview />
            </ProtectedRoute>
          }
        />

        {/* Teacher: Staffroom — staff chat, speaker channel, announcements */}
        <Route
          path="/staffroom"
          element={
            <ProtectedRoute>
              <StaffroomUI />
            </ProtectedRoute>
          }
        />

        {/* Teacher: Class Dashboard (single class, filtered by ?classId) */}
        <Route
          path="/teacherDashboard"
          element={
            <ProtectedRoute>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* Teacher: Register Period */}
        <Route
          path="/register"
          element={
            <ProtectedRoute>
              <TeacherRegisterUI />
            </ProtectedRoute>
          }
        />

        {/* LearningTaskUI [The Cooperative Quest] */}
        <Route
          path="/task"
          element={
            <ProtectedRoute>
              <LearningTaskUI />
            </ProtectedRoute>
          }
        />

        {/* Assignment hand-in [Submission Portal] */}
        <Route
          path="/submit/:taskId"
          element={
            <ProtectedRoute>
              <AssignmentSubmitUI />
            </ProtectedRoute>
          }
        />

        {/* Teacher: Learning Task Manager (Phase 5d) */}
        <Route
          path="/task-manager"
          element={
            <ProtectedRoute>
              <LearningTaskManager />
            </ProtectedRoute>
          }
        />

        {/* Teacher: Learning Task Creator (Phase 5d) */}
        <Route
          path="/task-creator"
          element={
            <ProtectedRoute>
              <LearningTaskCreator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task-creator/:taskId"
          element={
            <ProtectedRoute>
              <LearningTaskCreator />
            </ProtectedRoute>
          }
        />

        {/* Admin panel */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminUI />
            </ProtectedRoute>
          }
        />

        {/* Learner: points history ledger */}
        <Route
          path="/ledger"
          element={
            <ProtectedRoute>
              <LedgerUI />
            </ProtectedRoute>
          }
        />

        {/* Admin: Theme Adder wizard */}
        <Route
          path="/theme-adder"
          element={
            <ProtectedRoute>
              <ThemeAdderUI />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
