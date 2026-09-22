import { useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard.jsx'
import Sidebar from './components/Sidebar.jsx'

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div
      className={`app-shell${isSidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}
    >
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
      />
      <Dashboard />
    </div>
  )
}

export default App
