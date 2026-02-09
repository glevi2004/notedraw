'use client'

import { DashboardSidebar } from '@/app/dashboard/components/DashboardSidebar'
import { SidebarProvider } from '@/app/dashboard/components/SidebarContext'

export default function SceneLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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
  )
}
