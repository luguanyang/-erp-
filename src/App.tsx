import { lazy, Suspense, type ReactNode } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Stores = lazy(() => import('./pages/Stores'))
const Categories = lazy(() => import('./pages/Categories'))
const Products = lazy(() => import('./pages/Products'))
const Inventory = lazy(() => import('./pages/Inventory'))
const StockLogs = lazy(() => import('./pages/StockLogs'))
const ProcessLogs = lazy(() => import('./pages/ProcessLogs'))
const StockCountLogs = lazy(() => import('./pages/StockCountLogs'))
const Warehouses = lazy(() => import('./pages/Warehouses'))
const Departments = lazy(() => import('./pages/Departments'))
const Orders = lazy(() => import('./pages/Orders'))
const Users = lazy(() => import('./pages/Users'))
const Printers = lazy(() => import('./pages/Printers'))
const PrintTemplates = lazy(() => import('./pages/PrintTemplates'))
const PrintLogs = lazy(() => import('./pages/PrintLogs'))
const Statistics = lazy(() => import('./pages/Statistics'))

dayjs.locale('zh-cn')

function RequireAuth({ children }: { children: ReactNode }) {
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
      { path: 'departments', element: <Departments /> },
      { path: 'orders', element: <Orders /> },
      { path: 'users', element: <Users /> },
      { path: 'printers', element: <Printers /> },
      { path: 'print-templates', element: <PrintTemplates /> },
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
        <Suspense fallback={<div className="loading-screen">页面加载中...</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </ConfigProvider>
  )
}
