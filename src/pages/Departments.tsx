import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Key,
} from 'react'
import {
  Alert,
  Button,
  DatePicker,
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
  Tooltip,
  message,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  ClusterOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  PrinterOutlined,
  RollbackOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import ProductInlineSelect from '../components/ProductInlineSelect'
import PurchaseVoucherPrint, {
  type PurchaseVoucherGroup,
} from '../components/PurchaseVoucherPrint'
import type {
  CategoryItem,
  DepartmentItem,
  DepartmentLogItem,
  DepartmentStockItem,
  ProductOption,
  WarehouseItem,
} from '../types'

interface DepartmentForm {
  name: string
  code?: string
  remark?: string
}

interface EntryItem {
  productId?: string
  qty?: number
  price?: number
  amount?: number
  counted?: number
  remark?: string
}

interface EntryForm {
  date: Dayjs
  supplier?: string
  creator?: string
  inspector?: string
  departmentManager?: string
  targetType?: 'warehouse' | 'department'
  targetId?: string
  sourceDepartmentId?: string
  targetDepartmentId?: string
  warehouseId?: string
  departmentId?: string
  items: EntryItem[]
}

interface PurchaseSummaryRow {
  key: string
  receiptNo: string
  date: string
  logType: string
  supplier: string
  targetName: string
  operator: string
  itemCount: number
  totalQty: number
  totalAmount: number
  items: DepartmentLogItem[]
}

interface PurchaseLogEditForm {
  qty: number
  price: number
  amount: number
  remark?: string
}

interface StockStatsSummary {
  opening: number
  inbound: number
  outbound: number
  net: number
  closing: number
}

const logTypeLabels: Record<string, string> = {
  daily: '日常采购',
  direct: '直拨进货',
  purchase_return: '采购退货',
  issue: '领料',
  return: '退料',
  transfer: '调拨',
  sale: '销售',
  count: '盘点',
}

export default function Departments() {
  const { user: currentUser } = useAuth()
  const [deptForm] = Form.useForm<DepartmentForm>()
  const [purchaseForm] = Form.useForm<EntryForm>()
  const [moveForm] = Form.useForm<EntryForm>()
  const [countForm] = Form.useForm<EntryForm>()
  const [purchaseLogEditForm] = Form.useForm<PurchaseLogEditForm>()

  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('settings')

  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null)

  const [stock, setStock] = useState<DepartmentStockItem[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [exportingStock, setExportingStock] = useState(false)
  const [stockPage, setStockPage] = useState(1)
  const [stockPageSize, setStockPageSize] = useState(20)
  const [stockTotal, setStockTotal] = useState(0)
  const [stockFilters, setStockFilters] = useState({
    departmentId: '',
    category: '',
    subcategory: '',
    keyword: '',
  })

  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchasePrintLoading, setPurchasePrintLoading] = useState(false)
  const [purchasePage, setPurchasePage] = useState(1)
  const [purchasePageSize, setPurchasePageSize] = useState(20)
  const [purchaseTotal, setPurchaseTotal] = useState(0)
  const [purchaseRange, setPurchaseRange] = useState<[Dayjs | null, Dayjs | null] | null>(
    () => [dayjs(), dayjs()],
  )
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState('')
  const [purchaseProductFilter, setPurchaseProductFilter] = useState('')
  const [purchaseSummaryRows, setPurchaseSummaryRows] = useState<PurchaseSummaryRow[]>([])
  const [purchaseVoucherOpen, setPurchaseVoucherOpen] = useState(false)
  const [purchaseVoucherGroups, setPurchaseVoucherGroups] = useState<PurchaseVoucherGroup[]>([])
  const [purchaseSelectedKeys, setPurchaseSelectedKeys] = useState<Key[]>([])
  const [purchaseSelectedLogs, setPurchaseSelectedLogs] = useState<DepartmentLogItem[]>([])
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([])
  const [expandedRowsData, setExpandedRowsData] = useState<Record<string, DepartmentLogItem[]>>({})
  const [purchaseDetailOpen, setPurchaseDetailOpen] = useState(false)
  const [purchaseDetailProduct, setPurchaseDetailProduct] = useState<PurchaseSummaryRow | null>(null)
  const [purchaseDetailLogs, setPurchaseDetailLogs] = useState<DepartmentLogItem[]>([])
  const [editingPurchaseLog, setEditingPurchaseLog] = useState<DepartmentLogItem | null>(null)
  const [purchaseLogEditSaving, setPurchaseLogEditSaving] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)
  const [flowProductId, setFlowProductId] = useState('')
  const [flowRange, setFlowRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [flowLoading, setFlowLoading] = useState(false)
  const [flowRows, setFlowRows] = useState<DepartmentLogItem[]>([])
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsDepartmentId, setStatsDepartmentId] = useState('')
  const [statsProductIds, setStatsProductIds] = useState<string[]>([])
  const [statsRange, setStatsRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsRows, setStatsRows] = useState<DepartmentLogItem[]>([])
  const [statsSummary, setStatsSummary] = useState<StockStatsSummary | null>(null)

  const [moveLogs, setMoveLogs] = useState<DepartmentLogItem[]>([])
  const [moveLoading, setMoveLoading] = useState(false)
  const [movePage, setMovePage] = useState(1)
  const [movePageSize, setMovePageSize] = useState(20)
  const [moveTotal, setMoveTotal] = useState(0)

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [purchaseType, setPurchaseType] = useState<'daily' | 'direct' | 'return'>('daily')
  const [appendReceiptNo, setAppendReceiptNo] = useState('')
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveType, setMoveType] = useState<'issue' | 'return' | 'transfer' | 'sale'>('issue')
  const [countLogs, setCountLogs] = useState<DepartmentLogItem[]>([])
  const [countLoading, setCountLoading] = useState(false)
  const [countPage, setCountPage] = useState(1)
  const [countPageSize, setCountPageSize] = useState(20)
  const [countTotal, setCountTotal] = useState(0)
  const [countStockMap, setCountStockMap] = useState<Record<string, DepartmentStockItem>>({})
  const [countStockLoading, setCountStockLoading] = useState(false)
  const countDepartmentId = Form.useWatch('departmentId', countForm)

  const purchaseTargetType = Form.useWatch('targetType', purchaseForm)
  const purchaseEntryRefs = useRef<Record<string, { focus?: () => void } | null>>({})

  function setPurchaseEntryRef(key: string) {
    return (node: { focus?: () => void } | null) => {
      purchaseEntryRefs.current[key] = node && typeof node.focus === 'function' ? node : null
    }
  }

  function focusPurchaseEntry(index: number, field: string) {
    const node = purchaseEntryRefs.current[`${index}-${field}`]
    const focus = node && node.focus
    if (typeof focus === 'function') {
      requestAnimationFrame(() => {
        setTimeout(() => focus(), 0)
      })
    }
  }

  function moveToNextPurchaseEntry(index: number, field: string, nextRowIndex: number) {
    const order = ['productId', 'qty', 'price', 'amount', 'remark']
    const nextFieldIndex = order.indexOf(field) + 1
    if (nextFieldIndex < order.length) {
      focusPurchaseEntry(index, order[nextFieldIndex])
      return
    }
    if (nextRowIndex < fieldsCountRef.current) {
      focusPurchaseEntry(nextRowIndex, 'productId')
    } else {
      addPurchaseRowRef.current?.(nextRowIndex)
    }
  }

  function moveToAdjacentPurchaseEntry(
    index: number,
    field: string,
    direction: -1 | 1,
  ) {
    const order = ['qty', 'price', 'amount', 'remark']
    const currentIndex = order.indexOf(field)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return
    focusPurchaseEntry(index, order[nextIndex])
  }

  const fieldsCountRef = useRef(0)
  const addPurchaseRowRef = useRef<((nextIndex: number) => void) | null>(null)

  const loadDepartments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.departmentList()
      setDepartments(res.list)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载部门失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const res = await api.productOptions()
      setProducts(res.list)
    } catch {
      message.error('加载商品列表失败')
    }
  }, [])

  useEffect(() => {
    loadDepartments()
    loadProducts()
    api
      .categoryList()
      .then((res) => setCategories(res.list))
      .catch(() => undefined)
    api
      .warehouseList()
      .then((res) => setWarehouses(res.list))
      .catch(() => undefined)
  }, [loadDepartments, loadProducts])

  const loadStock = useCallback(async () => {
    setStockLoading(true)
    try {
      const res = await api.departmentStock({
        page: stockPage,
        pageSize: stockPageSize,
        ...stockFilters,
      })
      setStock(res.list)
      setStockTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载部门库存失败')
    } finally {
      setStockLoading(false)
    }
  }, [stockPage, stockPageSize, stockFilters])

  useEffect(() => {
    if (activeTab === 'stock') loadStock()
  }, [activeTab, loadStock])

  useEffect(() => {
    setStockPage(1)
  }, [stockFilters])

  async function exportStockExcel() {
    setExportingStock(true)
    try {
      const all: DepartmentStockItem[] = []
      let page = 1
      while (true) {
        const res = await api.departmentStock({ page, pageSize: 100, ...stockFilters })
        all.push(...res.list)
        if (all.length >= res.total || !res.list.length) break
        page += 1
      }
      if (!all.length) {
        message.warning('暂无可导出的部门库存')
        return
      }
      const XLSX = await import('xlsx')
      const rows: Array<Array<string | number>> = [
        ['部门', '商品', '分类', '子分类', '规格', '库存', '单位', '状态'],
      ]
      all.forEach((item) => {
        rows.push([
          item.departmentName,
          item.productName,
          item.categoryName,
          item.subcategory,
          item.spec,
          item.stock,
          item.unit,
          item.low ? '低库存' : '正常',
        ])
      })
      const sheet = XLSX.utils.aoa_to_sheet(rows)
      sheet['!cols'] = [
        { wch: 14 },
        { wch: 28 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 8 },
        { wch: 10 },
      ]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, '部门库存')
      XLSX.writeFile(workbook, `部门库存_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
      message.success('已导出 Excel')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExportingStock(false)
    }
  }

  const loadPurchaseLogs = useCallback(async (targetPage = purchasePage) => {
    setPurchaseLoading(true)
    try {
      const start =
        purchaseRange && purchaseRange[0]
          ? purchaseRange[0].format('YYYY-MM-DD')
          : ''
      const end =
        purchaseRange && purchaseRange[1]
          ? purchaseRange[1].format('YYYY-MM-DD')
          : ''
      const types =
        purchaseTypeFilter === 'return'
          ? ['purchase_return']
          : purchaseTypeFilter
            ? [purchaseTypeFilter]
            : ['daily', 'direct', 'purchase_return']
      const res = await api.departmentPurchaseSummary({
        page: targetPage,
        pageSize: purchasePageSize,
        types,
        startDate: start || undefined,
        endDate: end || undefined,
        productId: purchaseProductFilter || undefined,
      })
      setPurchaseSummaryRows(res.list)
      setPurchaseTotal(res.total)
      if (targetPage !== purchasePage) setPurchasePage(targetPage)
      return res.list
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载采购流水失败')
      return []
    } finally {
      setPurchaseLoading(false)
    }
  }, [purchasePage, purchasePageSize, purchaseRange, purchaseTypeFilter, purchaseProductFilter])

  const loadMoveLogs = useCallback(async () => {
    setMoveLoading(true)
    try {
      const res = await api.departmentLogs({
        page: movePage,
        pageSize: movePageSize,
        types: ['issue', 'return', 'transfer', 'sale'],
      })
      setMoveLogs(res.list)
      setMoveTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载库存变动失败')
    } finally {
      setMoveLoading(false)
    }
  }, [movePage, movePageSize])

  useEffect(() => {
    if (activeTab === 'purchase') loadPurchaseLogs()
  }, [activeTab, loadPurchaseLogs])

  useEffect(() => {
    setPurchasePage(1)
    setPurchaseSelectedKeys([])
    setPurchaseSelectedLogs([])
    setExpandedRowKeys([])
    setExpandedRowsData({})
  }, [purchaseRange, purchaseTypeFilter, purchaseProductFilter])

  useEffect(() => {
    if (activeTab === 'move') loadMoveLogs()
  }, [activeTab, loadMoveLogs])

  const loadCountLogs = useCallback(async () => {
    setCountLoading(true)
    try {
      const res = await api.departmentLogs({
        page: countPage,
        pageSize: countPageSize,
        types: ['count'],
      })
      setCountLogs(res.list)
      setCountTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载盘点记录失败')
    } finally {
      setCountLoading(false)
    }
  }, [countPage, countPageSize])

  useEffect(() => {
    if (activeTab === 'count') loadCountLogs()
  }, [activeTab, loadCountLogs])

  async function fetchDepartmentStockRows(departmentId: string) {
    const all: DepartmentStockItem[] = []
    let page = 1
    while (true) {
      const res = await api.departmentStock({
        departmentId,
        page,
        pageSize: 100,
      })
      all.push(...res.list)
      if (all.length >= res.total || !res.list.length) break
      page += 1
    }
    return all
  }

  const loadCountStock = useCallback(async (departmentId: string) => {
    setCountStockLoading(true)
    try {
      const rows = await fetchDepartmentStockRows(departmentId)
      const map: Record<string, DepartmentStockItem> = {}
      rows.forEach((row) => {
        map[row.productId] = row
      })
      setCountStockMap(map)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载部门库存失败')
    } finally {
      setCountStockLoading(false)
    }
  }, [])

  useEffect(() => {
    if (countDepartmentId) {
      loadCountStock(countDepartmentId)
    } else {
      setCountStockMap({})
    }
  }, [countDepartmentId, loadCountStock])

  async function loadDepartmentProducts() {
    const departmentId = countForm.getFieldValue('departmentId')
    if (!departmentId) {
      message.warning('请先选择盘点部门')
      return
    }
    setCountStockLoading(true)
    try {
      const rows = await fetchDepartmentStockRows(departmentId)
      if (!rows.length) {
        message.info('该部门暂无可盘点的商品')
        return
      }
      const map: Record<string, DepartmentStockItem> = {}
      rows.forEach((row) => {
        map[row.productId] = row
      })
      setCountStockMap(map)
      countForm.setFieldsValue({
        items: rows.map((row) => ({
          productId: row.productId,
          counted: row.stock,
          remark: '',
        })),
      })
      message.success(`已载入 ${rows.length} 个部门商品`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载部门商品失败')
    } finally {
      setCountStockLoading(false)
    }
  }

  function currentCountStock(productId?: string): string {
    if (!productId) return '-'
    const row = countStockMap[productId]
    return row ? `${Number(row.stock || 0)} ${row.unit || ''}`.trim() : '-'
  }

  function openProductFlow() {
    setFlowRows([])
    setFlowProductId('')
    setFlowRange(null)
    setFlowOpen(true)
  }

  async function queryProductFlow() {
    const start = flowRange && flowRange[0] ? flowRange[0].format('YYYY-MM-DD') : ''
    const end = flowRange && flowRange[1] ? flowRange[1].format('YYYY-MM-DD') : ''
    if (!flowProductId || !start || !end) {
      message.warning('请选择商品和时间段')
      return
    }
    if (start > end) {
      message.warning('开始日期不能晚于结束日期')
      return
    }

    setFlowLoading(true)
    try {
      const all: DepartmentLogItem[] = []
      let page = 1
      while (true) {
        const res = await api.departmentLogs({
          page,
          pageSize: 200,
          productId: flowProductId,
          startDate: start,
          endDate: end,
          types: ['daily', 'direct', 'purchase_return', 'issue', 'return', 'transfer', 'sale'],
        })
        all.push(...res.list)
        if (!res.list.length || all.length >= res.total) break
        page += 1
      }
      setFlowRows(all)
      if (!all.length) {
        message.info('该时间段内没有这个商品的进出货记录')
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '进出货查询失败')
    } finally {
      setFlowLoading(false)
    }
  }

  function departmentLogStockDelta(log: DepartmentLogItem) {
    if (log.recalled) return 0
    if (log.logType === 'count') return Number(log.diff || 0)
    return log.direction === 'out' ? -Number(log.qty || 0) : Number(log.qty || 0)
  }

  function departmentLogQuantity(log: DepartmentLogItem) {
    return log.logType === 'count' ? Number(log.diff || 0) : Number(log.qty || 0)
  }

  function departmentLogDepartments(log: DepartmentLogItem) {
    const names: string[] = []
    if (log.fromType === 'department' && log.fromName) names.push(log.fromName)
    if (log.toType === 'department' && log.toName) names.push(log.toName)
    return Array.from(new Set(names)).join(' → ') || log.targetName || '-'
  }

  function openStockStats() {
    setStatsRows([])
    setStatsSummary(null)
    setStatsDepartmentId('')
    setStatsProductIds([])
    setStatsRange(null)
    setStatsOpen(true)
  }

  async function queryStockStats() {
    const start = statsRange && statsRange[0] ? statsRange[0].format('YYYY-MM-DD') : ''
    const end = statsRange && statsRange[1] ? statsRange[1].format('YYYY-MM-DD') : ''
    if (!statsProductIds.length || !start || !end) {
      message.warning('请选择商品和时间段')
      return
    }
    if (start > end) {
      message.warning('开始日期不能晚于结束日期')
      return
    }

    setStatsLoading(true)
    try {
      const all: DepartmentLogItem[] = []
      let page = 1
      while (true) {
        const res = await api.departmentLogs({
          page,
          pageSize: 200,
          departmentId: statsDepartmentId,
          productIds: statsProductIds,
        })
        all.push(...res.list)
        if (!res.list.length || all.length >= res.total) break
        page += 1
      }

      let currentStock = 0
      let stockPage = 1
      let stockFetched = 0
      let stockTotal = 1
      while (stockFetched < stockTotal) {
        const stockRes = await api.departmentStock({
          page: stockPage,
          pageSize: 200,
          departmentId: statsDepartmentId || undefined,
          productIds: statsProductIds,
        })
        currentStock += stockRes.list.reduce(
          (sum, row) => sum + Number(row.stock || 0),
          0,
        )
        stockFetched += stockRes.list.length
        stockTotal = stockRes.total
        if (!stockRes.list.length) break
        stockPage += 1
      }
      const activeLogs = all
        .filter((log) => !log.recalled)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
      const periodLogs = activeLogs.filter(
        (log) => log.date >= start && log.date <= end,
      )
      const afterEndDelta = activeLogs
        .filter((log) => log.date > end)
        .reduce((sum, log) => sum + departmentLogStockDelta(log), 0)
      const periodDelta = periodLogs.reduce(
        (sum, log) => sum + departmentLogStockDelta(log),
        0,
      )
      const closing = currentStock - afterEndDelta
      const opening = closing - periodDelta
      const inbound = periodLogs
        .map(departmentLogStockDelta)
        .filter((delta) => delta > 0)
        .reduce((sum, delta) => sum + delta, 0)
      const outbound = periodLogs
        .map(departmentLogStockDelta)
        .filter((delta) => delta < 0)
        .reduce((sum, delta) => sum + Math.abs(delta), 0)

      setStatsRows(periodLogs)
      setStatsSummary({
        opening,
        inbound,
        outbound,
        net: periodDelta,
        closing,
      })
    } catch (err) {
      message.error(err instanceof Error ? err.message : '库存统计失败')
    } finally {
      setStatsLoading(false)
    }
  }

  async function exportStockStats() {
    if (!statsSummary || !statsRows.length) {
      message.warning('当前没有可导出的库存统计结果')
      return
    }
    const XLSX = await import('xlsx')
    const departmentName =
      departments.find((d) => d.id === statsDepartmentId)?.name || '全部部门'
    const productNames = statsProductIds
      .map((id) => products.find((p) => p.id === id)?.name || '')
      .filter(Boolean)
      .join('、')
    const start = statsRange?.[0]?.format('YYYY-MM-DD') || ''
    const end = statsRange?.[1]?.format('YYYY-MM-DD') || ''
    const rows: (string | number)[][] = [
      ['部门库存统计'],
      ['部门', departmentName],
      ['商品', productNames],
      ['时间段', `${start} ~ ${end}`],
      [],
      ['期初库存', statsSummary.opening],
      ['期间入库', statsSummary.inbound],
      ['期间出库', statsSummary.outbound],
      ['净变化', statsSummary.net],
      ['期末库存', statsSummary.closing],
      [],
      [
        '日期',
        '类型',
        '商品',
        '部门',
        '方向',
        '数量',
        '单价',
        '金额',
        '来源',
        '去向',
        '操作人',
        '备注',
      ],
      ...statsRows.map((log) => [
        log.date,
        logTypeLabels[log.logType] || log.logType,
        log.productName,
        departmentLogDepartments(log),
        log.logType === 'count'
          ? '调整'
          : log.direction === 'in'
            ? '入库'
            : log.direction === 'out'
              ? '出库'
              : log.direction,
        departmentLogQuantity(log),
        Number(log.price || 0),
        Number(log.amount || 0),
        log.fromName || '',
        log.toName || '',
        log.operator,
        log.remark || '',
      ]),
    ]
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:L1')
    for (let rowIndex = 12; rowIndex <= range.e.r; rowIndex += 1) {
      for (const columnIndex of [6, 7]) {
        const cell = sheet[
          XLSX.utils.encode_cell({
            r: rowIndex,
            c: columnIndex,
          })
        ]
        if (cell) cell.z = '0.00'
      }
    }
    sheet['!cols'] = [
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, '部门库存统计')
    XLSX.writeFile(workbook, `部门库存统计_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
  }

  async function handleDeptFinish(values: DepartmentForm) {
    setSaving(true)
    try {
      if (editingDept) {
        await api.departmentUpdate({ id: editingDept.id, ...values })
        message.success('部门已更新')
      } else {
        await api.departmentCreate(values)
        message.success('部门已创建')
      }
      setDeptModalOpen(false)
      setEditingDept(null)
      deptForm.resetFields()
      await loadDepartments()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存部门失败')
    } finally {
      setSaving(false)
    }
  }

  function openEditDept(record: DepartmentItem) {
    setEditingDept(record)
    deptForm.setFieldsValue({ name: record.name, code: record.code, remark: record.remark })
    setDeptModalOpen(true)
  }

  async function moveDept(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= departments.length) return
    const next = [...departments]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDepartments(next)
    try {
      await api.departmentReorder(next.map((d) => d.id))
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存排序失败')
      await loadDepartments()
    }
  }

  function confirmDeleteDept(record: DepartmentItem) {
    Modal.confirm({
      title: `删除部门「${record.name}」`,
      content: '该部门库存为 0 时才能删除，历史流水保留。',
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.departmentDelete(record.id)
          message.success('部门已删除')
          setStockFilters((f) => ({
            ...f,
            departmentId: f.departmentId === record.id ? '' : f.departmentId,
          }))
          await loadDepartments()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败')
        }
      },
    })
  }

  function getReceiptPurchaseMeta(row: PurchaseSummaryRow) {
    const active = (row.items || []).find((item) => !item.recalled)
    if (!row.receiptNo || !active) return null
    const purchaseType: 'daily' | 'direct' | 'return' =
      active.logType === 'purchase_return'
        ? 'return'
        : active.logType === 'direct'
          ? 'direct'
          : 'daily'
    const targetType: 'warehouse' | 'department' =
      active.logType === 'purchase_return'
        ? active.fromType === 'department'
          ? 'department'
          : 'warehouse'
        : active.toType === 'department'
          ? 'department'
          : 'warehouse'
    const targetId =
      active.logType === 'purchase_return' ? active.fromId : active.toId
    if (!targetId) return null
    return {
      receiptNo: row.receiptNo,
      purchaseType,
      targetType,
      targetId,
    }
  }

  function openPurchase(type: 'daily' | 'direct' | 'return', receipt?: PurchaseSummaryRow) {
    const receiptMeta = receipt ? getReceiptPurchaseMeta(receipt) : null
    setPurchaseType(receiptMeta ? receiptMeta.purchaseType : type)
    setAppendReceiptNo(receiptMeta ? receiptMeta.receiptNo : '')
    purchaseForm.resetFields()
    purchaseForm.setFieldsValue({
      date: receipt ? dayjs(receipt.date) : dayjs(),
      supplier: receipt ? receipt.supplier : '',
      creator: currentUser?.name || '',
      inspector: '',
      departmentManager: '',
      targetType: receiptMeta ? receiptMeta.targetType : 'warehouse',
      targetId: receiptMeta ? receiptMeta.targetId : undefined,
      items: [{ productId: undefined, qty: undefined }],
    })
    if (receipt) setPurchaseDetailOpen(false)
    setPurchaseOpen(true)
  }

  function openPurchaseForReceipt(row: PurchaseSummaryRow) {
    if (!row.receiptNo) {
      message.warning('历史单无法追加，请新建采购单')
      return
    }
    if (!getReceiptPurchaseMeta(row)) {
      message.warning('该单据没有可继续添加的有效明细')
      return
    }
    openPurchase(getReceiptPurchaseMeta(row)!.purchaseType, row)
  }

  function purchaseDraftKey() {
    return `purchase_draft_${purchaseType}`
  }

  function removePurchaseDraft() {
    localStorage.removeItem(purchaseDraftKey())
  }

  function savePurchaseDraft() {
    try {
      const values = purchaseForm.getFieldsValue()
      const draft = Object.assign({}, values, {
        date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      })
      localStorage.setItem(purchaseDraftKey(), JSON.stringify(draft))
      message.success('已暂存，可稍后继续录入')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '暂存失败')
    }
  }

  function loadPurchaseDraft() {
    try {
      const raw = localStorage.getItem(purchaseDraftKey())
      if (!raw) {
        message.info('当前没有暂存数据')
        return
      }
      const draft = JSON.parse(raw)
      purchaseForm.setFieldsValue(
        Object.assign({}, draft, {
          date: draft.date ? dayjs(draft.date) : dayjs(),
        }),
      )
      message.success('已读取暂存数据')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '读取暂存失败')
    }
  }

  function clearPurchaseDraft() {
    try {
      removePurchaseDraft()
      message.success('暂存已清空')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '清空暂存失败')
    }
  }

  function printCurrentPurchaseDraft() {
    const values = purchaseForm.getFieldsValue()
    const date = values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
    const targetType = values.targetType || 'warehouse'
    const targetName =
      targetType === 'department'
        ? departments.find((d) => d.id === values.targetId)?.name || '默认部门'
        : warehouses.find((w) => w.id === values.targetId)?.name || '默认仓库'

    const logs: DepartmentLogItem[] = (values.items || [])
      .filter((item: EntryItem) => item.productId)
      .map((item: EntryItem, index: number) => {
        const product = products.find((p) => p.id === item.productId)
        const qty = Number(item.qty || 0)
        const price = Number(item.price || 0)
        const amount = Number(item.amount || 0)
        return {
          id: `current_purchase_${Date.now()}_${index}`,
          receiptNo: '',
          lineNo: index + 1,
          logType: purchaseType === 'return' ? 'purchase_return' : purchaseType,
          direction: purchaseType === 'return' ? 'out' : 'in',
          supplier: values.supplier || '',
          targetName,
          productId: item.productId || '',
          productName: product ? product.name : '未选择商品',
          unit: product ? product.unit || '件' : '件',
          qty,
          counted: null,
          diff: null,
          price,
          amount,
          date,
          fromType: '',
          fromId: '',
          fromName: '',
          toType: '',
          toId: '',
          toName: '',
          operator: currentUser?.name || '',
          remark: item.remark || '',
          recalled: false,
          recalledAt: null,
          createdAt: new Date(),
        }
      })

    if (!logs.length) {
      message.warning('请先选择至少一个商品')
      return
    }

    setPurchaseVoucherGroups([
      {
        warehouseName: targetName,
        date,
        logType: purchaseType === 'return' ? 'purchase_return' : purchaseType,
        creator: values.creator || currentUser?.name || '',
        inspector: values.inspector || '',
        departmentManager: values.departmentManager || '',
        logs,
      },
    ])
    setPurchaseVoucherOpen(true)
    setTimeout(() => window.print(), 100)
  }

  function syncPurchaseRow(
    index: number,
    changed: 'qty' | 'price' | 'amount',
    value: number | null,
  ) {
    const items = purchaseForm.getFieldValue('items') || []
    const row = items[index] || {}
    const qty =
      changed === 'qty' ? Number(value || 0) : Number(row.qty || 0)
    const price =
      changed === 'price' ? Number(value || 0) : Number(row.price || 0)
    const amount =
      changed === 'amount' ? Number(value || 0) : Number(row.amount || 0)

    if (changed === 'amount' && qty > 0 && amount > 0) {
      const nextPrice = Math.round((amount / qty) * 100) / 100
      if (nextPrice !== Number(row.price || 0)) {
        purchaseForm.setFieldValue(['items', index, 'price'], nextPrice)
      }
      return
    }

    if (changed === 'qty' && qty > 0) {
      if (amount > 0) {
        const nextPrice = Math.round((amount / qty) * 100) / 100
        purchaseForm.setFieldValue(['items', index, 'price'], nextPrice)
      } else if (price > 0) {
        const nextAmount = Math.round(qty * price * 100) / 100
        purchaseForm.setFieldValue(['items', index, 'amount'], nextAmount)
      }
      return
    }

    if (changed === 'price' && qty > 0 && value != null && price >= 0) {
      const nextAmount = Math.round(qty * price * 100) / 100
      purchaseForm.setFieldValue(['items', index, 'amount'], nextAmount)
    }
  }

  async function handlePurchaseFinish(values: EntryForm) {
    setSaving(true)
    const appendedReceiptNo = appendReceiptNo || undefined
    try {
      const res = await api.departmentPurchase({
        purchaseType,
        supplier: values.supplier,
        targetType: values.targetType,
        targetId: values.targetId,
        date: values.date.format('YYYY-MM-DD'),
        items: values.items,
        receiptNo: appendedReceiptNo,
      })
      message.success(
        res.appended
          ? `已向原采购单追加 ${res.handled} 条商品`
          : `采购流水已记录 ${res.handled} 条`,
      )
      setPurchaseOpen(false)
      setAppendReceiptNo('')
      removePurchaseDraft()
      await loadStock()
      await loadPurchaseLogs(1)
      if (res.appended) {
        const detailRes = await api.departmentPurchaseSummary({
          page: 1,
          pageSize: 1,
          receiptNo: res.receiptNo,
        })
        const refreshed = detailRes.list[0]
        if (refreshed) {
          setPurchaseDetailProduct(refreshed)
          setPurchaseDetailLogs(refreshed.items || [])
          setPurchaseDetailOpen(true)
        }
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存采购失败')
    } finally {
      setSaving(false)
    }
  }

  function confirmPurchaseRecall(record: DepartmentLogItem) {
    Modal.confirm({
      title: `撤回这条${logTypeLabels[record.logType] || '采购'}记录？`,
      content: '撤回后会反向调整对应仓库/部门库存和采购批次，历史记录保留并标记“已撤回”。',
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.departmentLogRecall(record.id)
          message.success('已撤回')
          await loadPurchaseLogs()
          await loadStock()
          setPurchaseDetailOpen(false)
          setExpandedRowKeys([])
          setExpandedRowsData({})
        } catch (err) {
          message.error(err instanceof Error ? err.message : '撤回失败')
        }
      },
    })
  }

  function confirmRecallReceipt(row: PurchaseSummaryRow) {
    const activeItems = (row.items || []).filter((item) => !item.recalled)
    if (!activeItems.length) {
      message.warning('该单据没有可撤回的采购明细')
      return
    }
    Modal.confirm({
      title: `整单撤回「${row.receiptNo || '历史单'}」？`,
      content: `将撤回该单据中 ${activeItems.length} 条未撤回采购明细，并反向调整对应仓库/部门库存和采购批次。`,
      okText: '确认整单撤回',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await api.departmentLogsRecallBatch({
            ids: activeItems.map((item) => item.id),
          })
          message.success(`已撤回 ${res.recalled} 条采购明细`)
          setPurchaseDetailOpen(false)
          setExpandedRowKeys([])
          setExpandedRowsData({})
          await loadPurchaseLogs()
          await loadStock()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '整单撤回失败')
        }
      },
    })
  }

  function openPurchaseLogEdit(record: DepartmentLogItem) {
    setEditingPurchaseLog(record)
    purchaseLogEditForm.setFieldsValue({
      qty: Number(record.qty || 0),
      price: Number(record.price || 0),
      amount: Number(record.amount || 0),
      remark: record.remark || '',
    })
  }

  async function submitPurchaseLogEdit(values: PurchaseLogEditForm) {
    if (!editingPurchaseLog) return
    setPurchaseLogEditSaving(true)
    try {
      await api.departmentLogUpdate({
        id: editingPurchaseLog.id,
        qty: values.qty,
        price: values.price,
        amount: values.amount,
        remark: values.remark || '',
      })
      message.success('采购明细已修改')
      setEditingPurchaseLog(null)
      setPurchaseDetailOpen(false)
      setExpandedRowKeys([])
      setExpandedRowsData({})
      await loadPurchaseLogs()
      await loadStock()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修改采购明细失败')
    } finally {
      setPurchaseLogEditSaving(false)
    }
  }

  function confirmCountRecall(record: DepartmentLogItem) {
    Modal.confirm({
      title: '撤回这条盘点记录？',
      content: '撤回后会把该部门商品库存恢复为盘点前的数量，历史记录保留并标记“已撤回”。',
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.departmentLogRecall(record.id)
          message.success('已撤回')
          await loadCountLogs()
          await loadStock()
          if (countDepartmentId) await loadCountStock(countDepartmentId)
        } catch (err) {
          message.error(err instanceof Error ? err.message : '撤回失败')
        }
      },
    })
  }

  function openPurchaseVoucher(record: DepartmentLogItem) {
    setPurchaseVoucherGroups([
      {
        warehouseName:
          record.targetName || record.fromName || record.toName || '默认',
        date: record.date || dayjs(record.createdAt).format('YYYY-MM-DD'),
        logType: record.logType || 'daily',
        creator: record.operator || '',
        inspector: '',
        departmentManager: '',
        logs: [record],
      },
    ])
    setPurchaseVoucherOpen(true)
  }

  function buildPurchaseVoucherGroups(
    logs: DepartmentLogItem[],
  ): PurchaseVoucherGroup[] {
    const groupMap = new Map<string, PurchaseVoucherGroup>()
    logs
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .forEach((log) => {
        const date = log.date || dayjs(log.createdAt).format('YYYY-MM-DD')
        const warehouseName =
          log.targetName || log.fromName || log.toName || '默认'
        const key = `${warehouseName}__${date}__${log.logType || 'daily'}`
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            warehouseName,
            date,
            logType: log.logType || 'daily',
            creator: log.operator || '',
            inspector: '',
            departmentManager: '',
            logs: [],
          })
        }
        groupMap.get(key)?.logs.push(log)
      })
    return Array.from(groupMap.values())
  }

  function handlePurchaseSelectionChange(nextKeys: Key[]) {
    setPurchaseSelectedKeys(nextKeys)
    setPurchaseSelectedLogs([])
  }

  async function openPurchaseDetail(row: PurchaseSummaryRow) {
    setPurchaseDetailProduct(row)
    setPurchaseDetailOpen(true)
    setPurchaseDetailLogs(row.items || [])
  }

  function loadExpandedPurchaseLogs(row: PurchaseSummaryRow) {
    setExpandedRowsData((prev) => ({ ...prev, [row.key]: row.items || [] }))
  }

  function renderExpandedPurchaseRow(row: PurchaseSummaryRow) {
    const logs = expandedRowsData[row.key] || []
    return (
      <Table<DepartmentLogItem>
        rowKey="id"
        dataSource={logs}
        size="small"
        loading={!expandedRowsData[row.key]}
        pagination={false}
        columns={[
          { title: '日期', dataIndex: 'date', width: 110 },
          {
            title: '类型',
            dataIndex: 'logType',
            width: 110,
            render: (type: string) => logTypeLabels[type] || type,
          },
          { title: '商品', dataIndex: 'productName', width: 140 },
          { title: '数量', dataIndex: 'qty', width: 90 },
          {
            title: '金额',
            dataIndex: 'amount',
            width: 110,
            render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
          },
          {
            title: '仓库/部门',
            dataIndex: 'targetName',
            width: 130,
            render: (value: string) => value || '-',
          },
          { title: '操作人', dataIndex: 'operator', width: 110 },
          {
            title: '状态',
            dataIndex: 'recalled',
            width: 100,
            render: (recalled: boolean) =>
              recalled ? <Tag color="default">已撤回</Tag> : <Tag color="green">正常</Tag>,
          },
          {
            title: '操作',
            width: 150,
            render: (_, record) =>
              record.recalled ? null : (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openPurchaseLogEdit(record)}
                  >
                    修改
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => confirmPurchaseRecall(record)}
                  >
                    撤回
                  </Button>
                </Space>
              ),
          },
        ]}
      />
    )
  }

  async function printSelectedPurchase() {
    const selectedRows = purchaseSummaryRows.filter((row) =>
      purchaseSelectedKeys.includes(row.key),
    )
    if (!selectedRows.length) {
      message.warning('请先勾选要打印的采购记录')
      return
    }

    setPurchasePrintLoading(true)
    try {
      const logs = selectedRows.flatMap((row) => row.items || [])
      const selected = logs.filter((record) => !record.recalled)
      setPurchaseVoucherGroups(buildPurchaseVoucherGroups(selected))
      setPurchaseVoucherOpen(true)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载打印记录失败')
    } finally {
      setPurchasePrintLoading(false)
    }
  }

  function openMove(type: 'issue' | 'return' | 'transfer' | 'sale') {
    setMoveType(type)
    moveForm.resetFields()
    const fields: EntryForm = {
      date: dayjs(),
      warehouseId: 'wh_main',
      sourceDepartmentId: undefined,
      targetDepartmentId: undefined,
      items: [{ productId: undefined, qty: 1 }],
    }
    moveForm.setFieldsValue(fields)
    setMoveOpen(true)
  }

  async function handleMoveFinish(values: EntryForm) {
    setSaving(true)
    try {
      const res = await api.departmentMove({
        moveType,
        date: values.date.format('YYYY-MM-DD'),
        warehouseId: values.warehouseId || 'wh_main',
        sourceDepartmentId: values.sourceDepartmentId,
        targetDepartmentId: values.targetDepartmentId,
        items: values.items,
      })
      message.success(`库存变动已记录 ${res.handled} 条`)
      setMoveOpen(false)
      await loadMoveLogs()
      await loadStock()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存库存变动失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleCountFinish(values: EntryForm) {
    setSaving(true)
    try {
      const res = await api.departmentCount({
        departmentId: values.departmentId,
        date: values.date.format('YYYY-MM-DD'),
        items: values.items,
      })
      message.success(`盘点已记录 ${res.handled} 条`)
      countForm.resetFields()
      countForm.setFieldsValue({
        date: dayjs(),
        departmentId: undefined,
        items: [{ productId: undefined, counted: 0 }],
      })
      await loadCountLogs()
      await loadStock()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存盘点失败')
    } finally {
      setSaving(false)
    }
  }

  const currentCategory = categories.find((c) => c.key === stockFilters.category)
  const isAppendingPurchase = !!appendReceiptNo
  const activePurchaseDetailLogs = purchaseDetailLogs.filter(
    (record) => !record.recalled,
  )
  const activePurchaseDetailCount = activePurchaseDetailLogs.length
  const purchaseDetailTotalQty = activePurchaseDetailLogs.reduce(
    (sum, record) => sum + Number(record.qty || 0),
    0,
  )
  const purchaseDetailTotalAmount = activePurchaseDetailLogs.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0,
  )
  const canAppendPurchase =
    !!purchaseDetailProduct?.receiptNo && activePurchaseDetailCount > 0
  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name}${p.spec ? `(${p.spec})` : ''}`,
  }))
  const validPurchaseSelectedCount = purchaseSelectedKeys.length
  const flowInQty = flowRows
    .filter((row) => row.direction === 'in')
    .reduce((sum, row) => sum + Number(row.qty || 0), 0)
  const flowOutQty = flowRows
    .filter((row) => row.direction === 'out')
    .reduce((sum, row) => sum + Number(row.qty || 0), 0)

  async function exportPurchaseSummary() {
    const start =
      purchaseRange && purchaseRange[0]
        ? purchaseRange[0].format('YYYY-MM-DD')
        : ''
    const end =
      purchaseRange && purchaseRange[1]
        ? purchaseRange[1].format('YYYY-MM-DD')
        : ''
    const types =
      purchaseTypeFilter === 'return'
        ? ['purchase_return']
        : purchaseTypeFilter
          ? [purchaseTypeFilter]
          : ['daily', 'direct', 'purchase_return']
    const all: PurchaseSummaryRow[] = []
    let page = 1
    while (true) {
      const res = await api.departmentPurchaseSummary({
        page,
        pageSize: 200,
        types,
        startDate: start || undefined,
        endDate: end || undefined,
        productId: purchaseProductFilter || undefined,
      })
      all.push(...res.list)
      if (!res.list.length || all.length >= res.total) break
      page += 1
    }
    if (!all.length) {
      message.warning('当前没有可导出的采购汇总数据')
      return
    }
    const XLSX = await import('xlsx')
    const sheet = XLSX.utils.json_to_sheet(
      all.map((row) => ({
        单据号: row.receiptNo || '历史单',
        日期: row.date,
        类型: logTypeLabels[row.logType] || row.logType,
        供货商: row.supplier || '',
        去向: row.targetName || '',
        商品数: row.itemCount,
        总数量: row.totalQty,
        总金额: Number(row.totalAmount || 0),
      })),
    )
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:H1')
    for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
      const amountCell =
        sheet[
          XLSX.utils.encode_cell({
            r: rowIndex,
            c: 7,
          })
        ]
      if (amountCell) amountCell.z = '0.00'
    }
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, '采购汇总')
    XLSX.writeFile(workbook, `采购汇总_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
  }

  return (
    <>
      <PageHeader
        title="部门"
        subtitle="维护部门单位、采购流水和部门库存变动，商品统一来自商品页。"
      />
      <Tabs
        className="dept-tabs"
        tabBarGutter={8}
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'settings',
            label: '部门设置',
            children: (
              <div className="panel-card">
                <div className="dept-toolbar">
                  <div>
                    <h3>部门单位</h3>
                    <div className="dept-toolbar-desc">维护部门名称、编号和排序，商品统一从商品页选择。</div>
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingDept(null)
                      deptForm.resetFields()
                      setDeptModalOpen(true)
                    }}
                  >
                    新建部门
                  </Button>
                </div>
                <Spin spinning={loading}>
                  <Table<DepartmentItem>
                    rowKey="id"
                    dataSource={departments}
                    pagination={false}
                    size="middle"
                    columns={[
                      {
                        title: '排序',
                        width: 110,
                        render: (_, record, index) => (
                          <Space>
                            <Button
                              size="small"
                              icon={<ArrowUpOutlined />}
                              disabled={index === 0}
                              onClick={() => moveDept(index, -1)}
                            />
                            <Button
                              size="small"
                              icon={<ArrowDownOutlined />}
                              disabled={index === departments.length - 1}
                              onClick={() => moveDept(index, 1)}
                            />
                          </Space>
                        ),
                      },
                      { title: '名称', dataIndex: 'name' },
                      { title: '编号', dataIndex: 'code', width: 140 },
                      { title: '备注', dataIndex: 'remark' },
                      { title: '库存总数', dataIndex: 'stockCount', width: 110 },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        width: 100,
                        render: (status: string) => (
                          <Tag color={status === 'active' ? 'green' : 'default'}>
                            {status === 'active' ? '启用' : '停用'}
                          </Tag>
                        ),
                      },
                      {
                        title: '操作',
                        width: 160,
                        render: (_, record) => (
                          <Space>
                            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditDept(record)}>
                              编辑
                            </Button>
                            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDeleteDept(record)}>
                              删除
                            </Button>
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
            key: 'stock',
            label: '部门库存',
            children: (
              <div className="panel-card">
                <div className="dept-toolbar">
                  <div>
                    <h3>部门库存</h3>
                    <div className="dept-toolbar-desc">按部门、分类和关键字查看商品库存，并支持导出 Excel。</div>
                  </div>
                  <Button icon={<DownloadOutlined />} loading={exportingStock} onClick={exportStockExcel}>
                    导出部门库存
                  </Button>
                </div>
                <div className="filter-bar">
                  <Select
                    allowClear
                    placeholder="全部部门"
                    style={{ width: 160 }}
                    value={stockFilters.departmentId || undefined}
                    options={departments.map((d) => ({ value: d.id, label: d.name }))}
                    onChange={(value) => setStockFilters((f) => ({ ...f, departmentId: value || '' }))}
                  />
                  <Select
                    allowClear
                    placeholder="全部分类"
                    style={{ width: 140 }}
                    value={stockFilters.category || undefined}
                    options={categories.map((c) => ({ value: c.key, label: c.name }))}
                    onChange={(value) =>
                      setStockFilters((f) => ({ ...f, category: value || '', subcategory: '' }))
                    }
                  />
                  <Select
                    allowClear
                    placeholder="全部子分类"
                    style={{ width: 160 }}
                    value={stockFilters.subcategory || undefined}
                    options={(currentCategory?.subcategories || []).map((s) => ({ value: s, label: s }))}
                    onChange={(value) => setStockFilters((f) => ({ ...f, subcategory: value || '' }))}
                  />
                  <Input
                    allowClear
                    placeholder="搜索商品/部门"
                    prefix={<SearchOutlined />}
                    style={{ width: 200 }}
                    value={stockFilters.keyword}
                    onChange={(e) => setStockFilters((f) => ({ ...f, keyword: e.target.value }))}
                  />
                  <Button type="primary" onClick={() => { setStockPage(1); loadStock() }}>
                    查询
                  </Button>
                </div>
                <Spin spinning={stockLoading}>
                  <Table<DepartmentStockItem>
                    rowKey="id"
                    dataSource={stock}
                    size="middle"
                    scroll={{ x: 900 }}
                    pagination={{
                      current: stockPage,
                      pageSize: stockPageSize,
                      total: stockTotal,
                      showSizeChanger: true,
                      onChange: (p, s) => {
                        setStockPage(p)
                        setStockPageSize(s)
                      },
                    }}
                    columns={[
                      { title: '部门', dataIndex: 'departmentName', width: 130 },
                      { title: '商品', dataIndex: 'productName' },
                      { title: '分类', dataIndex: 'categoryName', width: 100 },
                      { title: '子分类', dataIndex: 'subcategory', width: 140 },
                      { title: '规格', dataIndex: 'spec' },
                      {
                        title: '库存',
                        dataIndex: 'stock',
                        width: 90,
                        render: (value: number) => <strong>{value}</strong>,
                      },
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
            ),
          },
          {
            key: 'purchase',
            label: '采购流水',
            children: (
              <div className="panel-card">
                <div className="dept-toolbar">
                  <div>
                    <h3>采购流水</h3>
                    <div className="dept-toolbar-desc">记录日常采购、直拨进货和采购退货，商品统一来自商品页。</div>
                  </div>
                  <Space wrap>
                    <Button
                      icon={<PrinterOutlined />}
                      disabled={validPurchaseSelectedCount === 0}
                      loading={purchasePrintLoading}
                      onClick={printSelectedPurchase}
                    >
                      打印选中
                      {validPurchaseSelectedCount
                        ? `（${validPurchaseSelectedCount}）`
                        : ''}
                    </Button>
                    <Button icon={<ShoppingCartOutlined />} onClick={() => openPurchase('daily')}>
                      日常采购
                    </Button>
                    <Button icon={<ClusterOutlined />} onClick={() => openPurchase('direct')}>
                      直拨进货
                    </Button>
                    <Button icon={<RollbackOutlined />} onClick={() => openPurchase('return')}>
                      采购退货
                    </Button>
                    <Button icon={<SearchOutlined />} onClick={openProductFlow}>
                      进出货查询
                    </Button>
                    <Button icon={<BarChartOutlined />} onClick={openStockStats}>
                      库存统计
                    </Button>
                  </Space>
                </div>
                <div className="filter-bar">
                  <Select
                    allowClear
                    placeholder="全部类型"
                    style={{ width: 140 }}
                    value={purchaseTypeFilter || undefined}
                    options={[
                      { value: 'daily', label: '日常采购' },
                      { value: 'direct', label: '直拨进货' },
                      { value: 'return', label: '采购退货' },
                    ]}
                    onChange={(value) => setPurchaseTypeFilter(value || '')}
                  />
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    placeholder="选择商品"
                    style={{ width: 240 }}
                    value={purchaseProductFilter || undefined}
                    options={productOptions}
                    onChange={(value) => setPurchaseProductFilter(value || '')}
                  />
                  <DatePicker.RangePicker
                    allowClear
                    placeholder={['开始日期', '结束日期']}
                    value={purchaseRange}
                    onChange={(dates) => {
                      setPurchaseRange(
                        dates && dates[0] && dates[1]
                          ? [dates[0], dates[1]]
                          : [dayjs(), dayjs()],
                      )
                    }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      loadPurchaseLogs()
                    }}
                  >
                    查询
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={exportPurchaseSummary}>
                    导出
                  </Button>
                </div>
                <Spin spinning={purchaseLoading}>
                  <Table<PurchaseSummaryRow>
                    rowKey="key"
                    dataSource={purchaseSummaryRows}
                    expandable={{
                      expandedRowKeys,
                      onExpand: (expanded, row) => {
                        setExpandedRowKeys((keys) =>
                          expanded
                            ? Array.from(new Set([...keys, row.key]))
                            : keys.filter((key) => key !== row.key),
                        )
                        if (expanded) loadExpandedPurchaseLogs(row)
                      },
                      expandedRowRender: renderExpandedPurchaseRow,
                    }}
                    rowSelection={{
                      selectedRowKeys: purchaseSelectedKeys,
                      onChange: handlePurchaseSelectionChange,
                      preserveSelectedRowKeys: false,
                    }}
                    size="middle"
                    scroll={{ x: 900 }}
                    pagination={{
                      current: purchasePage,
                      pageSize: purchasePageSize,
                      total: purchaseTotal,
                      showSizeChanger: true,
                      onChange: (p, s) => {
                        setPurchasePage(p)
                        setPurchasePageSize(s)
                        setPurchaseSelectedKeys([])
                        setPurchaseSelectedLogs([])
                        setExpandedRowKeys([])
                        setExpandedRowsData({})
                      },
                    }}
                    columns={[
                      {
                        title: '单据号',
                        dataIndex: 'receiptNo',
                        width: 170,
                        render: (value: string) => value || '历史单',
                      },
                      { title: '日期', dataIndex: 'date', width: 110 },
                      {
                        title: '类型',
                        dataIndex: 'logType',
                        width: 110,
                        render: (type: string) => logTypeLabels[type] || type,
                      },
                      { title: '供货商', dataIndex: 'supplier', width: 150 },
                      { title: '去向', dataIndex: 'targetName', width: 130 },
                      { title: '商品数', dataIndex: 'itemCount', width: 90 },
                      { title: '总数量', dataIndex: 'totalQty', width: 110 },
                      {
                        title: '总金额',
                        dataIndex: 'totalAmount',
                        width: 130,
                        render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
                      },
                      {
                        title: '操作',
                        width: 220,
                        render: (_, record) => (
                          <Space>
                            <Button
                              type="link"
                              size="small"
                              onClick={() => openPurchaseDetail(record)}
                            >
                              明细/撤回
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              danger
                              disabled={record.itemCount === 0}
                              onClick={() => confirmRecallReceipt(record)}
                            >
                              整单撤回
                            </Button>
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
            key: 'move',
            label: '库存变动',
            children: (
              <div className="panel-card">
                <div className="dept-toolbar">
                  <div>
                    <h3>库存变动</h3>
                    <div className="dept-toolbar-desc">覆盖领料、退料、调拨和销售，变动会实时更新部门库存。</div>
                  </div>
                  <Space wrap>
                    <Button icon={<ExportOutlined />} onClick={() => openMove('issue')}>
                      领料
                    </Button>
                    <Button icon={<ImportOutlined />} onClick={() => openMove('return')}>
                      退料
                    </Button>
                    <Button icon={<SwapOutlined />} onClick={() => openMove('transfer')}>
                      调拨
                    </Button>
                    <Button icon={<DollarOutlined />} onClick={() => openMove('sale')}>
                      销售
                    </Button>
                  </Space>
                </div>
                <Spin spinning={moveLoading}>
                  <Table<DepartmentLogItem>
                    rowKey="id"
                    dataSource={moveLogs}
                    size="middle"
                    scroll={{ x: 900 }}
                    pagination={{
                      current: movePage,
                      pageSize: movePageSize,
                      total: moveTotal,
                      showSizeChanger: true,
                      onChange: (p, s) => {
                        setMovePage(p)
                        setMovePageSize(s)
                      },
                    }}
                    columns={[
                      { title: '日期', dataIndex: 'date', width: 110 },
                      {
                        title: '类型',
                        dataIndex: 'logType',
                        width: 110,
                        render: (type: string) => logTypeLabels[type] || type,
                      },
                      { title: '商品', dataIndex: 'productName' },
                      {
                        title: '数量/盘存',
                        width: 110,
                        render: (_, record) =>
                          record.logType === 'count' ? record.counted ?? '-' : record.qty,
                      },
                      {
                        title: '差异',
                        dataIndex: 'diff',
                        width: 90,
                        render: (value: number | null) =>
                          value === null ? '-' : value > 0 ? `+${value}` : value,
                      },
                      { title: '来源', dataIndex: 'fromName', width: 130 },
                      { title: '去向', dataIndex: 'toName', width: 130 },
                      { title: '操作人', dataIndex: 'operator', width: 110 },
                      { title: '备注', dataIndex: 'remark' },
                    ]}
                  />
                </Spin>
              </div>
            ),
          },
          {
            key: 'count',
            label: '盘点',
            children: (
              <>
                <div className="panel-card dept-count-card">
                  <div className="dept-panel-head">
                    <div>
                      <h3>盘点录入</h3>
                      <div className="dept-toolbar-desc">直接把部门商品库存调整为盘存数，差异自动记录。</div>
                    </div>
                  </div>
                  <Form<EntryForm> form={countForm} layout="vertical" className="dept-count-form" onFinish={handleCountFinish}>
                    <div className="dept-count-meta">
                      <Form.Item name="date" label="盘点日期" rules={[{ required: true }]}>
                        <DatePicker style={{ width: 180 }} />
                      </Form.Item>
                      <Form.Item name="departmentId" label="盘点部门" rules={[{ required: true }]}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          style={{ width: 220 }}
                          placeholder="选择盘点部门"
                          options={departments.map((d) => ({ value: d.id, label: d.name }))}
                        />
                      </Form.Item>
                    </div>
                    <div className="dept-entry-list">
                      <div className="dept-entry-head">
                        <span>商品</span>
                        <span>当前库存</span>
                        <span>盘存数</span>
                        <span>备注</span>
                        <span>操作</span>
                      </div>
                      <Form.List name="items">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map((field) => (
                              <div className="dept-entry-row" key={field.key}>
                                <Form.Item
                                  className="dept-entry-field"
                                  name={[field.name, 'productId']}
                                  rules={[{ required: true, message: '请选择商品' }]}
                                >
                                  <Select showSearch optionFilterProp="label" placeholder="选择商品" options={productOptions} />
                                </Form.Item>
                                <Form.Item
                                  className="dept-entry-field"
                                  shouldUpdate={(prev, next) =>
                                    prev.items?.[field.name]?.productId !==
                                    next.items?.[field.name]?.productId
                                  }
                                >
                                  {({ getFieldValue }) => {
                                    const productId = getFieldValue([
                                      'items',
                                      field.name,
                                      'productId',
                                    ])
                                    return (
                                      <Input
                                        disabled
                                        value={currentCountStock(productId)}
                                      />
                                    )
                                  }}
                                </Form.Item>
                                <Form.Item
                                  className="dept-entry-field"
                                  name={[field.name, 'counted']}
                                  rules={[{ required: true, message: '盘存数' }]}
                                >
                                  <InputNumber min={0} placeholder="盘存数" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item className="dept-entry-field" name={[field.name, 'remark']}>
                                  <Input placeholder="备注" />
                                </Form.Item>
                                <div className="dept-entry-actions">
                                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                                </div>
                              </div>
                            ))}
                            <Space style={{ display: 'flex' }}>
                              <Button
                                type="dashed"
                                block
                                icon={<PlusOutlined />}
                                onClick={() =>
                                  add({ productId: undefined, counted: 0 })
                                }
                              >
                                添加商品
                              </Button>
                              <Button
                                icon={<DownloadOutlined />}
                                loading={countStockLoading}
                                onClick={loadDepartmentProducts}
                              >
                                载入部门商品
                              </Button>
                            </Space>
                          </>
                        )}
                      </Form.List>
                    </div>
                    <Space style={{ marginTop: 16, justifyContent: 'flex-end', width: '100%' }}>
                      <Button
                        onClick={() => {
                          countForm.resetFields()
                          countForm.setFieldsValue({
                            date: dayjs(),
                            departmentId: undefined,
                            items: [{ productId: undefined, counted: 0 }],
                          })
                        }}
                      >
                        清空
                      </Button>
                      <Button type="primary" htmlType="submit" loading={saving}>保存盘点</Button>
                    </Space>
                  </Form>
                </div>
                <div className="panel-card dept-record-card">
                  <div className="dept-panel-head">
                    <div>
                      <h3>盘点记录</h3>
                      <div className="dept-toolbar-desc">查看各部门的盘存数、盘盈/盘亏差异和操作人。</div>
                    </div>
                    <Tag color="blue">{countTotal} 条</Tag>
                  </div>
                  <Spin spinning={countLoading}>
                    <Table<DepartmentLogItem>
                      rowKey="id"
                      dataSource={countLogs}
                      size="middle"
                      scroll={{ x: 800 }}
                      pagination={{
                        current: countPage,
                        pageSize: countPageSize,
                        total: countTotal,
                        showSizeChanger: true,
                        onChange: (p, s) => {
                          setCountPage(p)
                          setCountPageSize(s)
                        },
                      }}
                      columns={[
                        { title: '日期', dataIndex: 'date', width: 110 },
                        { title: '商品', dataIndex: 'productName' },
                        {
                          title: '盘存数',
                          dataIndex: 'counted',
                          width: 100,
                          render: (value: number | null) => value ?? '-',
                        },
                        {
                          title: '差异',
                          dataIndex: 'diff',
                          width: 100,
                          render: (value: number | null) =>
                            value === null ? '-' : value > 0 ? `+${value}` : value,
                        },
                        { title: '部门', dataIndex: 'fromName', width: 140 },
                        { title: '操作人', dataIndex: 'operator', width: 120 },
                        { title: '备注', dataIndex: 'remark' },
                        {
                          title: '操作',
                          width: 110,
                          render: (_, record) =>
                            record.recalled ? (
                              <Tag color="default">已撤回</Tag>
                            ) : (
                              <Button
                                type="link"
                                size="small"
                                danger
                                onClick={() => confirmCountRecall(record)}
                              >
                                撤回
                              </Button>
                            ),
                        },
                      ]}
                    />
                  </Spin>
                </div>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editingDept ? '编辑部门' : '新建部门'}
        open={deptModalOpen}
        onCancel={() => {
          setDeptModalOpen(false)
          setEditingDept(null)
        }}
        onOk={() => deptForm.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={deptForm} layout="vertical" onFinish={handleDeptFinish}>
          <Form.Item name="name" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input placeholder="例如：中厨" />
          </Form.Item>
          <Form.Item name="code" label="部门编号">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        className="product-entry-modal"
        title={
          isAppendingPurchase
            ? `继续添加商品 · ${appendReceiptNo}`
            : `${logTypeLabels[purchaseType === 'return' ? 'purchase_return' : purchaseType] || '采购'}录入`
        }
        width={840}
        open={purchaseOpen}
        onCancel={() => {
          setPurchaseOpen(false)
          setAppendReceiptNo('')
        }}
        footer={null}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
      >
        <Form<EntryForm> form={purchaseForm} layout="vertical" onFinish={handlePurchaseFinish}>
          {isAppendingPurchase ? (
            <Alert
              showIcon
              type="info"
              style={{ marginBottom: 16 }}
              message={`正在向原采购单 ${appendReceiptNo} 追加商品`}
              description={`原单已有 ${activePurchaseDetailCount} 条有效商品。日期、类型、供货商和入库去向沿用原单，新商品保存后会追加到同一单据。`}
            />
          ) : null}
          <Space size={12} style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Form.Item name="date" label="日期" rules={[{ required: true }]}>
              <DatePicker style={{ width: 160 }} disabled={isAppendingPurchase} />
            </Form.Item>
            <Form.Item name="supplier" label="供货商">
              <Input
                placeholder="选填，例如：XX 供应商"
                style={{ width: 180 }}
                disabled={isAppendingPurchase}
              />
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
            <Form.Item name="targetType" label={purchaseType === 'return' ? '退货来源' : '入库去向'} rules={[{ required: true }]}>
              <Select
                style={{ width: 150 }}
                disabled={isAppendingPurchase}
                options={[
                  { value: 'warehouse', label: '仓库' },
                  { value: 'department', label: '部门' },
                ]}
                onChange={() => purchaseForm.setFieldValue('targetId', undefined)}
              />
            </Form.Item>
            <Form.Item name="targetId" label="选择" rules={[{ required: true, message: '请选择' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                style={{ width: 220 }}
                disabled={isAppendingPurchase}
                options={(
                  purchaseTargetType === 'department'
                    ? departments.map((d) => ({ value: d.id, label: d.name }))
                    : warehouses.map((w) => ({ value: w.id, label: w.name }))
                )}
              />
            </Form.Item>
          </Space>
          <div className="dept-entry-head dept-entry-purchase-head">
            <span>商品</span>
            <span>单位</span>
            <span>数量</span>
            <span>单价</span>
            <span>总额</span>
            <span>备注</span>
            <span>操作</span>
          </div>
          <Form.List name="items">
            {(fields, { add, remove }) => {
              fieldsCountRef.current = fields.length
              addPurchaseRowRef.current = (nextIndex: number) => {
                add({ productId: undefined, qty: undefined })
                setTimeout(() => focusPurchaseEntry(nextIndex, 'productId'), 0)
              }
              return (
              <>
                {fields.map((field) => (
                  <div className="dept-entry-row dept-entry-purchase-row" key={field.key}>
                    <Form.Item
                      className="dept-entry-field"
                      name={[field.name, 'productId']}
                      rules={[{ required: true, message: '请选择商品' }]}
                    >
                      <ProductInlineSelect
                        ref={setPurchaseEntryRef(`${field.name}-productId`)}
                        placeholder="选择商品"
                        options={productOptions}
                        onCommit={() =>
                          moveToNextPurchaseEntry(
                            field.name,
                            'productId',
                            field.name + 1,
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item
                      className="dept-entry-field"
                      shouldUpdate={(prev, next) =>
                        prev.items?.[field.name]?.productId !==
                        next.items?.[field.name]?.productId
                      }
                    >
                      {() => {
                        const productId = purchaseForm.getFieldValue([
                          'items',
                          field.name,
                          'productId',
                        ])
                        const unit =
                          products.find((p) => p.id === productId)?.unit || ''
                        return (
                          <Input
                            value={unit}
                            disabled
                            placeholder="单位"
                            style={{ width: '100%' }}
                          />
                        )
                      }}
                    </Form.Item>
                    <Form.Item
                      className="dept-entry-field"
                      name={[field.name, 'qty']}
                      rules={[{ required: true, message: '数量' }]}
                    >
                      <InputNumber
                        ref={setPurchaseEntryRef(`${field.name}-qty`)}
                        min={0}
                        placeholder="数量"
                        style={{ width: '100%' }}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            event.preventDefault()
                            event.stopPropagation()
                            moveToAdjacentPurchaseEntry(
                              field.name,
                              'qty',
                              event.key === 'ArrowRight' ? 1 : -1,
                            )
                          }
                        }}
                        onPressEnter={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          moveToNextPurchaseEntry(field.name, 'qty', field.name + 1)
                        }}
                        onBlur={() =>
                          syncPurchaseRow(
                            field.name,
                            'qty',
                            purchaseForm.getFieldValue(['items', field.name, 'qty']),
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'price']}>
                      <InputNumber
                        ref={setPurchaseEntryRef(`${field.name}-price`)}
                        min={0}
                        precision={2}
                        placeholder="单价"
                        style={{ width: '100%' }}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            event.preventDefault()
                            event.stopPropagation()
                            moveToAdjacentPurchaseEntry(
                              field.name,
                              'price',
                              event.key === 'ArrowRight' ? 1 : -1,
                            )
                          }
                        }}
                        onPressEnter={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          moveToNextPurchaseEntry(field.name, 'price', field.name + 1)
                        }}
                        onBlur={() =>
                          syncPurchaseRow(
                            field.name,
                            'price',
                            purchaseForm.getFieldValue(['items', field.name, 'price']),
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'amount']}>
                      <InputNumber
                        ref={setPurchaseEntryRef(`${field.name}-amount`)}
                        min={0}
                        precision={2}
                        placeholder="总额"
                        style={{ width: '100%' }}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            event.preventDefault()
                            event.stopPropagation()
                            moveToAdjacentPurchaseEntry(
                              field.name,
                              'amount',
                              event.key === 'ArrowRight' ? 1 : -1,
                            )
                          }
                        }}
                        onPressEnter={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          moveToNextPurchaseEntry(field.name, 'amount', field.name + 1)
                        }}
                        onBlur={() =>
                          syncPurchaseRow(
                            field.name,
                            'amount',
                            purchaseForm.getFieldValue(['items', field.name, 'amount']),
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'remark']}>
                      <Input
                        ref={setPurchaseEntryRef(`${field.name}-remark`)}
                        placeholder="备注"
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            event.preventDefault()
                            event.stopPropagation()
                            moveToAdjacentPurchaseEntry(
                              field.name,
                              'remark',
                              event.key === 'ArrowRight' ? 1 : -1,
                            )
                          }
                        }}
                        onPressEnter={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          moveToNextPurchaseEntry(field.name, 'remark', field.name + 1)
                        }}
                      />
                    </Form.Item>
                    <div className="dept-entry-actions">
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    </div>
                  </div>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ productId: undefined, qty: undefined })}>
                  添加商品
                </Button>
              </>
              )
            }}
          </Form.List>
          <Space style={{ marginTop: 20, justifyContent: 'flex-end', width: '100%' }}>
            {!isAppendingPurchase ? (
              <>
                <Button onClick={savePurchaseDraft}>暂存</Button>
                <Button onClick={loadPurchaseDraft}>读取暂存</Button>
                <Button danger onClick={clearPurchaseDraft}>清空暂存</Button>
                <Button icon={<PrinterOutlined />} onClick={printCurrentPurchaseDraft}>
                  直接打印
                </Button>
              </>
            ) : null}
            <Button
              onClick={() => {
                setPurchaseOpen(false)
                setAppendReceiptNo('')
              }}
            >
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {isAppendingPurchase ? '追加保存' : '保存'}
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={`${logTypeLabels[moveType] || '库存变动'}录入`}
        width={720}
        open={moveOpen}
        onCancel={() => setMoveOpen(false)}
        footer={null}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
      >
        <Form<EntryForm> form={moveForm} layout="vertical" onFinish={handleMoveFinish}>
          <Space size={12} style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Form.Item name="date" label="日期" rules={[{ required: true }]}>
              <DatePicker style={{ width: 150 }} />
            </Form.Item>
            {moveType === 'issue' || moveType === 'return' ? (
              <Form.Item name="warehouseId" label="仓库" rules={[{ required: true }]}>
                <Select
                  style={{ width: 180 }}
                  options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                />
              </Form.Item>
            ) : null}
            {moveType === 'return' || moveType === 'transfer' || moveType === 'sale' ? (
              <Form.Item name="sourceDepartmentId" label="来源部门" rules={[{ required: true }]}>
                <Select style={{ width: 180 }} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
              </Form.Item>
            ) : null}
            {moveType === 'issue' || moveType === 'transfer' ? (
              <Form.Item name="targetDepartmentId" label="目标部门" rules={[{ required: true }]}>
                <Select style={{ width: 180 }} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
              </Form.Item>
            ) : null}
          </Space>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item
                      name={[field.name, 'productId']}
                      rules={[{ required: true, message: '请选择商品' }]}
                      style={{ width: 300 }}
                    >
                      <Select showSearch optionFilterProp="label" placeholder="选择商品" options={productOptions} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'qty']} rules={[{ required: true, message: '数量' }]} style={{ width: 120 }}>
                      <InputNumber min={0} placeholder="数量" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'remark']} style={{ width: 160 }}>
                      <Input placeholder="备注" />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ productId: undefined, qty: 1 })}>
                  添加商品
                </Button>
              </>
            )}
          </Form.List>
          <Space style={{ marginTop: 20, justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setMoveOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="商品进出货查询"
        open={flowOpen}
        width={900}
        onCancel={() => setFlowOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div className="filter-bar">
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            placeholder="选择商品"
            style={{ width: 300 }}
            value={flowProductId || undefined}
            options={productOptions}
            onChange={(value) => setFlowProductId(value || '')}
          />
          <DatePicker.RangePicker
            value={flowRange}
            onChange={(dates) =>
              setFlowRange(
                dates && dates[0] && dates[1] ? [dates[0], dates[1]] : null,
              )
            }
          />
          <Button type="primary" loading={flowLoading} onClick={queryProductFlow}>
            查询
          </Button>
        </div>

        {flowRows.length ? (
          <div className="flow-summary">
            <span>期间进货量：{flowInQty}</span>
            <span>期间出货量：{flowOutQty}</span>
            <span>净变化：{flowInQty - flowOutQty}</span>
          </div>
        ) : null}

        <Spin spinning={flowLoading}>
          <Table<DepartmentLogItem>
            rowKey="id"
            dataSource={flowRows}
            size="small"
            pagination={false}
            columns={[
              { title: '日期', dataIndex: 'date', width: 110 },
              {
                title: '类型',
                dataIndex: 'logType',
                width: 110,
                render: (type: string) => logTypeLabels[type] || type,
              },
              { title: '商品', dataIndex: 'productName' },
              {
                title: '方向',
                dataIndex: 'direction',
                width: 90,
                render: (value: string) =>
                  value === 'in' ? '入库' : value === 'out' ? '出库' : value,
              },
              { title: '数量', dataIndex: 'qty', width: 90 },
              {
                title: '来源',
                dataIndex: 'fromName',
                width: 130,
                render: (value: string) => value || '-',
              },
              {
                title: '去向',
                dataIndex: 'toName',
                width: 130,
                render: (value: string) => value || '-',
              },
              { title: '操作人', dataIndex: 'operator', width: 110 },
              { title: '备注', dataIndex: 'remark' },
            ]}
          />
        </Spin>
      </Modal>

      <Modal
        title="部门库存统计"
        open={statsOpen}
        width={980}
        onCancel={() => setStatsOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div className="filter-bar">
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            placeholder="全部部门（可不选）"
            style={{ width: 200 }}
            value={statsDepartmentId || undefined}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            onChange={(value) => setStatsDepartmentId(value || '')}
          />
          <Select
            showSearch
            allowClear
            mode="multiple"
            optionFilterProp="label"
            placeholder="选择商品"
            style={{ width: 320 }}
            value={statsProductIds}
            options={productOptions}
            onChange={(value) => setStatsProductIds(value || [])}
          />
          <DatePicker.RangePicker
            value={statsRange}
            onChange={(dates) =>
              setStatsRange(
                dates && dates[0] && dates[1] ? [dates[0], dates[1]] : null,
              )
            }
          />
          <Button type="primary" loading={statsLoading} onClick={queryStockStats}>
            查询
          </Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!statsSummary || !statsRows.length}
            onClick={exportStockStats}
          >
            导出
          </Button>
        </div>

        {statsSummary ? (
          <div className="flow-summary">
            <span>期初库存：{statsSummary.opening}</span>
            <span>期间入库：{statsSummary.inbound}</span>
            <span>期间出库：{statsSummary.outbound}</span>
            <span>净变化：{statsSummary.net}</span>
            <span>期末库存：{statsSummary.closing}</span>
          </div>
        ) : null}

        <Spin spinning={statsLoading}>
          <Table<DepartmentLogItem>
            rowKey="id"
            dataSource={statsRows}
            size="small"
            pagination={false}
            summary={() => {
              const totalQty = statsRows.reduce(
                (sum, record) => sum + departmentLogQuantity(record),
                0,
              )
              const totalAmount = statsRows.reduce(
                (sum, record) => sum + Number(record.amount || 0),
                0,
              )
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    合计
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    {totalQty}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                  <Table.Summary.Cell index={7} align="right">
                    ¥{totalAmount.toFixed(2)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} colSpan={4} />
                </Table.Summary.Row>
              )
            }}
            columns={[
              { title: '日期', dataIndex: 'date', width: 110 },
              {
                title: '类型',
                dataIndex: 'logType',
                width: 110,
                render: (type: string) => logTypeLabels[type] || type,
              },
              { title: '商品', dataIndex: 'productName' },
              {
                title: '部门',
                width: 150,
                render: (_, record) => departmentLogDepartments(record),
              },
              {
                title: '方向',
                dataIndex: 'direction',
                width: 90,
                render: (value: string, record) =>
                  record.logType === 'count'
                    ? '调整'
                    : value === 'in'
                      ? '入库'
                      : value === 'out'
                        ? '出库'
                        : value,
              },
              {
                title: '数量',
                dataIndex: 'qty',
                width: 90,
                render: (_, record) => departmentLogQuantity(record),
              },
              {
                title: '单价',
                dataIndex: 'price',
                width: 100,
                align: 'right',
                render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
              },
              {
                title: '金额',
                dataIndex: 'amount',
                width: 110,
                align: 'right',
                render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
              },
              {
                title: '来源',
                dataIndex: 'fromName',
                width: 130,
                render: (value: string) => value || '-',
              },
              {
                title: '去向',
                dataIndex: 'toName',
                width: 130,
                render: (value: string) => value || '-',
              },
              { title: '操作人', dataIndex: 'operator', width: 110 },
              { title: '备注', dataIndex: 'remark' },
            ]}
          />
        </Spin>
      </Modal>

      <Modal
        className="purchase-detail-modal"
        title={
          <div className="purchase-detail-title">
            <div className="purchase-detail-title-main">
              采购明细 · {purchaseDetailProduct?.receiptNo || '历史单'}
            </div>
            <div className="purchase-detail-title-meta">
              {purchaseDetailProduct?.date || '-'} ·{' '}
              {logTypeLabels[purchaseDetailProduct?.logType || ''] ||
                purchaseDetailProduct?.logType ||
                '-'}
            </div>
          </div>
        }
        open={purchaseDetailOpen}
        width={900}
        onCancel={() => setPurchaseDetailOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 8, textAlign: 'right' }}>
          <Tooltip
            title={
              purchaseDetailProduct?.receiptNo
                ? activePurchaseDetailCount
                  ? ''
                  : '该单据没有可继续添加的有效明细'
                : '历史单无法追加，请新建采购单'
            }
          >
            <span>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!canAppendPurchase}
                onClick={() => {
                  if (purchaseDetailProduct) openPurchaseForReceipt(purchaseDetailProduct)
                }}
              >
                继续添加商品
              </Button>
            </span>
          </Tooltip>
        </div>
        <Table<DepartmentLogItem>
          className="purchase-detail-table"
          rowKey="id"
          dataSource={purchaseDetailLogs}
          size="small"
          pagination={false}
          tableLayout="fixed"
          scroll={{ y: '60vh' }}
          columns={[
            {
              title: '序号',
              width: 50,
              align: 'center',
              render: (_, record, index) => record.lineNo ?? index + 1,
            },
            {
              title: '商品',
              dataIndex: 'productName',
              width: 150,
              ellipsis: true,
            },
            { title: '数量', dataIndex: 'qty', width: 64, align: 'right' },
            {
              title: '单价',
              dataIndex: 'price',
              width: 80,
              align: 'right',
              render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
            },
            {
              title: '金额',
              dataIndex: 'amount',
              width: 88,
              align: 'right',
              render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
            },
            {
              title: '仓库/部门',
              dataIndex: 'targetName',
              width: 110,
              ellipsis: true,
              render: (value: string) => value || '-',
            },
            { title: '操作人', dataIndex: 'operator', width: 78 },
            {
              title: '状态',
              dataIndex: 'recalled',
              width: 76,
              render: (recalled: boolean) =>
                recalled ? <Tag color="default">已撤回</Tag> : <Tag color="green">正常</Tag>,
            },
            {
              title: '操作',
              width: 142,
              render: (_, record) =>
                record.recalled ? null : (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openPurchaseLogEdit(record)}
                    >
                      修改
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => confirmPurchaseRecall(record)}
                    >
                      撤回
                    </Button>
                  </Space>
                ),
            },
          ]}
        />
        <div className="purchase-detail-total">
          <span>总数量：{purchaseDetailTotalQty}</span>
          <span>总金额：¥{purchaseDetailTotalAmount.toFixed(2)}</span>
        </div>
      </Modal>

      <Modal
        title={`修改采购明细 · ${editingPurchaseLog?.productName || ''}`}
        open={!!editingPurchaseLog}
        width={520}
        onCancel={() => setEditingPurchaseLog(null)}
        footer={null}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
      >
        <Form<PurchaseLogEditForm>
          form={purchaseLogEditForm}
          layout="vertical"
          onFinish={submitPurchaseLogEdit}
        >
          <Form.Item
            name="qty"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="单价">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="总额">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setEditingPurchaseLog(null)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={purchaseLogEditSaving}>
              保存修改
            </Button>
          </Space>
        </Form>
      </Modal>

      <PurchaseVoucherPrint
        open={purchaseVoucherOpen}
        groups={purchaseVoucherGroups}
        onClose={() => setPurchaseVoucherOpen(false)}
      />
    </>
  )
}
