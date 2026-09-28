import { useCallback, useEffect, useState, type Key } from 'react'
import {
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import {
  DownloadOutlined,
  ClearOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
  RollbackOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type {
  CategoryItem,
  StoreCountDocumentDetail,
  StoreCountDocumentSummary,
  StoreCountLogItem,
  StoreItem,
  StoreStockItem,
} from '../types'
import StoreCountVoucherPrint from '../components/StoreCountVoucherPrint'

interface StockFilters {
  storeId: string
  category: string
  subcategory: string
  keyword: string
}

interface LogFilters {
  storeId: string
  keyword: string
  range: [Dayjs, Dayjs] | null
}

interface CorrectionForm {
  counted: number
  remark?: string
}

interface BatchCountRow extends StoreStockItem {
  countedInput: number | null
}

interface DocumentFilters {
  storeId: string
  status: string
  keyword: string
  range: [Dayjs, Dayjs] | null
}

function diffText(value: number | null) {
  if (value === null) return '-'
  return value > 0 ? `+${value}` : String(value)
}

export default function StoreCount() {
  const [stores, setStores] = useState<StoreItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [activeTab, setActiveTab] = useState('stock')

  const [stockList, setStockList] = useState<StoreStockItem[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockPage, setStockPage] = useState(1)
  const [stockPageSize, setStockPageSize] = useState(20)
  const [stockTotal, setStockTotal] = useState(0)
  const [stockFilters, setStockFilters] = useState<StockFilters>({
    storeId: '',
    category: '',
    subcategory: '',
    keyword: '',
  })

  const [logList, setLogList] = useState<StoreCountLogItem[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [logPageSize, setLogPageSize] = useState(20)
  const [logTotal, setLogTotal] = useState(0)
  const [logFilters, setLogFilters] = useState<LogFilters>({
    storeId: '',
    keyword: '',
    range: null,
  })

  const [correctionForm] = Form.useForm<CorrectionForm>()
  const [correction, setCorrection] = useState<{
    id: string
    productName: string
    counted: number
  } | null>(null)
  const [correctionSaving, setCorrectionSaving] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchDate, setBatchDate] = useState<Dayjs>(dayjs())
  const [batchRemark, setBatchRemark] = useState('')
  const [batchFilters, setBatchFilters] = useState({
    category: '',
    subcategory: '',
    keyword: '',
  })
  const [batchRows, setBatchRows] = useState<BatchCountRow[]>([])
  const [batchScope, setBatchScope] = useState<'all' | 'selected'>('all')
  const [batchIncludeZero, setBatchIncludeZero] = useState(true)
  const [batchOnlyBusiness, setBatchOnlyBusiness] = useState(false)
  const [batchSelectedKeys, setBatchSelectedKeys] = useState<Key[]>([])
  const [docList, setDocList] = useState<StoreCountDocumentSummary[]>([])
  const [docLoading, setDocLoading] = useState(false)
  const [docPage, setDocPage] = useState(1)
  const [docPageSize, setDocPageSize] = useState(20)
  const [docTotal, setDocTotal] = useState(0)
  const [docFilters, setDocFilters] = useState<DocumentFilters>({
    storeId: '',
    status: '',
    keyword: '',
    range: null,
  })
  const [docDetail, setDocDetail] = useState<StoreCountDocumentDetail | null>(null)
  const [docDetailLoading, setDocDetailLoading] = useState(false)
  const [docActionLoading, setDocActionLoading] = useState(false)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherDocument, setVoucherDocument] =
    useState<StoreCountDocumentDetail | null>(null)

  const loadStores = useCallback(async () => {
    const res = await api.storeList()
    setStores(res.list)
    const firstId = res.list[0]?.id || ''
    setStockFilters((current) => ({
      ...current,
      storeId: current.storeId || firstId,
    }))
    setLogFilters((current) => ({
      ...current,
      storeId: current.storeId || firstId,
    }))
    setDocFilters((current) => ({
      ...current,
      storeId: current.storeId || firstId,
    }))
  }, [])

  const loadStock = useCallback(async () => {
    if (!stockFilters.storeId) return
    setStockLoading(true)
    try {
      const res = await api.storeStockList({
        page: stockPage,
        pageSize: stockPageSize,
        ...stockFilters,
      })
      setStockList(res.list)
      setStockTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载门店库存失败')
    } finally {
      setStockLoading(false)
    }
  }, [stockFilters, stockPage, stockPageSize])

  const loadLogs = useCallback(async () => {
    if (!logFilters.storeId) return
    setLogLoading(true)
    try {
      const res = await api.storeCountLogList({
        page: logPage,
        pageSize: logPageSize,
        storeId: logFilters.storeId,
        keyword: logFilters.keyword,
        startDate: logFilters.range?.[0]
          ? logFilters.range[0].format('YYYY-MM-DD')
          : undefined,
        endDate: logFilters.range?.[1]
          ? logFilters.range[1].format('YYYY-MM-DD')
          : undefined,
      })
      setLogList(res.list)
      setLogTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载盘点记录失败')
    } finally {
      setLogLoading(false)
    }
  }, [logFilters, logPage, logPageSize])

  const loadDocuments = useCallback(async () => {
    setDocLoading(true)
    try {
      const res = await api.storeCountDocumentList({
        page: docPage,
        pageSize: docPageSize,
        storeId: docFilters.storeId || undefined,
        status: docFilters.status || undefined,
        keyword: docFilters.keyword,
        startDate: docFilters.range?.[0]
          ? docFilters.range[0].format('YYYY-MM-DD')
          : undefined,
        endDate: docFilters.range?.[1]
          ? docFilters.range[1].format('YYYY-MM-DD')
          : undefined,
      })
      setDocList(res.list)
      setDocTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载盘点单失败')
    } finally {
      setDocLoading(false)
    }
  }, [docFilters, docPage, docPageSize])

  useEffect(() => {
    loadStores().catch((err) =>
      message.error(err instanceof Error ? err.message : '加载门店失败'),
    )
    api
      .categoryList()
      .then((res) => setCategories(res.list))
      .catch(() => undefined)
  }, [loadStores])

  useEffect(() => {
    loadStock()
  }, [loadStock])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    setStockPage(1)
  }, [stockFilters])

  useEffect(() => {
    setLogPage(1)
  }, [logFilters])

  useEffect(() => {
    setDocPage(1)
  }, [docFilters])

  const currentCategory = categories.find(
    (category) => category.key === stockFilters.category,
  )
  const batchCategory = categories.find(
    (category) => category.key === batchFilters.category,
  )

  const loadBatchRows = useCallback(
    async (
      filters = batchFilters,
      options?: { includeZero?: boolean; onlyBusiness?: boolean },
    ) => {
      if (!stockFilters.storeId) return
      const includeZero = options?.includeZero ?? batchIncludeZero
      const onlyBusiness = options?.onlyBusiness ?? batchOnlyBusiness
      setBatchLoading(true)
      try {
        const list: StoreStockItem[] = []
        let nextPage = 1
        let totalCount = 1
        do {
          const res = await api.storeStockList({
            storeId: stockFilters.storeId,
            page: nextPage,
            pageSize: 200,
            ...filters,
          })
          list.push(...res.list)
          totalCount = res.total
          nextPage += 1
        } while (list.length < totalCount && nextPage <= 100)
        setBatchRows(
          list
            .filter((item) => includeZero || Number(item.stock || 0) !== 0)
            .filter(
              (item) =>
                !onlyBusiness ||
                !!item.lastLogId ||
                Number(item.stock || 0) !== 0,
            )
            .map((item) => ({ ...item, countedInput: null })),
        )
      } catch (err) {
        message.error(err instanceof Error ? err.message : '加载盘点商品失败')
      } finally {
        setBatchLoading(false)
      }
    },
    [batchFilters, batchIncludeZero, batchOnlyBusiness, stockFilters.storeId],
  )

  async function openBatchCount() {
    if (!stockFilters.storeId) {
      message.warning('请先选择门店')
      return
    }
    const nextDate = dayjs()
    const begin = async () => {
      const nextFilters = { category: '', subcategory: '', keyword: '' }
      setBatchDate(nextDate)
      setBatchRemark('')
      setBatchFilters(nextFilters)
      setBatchScope('all')
      setBatchIncludeZero(true)
      setBatchOnlyBusiness(false)
      setBatchSelectedKeys([])
      setBatchOpen(true)
      await loadBatchRows(nextFilters)
    }
    try {
      const exists = await api.storeCountDocumentList({
        storeId: stockFilters.storeId,
        status: 'active',
        startDate: nextDate.format('YYYY-MM-DD'),
        endDate: nextDate.format('YYYY-MM-DD'),
        page: 1,
        pageSize: 1,
      })
      if (!exists.total) {
        await begin()
        return
      }
      Modal.confirm({
        title: '该门店今天已有盘点单',
        content: '继续新建会生成另一张盘点单，是否继续？',
        okText: '继续新建',
        cancelText: '取消',
        onOk: begin,
      })
    } catch {
      await begin()
    }
  }

  function fillBatchBookStock() {
    setBatchRows((rows) =>
      rows.map((row) => ({ ...row, countedInput: Number(row.stock || 0) })),
    )
  }

  function clearBatchInputs() {
    setBatchRows((rows) => rows.map((row) => ({ ...row, countedInput: null })))
    setBatchSelectedKeys([])
  }

  async function submitBatchCount() {
    if (!stockFilters.storeId) return
    const selectedSet = new Set(batchSelectedKeys.map(String))
    const items = batchRows
      .filter((row) => batchScope === 'all' || selectedSet.has(row.productId))
      .filter(
        (row) =>
          row.countedInput !== null &&
          row.countedInput !== undefined &&
          Number.isFinite(Number(row.countedInput)),
      )
      .map((row) => ({
        productId: row.productId,
        counted: Math.max(0, Number(row.countedInput)),
      }))
    if (!items.length) {
      message.warning('请至少填写一个商品的实盘数')
      return
    }
    setBatchSaving(true)
    try {
      const result = await api.storeCountSave({
        storeId: stockFilters.storeId,
        date: batchDate.format('YYYY-MM-DD'),
        remark: batchRemark,
        scopeType: batchScope,
        includeZero: batchIncludeZero,
        onlyBusiness: batchOnlyBusiness,
        items,
      })
      message.success(`盘点保存成功，共 ${result.handled} 个商品`)
      setBatchOpen(false)
      await Promise.all([loadStock(), loadLogs(), loadDocuments()])
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存盘点失败')
    } finally {
      setBatchSaving(false)
    }
  }

  async function openDocumentDetail(record: StoreCountDocumentSummary) {
    setDocDetailLoading(true)
    try {
      const res = await api.storeCountDocumentDetail(record.countNo)
      setDocDetail(res)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载盘点单详情失败')
    } finally {
      setDocDetailLoading(false)
    }
  }

  async function openDocumentVoucher(record: StoreCountDocumentSummary) {
    setDocActionLoading(true)
    try {
      const detail = await api.storeCountDocumentDetail(record.countNo)
      setVoucherDocument(detail)
      setVoucherOpen(true)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载盘点单失败')
    } finally {
      setDocActionLoading(false)
    }
  }

  async function exportDocument(record: StoreCountDocumentSummary) {
    setDocActionLoading(true)
    try {
      const detail = await api.storeCountDocumentDetail(record.countNo)
      const XLSX = await import('xlsx')
      const sheet = XLSX.utils.json_to_sheet(
        detail.items.map((item) => ({
          序号: item.lineNo || '',
          商品: item.productName,
          规格: item.spec,
          单位: item.unit,
          账面数: item.bookQty,
          实盘数: item.countedQty,
          差异: item.diff,
          单价: item.price,
          差异金额: item.amount,
          操作人: item.operator,
          备注: item.remark,
        })),
      )
      sheet['!cols'] = [
        { wch: 8 },
        { wch: 22 },
        { wch: 14 },
        { wch: 8 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
      ]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, '盘点单')
      XLSX.writeFile(workbook, `${record.countNo || '门店盘点单'}.xlsx`)
      message.success('盘点单已导出')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导出盘点单失败')
    } finally {
      setDocActionLoading(false)
    }
  }

  function confirmVoidDocument(record: StoreCountDocumentSummary) {
    Modal.confirm({
      title: `作废盘点单「${record.countNo}」？`,
      content:
        '仅当该单据仍是每个商品最近一次盘点时才能作废；作废后门店库存恢复到盘点前数量。',
      okText: '确认作废',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setDocActionLoading(true)
        try {
          await api.storeCountDocumentVoid(record.countNo)
          message.success('盘点单已作废')
          await Promise.all([loadStock(), loadLogs(), loadDocuments()])
        } catch (err) {
          message.error(err instanceof Error ? err.message : '作废失败')
        } finally {
          setDocActionLoading(false)
        }
      },
    })
  }

  function openCorrection(
    id: string,
    productName: string,
    counted: number | null,
  ) {
    if (!id) {
      message.info('该商品还没有盘点记录，请由门店账号先提交盘点')
      return
    }
    const value = Number(counted ?? 0)
    setCorrection({ id, productName, counted: value })
    correctionForm.setFieldsValue({
      counted: value,
      remark: '',
    })
  }

  async function submitCorrection(values: CorrectionForm) {
    if (!correction) return
    setCorrectionSaving(true)
    try {
      await api.storeCountUpdate({
        id: correction.id,
        counted: values.counted,
        remark: values.remark,
      })
      message.success('实盘数已修正')
      setCorrection(null)
      await Promise.all([loadStock(), loadLogs(), loadDocuments()])
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修正失败')
    } finally {
      setCorrectionSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="门店盘点"
        subtitle="每个门店独立记录库存，门店账号提交盘点，总负责人查看和修正。"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!stockFilters.storeId}
            onClick={openBatchCount}
          >
            开始盘点
          </Button>
        }
      />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'stock',
            label: '门店库存',
            children: (
              <div className="panel-card">
                <div className="filter-bar">
                  <Select
                    style={{ width: 210 }}
                    placeholder="选择门店"
                    value={stockFilters.storeId || undefined}
                    options={stores.map((store) => ({
                      value: store.id,
                      label: store.name,
                    }))}
                    onChange={(value) =>
                      setStockFilters((current) => ({
                        ...current,
                        storeId: value || '',
                      }))
                    }
                  />
                  <Select
                    allowClear
                    placeholder="全部分类"
                    style={{ width: 140 }}
                    value={stockFilters.category || undefined}
                    options={categories.map((category) => ({
                      value: category.key,
                      label: category.name,
                    }))}
                    onChange={(value) =>
                      setStockFilters((current) => ({
                        ...current,
                        category: value || '',
                        subcategory: '',
                      }))
                    }
                  />
                  <Select
                    allowClear
                    placeholder="全部子分类"
                    style={{ width: 150 }}
                    value={stockFilters.subcategory || undefined}
                    options={(currentCategory?.subcategories || []).map(
                      (subcategory) => ({
                        value: subcategory,
                        label: subcategory,
                      }),
                    )}
                    onChange={(value) =>
                      setStockFilters((current) => ({
                        ...current,
                        subcategory: value || '',
                      }))
                    }
                  />
                  <Input
                    allowClear
                    placeholder="搜索商品"
                    prefix={<SearchOutlined />}
                    style={{ width: 220 }}
                    value={stockFilters.keyword}
                    onChange={(event) =>
                      setStockFilters((current) => ({
                        ...current,
                        keyword: event.target.value,
                      }))
                    }
                  />
                  <Button type="primary" onClick={loadStock}>
                    查询
                  </Button>
                </div>
                <Spin spinning={stockLoading}>
                  <Table<StoreStockItem>
                    rowKey="id"
                    dataSource={stockList}
                    pagination={{
                      current: stockPage,
                      pageSize: stockPageSize,
                      total: stockTotal,
                      showSizeChanger: true,
                      onChange: (page, pageSize) => {
                        setStockPage(page)
                        setStockPageSize(pageSize)
                      },
                    }}
                    columns={[
                      { title: '商品', dataIndex: 'productName' },
                      { title: '规格', dataIndex: 'spec', width: 100 },
                      {
                        title: '分类',
                        dataIndex: 'categoryName',
                        width: 100,
                      },
                      { title: '单位', dataIndex: 'unit', width: 70 },
                      {
                        title: '门店库存',
                        dataIndex: 'stock',
                        width: 100,
                        align: 'right',
                        render: (value: number) => Number(value || 0),
                      },
                      {
                        title: '最近实盘',
                        dataIndex: 'counted',
                        width: 100,
                        align: 'right',
                        render: (value: number | null) =>
                          value === null ? '-' : Number(value),
                      },
                      {
                        title: '差异',
                        dataIndex: 'diff',
                        width: 90,
                        align: 'right',
                        render: (value: number | null) => (
                          <span
                            style={{
                              fontWeight: 600,
                              color:
                                value && value > 0
                                  ? 'var(--success)'
                                  : value && value < 0
                                    ? 'var(--danger)'
                                    : 'inherit',
                            }}
                          >
                            {diffText(value)}
                          </span>
                        ),
                      },
                      {
                        title: '最近盘点时间',
                        dataIndex: 'lastCountedAt',
                        width: 180,
                        render: (value: string | Date | null) =>
                          value
                            ? dayjs(String(value)).format('YYYY-MM-DD HH:mm')
                            : '-',
                      },
                      {
                        title: '操作人',
                        dataIndex: 'lastOperator',
                        width: 100,
                      },
                      {
                        title: '操作',
                        width: 110,
                        render: (_, record) => (
                          <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() =>
                              openCorrection(
                                record.lastLogId,
                                record.productName,
                                record.counted,
                              )
                            }
                          >
                            修改实盘
                          </Button>
                        ),
                      },
                    ]}
                  />
                </Spin>
              </div>
            ),
          },
          {
            key: 'documents',
            label: '盘点单',
            children: (
              <div className="panel-card">
                <div className="filter-bar">
                  <Select
                    allowClear
                    placeholder="全部门店"
                    style={{ width: 200 }}
                    value={docFilters.storeId || undefined}
                    options={stores.map((store) => ({
                      value: store.id,
                      label: store.name,
                    }))}
                    onChange={(value) =>
                      setDocFilters((current) => ({
                        ...current,
                        storeId: value || '',
                      }))
                    }
                  />
                  <Select
                    allowClear
                    placeholder="全部状态"
                    style={{ width: 130 }}
                    value={docFilters.status || undefined}
                    options={[
                      { value: 'active', label: '已生效' },
                      { value: 'voided', label: '已作废' },
                    ]}
                    onChange={(value) =>
                      setDocFilters((current) => ({
                        ...current,
                        status: value || '',
                      }))
                    }
                  />
                  <Input
                    allowClear
                    placeholder="搜索单据号、门店或操作人"
                    prefix={<SearchOutlined />}
                    style={{ width: 240 }}
                    value={docFilters.keyword}
                    onChange={(event) =>
                      setDocFilters((current) => ({
                        ...current,
                        keyword: event.target.value,
                      }))
                    }
                  />
                  <DatePicker.RangePicker
                    value={docFilters.range}
                    onChange={(dates) =>
                      setDocFilters((current) => ({
                        ...current,
                        range:
                          dates && dates[0] && dates[1]
                            ? [dates[0], dates[1]]
                            : null,
                      }))
                    }
                  />
                  <Button type="primary" onClick={loadDocuments}>
                    查询
                  </Button>
                </div>
                <Spin spinning={docLoading}>
                  <Table<StoreCountDocumentSummary>
                    rowKey="id"
                    dataSource={docList}
                    pagination={{
                      current: docPage,
                      pageSize: docPageSize,
                      total: docTotal,
                      showSizeChanger: true,
                      onChange: (page, pageSize) => {
                        setDocPage(page)
                        setDocPageSize(pageSize)
                      },
                    }}
                    columns={[
                      { title: '盘点单号', dataIndex: 'countNo', width: 190 },
                      { title: '日期', dataIndex: 'date', width: 110 },
                      { title: '门店', dataIndex: 'storeName', width: 160 },
                      {
                        title: '范围',
                        dataIndex: 'scopeType',
                        width: 90,
                        render: (value: string) =>
                          value === 'selected' ? '指定商品' : '全场',
                      },
                      {
                        title: '商品数',
                        dataIndex: 'itemCount',
                        width: 80,
                        align: 'right',
                      },
                      {
                        title: '总数量',
                        dataIndex: 'totalCountedQty',
                        width: 90,
                        align: 'right',
                      },
                      {
                        title: '差异',
                        dataIndex: 'totalDiff',
                        width: 90,
                        align: 'right',
                        render: (value: number) => (
                          <span
                            style={{
                              color:
                                value > 0
                                  ? 'var(--success)'
                                  : value < 0
                                    ? 'var(--danger)'
                                    : 'inherit',
                            }}
                          >
                            {diffText(value)}
                          </span>
                        ),
                      },
                      {
                        title: '盘盈金额',
                        dataIndex: 'gainAmount',
                        width: 110,
                        align: 'right',
                        render: (value: number) =>
                          `¥${Number(value || 0).toFixed(2)}`,
                      },
                      {
                        title: '盘亏金额',
                        dataIndex: 'lossAmount',
                        width: 110,
                        align: 'right',
                        render: (value: number) =>
                          `¥${Number(value || 0).toFixed(2)}`,
                      },
                      {
                        title: '净差异',
                        dataIndex: 'netAmount',
                        width: 110,
                        align: 'right',
                        render: (value: number) => (
                          <span
                            style={{
                              color:
                                value > 0
                                  ? 'var(--success)'
                                  : value < 0
                                    ? 'var(--danger)'
                                    : 'inherit',
                            }}
                          >
                            ¥{Number(value || 0).toFixed(2)}
                          </span>
                        ),
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        width: 90,
                        render: (status: string) =>
                          status === 'voided' ? (
                            <Tag color="default">已作废</Tag>
                          ) : (
                            <Tag color="green">已生效</Tag>
                          ),
                      },
                      { title: '操作人', dataIndex: 'operator', width: 100 },
                      {
                        title: '创建时间',
                        dataIndex: 'createdAt',
                        width: 170,
                        render: (value: string | Date) =>
                          dayjs(String(value)).format('YYYY-MM-DD HH:mm'),
                      },
                      {
                        title: '操作',
                        width: 260,
                        render: (_, record) => (
                          <Space size={0}>
                            <Button
                              type="link"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => openDocumentDetail(record)}
                            >
                              查看
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              icon={<DownloadOutlined />}
                              disabled={docActionLoading}
                              onClick={() => exportDocument(record)}
                            >
                              导出
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              icon={<PrinterOutlined />}
                              disabled={docActionLoading}
                              onClick={() => openDocumentVoucher(record)}
                            >
                              打印
                            </Button>
                            {record.status !== 'voided' ? (
                              <Button
                                type="link"
                                size="small"
                                danger
                                icon={<RollbackOutlined />}
                                disabled={docActionLoading}
                                onClick={() => confirmVoidDocument(record)}
                              >
                                作废
                              </Button>
                            ) : null}
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Spin>
              </div>
            ),
          },
          {
            key: 'logs',
            label: '盘点记录',
            children: (
              <div className="panel-card">
                <div className="filter-bar">
                  <Select
                    style={{ width: 210 }}
                    placeholder="选择门店"
                    value={logFilters.storeId || undefined}
                    options={stores.map((store) => ({
                      value: store.id,
                      label: store.name,
                    }))}
                    onChange={(value) =>
                      setLogFilters((current) => ({
                        ...current,
                        storeId: value || '',
                      }))
                    }
                  />
                  <Input
                    allowClear
                    placeholder="搜索商品、操作人或盘点单号"
                    prefix={<SearchOutlined />}
                    style={{ width: 250 }}
                    value={logFilters.keyword}
                    onChange={(event) =>
                      setLogFilters((current) => ({
                        ...current,
                        keyword: event.target.value,
                      }))
                    }
                  />
                  <DatePicker.RangePicker
                    value={logFilters.range}
                    onChange={(dates) =>
                      setLogFilters((current) => ({
                        ...current,
                        range:
                          dates && dates[0] && dates[1]
                            ? [dates[0], dates[1]]
                            : null,
                      }))
                    }
                  />
                  <Button type="primary" onClick={loadLogs}>
                    查询
                  </Button>
                </div>
                <Spin spinning={logLoading}>
                  <Table<StoreCountLogItem>
                    rowKey="id"
                    dataSource={logList}
                    pagination={{
                      current: logPage,
                      pageSize: logPageSize,
                      total: logTotal,
                      showSizeChanger: true,
                      onChange: (page, pageSize) => {
                        setLogPage(page)
                        setLogPageSize(pageSize)
                      },
                    }}
                    columns={[
                      { title: '盘点单号', dataIndex: 'countNo', width: 190 },
                      { title: '日期', dataIndex: 'date', width: 110 },
                      { title: '商品', dataIndex: 'productName' },
                      { title: '规格', dataIndex: 'spec', width: 100 },
                      {
                        title: '盘点前',
                        dataIndex: 'stockBefore',
                        width: 90,
                        align: 'right',
                      },
                      {
                        title: '实盘数',
                        dataIndex: 'counted',
                        width: 90,
                        align: 'right',
                      },
                      {
                        title: '差异',
                        dataIndex: 'diff',
                        width: 90,
                        align: 'right',
                        render: (value: number) => (
                          <span
                            style={{
                              fontWeight: 600,
                              color:
                                value > 0
                                  ? 'var(--success)'
                                  : value < 0
                                    ? 'var(--danger)'
                                    : 'inherit',
                            }}
                          >
                            {diffText(value)}
                          </span>
                        ),
                      },
                      { title: '单位', dataIndex: 'unit', width: 70 },
                      { title: '操作人', dataIndex: 'operator', width: 100 },
                      {
                        title: '来源',
                        dataIndex: 'source',
                        width: 100,
                        render: (value: string) => (
                          <Tag
                            color={
                              value === 'admin_correction'
                                ? 'orange'
                                : value === 'admin_count'
                                  ? 'green'
                                  : 'blue'
                            }
                          >
                            {value === 'admin_correction'
                              ? '管理员修正'
                              : value === 'admin_count'
                                ? '管理员盘点'
                                : '门店盘点'}
                          </Tag>
                        ),
                      },
                      { title: '备注', dataIndex: 'remark', ellipsis: true },
                      {
                        title: '时间',
                        dataIndex: 'createdAt',
                        width: 180,
                        render: (value: string | Date) =>
                          dayjs(String(value)).format('YYYY-MM-DD HH:mm'),
                      },
                      {
                        title: '操作',
                        width: 110,
                        render: (_, record) =>
                          record.isLatest ? (
                            <Button
                              type="link"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() =>
                                openCorrection(
                                  record.id,
                                  record.productName,
                                  record.counted,
                                )
                              }
                            >
                              修改实盘
                            </Button>
                          ) : null,
                      },
                    ]}
                  />
                </Spin>
              </div>
            ),
          },
        ]}
      />
      <Modal
        title="门店批量盘点"
        width={1100}
        open={batchOpen}
        onCancel={() => setBatchOpen(false)}
        footer={null}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
      >
        <div className="filter-bar">
          <span style={{ fontWeight: 600 }}>
            门店：
            {stores.find((store) => store.id === stockFilters.storeId)?.name || '-'}
          </span>
          <DatePicker
            value={batchDate}
            onChange={(value) => value && setBatchDate(value)}
            allowClear={false}
          />
          <Select
            style={{ width: 130 }}
            value={batchScope}
            options={[
              { value: 'all', label: '全场盘点' },
              { value: 'selected', label: '指定商品' },
            ]}
            onChange={(value) => {
              setBatchScope(value)
              if (value === 'all') setBatchSelectedKeys([])
            }}
          />
          <Checkbox
            checked={batchIncludeZero}
            onChange={(event) => {
              setBatchIncludeZero(event.target.checked)
              loadBatchRows(batchFilters, {
                includeZero: event.target.checked,
              })
            }}
          >
            包含零库存
          </Checkbox>
          <Checkbox
            checked={batchOnlyBusiness}
            onChange={(event) => {
              setBatchOnlyBusiness(event.target.checked)
              loadBatchRows(batchFilters, {
                onlyBusiness: event.target.checked,
              })
            }}
          >
            仅有业务商品
          </Checkbox>
          <Select
            allowClear
            placeholder="全部分类"
            style={{ width: 140 }}
            value={batchFilters.category || undefined}
            options={categories.map((category) => ({
              value: category.key,
              label: category.name,
            }))}
            onChange={(value) => {
              const next = {
                ...batchFilters,
                category: value || '',
                subcategory: '',
              }
              setBatchFilters(next)
              loadBatchRows(next)
            }}
          />
          <Select
            allowClear
            placeholder="全部子分类"
            style={{ width: 150 }}
            value={batchFilters.subcategory || undefined}
            options={(batchCategory?.subcategories || []).map((subcategory) => ({
              value: subcategory,
              label: subcategory,
            }))}
            onChange={(value) => {
              const next = { ...batchFilters, subcategory: value || '' }
              setBatchFilters(next)
              loadBatchRows(next)
            }}
          />
          <Input
            allowClear
            placeholder="搜索商品"
            prefix={<SearchOutlined />}
            style={{ width: 190 }}
            value={batchFilters.keyword}
            onChange={(event) => {
              const next = { ...batchFilters, keyword: event.target.value }
              setBatchFilters(next)
            }}
            onPressEnter={() => loadBatchRows(batchFilters)}
          />
          <Button onClick={() => loadBatchRows(batchFilters)}>查询</Button>
          <Button onClick={fillBatchBookStock}>按账面库存填入</Button>
          <Button icon={<ClearOutlined />} onClick={clearBatchInputs}>
            清空录入
          </Button>
        </div>
        <Spin spinning={batchLoading}>
          <Table<BatchCountRow>
            rowKey="productId"
            dataSource={batchRows}
            rowSelection={
              batchScope === 'selected'
                ? {
                    selectedRowKeys: batchSelectedKeys,
                    onChange: setBatchSelectedKeys,
                  }
                : undefined
            }
            pagination={false}
            scroll={{ y: '52vh' }}
            columns={[
              { title: '商品', dataIndex: 'productName' },
              { title: '规格', dataIndex: 'spec', width: 110 },
              { title: '单位', dataIndex: 'unit', width: 70 },
              {
                title: '账面库存',
                dataIndex: 'stock',
                width: 100,
                align: 'right',
              },
              {
                title: '实盘数',
                width: 140,
                align: 'right',
                render: (_, row) => (
                  <InputNumber
                    min={0}
                    precision={3}
                    value={row.countedInput}
                    placeholder="未盘点"
                    style={{ width: 110 }}
                    onChange={(value) =>
                      setBatchRows((rows) =>
                        rows.map((item) =>
                          item.productId === row.productId
                            ? {
                                ...item,
                                countedInput:
                                  value === null || value === undefined
                                    ? null
                                    : Number(value),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                ),
              },
              {
                title: '差异',
                width: 90,
                align: 'right',
                render: (_, row) => {
                  if (row.countedInput === null) return '-'
                  const diff = Number(row.countedInput) - Number(row.stock || 0)
                  return (
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          diff > 0
                            ? 'var(--success)'
                            : diff < 0
                              ? 'var(--danger)'
                              : 'inherit',
                      }}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  )
                },
              },
            ]}
          />
        </Spin>
        <Input.TextArea
          rows={2}
          value={batchRemark}
          placeholder="盘点备注（选填）"
          onChange={(event) => setBatchRemark(event.target.value)}
          style={{ marginTop: 12 }}
        />
        <Space
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 16,
          }}
        >
          <Button onClick={() => setBatchOpen(false)} disabled={batchSaving}>
            取消
          </Button>
          <Button type="primary" loading={batchSaving} onClick={submitBatchCount}>
            保存盘点
          </Button>
        </Space>
      </Modal>
      <Modal
        title={`盘点单详情 · ${docDetail?.document.countNo || ''}`}
        width={980}
        open={!!docDetail}
        onCancel={() => setDocDetail(null)}
        footer={null}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
      >
        <Spin spinning={docDetailLoading}>
          {docDetail ? (
            <>
              <Descriptions bordered size="small" column={3}>
                <Descriptions.Item label="门店">
                  {docDetail.document.storeName}
                </Descriptions.Item>
                <Descriptions.Item label="日期">
                  {docDetail.document.date}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {docDetail.document.status === 'voided' ? (
                    <Tag color="default">已作废</Tag>
                  ) : (
                    <Tag color="green">已生效</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="范围">
                  {docDetail.document.scopeType === 'selected' ? '指定商品' : '全场'}
                </Descriptions.Item>
                <Descriptions.Item label="包含零库存">
                  {docDetail.document.includeZero ? '是' : '否'}
                </Descriptions.Item>
                <Descriptions.Item label="仅业务商品">
                  {docDetail.document.onlyBusiness ? '是' : '否'}
                </Descriptions.Item>
                <Descriptions.Item label="商品数">
                  {docDetail.document.itemCount}
                </Descriptions.Item>
                <Descriptions.Item label="总数量">
                  {docDetail.document.totalCountedQty}
                </Descriptions.Item>
                <Descriptions.Item label="净差异">
                  {diffText(docDetail.document.totalDiff)}
                </Descriptions.Item>
                <Descriptions.Item label="盘盈金额">
                  ¥{Number(docDetail.document.gainAmount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="盘亏金额">
                  ¥{Number(docDetail.document.lossAmount || 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="操作人">
                  {docDetail.document.operator || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="备注" span={3}>
                  {docDetail.document.remark || '无'}
                </Descriptions.Item>
              </Descriptions>
              <Table<StoreCountDocumentDetail['items'][number]>
                rowKey="id"
                size="small"
                dataSource={docDetail.items}
                pagination={false}
                scroll={{ y: '52vh' }}
                style={{ marginTop: 16 }}
                columns={[
                  {
                    title: '序号',
                    width: 56,
                    align: 'center',
                    render: (_, item, index) => item.lineNo || index + 1,
                  },
                  { title: '商品', dataIndex: 'productName' },
                  { title: '规格', dataIndex: 'spec', width: 100 },
                  { title: '单位', dataIndex: 'unit', width: 66 },
                  {
                    title: '账面数',
                    dataIndex: 'bookQty',
                    width: 90,
                    align: 'right',
                  },
                  {
                    title: '实盘数',
                    dataIndex: 'countedQty',
                    width: 90,
                    align: 'right',
                  },
                  {
                    title: '差异',
                    dataIndex: 'diff',
                    width: 90,
                    align: 'right',
                    render: (value: number) => diffText(value),
                  },
                  {
                    title: '差异金额',
                    dataIndex: 'amount',
                    width: 100,
                    align: 'right',
                    render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
                  },
                  { title: '操作人', dataIndex: 'operator', width: 100 },
                  { title: '备注', dataIndex: 'remark', ellipsis: true },
                  {
                    title: '操作',
                    width: 100,
                    render: (_, item) =>
                      docDetail.document.status !== 'voided' && item.isLatest ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() =>
                            openCorrection(
                              item.id,
                              item.productName,
                              item.countedQty,
                            )
                          }
                        >
                          修改
                        </Button>
                      ) : null,
                  },
                ]}
              />
            </>
          ) : null}
        </Spin>
      </Modal>
      <Modal
        title={`修改实盘数 · ${correction?.productName || ''}`}
        open={!!correction}
        onCancel={() => setCorrection(null)}
        footer={null}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
      >
        <Form<CorrectionForm>
          form={correctionForm}
          layout="vertical"
          onFinish={submitCorrection}
        >
          <Form.Item
            name="counted"
            label="实盘数"
            rules={[{ required: true, message: '请输入实盘数' }]}
          >
            <InputNumber min={0} precision={3} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="修正说明">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setCorrection(null)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={correctionSaving}>
              保存修正
            </Button>
          </Space>
        </Form>
      </Modal>
      <StoreCountVoucherPrint
        open={voucherOpen}
        data={voucherDocument}
        onClose={() => setVoucherOpen(false)}
      />
    </>
  )
}
