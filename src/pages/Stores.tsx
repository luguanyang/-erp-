import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { StoreItem } from '../types'

interface StoreForm {
  code: string
  name: string
  address?: string
  phone?: string
  manager?: string
  status: 'active' | 'disabled'
}

export default function Stores() {
  const [form] = Form.useForm<StoreForm>()
  const [list, setList] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<StoreItem | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.storeList()
      setList(res.list)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载门店失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 'active' })
    setDrawerOpen(true)
  }

  function openEdit(record: StoreItem) {
    setEditing(record)
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      address: record.address,
      phone: record.phone,
      manager: record.manager,
      status: record.status,
    })
    setDrawerOpen(true)
  }

  async function handleFinish(values: StoreForm) {
    setSaving(true)
    try {
      if (editing) {
        await api.storeUpdate({ id: editing.id, ...values })
        message.success('门店已更新')
      } else {
        await api.storeCreate(values)
        message.success('门店已创建')
      }
      setDrawerOpen(false)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(record: StoreItem) {
    Modal.confirm({
      title: `删除门店「${record.name}」`,
      content: '彻底删除后，后台和小程序都不再展示该门店，关联打印机和门店级库存会一并清理；门店下仍有门店账号时无法删除。历史订单保留。',
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.storeDelete(record.id)
          message.success('门店已彻底删除')
          await load()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败')
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        title="门店管理"
        subtitle="维护门店编号、联系方式和启停状态。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建门店
          </Button>
        }
      />
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<StoreItem>
            rowKey="id"
            dataSource={list}
            pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
            columns={[
              { title: '门店编号', dataIndex: 'code', width: 120 },
              { title: '门店名称', dataIndex: 'name' },
              { title: '地址', dataIndex: 'address' },
              { title: '电话', dataIndex: 'phone', width: 140 },
              { title: '负责人', dataIndex: 'manager', width: 120 },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (status: string) => (
                  <Tag color={status === 'active' ? 'green' : 'default'}>
                    {status === 'active' ? '营业中' : '已停用'}
                  </Tag>
                ),
              },
              {
                title: '操作',
                width: 160,
                render: (_, record) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => openEdit(record)}>
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => confirmDelete(record)}
                    >
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      </div>
      <Drawer
        title={editing ? '编辑门店' : '新建门店'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Form<StoreForm> form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="code" label="门店编号" rules={[{ required: true, message: '请输入门店编号' }]}>
            <Input placeholder="如 MD-1001" />
          </Form.Item>
          <Form.Item name="name" label="门店名称" rules={[{ required: true, message: '请输入门店名称' }]}>
            <Input placeholder="如 北京朝阳店" />
          </Form.Item>
          <Form.Item name="address" label="门店地址">
            <Input placeholder="请输入详细地址" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="manager" label="负责人">
            <Input placeholder="请输入负责人" />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: '营业中' },
                { value: 'disabled', label: '已停用' },
              ]}
            />
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存
            </Button>
          </Space>
        </Form>
      </Drawer>
    </>
  )
}
