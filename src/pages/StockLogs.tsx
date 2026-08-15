import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { CategoryItem, StockLogItem } from '../types'

export default function StockLogs() {
  const [list, setList] = useState<StockLogItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ keyword: '', type: '', category: '', subcategory: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.stockLogList({ page, pageSize, ...filters })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载出入库记录失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    api
      .categoryList()
      .then((res) => setCategories(res.list))
      .catch(() => undefined)
  }, [])

  const currentCategory = categories.find((c) => c.key === filters.category)

  function confirmRecall(record: StockLogItem) {
    Modal.confirm({
      title: `撤回这条${record.type === 'in' ? '入库' : '出库'}记录？`,
      content: '撤回后会反向调整对应仓库的库存，历史记录保留并标记“已撤回”。',
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.stockLogRecall(record.id)
          message.success('已撤回')
          await load()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '撤回失败')
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        title="出入库记录"
        subtitle="查看全部入库/出库流水，包括仓库、价格、操作人与时间。"
      />
      <div className="panel-card">
        <div className="filter-bar">
          <Input
            allowClear
            placeholder="搜索商品或操作人"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
          />
          <Select
            allowClear
            placeholder="全部类型"
            style={{ width: 140 }}
            value={filters.type || undefined}
            options={[
              { value: 'in', label: '入库' },
              { value: 'out', label: '出库' },
            ]}
            onChange={(value) => setFilters((f) => ({ ...f, type: value || '' }))}
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
          <Button type="primary" onClick={() => { setPage(1); load() }}>
            查询
          </Button>
        </div>
        <Spin spinning={loading}>
          <Table<StockLogItem>
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
              { title: '分类', dataIndex: 'categoryName', width: 100 },
              { title: '子分类', dataIndex: 'subcategory', width: 140 },
              {
                title: '类型',
                dataIndex: 'type',
                width: 90,
                render: (type: 'in' | 'out') =>
                  type === 'in' ? <Tag color="green">入库</Tag> : <Tag color="red">出库</Tag>,
              },
              { title: '数量', dataIndex: 'qty', width: 90 },
              {
                title: '价格',
                dataIndex: 'price',
                width: 100,
                render: (v: number, r) => (r.type === 'in' ? `¥${Number(v || 0).toFixed(2)}` : '-'),
              },
              {
                title: '仓库',
                dataIndex: 'warehouseName',
                width: 120,
                render: (v: string, r) => (r.type === 'in' && v ? v : '-'),
              },
              {
                title: '入库申报人',
                dataIndex: 'inboundBy',
                width: 110,
                render: (v: string, r) => (r.type === 'in' && v ? v : '-'),
              },
              {
                title: '操作员',
                dataIndex: 'operatorName',
                width: 110,
                render: (v: string, r) => (r.type === 'in' && v ? v : '-'),
              },
              {
                title: '变动',
                width: 140,
                render: (_, r) => `${r.stockBefore} → ${r.stockAfter}`,
              },
              { title: '单位', dataIndex: 'unit', width: 80 },
              { title: '原因', dataIndex: 'reason', ellipsis: true },
              { title: '操作人', dataIndex: 'operator', width: 110 },
              {
                title: '时间',
                dataIndex: 'createdAt',
                width: 180,
                render: (v: string | Date) => new Date(v).toLocaleString('zh-CN'),
              },
              {
                title: '操作',
                width: 120,
                render: (_, record) =>
                  record.recalled ? (
                    <Tag color="default">已撤回</Tag>
                  ) : (
                    <Button type="link" size="small" danger onClick={() => confirmRecall(record)}>
                      撤回
                    </Button>
                  ),
              },
            ]}
          />
        </Spin>
      </div>
    </>
  )
}
