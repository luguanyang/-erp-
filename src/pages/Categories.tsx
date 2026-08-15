import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  message,
} from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { CategoryItem } from '../types'

interface CategoryForm {
  key: string
  name: string
  subcategories?: string[]
  sort: number
}

export default function Categories() {
  const [form] = Form.useForm<CategoryForm>()
  const [list, setList] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryItem | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.categoryList()
      setList(res.list)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载分类失败')
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
    form.setFieldsValue({ sort: list.length + 1, subcategories: [] })
    setDrawerOpen(true)
  }

  function openEdit(record: CategoryItem) {
    setEditing(record)
    form.setFieldsValue({
      key: record.key,
      name: record.name,
      subcategories: record.subcategories,
      sort: record.sort,
    })
    setDrawerOpen(true)
  }

  async function handleFinish(values: CategoryForm) {
    setSaving(true)
    try {
      if (editing) {
        await api.categoryUpdate({ id: editing.id, ...values })
        message.success('分类已更新')
      } else {
        await api.categoryCreate(values)
        message.success('分类已创建')
      }
      setDrawerOpen(false)
      await load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(record: CategoryItem) {
    Modal.confirm({
      title: `删除分类「${record.name}」`,
      content: record.productCount
        ? '该分类下仍有商品，无法删除。'
        : '删除后不可恢复，确认继续？',
      okButtonProps: { disabled: record.productCount > 0 },
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.categoryDelete(record.id)
          message.success('分类已删除')
          await load()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败')
        }
      },
    })
  }

  function moveSubcategory(index: number, direction: -1 | 1) {
    const current = [...(form.getFieldValue('subcategories') || [])]
    const target = index + direction
    if (target < 0 || target >= current.length) return
    ;[current[index], current[target]] = [current[target], current[index]]
    form.setFieldValue('subcategories', current)
  }

  function removeSubcategory(index: number) {
    const current = [...(form.getFieldValue('subcategories') || [])]
    current.splice(index, 1)
    form.setFieldValue('subcategories', current)
  }

  return (
    <>
      <PageHeader
        title="商品分类"
        subtitle="管理荤菜、素菜、物料分类及子分类。"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建分类
          </Button>
        }
      />
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<CategoryItem>
            rowKey="id"
            dataSource={list}
            pagination={false}
            columns={[
              { title: '分类键', dataIndex: 'key', width: 120 },
              { title: '名称', dataIndex: 'name', width: 140 },
              {
                title: '子分类',
                dataIndex: 'subcategories',
                render: (items: string[]) =>
                  Array.isArray(items) && items.length
                    ? items.map((item) => <span key={item} className="status-active">{item} </span>)
                    : '无',
              },
              { title: '排序', dataIndex: 'sort', width: 90 },
              { title: '商品数', dataIndex: 'productCount', width: 100 },
              {
                title: '操作',
                width: 160,
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
        title={editing ? '编辑分类' : '新建分类'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Form<CategoryForm> form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="key" label="分类键" rules={[{ required: true, message: '请输入分类键' }]}>
            <Input placeholder="如 meat / veg / mat" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 荤菜" />
          </Form.Item>
          <Form.Item name="subcategories" label="子分类">
            <Select
              mode="tags"
              placeholder="输入子分类后回车"
              tokenSeparators={[',']}
              maxTagCount={0}
            />
          </Form.Item>
          <Form.Item
            label="子分类排序"
            shouldUpdate={(prev, next) => prev.subcategories !== next.subcategories}
          >
            {({ getFieldValue }) => {
              const items = getFieldValue('subcategories') || []
              if (!items.length) return <span style={{ color: '#9ca3af' }}>暂无子分类</span>
              return (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {items.map((item: string, index: number) => (
                    <Space
                      key={`${item}-${index}`}
                      style={{
                        width: '100%',
                        justifyContent: 'space-between',
                        background: '#f6f6f6',
                        borderRadius: 6,
                        padding: '6px 8px',
                      }}
                    >
                      <span>{item}</span>
                      <Space size={4}>
                        <Button
                          size="small"
                          type="text"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0}
                          onClick={() => moveSubcategory(index, -1)}
                        />
                        <Button
                          size="small"
                          type="text"
                          icon={<ArrowDownOutlined />}
                          disabled={index === items.length - 1}
                          onClick={() => moveSubcategory(index, 1)}
                        />
                        <Button
                          size="small"
                          type="text"
                          danger
                          onClick={() => removeSubcategory(index)}
                        >
                          删除
                        </Button>
                      </Space>
                    </Space>
                  ))}
                </Space>
              )
            }}
          </Form.Item>
          <Form.Item name="sort" label="排序" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
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
