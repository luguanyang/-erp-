import { useCallback, useEffect, useState } from 'react'
import {
  Avatar,
  Button,
  Drawer,
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
import type { CategoryItem, ProductItem } from '../types'

interface ProductForm {
  name: string
  categoryKey: string
  subcategory?: string
  spec?: string
  price: number
  costMultiplier: number
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
  const [list, setList] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
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

  const load = useCallback(async () => {
    setLoading(true)
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
    load()
  }, [load])

  const currentCategory = categories.find((c) => c.key === filters.category)

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      categoryKey: filters.category || 'meat',
      unit: '斤',
      price: 0,
      costMultiplier: 1,
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
                title: '单价',
                dataIndex: 'price',
                width: 150,
                align: 'right',
                render: (value: number, record) => (
                  <span>
                    ¥{Number(value || 0).toFixed(2)}
                    {Number(record.costMultiplier || 1) !== 1 ? (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>
                        {' '}
                        ×{record.costMultiplier}
                      </span>
                    ) : null}
                  </span>
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
      <Drawer
        title={editing ? '编辑商品' : '新建商品'}
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
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
            dependencies={['categoryKey']}
          >
            <Select
              allowClear
              options={(
                categories.find((c) => c.key === form.getFieldValue('categoryKey'))?.subcategories ||
                []
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
                options={[
                  { value: '斤', label: '斤' },
                  { value: '件', label: '件' },
                  { value: '盒', label: '盒' },
                  { value: '桶', label: '桶' },
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
      </Drawer>
    </>
  )
}
