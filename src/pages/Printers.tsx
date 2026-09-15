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
  Switch,
  Table,
  Tag,
  message,
} from 'antd'
import { EditOutlined, PlusOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import PrintPreview from '../components/PrintPreview'
import PrintTemplateFields from '../components/PrintTemplateFields'
import { PRINT_GROUPS } from '../printGroups'
import type { PrinterItem, PrintTemplate, StoreItem } from '../types'

interface PrinterForm {
  scope: 'store' | 'global'
  storeId: string
  name: string
  type: string
  sn: string
  printGroupId?: string
  status: '在线' | '离线'
}

export default function Printers() {
  const navigate = useNavigate()
  const [form] = Form.useForm<PrinterForm>()
  const [styleForm] = Form.useForm<PrintTemplate>()
  const [list, setList] = useState<PrinterItem[]>([])
  const [stores, setStores] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<PrinterItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [stylePrinter, setStylePrinter] = useState<PrinterItem | null>(null)
  const [styleDrawerOpen, setStyleDrawerOpen] = useState(false)
  const [styleDefault, setStyleDefault] = useState<PrintTemplate | null>(null)
  const [inheritDefault, setInheritDefault] = useState(true)
  const [styleSaving, setStyleSaving] = useState(false)
  const styleValues = Form.useWatch<PrintTemplate>([], styleForm)
  const scope = Form.useWatch('scope', form) || 'store'
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

  useEffect(() => {
    setPage(1)
  }, [filters])

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ scope: 'store', type: '热敏小票', printGroupId: '', status: '在线' })
    setDrawerOpen(true)
  }

  function openEdit(record: PrinterItem) {
    setEditing(record)
    form.setFieldsValue({
      scope: record.scope === 'global' || !record.storeId ? 'global' : 'store',
      storeId: record.scope === 'global' ? undefined : record.storeId,
      name: record.name,
      type: record.type,
      sn: record.sn,
      printGroupId: record.printGroupId || '',
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

  async function openStyle(record: PrinterItem) {
    const kind = record.type === '标签打印' ? 'label' : 'thermal'
    setStylePrinter(record)
    styleForm.resetFields()
    setInheritDefault(!record.templateOverride)
    setStyleDefault(null)
    try {
      const res = await api.printTemplateGet(kind)
      const merged = record.templateOverride
        ? Object.assign({}, res.template, record.templateOverride)
        : res.template
      setStyleDefault(merged)
      styleForm.setFieldsValue(merged)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载默认模板失败')
    }
    setStyleDrawerOpen(true)
  }

  async function saveStyle() {
    if (!stylePrinter) return
    setStyleSaving(true)
    try {
      await api.printerUpdate({
        id: stylePrinter.id,
        templateOverride: inheritDefault ? null : styleForm.getFieldsValue(),
      })
      setStyleDrawerOpen(false)
      message.success('打印机样式已保存')
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存样式失败')
    } finally {
      setStyleSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="打印机管理"
        subtitle="维护各门店小票和标签打印机。"
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => navigate('/print-templates')}>
              默认模板
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建打印机
            </Button>
          </Space>
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
          options={[
            { value: 'global', label: '全局共享' },
            ...stores.map((s) => ({ value: s.id, label: s.name })),
          ]}
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
              {
                title: '门店',
                dataIndex: 'storeName',
                width: 160,
                render: (value: string, record: PrinterItem) =>
                  record.scope === 'global' ? <Tag color="orange">全局</Tag> : value,
              },
              { title: '名称', dataIndex: 'name' },
              { title: '类型', dataIndex: 'type', width: 120 },
              { title: '设备号', dataIndex: 'sn', width: 160 },
              {
                title: '出单分组',
                dataIndex: 'printGroupId',
                width: 120,
                render: (value: string) => {
                  if (!value) return <span style={{ color: '#9ca3af' }}>全部订单</span>
                  const group = PRINT_GROUPS.find((g) => g.value === value)
                  return group ? <Tag color={group.color}>{group.label}</Tag> : value
                },
              },
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
                width: 220,
                render: (_, record) => (
                  <Space>
                    <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => openStyle(record)}>
                      样式
                    </Button>
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
          <Form.Item name="scope" label="使用范围" rules={[{ required: true, message: '请选择使用范围' }]}>
            <Select
              options={[
                { value: 'store', label: '指定门店' },
                { value: 'global', label: '全局共享' },
              ]}
              onChange={(value: 'store' | 'global') => {
                if (value === 'global') form.setFieldsValue({ storeId: undefined })
              }}
            />
          </Form.Item>
          {scope === 'store' ? (
            <Form.Item name="storeId" label="所属门店" rules={[{ required: true, message: '请选择门店' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Form.Item>
          ) : null}
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
          <Form.Item name="sn" label="飞鹅设备编号 (SN)" rules={[{ required: true, message: '请输入飞鹅设备编号' }]}>
            <Input placeholder="如 918800000" />
          </Form.Item>
          <Form.Item name="printGroupId" label="出单分组">
            <Select
              placeholder="全部订单"
              options={[
                { value: '', label: '全部订单' },
                ...PRINT_GROUPS.map((g) => ({ value: g.value, label: g.label })),
              ]}
            />
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
      <Drawer
        title={stylePrinter ? `打印样式 · ${stylePrinter.name}` : '打印样式'}
        width={680}
        open={styleDrawerOpen}
        onClose={() => setStyleDrawerOpen(false)}
      >
        <div className="style-inherit-row">
          <div>
            <strong>继承默认模板</strong>
            <div className="style-inherit-desc">开启后使用“打印模板”页的统一样式</div>
          </div>
          <Switch checked={inheritDefault} onChange={setInheritDefault} />
        </div>
        {inheritDefault ? (
          <>
            <div className="panel-card style-inherit-tip">
              该打印机将使用“打印模板”页的默认样式，可点击顶部“默认模板”统一调整。
            </div>
            <div className="preview-stage compact">
              <PrintPreview
                type={stylePrinter?.type === '标签打印' ? 'label' : 'thermal'}
                template={styleDefault || undefined}
                height={280}
              />
            </div>
          </>
        ) : (
          <>
            <Form<PrintTemplate> form={styleForm} layout="vertical">
              <PrintTemplateFields type={stylePrinter?.type === '标签打印' ? 'label' : 'thermal'} />
            </Form>
            <div className="preview-stage compact">
              <PrintPreview
                type={stylePrinter?.type === '标签打印' ? 'label' : 'thermal'}
                template={styleValues}
                height={280}
              />
            </div>
          </>
        )}
        <div className="drawer-footer">
          <Space>
            <Button onClick={() => setStyleDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={styleSaving} onClick={saveStyle}>
              保存样式
            </Button>
          </Space>
        </div>
      </Drawer>
    </>
  )
}
