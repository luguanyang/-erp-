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
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { StoreItem, UserItem } from '../types'

interface UserForm {
  account: string
  name: string
  role: 'store' | 'head'
  storeId?: string
  phone?: string
  password?: string
  authUsername?: string
}

export default function Users() {
  const [form] = Form.useForm<UserForm>()
  const [list, setList] = useState<UserItem[]>([])
  const [stores, setStores] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ keyword: '', role: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.userList({ page, pageSize, ...filters })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载用户失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  useEffect(() => {
    api
      .storeList()
      .then((res) => setStores(res.list))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [filters])

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ role: 'store' })
    setDrawerOpen(true)
  }

  function openEdit(record: UserItem) {
    setEditing(record)
    form.setFieldsValue({
      account: record.account,
      name: record.name,
      role: record.role,
      storeId: record.storeId || undefined,
      phone: record.phone,
      password: '',
      authUsername: record.authUsername,
    })
    setDrawerOpen(true)
  }

  async function handleFinish(values: UserForm) {
    setSaving(true)
    try {
      if (editing) {
        const payload: Record<string, unknown> = { id: editing.id, ...values }
        if (!values.password) delete payload.password
        await api.userUpdate(payload)
        message.success('用户已更新')
      } else {
        await api.userCreate(values)
        message.success('用户已创建')
      }
      setDrawerOpen(false)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(record: UserItem) {
    Modal.confirm({
      title: `删除用户「${record.name}」`,
      content: '删除后该账号将无法登录小程序，历史订单仍会保留。',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.userDelete(record.id)
          message.success('用户已删除')
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
        title="用户管理"
        subtitle="维护门店账号和总负责人账号。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建用户
          </Button>
        }
      />
      <div className="filter-bar">
        <Input
          allowClear
          placeholder="搜索账号、姓名或手机号"
          prefix={<SearchOutlined />}
          style={{ width: 240 }}
          value={filters.keyword}
          onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
        />
        <Select
          allowClear
          placeholder="全部角色"
          style={{ width: 140 }}
          value={filters.role || undefined}
          options={[
            { value: 'store', label: '门店账号' },
            { value: 'head', label: '总负责人' },
          ]}
          onChange={(value) => setFilters((f) => ({ ...f, role: value || '' }))}
        />
        <Button type="primary" onClick={load}>
          查询
        </Button>
      </div>
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<UserItem>
            rowKey="id"
            dataSource={list}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (p, s) => {
                setPage(p)
                setPageSize(s)
              },
            }}
            columns={[
              { title: '账号', dataIndex: 'account', width: 180 },
              { title: '姓名', dataIndex: 'name', width: 140 },
              {
                title: '角色',
                dataIndex: 'role',
                width: 110,
                render: (role: string) => (
                  <Tag color={role === 'head' ? 'orange' : 'blue'}>
                    {role === 'head' ? '总负责人' : '门店账号'}
                  </Tag>
                ),
              },
              { title: '所属门店', dataIndex: 'storeName' },
              { title: '手机号', dataIndex: 'phone', width: 140 },
              {
                title: '后台登录',
                dataIndex: 'authUsername',
                width: 120,
                render: (value: string) => (value ? <Tag color="green">{value}</Tag> : '-'),
              },
              {
                title: '创建时间',
                dataIndex: 'createdAt',
                width: 140,
                render: (value) => (value ? dayjs(String(value)).format('YYYY-MM-DD') : '-'),
              },
              {
                title: '操作',
                width: 140,
                render: (_, record) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => openEdit(record)}>
                      编辑
                    </Button>
                    <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
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
        title={editing ? '编辑用户' : '新建用户'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Form<UserForm> form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="account" label="登录账号" rules={[{ required: true, message: '请输入登录账号' }]}>
            <Input placeholder="小程序登录账号" />
          </Form.Item>
          <Form.Item name="name" label="姓名/名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入姓名或名称" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'store', label: '门店账号' },
                { value: 'head', label: '总负责人' },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) => prev.role !== next.role}
          >
            {({ getFieldValue }) =>
              getFieldValue('role') === 'store' ? (
                <Form.Item
                  name="storeId"
                  label="所属门店"
                  rules={[{ required: true, message: '请选择门店' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={stores.map((s) => ({ value: s.id, label: s.name }))}
                  />
                </Form.Item>
              ) : (
                <Form.Item name="storeId" label="关联门店（总负责人可留空）">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={stores.map((s) => ({ value: s.id, label: s.name }))}
                  />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? '重置密码（留空则不修改）' : '初始密码'}
            rules={editing ? [] : [{ required: true, message: '请输入初始密码' }]}
          >
            <Input.Password placeholder="小程序登录密码" />
          </Form.Item>
          <Form.Item
            name="authUsername"
            label="后台登录用户名"
            extra="仅总负责人需要；需先在 CloudBase 用户管理中开通同名账号。"
          >
            <Input placeholder="如 admin" />
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
