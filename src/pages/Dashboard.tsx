import { useEffect, useState } from 'react'
import { Alert, Card, Col, Row, Spin, Statistic, Table, Tag } from 'antd'
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ShopOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { DashboardStats } from '../types'

export default function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .dashboardStats()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <Spin size="large" tip="加载总览数据" />
      </div>
    )
  }

  if (error || !data) {
    return <Alert type="error" message={error || '加载失败'} showIcon />
  }

  return (
    <>
      <PageHeader
        title="经营总览"
        subtitle={`欢迎回来，${data.operator || '总负责人'}。以下数据实时来自云端。`}
      />
      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} lg={4}>
          <Card className="panel-card stat-card">
            <Statistic
              title="门店"
              value={data.activeStoreCount}
              suffix={`/ ${data.storeCount}`}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card className="panel-card stat-card">
            <Statistic
              title="商品"
              value={data.activeProductCount}
              suffix={`/ ${data.productCount}`}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card className="panel-card stat-card">
            <Statistic
              title="累计订单"
              value={data.orderCount}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card className="panel-card stat-card">
            <Statistic
              title="今日订单"
              value={data.todayOrderCount}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card className="panel-card stat-card">
            <Statistic
              title="低库存商品"
              value={data.lowStockCount}
              valueStyle={{ color: data.lowStockCount > 0 ? '#c62828' : '#2e7d32' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card className="panel-card stat-card">
            <Statistic
              title="今日订货额"
              value={data.todayTotalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#e8542e' }}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            className="panel-card"
            title="最近订单"
            extra={<Tag color="orange">共 {data.orderCount} 单</Tag>}
          >
            <Table
              rowKey="orderNo"
              size="small"
              dataSource={data.recentOrders}
              pagination={false}
              columns={[
                { title: '订单号', dataIndex: 'orderNo' },
                { title: '门店', dataIndex: 'storeName' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (status: string) => (
                    <Tag color={status === '已下单' ? 'orange' : 'default'}>{status}</Tag>
                  ),
                },
                {
                  title: '金额',
                  dataIndex: 'totalAmount',
                  align: 'right',
                  render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            className="panel-card"
            title="低库存预警"
            extra={
              <Tag color={data.lowStockCount > 0 ? 'red' : 'green'}>
                {data.lowStockCount} 项
              </Tag>
            }
          >
            <Table
              rowKey="productId"
              size="small"
              dataSource={data.lowStockItems}
              pagination={false}
              columns={[
                { title: '商品', dataIndex: 'name' },
                { title: '规格', dataIndex: 'spec' },
                {
                  title: '库存',
                  dataIndex: 'stock',
                  render: (value: number, row) => (
                    <span>
                      {value} / {row.minStock} {row.unit}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
