'use client'

import { DashboardSidebar } from './components/DashboardSidebar'
import { SidebarProvider } from './components/SidebarContext'

export default function DashboardLayout({
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
