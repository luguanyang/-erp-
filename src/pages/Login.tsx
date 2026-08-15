import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Form, Input } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '../auth/AuthContext'

interface LoginValues {
  username: string
  password: string
}

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleFinish(values: LoginValues) {
    setLoading(true)
    setError('')
    try {
      await login(values.username.trim(), values.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="brand-page">
      <div className="brand-panel">
        <div className="brand-mark">金</div>
        <h1>金港仓储管理后台</h1>
        <p>
          集中管理门店、商品、库存、订单与打印设备，总负责人可跨门店查看经营数据，并对门店数据进行统一维护。
        </p>
      </div>
      <div className="login-card">
        <div className="login-box">
          <h2>管理员登录</h2>
          <div className="subtitle">使用已绑定的总负责人账号登录</div>
          {error ? (
            <Alert
              type="error"
              message={error}
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : null}
          <Form<LoginValues>
            layout="vertical"
            onFinish={handleFinish}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ marginTop: 8 }}
            >
              登录
            </Button>
          </Form>
        </div>
      </div>
    </div>
  )
}
