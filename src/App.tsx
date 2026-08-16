import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Stores from './pages/Stores'
import Categories from './pages/Categories'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import StockLogs from './pages/StockLogs'
import ProcessLogs from './pages/ProcessLogs'
import StockCountLogs from './pages/StockCountLogs'
import Warehouses from './pages/Warehouses'
import Orders from './pages/Orders'
import Users from './pages/Users'
import Printers from './pages/Printers'
import PrintLogs from './pages/PrintLogs'
import Statistics from './pages/Statistics'

dayjs.locale('zh-cn')

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="loading-screen">正在验证登录状态...</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

const router = createHashRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'stores', element: <Stores /> },
      { path: 'categories', element: <Categories /> },
      { path: 'products', element: <Products /> },
      { path: 'inventory', element: <Inventory /> },
      { path: 'inventory/logs', element: <StockLogs /> },
      { path: 'inventory/process', element: <ProcessLogs /> },
      { path: 'inventory/counts', element: <StockCountLogs /> },
      { path: 'warehouses', element: <Warehouses /> },
      { path: 'orders', element: <Orders /> },
      { path: 'users', element: <Users /> },
      { path: 'printers', element: <Printers /> },
      { path: 'print-logs', element: <PrintLogs /> },
      { path: 'statistics', element: <Statistics /> },
    ],
  },
])

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#E8542E',
          borderRadius: 8,
          colorText: '#24292f',
          fontFamily: '"Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfigProvider>
  )
}
