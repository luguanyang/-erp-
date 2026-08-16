import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Button, Dropdown, Layout, Menu, Space, Tag } from 'antd'
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PrinterOutlined,
  ProfileOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuth } from '../auth/AuthContext'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '总览' },
  { key: '/categories', icon: <AppstoreOutlined />, label: '分类' },
  { key: '/products', icon: <ProfileOutlined />, label: '商品' },
  {
    key: 'inventory-group',
    icon: <DatabaseOutlined />,
    label: '库存',
    children: [
      { key: '/inventory', icon: <DatabaseOutlined />, label: '库存' },
      { key: '/inventory/logs', icon: <FileTextOutlined />, label: '出入库记录' },
      { key: '/inventory/process', icon: <ExperimentOutlined />, label: '加工记录' },
      { key: '/inventory/counts', icon: <AuditOutlined />, label: '盘存记录' },
    ],
  },
  { key: '/warehouses', icon: <DatabaseOutlined />, label: '仓库' },
  { key: '/orders', icon: <FileTextOutlined />, label: '订单' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '下单统计' },
  {
    key: 'store-user',
    icon: <ShopOutlined />,
    label: '门店与用户',
    children: [
      { key: '/stores', icon: <ShopOutlined />, label: '门店' },
      { key: '/users', icon: <TeamOutlined />, label: '用户' },
    ],
  },
  {
    key: 'print-manage',
    icon: <PrinterOutlined />,
    label: '打印管理',
    children: [
      { key: '/printers', icon: <PrinterOutlined />, label: '打印机' },
      { key: '/print-logs', icon: <FileTextOutlined />, label: '打印记录' },
    ],
  },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const flatKeys = menuItems.flatMap((item) =>
    item.children ? item.children.map((c) => c.key) : [item.key],
  )
  const selectedKey =
    flatKeys.find((key) => location.pathname === key) ||
    flatKeys
      .filter((key) => location.pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0] ||
    '/dashboard'
  const openKeys = ['inventory-group', 'store-user', 'print-manage']

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: async () => {
          await logout()
          navigate('/login')
        },
      },
    ],
  }

  return (
    <Layout className="admin-shell">
      <Sider
        theme="dark"
        width={220}
        breakpoint="lg"
        collapsedWidth={72}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: '#20242a' }}
      >
        <div className="admin-logo">
          <span className="logo-dot">金</span>
          {!collapsed ? <span>金港仓储管理后台</span> : null}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: '#20242a', borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Space>
            <Tag color="orange" style={{ marginRight: 0 }}>
              总负责人后台
            </Tag>
            <span style={{ color: '#6b7280' }}>{user?.storeName || '全部门店'}</span>
          </Space>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Button type="text" style={{ height: 48 }}>
              <Space>
                <Avatar size="small" style={{ background: '#e8542e' }} icon={<UserOutlined />} />
                {user?.name || user?.account || '管理员'}
              </Space>
            </Button>
          </Dropdown>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
