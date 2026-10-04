import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Avatar,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  message,
} from 'antd'
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import { PRINT_GROUPS } from '../printGroups'
import type { CategoryItem, ProductItem, WarehouseItem } from '../types'

interface ProductForm {
  name: string
  categoryKey: string
  subcategory?: string
  spec?: string
  price: number
  costMultiplier: number
  storageWarehouseId?: string
  printGroupIds?: string[]
  unit: string
  emoji?: string
  color?: string
  image?: string
  outOfStock: boolean
  status: 'active' | 'disabled'
  sort: number
}

interface ProductFilter {
  keyword: string
  category: string
  subcategory: string
  status: string
}

export default function Products() {
  const [form] = Form.useForm<ProductForm>()
  const watchedCategoryKey = Form.useWatch('categoryKey', form)
  const [list, setList] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ProductItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<ProductFilter>({
    keyword: '',
    category: '',
    subcategory: '',
    status: '',
  })
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const editingPriceIdRef = useRef<string | null>(null)
  const [priceDraft, setPriceDraft] = useState<number | null>(null)
  const priceDraftRef = useRef<number | null>(null)
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null)
  const savingPriceIdsRef = useRef<Set<string>>(new Set())
  const priceInputRefs = useRef<
    Record<string, { focus: () => void; select: () => void } | null>
  >({})
  const skipPriceBlurIdRef = useRef<string | null>(null)
  const previousEditingPriceIdRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    editingPriceIdRef.current = null
    priceDraftRef.current = null
    setEditingPriceId(null)
    setPriceDraft(null)
    try {
      const res = await api.productList({
        page,
        pageSize,
        keyword: filters.keyword,
        category: filters.category,
        subcategory: filters.subcategory,
        status: filters.status,
      })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载商品失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  useEffect(() => {
    api
      .categoryList()
      .then((res) => setCategories(res.list))
      .catch((err) => message.error(err instanceof Error ? err.message : '加载分类失败'))
  }, [])

  useEffect(() => {
    api
      .warehouseList()
      .then((res) => setWarehouses(res.list))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    const previousId = previousEditingPriceIdRef.current
    if (
      previousId &&
      previousId !== editingPriceId &&
      skipPriceBlurIdRef.current === previousId
    ) {
      skipPriceBlurIdRef.current = null
    }
    previousEditingPriceIdRef.current = editingPriceId
    if (!editingPriceId || savingPriceId === editingPriceId) return
    const input = priceInputRefs.current[editingPriceId]
    input?.focus()
    input?.select()
  }, [editingPriceId, savingPriceId])

  const currentCategory = categories.find((c) => c.key === filters.category)

  function beginPriceEdit(record: ProductItem) {
    const price = Number(record.price || 0)
    editingPriceIdRef.current = record.id
    priceDraftRef.current = price
    setEditingPriceId(record.id)
    setPriceDraft(price)
  }

  function stopPriceEdit(id: string) {
    if (editingPriceIdRef.current !== id) return
    editingPriceIdRef.current = null
    priceDraftRef.current = null
    setEditingPriceId(null)
    setPriceDraft(null)
  }

  function moveToNextPrice(record: ProductItem) {
    const index = list.findIndex((item) => item.id === record.id)
    const nextRecord = index >= 0 ? list[index + 1] : null
    if (nextRecord) beginPriceEdit(nextRecord)
  }

  async function commitPrice(record: ProductItem, moveNext = false) {
    if (
      editingPriceIdRef.current !== record.id ||
      savingPriceIdsRef.current.has(record.id)
    ) {
      return false
    }
    const rawPrice = priceDraftRef.current
    const nextPrice =
      rawPrice === null || rawPrice === undefined
        ? null
        : Math.round(Number(rawPrice) * 100) / 100
    if (nextPrice === null || !Number.isFinite(nextPrice) || nextPrice < 0) {
      skipPriceBlurIdRef.current = null
      message.warning('请输入有效的非负单价')
      requestAnimationFrame(() => priceInputRefs.current[record.id]?.focus())
      return false
    }
    const currentPrice = Math.round(Number(record.price || 0) * 100) / 100
    if (nextPrice === currentPrice) {
      stopPriceEdit(record.id)
      if (moveNext) moveToNextPrice(record)
      return true
    }

    savingPriceIdsRef.current.add(record.id)
    setSavingPriceId(record.id)
    try {
      await api.productUpdate({ id: record.id, price: nextPrice })
      setList((current) =>
        current.map((item) =>
          item.id === record.id ? { ...item, price: nextPrice } : item,
        ),
      )
      stopPriceEdit(record.id)
      if (moveNext) moveToNextPrice(record)
      return true
    } catch (err) {
      editingPriceIdRef.current = record.id
      priceDraftRef.current = nextPrice
      setEditingPriceId(record.id)
      setPriceDraft(nextPrice)
      skipPriceBlurIdRef.current = null
      message.error(err instanceof Error ? err.message : '单价保存失败')
      requestAnimationFrame(() => {
        const input = priceInputRefs.current[record.id]
        input?.focus()
        input?.select()
      })
      return false
    } finally {
      savingPriceIdsRef.current.delete(record.id)
      setSavingPriceId((current) => (current === record.id ? null : current))
    }
  }

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      categoryKey: filters.category || 'meat',
      unit: '斤',
      price: 0,
      costMultiplier: 1,
      printGroupIds: [],
      sort: 0,
      outOfStock: false,
      status: 'active',
    })
    setDrawerOpen(true)
  }

  function openEdit(record: ProductItem) {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      categoryKey: record.categoryKey,
      subcategory: record.subcategory,
      spec: record.spec,
      price: record.price,
      costMultiplier: record.costMultiplier || 1,
      storageWarehouseId: record.storageWarehouseId || undefined,
      printGroupIds: record.printGroupIds || [],
      unit: record.unit,
      emoji: record.emoji,
      color: record.color,
      image: record.image,
      outOfStock: record.outOfStock,
      status: record.status,
      sort: record.sort,
    })
    setDrawerOpen(true)
  }

  async function handleFinish(values: ProductForm) {
    setSaving(true)
    try {
      if (editing) {
        await api.productUpdate({ id: editing.id, ...values })
        message.success('商品已更新')
      } else {
        await api.productCreate(values)
        message.success('商品已创建')
      }
      setDrawerOpen(false)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(record: ProductItem) {
    Modal.confirm({
      title: `删除商品「${record.name}」`,
      content: '彻底删除后，后台和小程序都不再展示该商品，关联库存与购物车引用会一并清理；历史订单记录保留。',
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.productDelete(record.id)
          message.success('商品已彻底删除')
          await load()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败')
        }
      },
    })
  }

  async function toggleStatus(record: ProductItem) {
    const nextStatus = record.status === 'active' ? 'disabled' : 'active'
    try {
      await api.productUpdate({ id: record.id, status: nextStatus })
      message.success(nextStatus === 'active' ? '商品已上线' : '商品已下线')
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败')
    }
  }

  function handleCategoryChange(value: string) {
    const next = categories.find((c) => c.key === value)
    if (next && !next.subcategories.includes(form.getFieldValue('subcategory') || '')) {
      form.setFieldValue('subcategory', '')
    }
  }

  return (
    <>
      <PageHeader
        title="商品管理"
        subtitle="维护商品规格、价格、分类和上线状态，只有已上线商品会在小程序展示。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建商品
          </Button>
        }
      />
      <div className="filter-bar">
        <Input
          allowClear
          placeholder="搜索商品名称或规格"
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
          options={(currentCategory?.subcategories || []).map((s) => ({ value: s, label: s }))}
          onChange={(value) => setFilters((f) => ({ ...f, subcategory: value || '' }))}
        />
        <Select
          allowClear
          placeholder="全部状态"
          style={{ width: 130 }}
          value={filters.status || undefined}
          options={[
            { value: 'active', label: '已上线' },
            { value: 'disabled', label: '未上线' },
          ]}
          onChange={(value) => setFilters((f) => ({ ...f, status: value || '' }))}
        />
        <Button type="primary" onClick={load}>
          查询
        </Button>
      </div>
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<ProductItem>
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
                title: '商品',
                dataIndex: 'name',
                render: (name: string, record) => (
                  <Space>
                    <Avatar
                      size={34}
                      shape="square"
                      style={{ background: record.color || '#F5EFE7', color: '#5b4636' }}
                    >
                      {name.slice(0, 1)}
                    </Avatar>
                    <Space direction="vertical" size={0}>
                      <span>{name}</span>
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>{record.spec}</span>
                    </Space>
                  </Space>
                ),
              },
              { title: '分类', dataIndex: 'categoryName', width: 100 },
              { title: '子分类', dataIndex: 'subcategory', width: 120 },
              {
                title: (
                  <span>
                    单价{' '}
                    <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 400 }}>
                      点击可改
                    </span>
                  </span>
                ),
                dataIndex: 'price',
                width: 170,
                align: 'right',
                render: (value: number, record) => (
                  <Space size={6}>
                    {editingPriceId === record.id ? (
                      <>
                        <InputNumber
                          ref={(node) => {
                            priceInputRefs.current[record.id] = node
                          }}
                          min={0}
                          precision={2}
                          step={0.1}
                          controls={false}
                          disabled={savingPriceId === record.id}
                          value={priceDraft}
                          onChange={(nextValue) => {
                            const next =
                              nextValue === null || nextValue === undefined
                                ? null
                                : Number(nextValue)
                            priceDraftRef.current = next
                            setPriceDraft(next)
                          }}
                          onFocus={(event) => event.currentTarget.select()}
                          onPressEnter={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            skipPriceBlurIdRef.current = record.id
                            void commitPrice(record, true)
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Escape') return
                            event.preventDefault()
                            event.stopPropagation()
                            skipPriceBlurIdRef.current = record.id
                            stopPriceEdit(record.id)
                          }}
                          onBlur={() => {
                            if (skipPriceBlurIdRef.current === record.id) {
                              skipPriceBlurIdRef.current = null
                              return
                            }
                            void commitPrice(record)
                          }}
                          style={{ width: 110 }}
                          aria-label={`修改${record.name}的单价`}
                        />
                        {savingPriceId === record.id ? <Spin size="small" /> : null}
                      </>
                    ) : (
                      <span
                        role="button"
                        tabIndex={0}
                        title="点击即可修改"
                        style={{ cursor: 'pointer' }}
                        onClick={() => beginPriceEdit(record)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return
                          event.preventDefault()
                          beginPriceEdit(record)
                        }}
                      >
                        ¥{Number(value || 0).toFixed(2)}
                      </span>
                    )}
                    {Number(record.costMultiplier || 1) !== 1 ? (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>
                        ×{record.costMultiplier}
                      </span>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: '库存',
                dataIndex: 'stock',
                width: 120,
                render: (value: number, record) => (
                  <span>
                    {value}
                    <span style={{ color: '#9ca3af' }}> / {record.minStock}{record.unit}</span>
                    {record.low ? <Tag color="red" style={{ marginLeft: 6 }}>低</Tag> : null}
                  </span>
                ),
              },
              {
                title: '暂存仓库',
                dataIndex: 'storageWarehouseName',
                width: 130,
                render: (value: string) =>
                  value ? <Tag color="blue">{value}</Tag> : <span style={{ color: '#9ca3af' }}>未设置</span>,
              },
              {
                title: '出单分组',
                dataIndex: 'printGroupIds',
                width: 150,
                render: (_: unknown, record: ProductItem) =>
                  record.printGroupIds?.length ? (
                    <Space size={4}>
                      {record.printGroupIds.map((id) => {
                        const group = PRINT_GROUPS.find((g) => g.value === id)
                        return group ? (
                          <Tag key={id} color={group.color}>
                            {group.label}
                          </Tag>
                        ) : null
                      })}
                    </Space>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>未设置</span>
                  ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 90,
                render: (status: string) => (
                  <Tag color={status === 'active' ? 'green' : 'default'}>
                    {status === 'active' ? '已上线' : '未上线'}
                  </Tag>
                ),
              },
              {
                title: '操作',
                width: 220,
                render: (_, record) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => openEdit(record)}>
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => toggleStatus(record)}
                    >
                      {record.status === 'active' ? '下线' : '上线'}
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
      <Modal
        title={editing ? '编辑商品' : '新建商品'}
        width={520}
        open={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        footer={null}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
      >
        <Form<ProductForm>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={(changed) => {
            if ('categoryKey' in changed) handleCategoryChange(changed.categoryKey)
          }}
        >
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input placeholder="请输入商品名称" />
          </Form.Item>
          <Form.Item name="categoryKey" label="分类" rules={[{ required: true }]}>
            <Select options={categories.map((c) => ({ value: c.key, label: c.name }))} />
          </Form.Item>
          <Form.Item
            name="subcategory"
            label="子分类"
          >
            <Select
              allowClear
              options={(
                categories.find((c) => c.key === watchedCategoryKey)?.subcategories || []
              ).map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
          <Form.Item name="spec" label="规格">
            <Input placeholder="如 1 斤" />
          </Form.Item>
          <Space size={12} style={{ display: 'flex' }}>
            <Form.Item name="price" label="参考单价" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" />
            </Form.Item>
            <Form.Item name="costMultiplier" label="成本倍数" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="unit" label="单位" style={{ flex: 1 }}>
              <Select
                showSearch
                optionFilterProp="label"
                options={[
                  { value: '斤', label: '斤' },
                  { value: '件', label: '件' },
                  { value: '盒', label: '盒' },
                  { value: '桶', label: '桶' },
                  { value: '瓶', label: '瓶' },
                  { value: '扎', label: '扎' },
                  { value: '包', label: '包' },
                  { value: '袋', label: '袋' },
                  { value: '只', label: '只' },
                  { value: '本', label: '本' },
                  { value: '个', label: '个' },
                  { value: '张', label: '张' },
                  { value: '款', label: '款' },
                  { value: '块', label: '块' },
                  { value: '份', label: '份' },
                  { value: '双', label: '双' },
                  { value: '套', label: '套' },
                  { value: '批', label: '批' },
                  { value: '碗', label: '碗' },
                  { value: '台', label: '台' },
                  { value: '罐', label: '罐' },
                  { value: '条', label: '条' },
                ]}
              />
            </Form.Item>
          </Space>
          <Space size={12} style={{ display: 'flex' }}>
            <Form.Item name="emoji" label="表情占位" style={{ flex: 1 }}>
              <Input placeholder="可留空" />
            </Form.Item>
            <Form.Item name="color" label="背景色" style={{ flex: 1 }}>
              <Input placeholder="#F5EFE7" />
            </Form.Item>
          </Space>
          <Form.Item name="image" label="图片地址">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="storageWarehouseId" label="暂存仓库">
            <Select
              allowClear
              placeholder="仅用于打印提示，不参与库存"
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            />
          </Form.Item>
          <Form.Item name="printGroupIds" label="出单分组">
            <Select
              mode="multiple"
              allowClear
              placeholder="可选，打印时只发送到对应分组打印机"
              options={PRINT_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
            />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="outOfStock" label="缺货/不可订" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'active', label: '上线' },
                { value: 'disabled', label: '下线' },
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
      </Modal>
    </>
  )
}
