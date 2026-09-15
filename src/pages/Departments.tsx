import { useCallback, useEffect, useState, type Key } from 'react'
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
  Tabs,
  Tag,
  message,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
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
import * as XLSX from 'xlsx'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import PurchaseVoucherPrint, {
  type PurchaseVoucherGroup,
} from '../components/PurchaseVoucherPrint'
import type {
  CategoryItem,
  DepartmentItem,
  DepartmentLogItem,
  DepartmentStockItem,
  ProductItem,
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
  targetType?: 'warehouse' | 'department'
  targetId?: string
  sourceDepartmentId?: string
  targetDepartmentId?: string
  warehouseId?: string
  departmentId?: string
  items: EntryItem[]
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
  const [deptForm] = Form.useForm<DepartmentForm>()
  const [purchaseForm] = Form.useForm<EntryForm>()
  const [moveForm] = Form.useForm<EntryForm>()
  const [countForm] = Form.useForm<EntryForm>()

  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
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

  const [purchaseLogs, setPurchaseLogs] = useState<DepartmentLogItem[]>([])
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchasePage, setPurchasePage] = useState(1)
  const [purchasePageSize, setPurchasePageSize] = useState(20)
  const [purchaseTotal, setPurchaseTotal] = useState(0)
  const [purchaseVoucherOpen, setPurchaseVoucherOpen] = useState(false)
  const [purchaseVoucherGroups, setPurchaseVoucherGroups] = useState<PurchaseVoucherGroup[]>([])
  const [purchaseSelectedKeys, setPurchaseSelectedKeys] = useState<Key[]>([])
  const [purchaseSelectedLogs, setPurchaseSelectedLogs] = useState<DepartmentLogItem[]>([])

  const [moveLogs, setMoveLogs] = useState<DepartmentLogItem[]>([])
  const [moveLoading, setMoveLoading] = useState(false)
  const [movePage, setMovePage] = useState(1)
  const [movePageSize, setMovePageSize] = useState(20)
  const [moveTotal, setMoveTotal] = useState(0)

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [purchaseType, setPurchaseType] = useState<'daily' | 'direct' | 'return'>('daily')
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
      const all: ProductItem[] = []
      let page = 1
      while (true) {
        const res = await api.productList({ page, pageSize: 100 })
        all.push(...res.list)
        if (all.length >= res.total || !res.list.length) break
        page += 1
      }
      setProducts(all)
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

  const loadPurchaseLogs = useCallback(async () => {
    setPurchaseLoading(true)
    try {
      const res = await api.departmentLogs({
        page: purchasePage,
        pageSize: purchasePageSize,
        types: ['daily', 'direct', 'purchase_return'],
      })
      setPurchaseLogs(res.list)
      setPurchaseTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载采购流水失败')
    } finally {
      setPurchaseLoading(false)
    }
  }, [purchasePage, purchasePageSize])

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

  function openPurchase(type: 'daily' | 'direct' | 'return') {
    setPurchaseType(type)
    purchaseForm.resetFields()
    purchaseForm.setFieldsValue({
      date: dayjs(),
      supplier: '',
      targetType: 'warehouse',
      targetId: undefined,
      items: [{ productId: undefined, qty: 1, price: 0, amount: 0 }],
    })
    setPurchaseOpen(true)
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

    if (changed === 'price' && qty > 0 && price >= 0) {
      const nextAmount = Math.round(qty * price * 100) / 100
      purchaseForm.setFieldValue(['items', index, 'amount'], nextAmount)
    }
  }

  async function handlePurchaseFinish(values: EntryForm) {
    setSaving(true)
    try {
      const res = await api.departmentPurchase({
        purchaseType,
        supplier: values.supplier,
        targetType: values.targetType,
        targetId: values.targetId,
        date: values.date.format('YYYY-MM-DD'),
        items: values.items,
      })
      message.success(`采购流水已记录 ${res.handled} 条`)
      setPurchaseOpen(false)
      await loadPurchaseLogs()
      await loadStock()
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
        } catch (err) {
          message.error(err instanceof Error ? err.message : '撤回失败')
        }
      },
    })
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
        const key = `${warehouseName}__${date}`
        if (!groupMap.has(key)) {
          groupMap.set(key, { warehouseName, date, logs: [] })
        }
        groupMap.get(key)?.logs.push(log)
      })
    return Array.from(groupMap.values())
  }

  function handlePurchaseSelectionChange(
    nextKeys: Key[],
    nextRows: DepartmentLogItem[],
  ) {
    const keySet = new Set(nextKeys.map(String))
    setPurchaseSelectedKeys(nextKeys)
    setPurchaseSelectedLogs((prev) => {
      const merged = new Map<string, DepartmentLogItem>()
      prev.forEach((row) => merged.set(row.id, row))
      nextRows.forEach((row) => merged.set(row.id, row))
      return Array.from(merged.values()).filter((row) => keySet.has(row.id))
    })
  }

  function printSelectedPurchase() {
    const selected = purchaseSelectedLogs.filter((record) => !record.recalled)
    if (!selected.length) {
      message.warning('请先勾选要打印的采购记录')
      return
    }
    setPurchaseVoucherGroups(buildPurchaseVoucherGroups(selected))
    setPurchaseVoucherOpen(true)
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
  const productOptions = products.map((p) => ({ value: p.id, label: `${p.name}${p.spec ? `(${p.spec})` : ''}` }))
  const validPurchaseSelectedCount = purchaseSelectedLogs.filter(
    (record) => !record.recalled,
  ).length

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
                  </Space>
                </div>
                <Spin spinning={purchaseLoading}>
                  <Table<DepartmentLogItem>
                    rowKey="id"
                    dataSource={purchaseLogs}
                    rowSelection={{
                      selectedRowKeys: purchaseSelectedKeys,
                      onChange: handlePurchaseSelectionChange,
                      preserveSelectedRowKeys: true,
                      getCheckboxProps: (record) => ({
                        disabled: record.recalled,
                      }),
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
                      { title: '数量', dataIndex: 'qty', width: 90 },
                      { title: '单价', dataIndex: 'price', width: 100 },
                      { title: '金额', dataIndex: 'amount', width: 110 },
                      {
                        title: '仓库/部门',
                        dataIndex: 'targetName',
                        width: 130,
                        render: (value: string) => value || '-',
                      },
                      { title: '供货商', dataIndex: 'supplier', width: 140 },
                      { title: '操作人', dataIndex: 'operator', width: 110 },
                      { title: '备注', dataIndex: 'remark' },
                      {
                        title: '操作',
                        width: 190,
                        render: (_, record) =>
                          record.recalled ? (
                            <Tag color="default">已撤回</Tag>
                          ) : (
                            <Space size={0}>
                              <Button
                                type="link"
                                size="small"
                                icon={<PrinterOutlined />}
                                onClick={() => openPurchaseVoucher(record)}
                              >
                                打印凭证
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

      <Drawer
        title={`${logTypeLabels[purchaseType === 'return' ? 'purchase_return' : purchaseType] || '采购'}录入`}
        width={840}
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
      >
        <Form<EntryForm> form={purchaseForm} layout="vertical" onFinish={handlePurchaseFinish}>
          <Space size={12} style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Form.Item name="date" label="日期" rules={[{ required: true }]}>
              <DatePicker style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="supplier" label="供货商">
              <Input placeholder="选填，例如：XX 供应商" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="targetType" label={purchaseType === 'return' ? '退货来源' : '入库去向'} rules={[{ required: true }]}>
              <Select
                style={{ width: 150 }}
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
                      <Select showSearch optionFilterProp="label" placeholder="选择商品" options={productOptions} />
                    </Form.Item>
                    <Form.Item
                      className="dept-entry-field"
                      name={[field.name, 'qty']}
                      rules={[{ required: true, message: '数量' }]}
                    >
                      <InputNumber
                        min={0}
                        placeholder="数量"
                        style={{ width: '100%' }}
                        onChange={(value) => syncPurchaseRow(field.name, 'qty', value)}
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'price']}>
                      <InputNumber
                        min={0}
                        precision={2}
                        placeholder="单价"
                        style={{ width: '100%' }}
                        onChange={(value) => syncPurchaseRow(field.name, 'price', value)}
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'amount']}>
                      <InputNumber
                        min={0}
                        precision={2}
                        placeholder="总额"
                        style={{ width: '100%' }}
                        onChange={(value) => syncPurchaseRow(field.name, 'amount', value)}
                      />
                    </Form.Item>
                    <Form.Item className="dept-entry-field" name={[field.name, 'remark']}>
                      <Input placeholder="备注" />
                    </Form.Item>
                    <div className="dept-entry-actions">
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    </div>
                  </div>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ productId: undefined, qty: 1, price: 0, amount: 0 })}>
                  添加商品
                </Button>
              </>
            )}
          </Form.List>
          <Space style={{ marginTop: 20, justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setPurchaseOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
          </Space>
        </Form>
      </Drawer>

      <Drawer
        title={`${logTypeLabels[moveType] || '库存变动'}录入`}
        width={720}
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
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
      </Drawer>

      <PurchaseVoucherPrint
        open={purchaseVoucherOpen}
        groups={purchaseVoucherGroups}
        onClose={() => setPurchaseVoucherOpen(false)}
      />
    </>
  )
}
