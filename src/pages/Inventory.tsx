import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd'
import {
  AuditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import StockVoucherPrint from '../components/StockVoucherPrint'
import type {
  CategoryItem,
  InventoryItem,
  ProductItem,
  StockLogItem,
  StockVoucherGroup,
  WarehouseItem,
} from '../types'

interface InventoryForm {
  stock: number
  minStock: number
  unit: string
}

interface StockMoveForm {
  qty: number
  price?: number
  warehouseId?: string
  inboundBy?: string
  operatorName?: string
  reason: string
}

interface ProcessForm {
  warehouseId?: string
  processed: number
  remark: string
}

interface CountForm {
  warehouseId?: string
  counted: number
  remark: string
}

interface BatchInboundItem {
  productId?: string
  qty?: number
  price?: number
  amount?: number
  remark?: string
}

interface BatchInboundForm {
  date: Dayjs
  warehouseId?: string
  inboundBy?: string
  operatorName?: string
  creator?: string
  inspector?: string
  departmentManager?: string
  items: BatchInboundItem[]
}

export default function Inventory() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [form] = Form.useForm<InventoryForm>()
  const [list, setList] = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [warehouseStocks, setWarehouseStocks] = useState<Record<string, number>>({})
  const [warehouseLoading, setWarehouseLoading] = useState(false)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [detailLogs, setDetailLogs] = useState<StockLogItem[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailProduct, setDetailProduct] = useState<{ id: string; name: string } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [processing, setProcessing] = useState<InventoryItem | null>(null)
  const [processForm] = Form.useForm<ProcessForm>()
  const [processOpen, setProcessOpen] = useState(false)
  const [counting, setCounting] = useState<InventoryItem | null>(null)
  const [countForm] = Form.useForm<CountForm>()
  const [countOpen, setCountOpen] = useState(false)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [moving, setMoving] = useState<{ record: InventoryItem; type: 'in' | 'out' } | null>(null)
  const [moveForm] = Form.useForm<StockMoveForm>()
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchForm] = Form.useForm<BatchInboundForm>()
  const [batchSaving, setBatchSaving] = useState(false)
  const [stockVoucherOpen, setStockVoucherOpen] = useState(false)
  const [stockVoucherGroups, setStockVoucherGroups] = useState<StockVoucherGroup[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    keyword: '',
    warehouseId: '',
    category: '',
    subcategory: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.inventoryList({ page, pageSize, ...filters })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载库存失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  useEffect(() => {
    api
      .categoryList()
      .then((res) => setCategories(res.list))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    api
      .warehouseList()
      .then((res) => setWarehouses(res.list))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    api
      .productList({ page: 1, pageSize: 200 })
      .then((res) => setProducts(res.list))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [filters])

  function openEdit(record: InventoryItem) {
    setEditing(record)
    form.setFieldsValue({
      stock: record.stock,
      minStock: record.minStock,
      unit: record.unit,
    })
  }

  async function handleSave(values: InventoryForm) {
    if (!editing) return
    setSaving(true)
    try {
      await api.inventoryUpdate([
        {
          id: editing.id,
          warehouseId: filters.warehouseId || editing.storeId || 'wh_main',
          productId: editing.productId,
          unit: values.unit,
          stock: values.stock,
          processed: editing.processed,
          minStock: values.minStock,
        },
      ])
      message.success('库存已更新')
      setEditing(null)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function openMove(record: InventoryItem, type: 'in' | 'out') {
    let latestWarehouses = warehouses
    // 先立即打开弹窗，避免等待网络请求
    setMoving({ record, type })
    moveForm.resetFields()
    moveForm.setFieldsValue({
      qty: 1,
      price: type === 'in' ? 0 : undefined,
      warehouseId: undefined,
      inboundBy: type === 'in' ? '' : undefined,
      operatorName: type === 'in' ? currentUser?.name || '' : undefined,
      reason: '',
    })
    // 并行加载仓库列表和出库库存，避免串行等待
    if (type === 'out') {
      setWarehouseLoading(true)
      try {
        const [whRes, stockRes] = await Promise.all([
          api.warehouseList(),
          api.stockProductWarehouses(record.productId),
        ])
        latestWarehouses = whRes.list
        setWarehouses(whRes.list)
        const stockMap: Record<string, number> = {}
        stockRes.list.forEach((item) => {
          stockMap[item.warehouseId] = Number(item.stock || 0)
        })
        setWarehouseStocks(stockMap)
        const firstWithStock =
          whRes.list.find((wh) => Number(stockMap[wh.id] || 0) > 0)?.id || ''
        const preferred =
          filters.warehouseId && stockMap[filters.warehouseId] !== undefined
            ? filters.warehouseId
            : ''
        moveForm.setFieldValue('warehouseId', preferred || firstWithStock || '')
      } catch {
        // 库存加载失败时仍可手选仓库
      } finally {
        setWarehouseLoading(false)
      }
    } else {
      setWarehouseLoading(true)
      try {
        const res = await api.warehouseList()
        setWarehouses(res.list)
        moveForm.setFieldValue('warehouseId', res.list[0]?.id || '')
      } catch {
        // 保留当前列表
      } finally {
        setWarehouseLoading(false)
      }
    }
  }

  async function openInboundDetail(record: InventoryItem) {
    setDetailProduct({ id: record.productId, name: record.productName })
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await api.stockLogList({
        type: 'in',
        productId: record.productId,
        page: 1,
        pageSize: 200,
      })
      setDetailLogs(res.list)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载入库记录失败')
    } finally {
      setDetailLoading(false)
    }
  }

  function openProcess(record: InventoryItem) {
    setProcessing(record)
    processForm.resetFields()
    processForm.setFieldsValue({
      warehouseId:
        filters.warehouseId ||
        warehouses[0]?.id ||
        (record.storeId !== 'all' ? record.storeId : 'wh_main'),
      processed: record.processed ?? record.stock,
      remark: '',
    })
    setProcessOpen(true)
  }

  async function handleProcess(values: ProcessForm) {
    if (!processing) return
    setSaving(true)
    try {
      await api.stockProcess({
        productId: processing.productId,
        warehouseId: values.warehouseId || 'wh_main',
        productName: processing.productName,
        warehouseName:
          warehouses.find((w) => w.id === values.warehouseId)?.name || processing.storeName,
        processed: values.processed,
        remark: values.remark,
      })
      message.success('加工登记成功')
      setProcessOpen(false)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加工登记失败')
    } finally {
      setSaving(false)
    }
  }

  function openCount(record: InventoryItem) {
    setCounting(record)
    countForm.resetFields()
    countForm.setFieldsValue({
      warehouseId:
        filters.warehouseId ||
        warehouses[0]?.id ||
        (record.storeId !== 'all' ? record.storeId : 'wh_main'),
      counted: record.counted ?? record.processed ?? record.stock,
      remark: '',
    })
    setCountOpen(true)
  }

  async function handleCount(values: CountForm) {
    if (!counting) return
    setSaving(true)
    try {
      await api.stockCount({
        productId: counting.productId,
        warehouseId: values.warehouseId || 'wh_main',
        productName: counting.productName,
        warehouseName:
          warehouses.find((w) => w.id === values.warehouseId)?.name || counting.storeName,
        counted: values.counted,
        remark: values.remark,
      })
      message.success('盘存成功')
      setCountOpen(false)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '盘存失败')
    } finally {
      setSaving(false)
    }
  }

  function openBatchInbound() {
    batchForm.resetFields()
    batchForm.setFieldsValue({
      date: dayjs(),
      warehouseId: warehouses[0]?.id || '',
      inboundBy: '',
      operatorName: currentUser?.name || '',
      creator: currentUser?.name || '',
      inspector: '',
      departmentManager: '',
      items: [{ productId: undefined, qty: 1, price: 0, amount: 0, remark: '' }],
    })
    setBatchOpen(true)
  }

  function batchDraftKey() {
    return 'inventory_batch_inbound_draft'
  }

  function removeBatchDraft() {
    localStorage.removeItem(batchDraftKey())
  }

  function saveBatchDraft() {
    try {
      const values = batchForm.getFieldsValue()
      const draft = Object.assign({}, values, {
        date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      })
      localStorage.setItem(batchDraftKey(), JSON.stringify(draft))
      message.success('已暂存入库单')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '暂存失败')
    }
  }

  function loadBatchDraft() {
    try {
      const raw = localStorage.getItem(batchDraftKey())
      if (!raw) {
        message.info('当前没有暂存的入库单')
        return
      }
      const draft = JSON.parse(raw)
      batchForm.setFieldsValue(
        Object.assign({}, draft, {
          date: draft.date ? dayjs(draft.date) : dayjs(),
        }),
      )
      message.success('已读取暂存入库单')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '读取暂存失败')
    }
  }

  function clearBatchDraft() {
    try {
      removeBatchDraft()
      message.success('暂存已清空')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '清空暂存失败')
    }
  }

  function syncBatchRow(
    index: number,
    changed: 'qty' | 'price' | 'amount',
    value: number | null,
  ) {
    const items = batchForm.getFieldValue('items') || []
    const row = items[index] || {}
    const qty = changed === 'qty' ? Number(value || 0) : Number(row.qty || 0)
    const price = changed === 'price' ? Number(value || 0) : Number(row.price || 0)
    const amount = changed === 'amount' ? Number(value || 0) : Number(row.amount || 0)

    if (changed === 'amount' && qty > 0 && amount > 0) {
      const nextPrice = Math.round((amount / qty) * 100) / 100
      if (nextPrice !== Number(row.price || 0)) {
        batchForm.setFieldValue(['items', index, 'price'], nextPrice)
      }
      return
    }

    if (changed === 'qty' && qty > 0) {
      if (amount > 0) {
        const nextPrice = Math.round((amount / qty) * 100) / 100
        batchForm.setFieldValue(['items', index, 'price'], nextPrice)
      } else if (price > 0) {
        const nextAmount = Math.round(qty * price * 100) / 100
        batchForm.setFieldValue(['items', index, 'amount'], nextAmount)
      }
      return
    }

    if (changed === 'price' && qty > 0 && price >= 0) {
      const nextAmount = Math.round(qty * price * 100) / 100
      batchForm.setFieldValue(['items', index, 'amount'], nextAmount)
    }
  }

  function printBatchInbound() {
    const values = batchForm.getFieldsValue()
    const warehouseName =
      warehouses.find((w) => w.id === values.warehouseId)?.name || '默认仓库'
    const date = values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
    const logs = (values.items || [])
      .filter((item: BatchInboundItem) => item.productId)
      .map((item: BatchInboundItem, index: number) => {
        const product = products.find((p) => p.id === item.productId)
        return {
          id: `batch_in_${Date.now()}_${index}`,
          productName: product?.name || '未选择商品',
          spec: product?.spec || '',
          unit: product?.unit || '件',
          qty: Number(item.qty || 0),
          price: Number(item.price || 0),
          warehouseName,
          inboundBy: values.inboundBy || '',
          operatorName: values.operatorName || '',
          reason: item.remark || '',
          createdAt: new Date(),
        }
      })

    if (!logs.length) {
      message.warning('请先选择至少一个商品')
      return
    }

    setStockVoucherGroups([
      {
        warehouseName,
        date,
        logs,
      },
    ])
    setStockVoucherOpen(true)
    setTimeout(() => window.print(), 100)
  }

  async function handleBatchInbound(values: BatchInboundForm) {
    const validItems = (values.items || []).filter(
      (item) => item.productId && Number(item.qty || 0) > 0,
    )
    if (!values.warehouseId) {
      message.warning('请选择入库仓库')
      return
    }
    if (!validItems.length) {
      message.warning('请至少录入一个有效商品')
      return
    }

    setBatchSaving(true)
    try {
      for (let index = 0; index < validItems.length; index += 1) {
        const item = validItems[index]
        try {
          await api.stockMove({
            productId: item.productId,
            type: 'in',
            qty: Number(item.qty || 0),
            price: Number(item.price || 0),
            warehouseId: values.warehouseId,
            inboundBy: values.inboundBy,
            operatorName: values.operatorName,
            reason: item.remark || '',
          })
        } catch (err) {
          message.error(
            `第 ${index + 1} 条入库失败：${
              err instanceof Error ? err.message : '请检查商品和数量'
            }`,
          )
          return
        }
      }
      message.success(`批量入库成功，共 ${validItems.length} 条`)
      setBatchOpen(false)
      removeBatchDraft()
      await load()
    } finally {
      setBatchSaving(false)
    }
  }

  const currentProcessed = Form.useWatch('processed', processForm)
  const currentLoss = Math.max(0, (processing?.stock || 0) - Number(currentProcessed || 0))
  const currentCounted = Form.useWatch('counted', countForm)
  const countDiff = Number(currentCounted || 0) - (counting?.stock || 0)
  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name}${p.spec ? `（${p.spec}）` : ''}`,
  }))

  async function handleMove(values: StockMoveForm) {
    if (!moving) return
    setSaving(true)
    try {
      await api.stockMove({
        productId: moving.record.productId,
        type: moving.type,
        qty: values.qty,
        price: moving.type === 'in' ? values.price : undefined,
        warehouseId: values.warehouseId,
        inboundBy: moving.type === 'in' ? values.inboundBy : undefined,
        operatorName: moving.type === 'in' ? values.operatorName : undefined,
        reason: values.reason,
      })
      message.success(moving.type === 'in' ? '入库成功' : '出库成功')
      setMoving(null)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="库存管理"
        subtitle="维护商品库存和最低库存线，低库存会出现在总览预警中。"
      />
      <div className="filter-bar">
        <Select
          style={{ width: 160 }}
          value={filters.warehouseId}
          options={[
            { value: '', label: '全部仓库' },
            ...warehouses.map((w) => ({ value: w.id, label: w.name })),
          ]}
          onChange={(value) => setFilters((f) => ({ ...f, warehouseId: value || '' }))}
        />
        <Input
          allowClear
          placeholder="搜索商品或门店"
          prefix={<SearchOutlined />}
          style={{ width: 220 }}
          value={filters.keyword}
          onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
        />
        <Select
          allowClear
          placeholder="全部分类"
          style={{ width: 150 }}
          value={filters.category || undefined}
          options={categories.map((c) => ({ value: c.key, label: c.name }))}
          onChange={(value) =>
            setFilters((f) => ({ ...f, category: value || '', subcategory: '' }))
          }
        />
        <Select
          allowClear
          placeholder="全部子分类"
          style={{ width: 160 }}
          value={filters.subcategory || undefined}
          options={(
            categories.find((c) => c.key === filters.category)?.subcategories || []
          ).map((s) => ({ value: s, label: s }))}
          onChange={(value) => setFilters((f) => ({ ...f, subcategory: value || '' }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openBatchInbound}>
          入库
        </Button>
        <Button icon={<HistoryOutlined />} onClick={() => navigate('/inventory/logs')}>
          出入库记录
        </Button>
        <Button icon={<ExperimentOutlined />} onClick={() => navigate('/inventory/process')}>
          加工记录
        </Button>
        <Button icon={<AuditOutlined />} onClick={() => navigate('/inventory/counts')}>
          盘存记录
        </Button>
        <Button type="primary" onClick={load}>
          查询
        </Button>
      </div>
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<InventoryItem>
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
              { title: '商品', dataIndex: 'productName' },
              { title: '规格', dataIndex: 'spec' },
              { title: '门店/范围', dataIndex: 'storeName' },
              {
                title: '入库库存',
                dataIndex: 'stock',
                render: (value: number) => <strong>{value}</strong>,
              },
              {
                title: '加工后库存',
                dataIndex: 'processed',
                render: (value: number) => (
                  <strong style={{ color: 'var(--success)' }}>{value ?? 0}</strong>
                ),
              },
              {
                title: '损耗',
                dataIndex: 'loss',
                width: 90,
                render: (value: number) => (
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{value ?? 0}</span>
                ),
              },
              {
                title: '出库',
                dataIndex: 'issued',
                width: 90,
                render: (value: number) => <strong>{value ?? 0}</strong>,
              },
              {
                title: '盘存数',
                dataIndex: 'counted',
                width: 90,
                render: (value: number) =>
                  value === undefined || value === null ? '-' : <strong>{value}</strong>,
              },
              { title: '最低库存', dataIndex: 'minStock' },
              {
                title: '成本参考',
                dataIndex: 'costPrice',
                width: 180,
                render: (value: number | null, record: InventoryItem) =>
                  value === null || value === undefined ? (
                    <Button type="link" size="small" onClick={() => openInboundDetail(record)}>
                      查看记录
                    </Button>
                  ) : (
                    <>
                      ¥{Number(value).toFixed(2)}{' '}
                      <Button type="link" size="small" onClick={() => openInboundDetail(record)}>
                        查看记录
                      </Button>
                    </>
                  ),
              },
              {
                title: '状态',
                dataIndex: 'low',
                render: (low: boolean) => (
                  <Tag color={low ? 'red' : 'green'}>{low ? '低库存' : '正常'}</Tag>
                ),
              },
              {
                title: '操作',
                width: 340,
                render: (_, record) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => openMove(record, 'in')}
                    >
                      入库
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => openMove(record, 'out')}
                    >
                      出库
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<ExperimentOutlined />}
                      onClick={() => openProcess(record)}
                    >
                      加工/损耗
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<AuditOutlined />}
                      onClick={() => openCount(record)}
                    >
                      盘存
                    </Button>
                    <Button type="link" size="small" onClick={() => openEdit(record)}>
                      编辑
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      </div>
      <Modal
        title={`编辑库存 · ${editing?.productName || ''}`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form<InventoryForm> form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="stock" label="当前库存" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="minStock" label="最低库存" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space direction="vertical" style={{ color: '#6b7280', fontSize: 12 }}>
            <span>保存后，低库存预警会按最新数值重新计算。</span>
          </Space>
        </Form>
      </Modal>
      <Modal
        title={`${moving?.type === 'out' ? '出库' : '入库'}  · ${moving?.record.productName || ''}`}
        open={!!moving}
        onCancel={() => setMoving(null)}
        onOk={() => moveForm.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form<StockMoveForm> form={moveForm} layout="vertical" onFinish={handleMove}>
          <Form.Item name="qty" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="warehouseId"
            label={moving?.type === 'out' ? '出库仓库' : '入库仓库'}
            rules={[{ required: true, message: '请选择仓库' }]}
          >
            <Select
              loading={warehouseLoading}
              placeholder="请选择仓库"
              options={warehouses.map((w) => {
                const stock = moving?.type === 'out' ? Number(warehouseStocks[w.id] || 0) : null
                return {
                  value: w.id,
                  label: stock === null ? w.name : `${w.name}（${stock} ${moving?.record.unit || ''}）`,
                  disabled: stock !== null && stock <= 0,
                }
              })}
            />
          </Form.Item>
          {moving?.type === 'in' ? (
            <Form.Item name="inboundBy" label="入库申报人">
              <Input placeholder="填写本次入库申报人" />
            </Form.Item>
          ) : null}
          {moving?.type === 'in' ? (
            <Form.Item name="operatorName" label="操作员">
              <Input placeholder="填写本次操作员" />
            </Form.Item>
          ) : null}
          {moving?.type === 'in' ? (
            <Form.Item
              name="price"
              label="入库价格"
              rules={[{ required: true, message: '请输入入库价格' }]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" />
            </Form.Item>
          ) : null}
          <Form.Item name="reason" label="原因/备注">
            <Input.TextArea rows={3} placeholder="选填，例如采购入库、门店领用等" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`入库记录 · ${detailProduct?.name || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <Spin spinning={detailLoading}>
          <Table<StockLogItem>
            rowKey="id"
            dataSource={detailLogs}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            columns={[
              { title: '仓库', dataIndex: 'warehouseName', width: 120 },
              {
                title: '价格',
                dataIndex: 'price',
                width: 100,
                render: (v: number) => `¥${Number(v || 0).toFixed(2)}`,
              },
              { title: '数量', dataIndex: 'qty', width: 80 },
              { title: '单位', dataIndex: 'unit', width: 70 },
              {
                title: '入库申报人',
                dataIndex: 'inboundBy',
                width: 120,
                render: (v: string) => v || '-',
              },
              {
                title: '操作员',
                dataIndex: 'operatorName',
                width: 120,
                render: (v: string) => v || '-',
              },
              { title: '原因', dataIndex: 'reason', ellipsis: true },
              {
                title: '时间',
                dataIndex: 'createdAt',
                width: 170,
                render: (v: string | Date) => new Date(v).toLocaleString('zh-CN'),
              },
            ]}
          />
        </Spin>
      </Modal>
      <Modal
        title={`加工登记 · ${processing?.productName || ''}`}
        open={processOpen}
        onCancel={() => setProcessOpen(false)}
        onOk={() => processForm.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form<ProcessForm> form={processForm} layout="vertical" onFinish={handleProcess}>
          <Form.Item
            name="warehouseId"
            label="加工仓库"
            rules={[{ required: true, message: '请选择仓库' }]}
          >
            <Select
              placeholder="请选择仓库"
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            />
          </Form.Item>
          <Form.Item
            name="processed"
            label="加工后数量"
            rules={[
              { required: true, message: '请输入加工后数量' },
              {
                type: 'number',
                max: processing?.stock || 0,
                message: `不能大于入库库存 ${processing?.stock || 0}`,
              },
            ]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              addonAfter={processing?.unit || '件'}
            />
          </Form.Item>
          <div
            style={{
              padding: '10px 12px',
              marginBottom: 16,
              borderRadius: 8,
              background: currentLoss > 0 ? '#fff1ec' : '#f1f8f1',
              color: currentLoss > 0 ? 'var(--danger)' : 'var(--success)',
              fontSize: 13,
            }}
          >
            入库库存 {processing?.stock || 0}，加工后 {Number(currentProcessed || 0)}，损耗{' '}
            {currentLoss}
          </div>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填，例如清洗、切配、分装等" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`盘存 · ${counting?.productName || ''}`}
        open={countOpen}
        onCancel={() => setCountOpen(false)}
        onOk={() => countForm.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form<CountForm> form={countForm} layout="vertical" onFinish={handleCount}>
          <Form.Item
            name="warehouseId"
            label="盘存仓库"
            rules={[{ required: true, message: '请选择仓库' }]}
          >
            <Select
              placeholder="请选择仓库"
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            />
          </Form.Item>
          <Form.Item
            name="counted"
            label="盘存数"
            rules={[{ required: true, message: '请输入盘存数' }]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              addonAfter={counting?.unit || '件'}
            />
          </Form.Item>
          <div
            style={{
              padding: '10px 12px',
              marginBottom: 16,
              borderRadius: 8,
              background: countDiff === 0 ? '#f1f8f1' : '#fff1ec',
              color: countDiff === 0 ? 'var(--success)' : 'var(--danger)',
              fontSize: 13,
            }}
          >
            当前库存 {counting?.stock || 0}，预计差异{' '}
            {countDiff > 0 ? `+${countDiff}` : countDiff}
          </div>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填，例如月末盘点、临时盘点等" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="批量入库"
        width={920}
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
      >
        <Form<BatchInboundForm>
          form={batchForm}
          layout="vertical"
          onFinish={handleBatchInbound}
        >
          <Space size={12} style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Form.Item name="date" label="入库日期" rules={[{ required: true }]}>
              <DatePicker style={{ width: 150 }} />
            </Form.Item>
            <Form.Item
              name="warehouseId"
              label="入库仓库"
              rules={[{ required: true, message: '请选择仓库' }]}
            >
              <Select
                style={{ width: 180 }}
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              />
            </Form.Item>
            <Form.Item name="inboundBy" label="入库申报人">
              <Input placeholder="入库申报人" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="operatorName" label="操作员">
              <Input placeholder="操作员" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="creator" label="制单人">
              <Input placeholder="制单人" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="inspector" label="验货人">
              <Input placeholder="验货人" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="departmentManager" label="部门主管">
              <Input placeholder="部门主管" style={{ width: 140 }} />
            </Form.Item>
          </Space>

          <div className="dept-entry-head dept-entry-purchase-head">
            <span>商品</span>
            <span>数量</span>
            <span>单价</span>
            <span>总额</span>
            <span>备注</span>
            <span>操作</span>
          </div>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <div className="dept-entry-row dept-entry-purchase-row" key={field.key}>
                    <Form.Item
                      className="dept-entry-field"
                      name={[field.name, 'productId']}
                      rules={[{ required: true, message: '请选择商品' }]}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="选择商品"
                        options={productOptions}
                      />
                    </Form.Item>
                    <Form.Item
                      className="dept-entry-field"
                      name={[field.name, 'qty']}
                      rules={[{ required: true, message: '数量' }]}
                    >
                      <InputNumber
                        min={1}
                        placeholder="数量"
                        style={{ width: '100%' }}
                        onBlur={() =>
                          syncBatchRow(
                            field.name,
                            'qty',
                            batchForm.getFieldValue(['items', field.name, 'qty']),
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'price']}>
                      <InputNumber
                        min={0}
                        precision={2}
                        placeholder="单价"
                        style={{ width: '100%' }}
                        onBlur={() =>
                          syncBatchRow(
                            field.name,
                            'price',
                            batchForm.getFieldValue(['items', field.name, 'price']),
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'amount']}>
                      <InputNumber
                        min={0}
                        precision={2}
                        placeholder="总额"
                        style={{ width: '100%' }}
                        onBlur={() =>
                          syncBatchRow(
                            field.name,
                            'amount',
                            batchForm.getFieldValue(['items', field.name, 'amount']),
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'remark']}>
                      <Input placeholder="备注" />
                    </Form.Item>
                    <div className="dept-entry-actions">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({ productId: undefined, qty: 1, price: 0, amount: 0, remark: '' })
                  }
                >
                  添加商品
                </Button>
              </>
            )}
          </Form.List>

          <Space style={{ marginTop: 20, justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={saveBatchDraft}>暂存</Button>
            <Button onClick={loadBatchDraft}>读取暂存</Button>
            <Button danger onClick={clearBatchDraft}>清空暂存</Button>
            <Button icon={<PrinterOutlined />} onClick={printBatchInbound}>
              直接打印
            </Button>
            <Button onClick={() => setBatchOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={batchSaving}>
              保存
            </Button>
          </Space>
        </Form>
      </Drawer>

      <StockVoucherPrint
        open={stockVoucherOpen}
        groups={stockVoucherGroups}
        onClose={() => setStockVoucherOpen(false)}
      />
    </>
  )
}
