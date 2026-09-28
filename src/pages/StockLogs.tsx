import { useCallback, useEffect, useState, type Key } from 'react'
import {
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
  Tag,
  Tooltip,
  message,
} from 'antd'
import {
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import ProductInlineSelect from '../components/ProductInlineSelect'
import StockVoucherPrint from '../components/StockVoucherPrint'
import type {
  CategoryItem,
  ProductOption,
  StockDocumentSummary,
  StockLogItem,
  StockVoucherGroup,
  StockVoucherLine,
  WarehouseItem,
} from '../types'

interface StockLogEditForm {
  qty: number
  price?: number
  remark?: string
}

interface AppendStockForm {
  productId?: string
  qty?: number
  price?: number
  remark?: string
}

const appendableSourceTypes = new Set(['manual', 'batch_inbound', 'purchase'])

export default function StockLogs() {
  const [list, setList] = useState<StockDocumentSummary[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    keyword: '',
    type: '',
    category: '',
    subcategory: '',
    warehouseId: '',
  })
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherGroups, setVoucherGroups] = useState<StockVoucherGroup[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryWarehouseId, setSummaryWarehouseId] = useState('')
  const [summaryRange, setSummaryRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<StockDocumentSummary[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailDocument, setDetailDocument] = useState<StockDocumentSummary | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingLog, setEditingLog] = useState<StockLogItem | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm] = Form.useForm<StockLogEditForm>()
  const [appendOpen, setAppendOpen] = useState(false)
  const [appendSaving, setAppendSaving] = useState(false)
  const [appendDocument, setAppendDocument] = useState<StockDocumentSummary | null>(null)
  const [appendForm] = Form.useForm<AppendStockForm>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.stockDocumentSummary({
        page,
        pageSize,
        ...filters,
        startDate: range && range[0] ? range[0].startOf('day').toISOString() : undefined,
        endDate: range && range[1] ? range[1].endOf('day').toISOString() : undefined,
      })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载出入库记录失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters, range])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [filters, range])

  useEffect(() => {
    api
      .categoryList()
      .then((res) => setCategories(res.list))
      .catch(() => undefined)
    api
      .warehouseList()
      .then((res) => setWarehouses(res.list))
      .catch(() => undefined)
    api
      .productOptions()
      .then((res) => setProducts(res.list))
      .catch(() => undefined)
  }, [])

  const currentCategory = categories.find((category) => category.key === filters.category)
  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.name}${product.spec ? `（${product.spec}）` : ''}`,
  }))

  function toVoucherLine(record: StockLogItem): StockVoucherLine {
    return {
      id: record.id,
      lineNo: record.lineNo,
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

  function buildVoucherGroups(documents: StockDocumentSummary[]): StockVoucherGroup[] {
    return documents
      .filter((document) => document.type === 'in')
      .map((document) => ({
        documentNo: document.documentNo || undefined,
        warehouseName: document.warehouseName || '默认仓库',
        date:
          document.date ||
          dayjs(document.items[0]?.createdAt || Date.now()).format('YYYY-MM-DD'),
        logs: document.items
          .filter((item) => !item.recalled)
          .sort((a, b) => {
            const aLineNo = a.lineNo == null ? Number.MAX_SAFE_INTEGER : a.lineNo
            const bLineNo = b.lineNo == null ? Number.MAX_SAFE_INTEGER : b.lineNo
            if (aLineNo !== bLineNo) return aLineNo - bLineNo
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          })
          .map(toVoucherLine),
      }))
      .filter((group) => group.logs.length > 0)
  }

  async function loadDocument(documentNo: string) {
    if (!documentNo) return null
    const res = await api.stockDocumentSummary({
      documentNo,
      page: 1,
      pageSize: 200,
    })
    return res.list[0] || null
  }

  async function openDocument(document: StockDocumentSummary) {
    setDetailDocument(document)
    setDetailOpen(true)
    if (!document.documentNo) return
    setDetailLoading(true)
    try {
      const latest = await loadDocument(document.documentNo)
      if (latest) setDetailDocument(latest)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载单据明细失败')
    } finally {
      setDetailLoading(false)
    }
  }

  async function refreshDetail(documentNo: string) {
    const latest = await loadDocument(documentNo)
    if (latest) setDetailDocument(latest)
    await load()
  }

  function handleSelectionChange(nextKeys: Key[], nextRows: StockDocumentSummary[]) {
    const keySet = new Set(nextKeys.map(String))
    setSelectedRowKeys(nextKeys)
    setSelectedDocuments((previous) => {
      const merged = new Map<string, StockDocumentSummary>()
      previous.forEach((row) => merged.set(row.key, row))
      nextRows.forEach((row) => merged.set(row.key, row))
      return Array.from(merged.values()).filter((row) => keySet.has(row.key))
    })
  }

  function printSelected() {
    const groups = buildVoucherGroups(selectedDocuments)
    if (!groups.length) {
      message.warning('请先勾选包含有效入库商品的单据')
      return
    }
    setVoucherGroups(groups)
    setVoucherOpen(true)
  }

  function printDocument(document: StockDocumentSummary) {
    const groups = buildVoucherGroups([document])
    if (!groups.length) {
      message.warning('该单据没有可打印的有效入库商品')
      return
    }
    setVoucherGroups(groups)
    setVoucherOpen(true)
  }

  async function exportSelected() {
    const rows = selectedDocuments.flatMap((document) =>
      document.items
        .filter((item) => !item.recalled)
        .map((item) => ({ document, item })),
    )
    if (!rows.length) {
      message.warning('请先勾选要导出的单据')
      return
    }
    const XLSX = await import('xlsx')
    const sheet = XLSX.utils.json_to_sheet(
      rows.map(({ document, item }) => ({
        单据号: document.documentNo || '历史单',
        日期: document.date,
        类型: document.type === 'in' ? '入库' : '出库',
        仓库: document.warehouseName,
        商品: item.productName,
        规格: item.spec,
        分类: item.categoryName,
        子分类: item.subcategory,
        数量: item.qty,
        单位: item.unit,
        单价: Number(item.price || 0),
        金额: Number(item.price || 0) * Number(item.qty || 0),
        库存变动: `${item.stockBefore} → ${item.stockAfter}`,
        操作人: document.operator,
        原因: item.reason || document.reason,
        时间: new Date(item.createdAt).toLocaleString('zh-CN'),
      })),
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, '出入库单据')
    XLSX.writeFile(workbook, `出入库记录_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
  }

  async function runSummary() {
    if (!summaryRange || !summaryRange[0] || !summaryRange[1]) {
      message.warning('请先选择日期范围')
      return
    }
    setSummaryLoading(true)
    try {
      const logs: StockLogItem[] = []
      let pageNo = 1
      let fetchedCount = 0
      let totalCount = 1
      do {
        const res = await api.stockLogList({
          type: 'in',
          warehouseId: summaryWarehouseId || undefined,
          startDate: summaryRange[0].startOf('day').toISOString(),
          endDate: summaryRange[1].endOf('day').toISOString(),
          page: pageNo,
          pageSize: 200,
        })
        fetchedCount += res.list.length
        logs.push(...res.list.filter((log) => !log.recalled))
        totalCount = res.total
        pageNo += 1
      } while (fetchedCount < totalCount && pageNo <= 100)

      if (!logs.length) {
        message.info('该条件下没有可打印的入库记录')
        return
      }
      const grouped = new Map<string, StockVoucherGroup>()
      logs.forEach((log) => {
        const date = dayjs(log.createdAt).format('YYYY-MM-DD')
        const key = `${log.documentNo || 'legacy'}__${log.warehouseName}__${date}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            documentNo: log.documentNo || undefined,
            warehouseName: log.warehouseName || '默认仓库',
            date,
            logs: [],
          })
        }
        grouped.get(key)?.logs.push(toVoucherLine(log))
      })
      setVoucherGroups(Array.from(grouped.values()))
      setSummaryOpen(false)
      setVoucherOpen(true)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '生成汇总凭证失败')
    } finally {
      setSummaryLoading(false)
    }
  }

  function confirmRecallLog(record: StockLogItem) {
    Modal.confirm({
      title: `撤回商品「${record.productName}」？`,
      content: '撤回后会反向调整库存，历史记录保留并标记“已撤回”。',
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.stockLogRecall(record.id)
          message.success('已撤回')
          if (detailDocument?.documentNo) {
            await refreshDetail(detailDocument.documentNo)
          } else {
            await load()
          }
        } catch (err) {
          message.error(err instanceof Error ? err.message : '撤回失败')
        }
      },
    })
  }

  function confirmRecallDocument(document: StockDocumentSummary) {
    Modal.confirm({
      title: `整单撤回「${document.documentNo || '历史单'}」？`,
      content: '整张单据中的有效商品将一次性撤回，并同步反向调整库存和价格批次。',
      okText: '确认整单撤回',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (document.documentNo) {
            await api.stockLogsRecallBatch({ documentNo: document.documentNo })
          } else {
            const activeItems = document.items.filter((item) => !item.recalled)
            for (const item of activeItems) {
              await api.stockLogRecall(item.id)
            }
          }
          message.success('单据已撤回')
          if (detailDocument?.key === document.key) {
            const latest = document.documentNo
              ? await loadDocument(document.documentNo)
              : null
            setDetailDocument(latest)
          }
          await load()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '整单撤回失败')
        }
      },
    })
  }

  function openEdit(record: StockLogItem) {
    setEditingLog(record)
    editForm.setFieldsValue({
      qty: Number(record.qty || 0),
      price: Number(record.price || 0),
      remark: record.reason || '',
    })
  }

  async function submitEdit(values: StockLogEditForm) {
    if (!editingLog) return
    setEditSaving(true)
    try {
      await api.stockLogUpdate({
        id: editingLog.id,
        qty: values.qty,
        price: editingLog.type === 'in' ? values.price : 0,
        remark: values.remark,
      })
      message.success('明细已更新')
      setEditingLog(null)
      if (editingLog.documentNo) await refreshDetail(editingLog.documentNo)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修改失败')
    } finally {
      setEditSaving(false)
    }
  }

  function openAppend(document: StockDocumentSummary) {
    setAppendDocument(document)
    appendForm.resetFields()
    appendForm.setFieldsValue({
      productId: undefined,
      qty: 1,
      price: document.type === 'in' ? 0 : undefined,
      remark: '',
    })
    setAppendOpen(true)
  }

  async function submitAppend(values: AppendStockForm) {
    if (!appendDocument?.documentNo) return
    setAppendSaving(true)
    try {
      const result = await api.stockDocumentAppend({
        documentNo: appendDocument.documentNo,
        items: [
          {
            productId: values.productId,
            qty: Number(values.qty || 0),
            price: Number(values.price || 0),
            remark: values.remark || '',
          },
        ],
      })
      message.success(`已追加到单据 ${result.documentNo}`)
      setAppendOpen(false)
      await refreshDetail(appendDocument.documentNo)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '追加商品失败')
    } finally {
      setAppendSaving(false)
    }
  }

  const detailLogs = detailDocument?.items || []
  const activeDetailLogs = detailLogs.filter((item) => !item.recalled)
  const detailTotalQty = activeDetailLogs.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0,
  )
  const detailTotalAmount = activeDetailLogs.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0,
  )
  const canAppend =
    !!detailDocument?.documentNo &&
    activeDetailLogs.length > 0 &&
    appendableSourceTypes.has(detailDocument.sourceType || 'manual')
  const validSelectedCount = selectedDocuments.filter(
    (document) =>
      document.type === 'in' &&
      document.items.some((item) => !item.recalled),
  ).length

  return (
    <>
      <PageHeader
        title="出入库记录"
        subtitle="按单据查看入库/出库明细，并支持修改、追加、打印、导出和整单撤回。"
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
              icon={<DownloadOutlined />}
              disabled={selectedDocuments.length === 0}
              onClick={exportSelected}
            >
              导出选中
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
            placeholder="搜索单据号、商品或操作人"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            value={filters.keyword}
            onChange={(event) =>
              setFilters((current) => ({ ...current, keyword: event.target.value }))
            }
          />
          <Select
            allowClear
            placeholder="全部类型"
            style={{ width: 130 }}
            value={filters.type || undefined}
            options={[
              { value: 'in', label: '入库' },
              { value: 'out', label: '出库' },
            ]}
            onChange={(value) =>
              setFilters((current) => ({ ...current, type: value || '' }))
            }
          />
          <Select
            allowClear
            placeholder="全部仓库"
            style={{ width: 160 }}
            value={filters.warehouseId || undefined}
            options={warehouses.map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.name,
            }))}
            onChange={(value) =>
              setFilters((current) => ({ ...current, warehouseId: value || '' }))
            }
          />
          <Select
            allowClear
            placeholder="全部分类"
            style={{ width: 140 }}
            value={filters.category || undefined}
            options={categories.map((category) => ({
              value: category.key,
              label: category.name,
            }))}
            onChange={(value) =>
              setFilters((current) => ({
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
            value={filters.subcategory || undefined}
            options={(currentCategory?.subcategories || []).map((subcategory) => ({
              value: subcategory,
              label: subcategory,
            }))}
            onChange={(value) =>
              setFilters((current) => ({ ...current, subcategory: value || '' }))
            }
          />
          <DatePicker.RangePicker
            allowClear
            value={range}
            onChange={(dates) =>
              setRange(dates && dates[0] && dates[1] ? [dates[0], dates[1]] : null)
            }
          />
          <Button type="primary" onClick={() => { setPage(1); load() }}>
            查询
          </Button>
        </div>
        <Spin spinning={loading}>
          <Table<StockDocumentSummary>
            rowKey="key"
            dataSource={list}
            rowSelection={{
              selectedRowKeys,
              onChange: handleSelectionChange,
              preserveSelectedRowKeys: true,
              getCheckboxProps: (record) => ({
                disabled: !record.items.some((item) => !item.recalled),
              }),
            }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
              },
            }}
            columns={[
              {
                title: '单据号',
                dataIndex: 'documentNo',
                width: 190,
                render: (value: string) =>
                  value || <Tag color="default">历史单</Tag>,
              },
              { title: '日期', dataIndex: 'date', width: 110 },
              {
                title: '类型',
                dataIndex: 'type',
                width: 80,
                render: (type: 'in' | 'out') =>
                  type === 'in' ? <Tag color="green">入库</Tag> : <Tag color="red">出库</Tag>,
              },
              {
                title: '仓库',
                dataIndex: 'warehouseName',
                width: 130,
                ellipsis: true,
                render: (value: string) => value || '-',
              },
              { title: '商品数', dataIndex: 'itemCount', width: 76, align: 'right' },
              { title: '总数量', dataIndex: 'totalQty', width: 86, align: 'right' },
              {
                title: '总金额',
                dataIndex: 'totalAmount',
                width: 110,
                align: 'right',
                render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
              },
              { title: '操作人', dataIndex: 'operator', width: 100, ellipsis: true },
              { title: '原因', dataIndex: 'reason', ellipsis: true },
              {
                title: '操作',
                width: 210,
                render: (_, record) => (
                  <Space size={0}>
                    <Button type="link" size="small" onClick={() => openDocument(record)}>
                      明细
                    </Button>
                    {record.type === 'in' ? (
                      <Button
                        type="link"
                        size="small"
                        icon={<PrinterOutlined />}
                        disabled={!record.items.some((item) => !item.recalled)}
                        onClick={() => printDocument(record)}
                      >
                        打印
                      </Button>
                    ) : null}
                    <Button
                      type="link"
                      size="small"
                      danger
                      disabled={!record.items.some((item) => !item.recalled)}
                      onClick={() => confirmRecallDocument(record)}
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

      <Modal
        className="purchase-detail-modal"
        width={900}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        destroyOnClose
        title={
          <div className="purchase-detail-title">
            <div className="purchase-detail-title-main">
              出入库明细 · {detailDocument?.documentNo || '历史单'}
            </div>
            <div className="purchase-detail-title-meta">
              {detailDocument?.date || '-'} ·{' '}
              {detailDocument?.type === 'in' ? '入库' : '出库'}
            </div>
          </div>
        }
      >
        <Spin spinning={detailLoading}>
          <div className="purchase-detail-toolbar">
            <div className="purchase-detail-actions">
              <Tooltip
                title={
                  canAppend
                    ? ''
                    : !detailDocument?.documentNo
                      ? '历史单无法追加，请新建单据'
                      : '该来源单据暂不支持继续添加商品'
                }
              >
                <span>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!canAppend}
                    onClick={() => detailDocument && openAppend(detailDocument)}
                  >
                    继续添加商品
                  </Button>
                </span>
              </Tooltip>
            </div>
          </div>
          <Table<StockLogItem>
            className="purchase-detail-table"
            rowKey="id"
            dataSource={detailLogs}
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
                render: (value: number, record) =>
                  record.type === 'in' ? `¥${Number(value || 0).toFixed(2)}` : '-',
              },
              {
                title: '金额',
                width: 88,
                align: 'right',
                render: (_, record) =>
                  record.type === 'in'
                    ? `¥${(Number(record.price || 0) * Number(record.qty || 0)).toFixed(2)}`
                    : '-',
              },
              { title: '单位', dataIndex: 'unit', width: 64, align: 'center' },
              {
                title: '库存变动',
                width: 120,
                render: (_, record) => `${record.stockBefore} → ${record.stockAfter}`,
              },
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
                        disabled={!record.documentNo}
                        onClick={() => openEdit(record)}
                      >
                        修改
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => confirmRecallLog(record)}
                      >
                        撤回
                      </Button>
                    </Space>
                  ),
              },
            ]}
          />
          <div className="purchase-detail-total">
            <span>总数量：{detailTotalQty}</span>
            <span>总金额：¥{detailTotalAmount.toFixed(2)}</span>
          </div>
        </Spin>
      </Modal>

      <Modal
        title={`修改出入库明细 · ${editingLog?.productName || ''}`}
        open={!!editingLog}
        width={520}
        onCancel={() => setEditingLog(null)}
        footer={null}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
      >
        <Form<StockLogEditForm>
          form={editForm}
          layout="vertical"
          onFinish={submitEdit}
        >
          <Form.Item
            name="qty"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          {editingLog?.type === 'in' ? (
            <Form.Item name="price" label="单价">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setEditingLog(null)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={editSaving}>
              保存修改
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={`继续添加商品 · ${appendDocument?.documentNo || ''}`}
        open={appendOpen}
        onCancel={() => setAppendOpen(false)}
        footer={null}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
      >
        <Form<AppendStockForm> form={appendForm} layout="vertical" onFinish={submitAppend}>
          <Form.Item
            name="productId"
            label="商品"
            rules={[{ required: true, message: '请选择商品' }]}
          >
            <ProductInlineSelect options={productOptions} placeholder="搜索商品" />
          </Form.Item>
          <Space size={12} style={{ display: 'flex', width: '100%' }}>
            <Form.Item
              name="qty"
              label="数量"
              rules={[{ required: true, message: '请输入数量' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            {appendDocument?.type === 'in' ? (
              <Form.Item name="price" label="单价" style={{ flex: 1 }}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            ) : null}
          </Space>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setAppendOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={appendSaving}>
              保存并追加
            </Button>
          </Space>
        </Form>
      </Modal>

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
            options={warehouses.map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.name,
            }))}
            onChange={(value) => setSummaryWarehouseId(value || '')}
          />
          <Button type="primary" loading={summaryLoading} onClick={runSummary}>
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
