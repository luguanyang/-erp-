import { useCallback, useEffect, useState, type Key } from 'react'
import {
  Button,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd'
import { PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import StockVoucherPrint from '../components/StockVoucherPrint'
import type {
  CategoryItem,
  StockLogItem,
  StockVoucherGroup,
  StockVoucherLine,
  WarehouseItem,
} from '../types'

export default function StockLogs() {
  const [list, setList] = useState<StockLogItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ keyword: '', type: '', category: '', subcategory: '' })
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherGroups, setVoucherGroups] = useState<StockVoucherGroup[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryWarehouseId, setSummaryWarehouseId] = useState('')
  const [summaryRange, setSummaryRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [selectedLogs, setSelectedLogs] = useState<StockLogItem[]>([])

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
    setPage(1)
  }, [filters])

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

  const currentCategory = categories.find((c) => c.key === filters.category)

  function toVoucherLine(record: StockLogItem): StockVoucherLine {
    return {
      id: record.id,
      productName: record.productName,
      spec: record.spec,
      unit: record.unit,
      qty: record.qty,
      price: Number(record.price || 0),
      warehouseName: record.warehouseName,
      inboundBy: record.inboundBy,
      operatorName: record.operatorName,
      reason: record.reason,
      createdAt: record.createdAt,
    }
  }

  function openVoucher(record: StockLogItem) {
    setVoucherGroups([
      {
        warehouseName: record.warehouseName || '默认仓库',
        date: dayjs(record.createdAt).format('YYYY-MM-DD'),
        logs: [toVoucherLine(record)],
      },
    ])
    setVoucherOpen(true)
  }

  function buildVoucherGroups(logs: StockLogItem[]): StockVoucherGroup[] {
    const groupMap = new Map<string, StockVoucherGroup>()
    logs
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .forEach((log) => {
        const date = dayjs(log.createdAt).format('YYYY-MM-DD')
        const warehouseName = log.warehouseName || '默认仓库'
        const key = `${warehouseName}__${date}`
        if (!groupMap.has(key)) {
          groupMap.set(key, { warehouseName, date, logs: [] })
        }
        groupMap.get(key)?.logs.push(toVoucherLine(log))
      })
    return Array.from(groupMap.values())
  }

  function handleSelectionChange(nextKeys: Key[], nextRows: StockLogItem[]) {
    const keySet = new Set(nextKeys.map(String))
    setSelectedRowKeys(nextKeys)
    setSelectedLogs((prev) => {
      const merged = new Map<string, StockLogItem>()
      prev.forEach((row) => merged.set(row.id, row))
      nextRows.forEach((row) => merged.set(row.id, row))
      return Array.from(merged.values()).filter((row) => keySet.has(row.id))
    })
  }

  function printSelected() {
    const selected = selectedLogs.filter(
      (record) => record.type === 'in' && !record.recalled,
    )
    if (!selected.length) {
      message.warning('请先勾选要打印的入库商品')
      return
    }
    setVoucherGroups(buildVoucherGroups(selected))
    setVoucherOpen(true)
  }

  async function runSummary() {
    if (!summaryRange || !summaryRange[0] || !summaryRange[1]) {
      message.warning('请先选择日期范围')
      return
    }
    setSummaryLoading(true)
    try {
      const logs: StockLogItem[] = []
      let page = 1
      let fetchedCount = 0
      let total = 1
      do {
        const res = await api.stockLogList({
          type: 'in',
          warehouseId: summaryWarehouseId || undefined,
          startDate: summaryRange[0].startOf('day').toISOString(),
          endDate: summaryRange[1].endOf('day').toISOString(),
          page,
          pageSize: 200,
        })
        fetchedCount += res.list.length
        logs.push(...res.list.filter((log) => !log.recalled))
        total = res.total
        page += 1
      } while (fetchedCount < total && page <= 100)

      if (!logs.length) {
        message.info('该条件下没有可打印的入库记录')
        return
      }

      setVoucherGroups(buildVoucherGroups(logs))
      setSummaryOpen(false)
      setVoucherOpen(true)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '生成汇总凭证失败')
    } finally {
      setSummaryLoading(false)
    }
  }

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

  const validSelectedCount = selectedLogs.filter(
    (record) => record.type === 'in' && !record.recalled,
  ).length

  return (
    <>
      <PageHeader
        title="出入库记录"
        subtitle="查看全部入库/出库流水，包括仓库、价格、操作人与时间。"
        extra={
          <Space>
            <Button
              icon={<PrinterOutlined />}
              disabled={validSelectedCount === 0}
              onClick={printSelected}
            >
              打印选中{validSelectedCount ? `（${validSelectedCount}）` : ''}
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={() => {
                setSummaryRange([dayjs().startOf('day'), dayjs()])
                setSummaryOpen(true)
              }}
            >
              打印汇总凭证
            </Button>
          </Space>
        }
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
            rowSelection={{
              selectedRowKeys,
              onChange: handleSelectionChange,
              preserveSelectedRowKeys: true,
              getCheckboxProps: (record) => ({
                disabled: record.type !== 'in' || record.recalled,
              }),
            }}
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
                width: 190,
                render: (_, record) =>
                  record.recalled ? (
                    <Tag color="default">已撤回</Tag>
                  ) : (
                    <Space size={0}>
                      {record.type === 'in' ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<PrinterOutlined />}
                          onClick={() => openVoucher(record)}
                        >
                          打印凭证
                        </Button>
                      ) : null}
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => confirmRecall(record)}
                      >
                        撤回
                      </Button>
                    </Space>
                  ),
              },
            ]}
          />
        </Spin>
      </div>
      <Modal
        title="打印入库汇总凭证"
        open={summaryOpen}
        onCancel={() => setSummaryOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div className="filter-bar">
          <DatePicker.RangePicker
            value={summaryRange}
            onChange={(dates) =>
              setSummaryRange(
                dates && dates[0] && dates[1] ? [dates[0], dates[1]] : null,
              )
            }
          />
          <Select
            allowClear
            placeholder="全部仓库"
            style={{ width: 180 }}
            value={summaryWarehouseId || undefined}
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            onChange={(value) => setSummaryWarehouseId(value || '')}
          />
          <Button
            type="primary"
            loading={summaryLoading}
            onClick={runSummary}
          >
            生成并打印
          </Button>
        </div>
      </Modal>
      <StockVoucherPrint
        open={voucherOpen}
        groups={voucherGroups}
        onClose={() => setVoucherOpen(false)}
      />
    </>
  )
}
