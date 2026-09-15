import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
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
import { EyeOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { OrderDetailData, OrderItem, PrinterItem, StoreItem } from '../types'

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
  }, [filters])

  async function openDetail(orderNo: string) {
    setDetailLoading(true)
    try {
      const res = await api.orderDetail(orderNo)
      setDetail(res)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载订单详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

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
                width: 230,
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
                    {record.status === '已下单' ? (
                      <>
                        <Button
                          type="link"
                          size="small"
                          icon={<PrinterOutlined />}
                          onClick={() => openPrint(record.orderNo)}
                        >
                          打印
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
      <Drawer
        title="订单详情"
        width={640}
        open={!!detail}
        onClose={() => setDetail(null)}
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
              <Descriptions.Item label="商品件数">{detail.order.itemCount}</Descriptions.Item>
              <Descriptions.Item label="合计金额">
                ¥{Number(detail.order.totalAmount || 0).toFixed(2)}
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
              title={() => <strong>商品明细</strong>}
              columns={[
                { title: '商品', dataIndex: 'productName' },
                { title: '规格', dataIndex: 'spec' },
                {
                  title: '单价',
                  dataIndex: 'price',
                  align: 'right',
                  render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
                },
                { title: '数量', dataIndex: 'qty', align: 'right' },
                {
                  title: '小计',
                  dataIndex: 'subtotal',
                  align: 'right',
                  render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
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
      </Drawer>
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
    </>
  )
}
