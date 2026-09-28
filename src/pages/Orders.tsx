import { useCallback, useEffect, useRef, useState, type Key } from 'react'
import {
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd'
import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PrinterOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import OrderVoucherPrint from '../components/OrderVoucherPrint'
import type {
  OrderDetailData,
  OrderItem,
  OrderVoucherGroup,
  OrderVoucherLine,
  PrinterItem,
  StoreItem,
} from '../types'

interface OrderFilters {
  keyword: string
  storeId: string
  status: string
  range: [Dayjs, Dayjs] | null
}

export default function Orders() {
  const [list, setList] = useState<OrderItem[]>([])
  const [stores, setStores] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<OrderFilters>({
    keyword: '',
    storeId: '',
    status: '',
    range: null,
  })
  const [detail, setDetail] = useState<OrderDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [printers, setPrinters] = useState<PrinterItem[]>([])
  const [printOpen, setPrintOpen] = useState(false)
  const [printOrderNo, setPrintOrderNo] = useState('')
  const [selectedPrinterIds, setSelectedPrinterIds] = useState<string[]>([])
  const [copies, setCopies] = useState(1)
  const [printLoading, setPrintLoading] = useState(false)
  const [editingQty, setEditingQty] = useState(false)
  const [draftQty, setDraftQty] = useState<Record<string, number>>({})
  const [qtySaving, setQtySaving] = useState(false)
  const [selectedOrderKeys, setSelectedOrderKeys] = useState<Key[]>([])
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherGroups, setVoucherGroups] = useState<OrderVoucherGroup[]>([])
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const qtyInputRefs = useRef<Record<string, { focus: () => void } | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.orderList({
        page,
        pageSize,
        keyword: filters.keyword,
        storeId: filters.storeId,
        status: filters.status,
        startDate: filters.range?.[0] ? filters.range[0].format('YYYY-MM-DD') : '',
        endDate: filters.range?.[1] ? filters.range[1].format('YYYY-MM-DD') : '',
      })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载订单失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  useEffect(() => {
    api
      .storeList()
      .then((res) => setStores(res.list))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
    setSelectedOrderKeys([])
  }, [filters])

  async function openDetail(orderNo: string): Promise<OrderDetailData | null> {
    setDetailLoading(true)
    try {
      const res = await api.orderDetail(orderNo)
      setDetail(res)
      setEditingQty(false)
      setDraftQty({})
      return res
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载订单详情失败')
      return null
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetail(null)
    setEditingQty(false)
    setDraftQty({})
    setQtySaving(false)
  }

  function buildOrderVoucherGroup(
    detailData: OrderDetailData,
  ): OrderVoucherGroup | null {
    const logs: OrderVoucherLine[] = detailData.items
      .filter((item) => Number(item.qty || 0) > 0)
      .map((item, index) => ({
        id: `${detailData.order.orderNo}-${item.productId}`,
        productName: item.productName,
        spec: item.spec,
        unit: item.unit || '件',
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        amount: Number(item.price || 0) * Number(item.qty || 0),
        remark: index === 0 ? detailData.order.remark || '' : '',
      }))
    if (!logs.length) return null
    return {
      orderNo: detailData.order.orderNo,
      storeName: detailData.order.storeName,
      time: detailData.order.time,
      itemCount: logs.reduce((sum, item) => sum + item.qty, 0),
      operator: '',
      logs,
    }
  }

  async function printOrderVouchers(orderNos: string[]) {
    if (!orderNos.length) {
      message.warning('请先勾选要打印凭证的订单')
      return
    }
    setVoucherLoading(true)
    try {
      const details = await Promise.all(orderNos.map((orderNo) => api.orderDetail(orderNo)))
      const groups = details
        .map(buildOrderVoucherGroup)
        .filter((group): group is OrderVoucherGroup => !!group)
      if (!groups.length) {
        message.warning('所选订单没有可打印的商品')
        return
      }
      setVoucherGroups(groups)
      setVoucherOpen(true)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载订单凭证失败')
    } finally {
      setVoucherLoading(false)
    }
  }

  async function exportOrdersExcel() {
    if (exporting) return
    setExporting(true)
    try {
      const rows: OrderItem[] = []
      let nextPage = 1
      let totalCount = 1
      do {
        const res = await api.orderList({
          page: nextPage,
          pageSize: 200,
          keyword: filters.keyword,
          storeId: filters.storeId,
          status: filters.status,
          startDate: filters.range?.[0]
            ? filters.range[0].format('YYYY-MM-DD')
            : '',
          endDate: filters.range?.[1]
            ? filters.range[1].format('YYYY-MM-DD')
            : '',
        })
        rows.push(...res.list)
        totalCount = res.total
        nextPage += 1
      } while (rows.length < totalCount && nextPage <= 100)

      if (!rows.length) {
        message.warning('当前筛选条件下没有可导出的订单')
        return
      }
      const XLSX = await import('xlsx')
      const sheet = XLSX.utils.json_to_sheet(
        rows.map((row) => ({
          订单号: row.orderNo,
          门店: row.storeName,
          下单时间: row.time,
          商品件数: Number(row.itemCount || 0),
          金额: Number(row.totalAmount || 0),
          状态: row.status,
          备注: row.remark || '',
        })),
      )
      sheet['!cols'] = [
        { wch: 22 },
        { wch: 24 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 30 },
      ]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, '订单列表')
      XLSX.writeFile(
        workbook,
        `订单管理_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`,
      )
      message.success(`已导出 ${rows.length} 条订单`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导出订单失败')
    } finally {
      setExporting(false)
    }
  }

  function startQtyEdit() {
    if (!detail || detail.order.status !== '已下单') return
    const nextDraft: Record<string, number> = {}
    detail.items.forEach((item) => {
      nextDraft[item.productId] = Number(item.qty || 0)
    })
    setDraftQty(nextDraft)
    setEditingQty(true)
  }

  function cancelQtyEdit() {
    setEditingQty(false)
    setDraftQty({})
  }

  async function saveQtyEdits(printAfterSave = false) {
    if (!detail || qtySaving) return
    const changes = detail.items
      .filter((item) => Number(draftQty[item.productId] ?? item.qty) !== Number(item.qty))
      .map((item) => ({
        productId: item.productId,
        qty: Math.max(0, Math.floor(Number(draftQty[item.productId] ?? item.qty))),
      }))
    if (!changes.length) {
      if (!printAfterSave) {
        message.warning('商品数量没有变化')
        return
      }
      const group = buildOrderVoucherGroup(detail)
      if (!group) {
        message.warning('当前订单没有可打印的商品')
        return
      }
      setVoucherGroups([group])
      setVoucherOpen(true)
      return
    }
    setQtySaving(true)
    try {
      await api.orderUpdateQty({
        orderNo: detail.order.orderNo,
        changes,
      })
      message.success('商品数量已更新')
      const refreshedDetail = await openDetail(detail.order.orderNo)
      await load()
      if (printAfterSave) {
        if (!refreshedDetail) {
          message.warning('商品数量已更新，但凭证加载失败，请重新打开订单详情后重试')
          return
        }
        const group = buildOrderVoucherGroup(refreshedDetail)
        if (!group) {
          message.warning('当前订单没有可打印的商品')
          return
        }
        setVoucherGroups([group])
        setVoucherOpen(true)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修改数量失败')
    } finally {
      setQtySaving(false)
    }
  }

  const previewItems =
    detail?.items.map((item) => ({
      ...item,
      qty: editingQty
        ? Math.max(0, Math.floor(Number(draftQty[item.productId] ?? item.qty)))
        : Number(item.qty || 0),
    })) || []
  const previewItemCount = previewItems.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0,
  )
  const previewTotalAmount = previewItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0,
  )

  function confirmCancel(record: OrderItem) {
    Modal.confirm({
      title: `取消订单 ${record.orderNo}`,
      content: '取消后该订单将不再计入下单统计，确认继续？',
      okText: '确认取消',
      cancelText: '返回',
      onOk: async () => {
        try {
          await api.orderCancel(record.orderNo)
          message.success('订单已取消')
          setDetail(null)
          await load()
        } catch (err) {
          message.error(err instanceof Error ? err.message : '取消失败')
        }
      },
    })
  }

  async function openPrint(orderNo: string) {
    setPrintOrderNo(orderNo)
    setCopies(1)
    setPrintLoading(true)
    try {
      const res = await api.printerList({ page: 1, pageSize: 100 })
      setPrinters(res.list)
      const first = res.list.find((p) => p.online)
      setSelectedPrinterIds(first ? [first.id] : [])
      setPrintOpen(true)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载打印机失败')
    } finally {
      setPrintLoading(false)
    }
  }

  function togglePrinter(id: string) {
    setSelectedPrinterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function confirmPrint() {
    if (!selectedPrinterIds.length) {
      message.warning('请选择至少一台打印机')
      return
    }
    setPrintLoading(true)
    try {
      const res = await api.printSend({
        orderNo: printOrderNo,
        printerIds: selectedPrinterIds,
        copies,
      })
      if (res.failed) {
        message.warning(res.errMsg || `${res.sent} 台成功，${res.failed} 台失败`)
      } else {
        message.success('打印任务已发送')
      }
      setPrintOpen(false)
      if (detail && detail.order.orderNo === printOrderNo) {
        await openDetail(printOrderNo)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '打印失败')
    } finally {
      setPrintLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="订单管理"
        subtitle="按门店、日期和状态查看全部门店订单。"
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={exportOrdersExcel}
            >
              导出 Excel
            </Button>
            <Button
              icon={<PrinterOutlined />}
              loading={voucherLoading}
              disabled={selectedOrderKeys.length === 0}
              onClick={() => printOrderVouchers(selectedOrderKeys.map(String))}
            >
              打印凭证
              {selectedOrderKeys.length ? `（${selectedOrderKeys.length}）` : ''}
            </Button>
          </Space>
        }
      />
      <div className="filter-bar">
        <Input
          allowClear
          placeholder="搜索订单号"
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
          value={filters.keyword}
          onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
        />
        <Select
          allowClear
          placeholder="全部门店"
          style={{ width: 180 }}
          value={filters.storeId || undefined}
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(value) => setFilters((f) => ({ ...f, storeId: value || '' }))}
        />
        <Select
          allowClear
          placeholder="全部状态"
          style={{ width: 130 }}
          value={filters.status || undefined}
          options={[
            { value: '已下单', label: '已下单' },
            { value: '已取消', label: '已取消' },
          ]}
          onChange={(value) => setFilters((f) => ({ ...f, status: value || '' }))}
        />
        <DatePicker.RangePicker
          value={filters.range}
          onChange={(value) => setFilters((f) => ({ ...f, range: value as [Dayjs, Dayjs] | null }))}
        />
        <Button type="primary" onClick={load}>
          查询
        </Button>
      </div>
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<OrderItem>
            rowKey="orderNo"
            dataSource={list}
            rowSelection={{
              selectedRowKeys: selectedOrderKeys,
              preserveSelectedRowKeys: false,
              onChange: setSelectedOrderKeys,
              getCheckboxProps: (record) => ({
                disabled: record.status !== '已下单',
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
                setSelectedOrderKeys([])
              },
            }}
            columns={[
              { title: '订单号', dataIndex: 'orderNo', width: 170 },
              { title: '门店', dataIndex: 'storeName', width: 150 },
              { title: '下单时间', dataIndex: 'time', width: 170 },
              { title: '商品件数', dataIndex: 'itemCount', width: 100, align: 'right' },
              {
                title: '金额',
                dataIndex: 'totalAmount',
                width: 120,
                align: 'right',
                render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (status: string) => (
                  <Tag color={status === '已下单' ? 'orange' : 'default'}>{status}</Tag>
                ),
              },
              {
                title: '操作',
                width: 330,
                render: (_, record) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => openDetail(record.orderNo)}
                    >
                      查看
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<PrinterOutlined />}
                      disabled={record.status !== '已下单' || voucherLoading}
                      onClick={() => printOrderVouchers([record.orderNo])}
                    >
                      打印凭证
                    </Button>
                    {record.status === '已下单' ? (
                      <>
                        <Button
                          type="link"
                          size="small"
                          icon={<PrinterOutlined />}
                          onClick={() => openPrint(record.orderNo)}
                        >
                          打印小票
                        </Button>
                        <Button type="link" size="small" danger onClick={() => confirmCancel(record)}>
                          取消
                        </Button>
                      </>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      </div>
      <Modal
        title="订单详情"
        width={640}
        open={!!detail}
        onCancel={closeDetail}
        footer={
          editingQty ? (
            <Space>
              <Button
                icon={<PrinterOutlined />}
                disabled={qtySaving}
                onClick={() => saveQtyEdits(true)}
              >
                打印凭证
              </Button>
              <Button onClick={cancelQtyEdit} disabled={qtySaving}>
                取消
              </Button>
              <Button
                type="primary"
                loading={qtySaving}
                onClick={() => saveQtyEdits()}
              >
                保存修改
              </Button>
            </Space>
          ) : null
        }
        maskClosable={false}
        keyboard={false}
        loading={detailLoading}
      >
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="订单号">{detail.order.orderNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={detail.order.status === '已下单' ? 'orange' : 'default'}>
                  {detail.order.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="门店">{detail.order.storeName}</Descriptions.Item>
              <Descriptions.Item label="下单时间">{detail.order.time}</Descriptions.Item>
              <Descriptions.Item label={editingQty ? '修改后件数' : '商品件数'}>
                {editingQty ? previewItemCount : detail.order.itemCount}
              </Descriptions.Item>
              <Descriptions.Item label={editingQty ? '修改后金额' : '合计金额'}>
                ¥
                {Number(
                  editingQty ? previewTotalAmount : detail.order.totalAmount || 0,
                ).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {detail.order.remark || '无'}
              </Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="productId"
              size="small"
              pagination={false}
              dataSource={detail.items}
              title={() => (
                <Space
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <strong>商品明细</strong>
                  {detail.order.status === '已下单' && !editingQty ? (
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={startQtyEdit}
                    >
                      修改数量
                    </Button>
                  ) : null}
                </Space>
              )}
              columns={[
                {
                  title: '序号',
                  width: 56,
                  align: 'center',
                  render: (_, __, index) => index + 1,
                },
                { title: '商品', dataIndex: 'productName' },
                { title: '规格', dataIndex: 'spec' },
                {
                  title: '单价',
                  dataIndex: 'price',
                  align: 'right',
                  render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
                },
                {
                  title: '数量',
                  dataIndex: 'qty',
                  align: 'right',
                  render: (value: number, record) =>
                    editingQty ? (
                      <InputNumber
                        ref={(node) => {
                          qtyInputRefs.current[record.productId] = node
                        }}
                        min={0}
                        precision={0}
                        step={1}
                        keyboard={false}
                        value={draftQty[record.productId] ?? Number(value || 0)}
                        onChange={(nextValue) =>
                          setDraftQty((current) => ({
                            ...current,
                            [record.productId]: Math.max(
                              0,
                              Math.floor(Number(nextValue) || 0),
                            ),
                          }))
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key !== 'ArrowUp' &&
                            event.key !== 'ArrowDown' &&
                            event.key !== 'Enter'
                          ) {
                            return
                          }
                          event.preventDefault()
                          const currentIndex = detail.items.findIndex(
                            (item) => item.productId === record.productId,
                          )
                          const targetIndex =
                            event.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1
                          if (
                            currentIndex < 0 ||
                            targetIndex < 0 ||
                            targetIndex >= detail.items.length
                          ) {
                            return
                          }
                          qtyInputRefs.current[detail.items[targetIndex].productId]?.focus()
                        }}
                        style={{ width: 76 }}
                      />
                    ) : (
                      value
                    ),
                },
                {
                  title: '小计',
                  dataIndex: 'subtotal',
                  align: 'right',
                  render: (value: number, record) => {
                    const qty = editingQty
                      ? Math.max(
                          0,
                          Math.floor(
                            Number(draftQty[record.productId] ?? record.qty) || 0,
                          ),
                        )
                      : Number(record.qty || 0)
                    return `¥${(Number(record.price || 0) * qty).toFixed(2)}`
                  },
                },
              ]}
            />
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.printLogs}
              title={() => <strong>打印记录</strong>}
              columns={[
                { title: '打印机', dataIndex: 'printerName' },
                { title: '份数', dataIndex: 'copies', align: 'right' },
                {
                  title: '时间',
                  dataIndex: 'createdAt',
                  render: (value) =>
                    value ? dayjs(String(value)).format('YYYY-MM-DD HH:mm') : '-',
                },
              ]}
            />
          </Space>
        ) : null}
      </Modal>
      <Modal
        title="打印订单"
        open={printOpen}
        onCancel={() => setPrintOpen(false)}
        onOk={confirmPrint}
        confirmLoading={printLoading}
        okText="发送打印"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <strong>选择打印机</strong>
          <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
            {printers.length ? (
              printers.map((printer) => (
                <Checkbox
                  key={printer.id}
                  checked={selectedPrinterIds.includes(printer.id)}
                  disabled={!printer.online}
                  onChange={() => togglePrinter(printer.id)}
                >
                  {printer.name}
                  <span style={{ color: '#9ca3af', marginLeft: 8 }}>
                    {printer.storeName} · {printer.status}
                  </span>
                </Checkbox>
              ))
            ) : (
              <span style={{ color: '#9ca3af' }}>暂无打印机</span>
            )}
          </Space>
        </div>
        <div>
          <strong>打印份数</strong>
          <InputNumber
            min={1}
            max={9}
            value={copies}
            onChange={(value) => setCopies(Number(value) || 1)}
            style={{ marginLeft: 12, width: 120 }}
          />
        </div>
      </Modal>
      <OrderVoucherPrint
        open={voucherOpen}
        groups={voucherGroups}
        onClose={() => setVoucherOpen(false)}
      />
    </>
  )
}
