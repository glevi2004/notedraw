'use client'

import { Suspense } from 'react'
import { DashboardSidebar } from './components/DashboardSidebar'
import { SidebarProvider } from './components/SidebarContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <DashboardSidebar>
        {({ sidebarCollapsed, setSidebarCollapsed }) => (
          <SidebarProvider 
            sidebarCollapsed={sidebarCollapsed} 
            setSidebarCollapsed={setSidebarCollapsed}
          >
            {children}
          </SidebarProvider>
        )}
      </DashboardSidebar>
    </Suspense>
  )
}
