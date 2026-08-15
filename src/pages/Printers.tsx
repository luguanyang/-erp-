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
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { PrinterItem, StoreItem } from '../types'

interface PrinterForm {
  storeId: string
  name: string
  type: string
  sn?: string
  status: '在线' | '离线'
}

export default function Printers() {
  const [form] = Form.useForm<PrinterForm>()
  const [list, setList] = useState<PrinterItem[]>([])
  const [stores, setStores] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<PrinterItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ keyword: '', storeId: '', status: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.printerList({ page, pageSize, ...filters })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载打印机失败')
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

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ type: '热敏小票', status: '在线' })
    setDrawerOpen(true)
  }

  function openEdit(record: PrinterItem) {
    setEditing(record)
    form.setFieldsValue({
      storeId: record.storeId,
      name: record.name,
      type: record.type,
      sn: record.sn,
      status: record.status === '离线' ? '离线' : '在线',
    })
    setDrawerOpen(true)
  }

  async function handleFinish(values: PrinterForm) {
    setSaving(true)
    try {
      if (editing) {
        await api.printerUpdate({ id: editing.id, ...values })
        message.success('打印机已更新')
      } else {
        await api.printerCreate(values)
        message.success('打印机已创建')
      }
      setDrawerOpen(false)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(record: PrinterItem) {
    Modal.confirm({
      title: `停用打印机「${record.name}」`,
      content: '停用后该打印机将不可再被选择，历史打印记录保留。',
      okText: '确认停用',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.printerDelete(record.id)
          message.success('打印机已停用')
          await load()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '停用失败')
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        title="打印机管理"
        subtitle="维护各门店小票和标签打印机。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建打印机
          </Button>
        }
      />
      <div className="filter-bar">
        <Input
          allowClear
          placeholder="搜索名称或设备号"
          prefix={<SearchOutlined />}
          style={{ width: 220 }}
          value={filters.keyword}
          onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
        />
        <Select
          allowClear
          placeholder="全部门店"
          style={{ width: 180 }}
          value={filters.storeId || undefined}
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(value) => setFilters((f) => ({ ...f, storeId: value || '' }))}
        />
        <Select
          allowClear
          placeholder="全部状态"
          style={{ width: 130 }}
          value={filters.status || undefined}
          options={[
            { value: '在线', label: '在线' },
            { value: '离线', label: '离线' },
          ]}
          onChange={(value) => setFilters((f) => ({ ...f, status: value || '' }))}
        />
        <Button type="primary" onClick={load}>
          查询
        </Button>
      </div>
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<PrinterItem>
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
              { title: '门店', dataIndex: 'storeName', width: 160 },
              { title: '名称', dataIndex: 'name' },
              { title: '类型', dataIndex: 'type', width: 120 },
              { title: '设备号', dataIndex: 'sn', width: 160 },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (status: string) => (
                  <Tag color={status === '在线' ? 'green' : 'default'}>{status}</Tag>
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
                    <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
                      停用
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      </div>
      <Drawer
        title={editing ? '编辑打印机' : '新建打印机'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Form<PrinterForm> form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择门店' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="name" label="打印机名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 前台小票机" />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select
              options={[
                { value: '热敏小票', label: '热敏小票' },
                { value: '标签打印', label: '标签打印' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sn" label="设备编号">
            <Input placeholder="请输入设备编号" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: '在线', label: '在线' },
                { value: '离线', label: '离线' },
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
