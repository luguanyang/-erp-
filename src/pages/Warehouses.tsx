import { useCallback, useEffect, useState } from 'react'
import {
  Button,
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
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { CategoryItem, InventoryItem, WarehouseItem } from '../types'

interface WarehouseForm {
  id?: string
  name: string
  code?: string
  remark?: string
}

interface WarehouseInventoryFilter {
  keyword: string
  category: string
  subcategory: string
}

export default function Warehouses() {
  const [form] = Form.useForm<WarehouseForm>()
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [selected, setSelected] = useState<string>('')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<WarehouseItem | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<WarehouseInventoryFilter>({
    keyword: '',
    category: '',
    subcategory: '',
  })

  const loadWarehouses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.warehouseList()
      setWarehouses(res.list)
      if ((!selected || !res.list.some((w) => w.id === selected)) && res.list.length) {
        setSelected(res.list[0].id)
      } else if (!res.list.length) {
        setSelected('')
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载仓库失败')
    } finally {
      setLoading(false)
    }
  }, [selected])

  const loadInventory = useCallback(async () => {
    if (!selected) return
    setInventoryLoading(true)
    try {
      const res = await api.warehouseInventory({
        page,
        pageSize,
        warehouseId: selected,
        ...filters,
      })
      setInventory(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载仓库库存失败')
    } finally {
      setInventoryLoading(false)
    }
  }, [selected, page, pageSize, filters])

  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  useEffect(() => {
    api
      .categoryList()
      .then((res) => setCategories(res.list))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  useEffect(() => {
    setPage(1)
  }, [filters])

  async function handleCreate(values: WarehouseForm) {
    setSaving(true)
    try {
      const created = await api.warehouseCreate(values)
      message.success('仓库已创建')
      setCreateOpen(false)
      form.resetFields()
      const res = await api.warehouseList()
      setWarehouses(res.list)
      if (created.id) setSelected(created.id)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建仓库失败')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(record: WarehouseItem) {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      remark: record.remark,
    })
    setCreateOpen(true)
  }

  async function handleUpdate(values: WarehouseForm) {
    if (!editing) return
    setSaving(true)
    try {
      await api.warehouseUpdate({ id: editing.id, ...values })
      message.success('仓库已更新')
      setCreateOpen(false)
      setEditing(null)
      form.resetFields()
      const res = await api.warehouseList()
      setWarehouses(res.list)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '更新仓库失败')
    } finally {
      setSaving(false)
    }
  }

  async function moveWarehouse(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= warehouses.length) return
    const next = [...warehouses]
    ;[next[index], next[target]] = [next[target], next[index]]
    setWarehouses(next)
    try {
      await api.warehouseReorder(next.map((w) => w.id))
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存排序失败')
      const res = await api.warehouseList()
      setWarehouses(res.list)
    }
  }

  function confirmDelete(record: WarehouseItem) {
    Modal.confirm({
      title: `删除仓库「${record.name}」`,
      content: '删除后该仓库的库存记录会一并清理，历史出入库流水保留。',
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.warehouseDelete(record.id)
          message.success('仓库已删除')
          const res = await api.warehouseList()
          setWarehouses(res.list)
          if (selected === record.id) {
            setSelected(res.list.length ? res.list[0].id : '')
          }
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败')
        }
      },
    })
  }

  const currentCategory = categories.find((c) => c.key === filters.category)

  return (
    <>
      <PageHeader
        title="仓库管理"
        subtitle="维护仓库，并查看每个仓库的商品库存。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建仓库
          </Button>
        }
      />
      <div className="panel-card" style={{ marginBottom: 16 }}>
        <Spin spinning={loading}>
          <Table<WarehouseItem>
            rowKey="id"
            dataSource={warehouses}
            pagination={false}
            rowClassName={(record) => (record.id === selected ? 'row-selected' : '')}
            onRow={(record) => ({ onClick: () => setSelected(record.id) })}
            columns={[
              { title: '仓库名称', dataIndex: 'name' },
              { title: '仓库编号', dataIndex: 'code', width: 140 },
              { title: '备注', dataIndex: 'remark', ellipsis: true },
              {
                title: '排序',
                width: 120,
                render: (_, record, index) => (
                  <Space size={4}>
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation()
                        moveWarehouse(index, -1)
                      }}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowDownOutlined />}
                      disabled={index === warehouses.length - 1}
                      onClick={(e) => {
                        e.stopPropagation()
                        moveWarehouse(index, 1)
                      }}
                    />
                  </Space>
                ),
              },
              {
                title: '操作',
                width: 180,
                render: (_, record) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(record)
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        confirmDelete(record)
                      }}
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
      <div className="panel-card">
        <div className="filter-bar">
          <Select
            style={{ width: 180 }}
            value={selected || undefined}
            placeholder="选择仓库"
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            onChange={(value) => setSelected(value)}
          />
          <Input
            allowClear
            placeholder="搜索商品"
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
          <Button
            type="primary"
            onClick={() => {
              setPage(1)
              loadInventory()
            }}
          >
            查询
          </Button>
        </div>
        <Spin spinning={inventoryLoading}>
          <Table<InventoryItem>
            rowKey="id"
            dataSource={inventory}
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
              { title: '分类', dataIndex: 'categoryName', width: 100 },
              { title: '子分类', dataIndex: 'subcategory', width: 140 },
              { title: '规格', dataIndex: 'spec' },
              {
                title: '库存',
                dataIndex: 'stock',
                width: 100,
                render: (value: number) => <strong>{value}</strong>,
              },
              { title: '最低库存', dataIndex: 'minStock', width: 100 },
              { title: '单位', dataIndex: 'unit', width: 80 },
              {
                title: '状态',
                dataIndex: 'low',
                width: 100,
                render: (low: boolean) => (
                  <Tag color={low ? 'red' : 'green'}>{low ? '低库存' : '正常'}</Tag>
                ),
              },
            ]}
          />
        </Spin>
      </div>
      <Modal
        title={editing ? '编辑仓库' : '新建仓库'}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editing ? handleUpdate : handleCreate}
        >
          <Form.Item name="name" label="仓库名称" rules={[{ required: true, message: '请输入仓库名称' }]}>
            <Input placeholder="例如：二楼仓" />
          </Form.Item>
          <Form.Item name="code" label="仓库编号">
            <Input placeholder="选填，例如 WH-002" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
