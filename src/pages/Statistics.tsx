import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import dayjs, { type Dayjs } from 'dayjs'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { StatsSummary, StoreDetailData, StoreItem } from '../types'

const categoryTabs = [
  { key: 'meat', label: '荤菜' },
  { key: 'veg', label: '素菜' },
  { key: 'mat', label: '物料' },
]

export default function Statistics() {
  const [stores, setStores] = useState<StoreItem[]>([])
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [storeId, setStoreId] = useState('')
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ])
  const [loading, setLoading] = useState(false)
  const [storeDetail, setStoreDetail] = useState<StoreDetailData | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.statsProductSummary({
        storeId,
        startDate: range?.[0] ? range[0].format('YYYY-MM-DD') : '',
        endDate: range?.[1] ? range[1].format('YYYY-MM-DD') : '',
      })
      setStats(res)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载统计失败')
    } finally {
      setLoading(false)
    }
  }, [storeId, range])

  useEffect(() => {
    api
      .storeList()
      .then((res) => setStores(res.list))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openStoreDetail(productId: string) {
    try {
      const res = await api.statsProductStoreDetail({
        productId,
        startDate: range?.[0] ? range[0].format('YYYY-MM-DD') : '',
        endDate: range?.[1] ? range[1].format('YYYY-MM-DD') : '',
      })
      setStoreDetail(res)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载门店明细失败')
    }
  }

  function exportExcel() {
    if (!stats || !stats.groups.length) {
      message.warning('暂无可导出的统计数据')
      return
    }
    const rows: Array<Array<string | number>> = []
    const storeName = storeId
      ? stores.find((s) => s.id === storeId)?.name || ''
      : '全部门店'
    const startDate = range?.[0] ? range[0].format('YYYY-MM-DD') : ''
    const endDate = range?.[1] ? range[1].format('YYYY-MM-DD') : ''

    rows.push(['下单统计导出'])
    rows.push(['统计门店', storeName])
    rows.push(['统计日期', `${startDate} 至 ${endDate}`])
    rows.push(['商品种类', stats.kindCount])
    rows.push(['累计件数', stats.itemCount])
    rows.push(['订货金额', Number(stats.totalAmount || 0).toFixed(2)])
    rows.push([])
    rows.push(['分类', '商品', '规格', '累计份数', '单位'])

    stats.groups.forEach((group) => {
      group.items.forEach((item) => {
        rows.push([
          categoryTabs.find((tab) => tab.key === group.categoryKey)?.label ||
            group.categoryKey,
          item.name,
          item.spec,
          item.qty,
          item.unit,
        ])
      })
    })

    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = [
      { wch: 12 },
      { wch: 24 },
      { wch: 16 },
      { wch: 12 },
      { wch: 8 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, '下单统计')
    XLSX.writeFile(workbook, `下单统计_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
    message.success('已导出 Excel')
  }

  return (
    <>
      <PageHeader title="下单统计" subtitle="按日期和门店查看各商品累计下单份数。" />
      <div className="filter-bar">
        <Select
          allowClear
          placeholder="全部门店"
          style={{ width: 180 }}
          value={storeId || undefined}
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(value) => setStoreId(value || '')}
        />
        <DatePicker.RangePicker
          value={range}
          onChange={(value) => setRange(value as [Dayjs, Dayjs] | null)}
        />
        <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={load}>
          查询
        </Button>
        <Button icon={<DownloadOutlined />} onClick={exportExcel}>
          导出数据
        </Button>
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="panel-card">
            <Statistic title="商品种类" value={stats?.kindCount || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="panel-card">
            <Statistic title="累计件数" value={stats?.itemCount || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="panel-card">
            <Statistic
              title="订货金额"
              value={stats?.totalAmount || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#e8542e' }}
            />
          </Card>
        </Col>
      </Row>
      <div className="panel-card">
        <Tabs
          items={categoryTabs.map((tab) => {
            const group = stats?.groups.find((g) => g.categoryKey === tab.key)
            return {
              key: tab.key,
              label: tab.label,
              children: (
                <Table
                  rowKey="productId"
                  size="small"
                  dataSource={group?.items || []}
                  pagination={false}
                  locale={{ emptyText: '该分类暂无下单数据' }}
                  columns={[
                    { title: '商品', dataIndex: 'name' },
                    { title: '规格', dataIndex: 'spec' },
                    {
                      title: '累计份数',
                      dataIndex: 'qty',
                      align: 'right',
                      render: (value: number, record) => (
                        <Space>
                          <strong>{value}</strong>
                          <span style={{ color: '#9ca3af' }}>{record.unit}</span>
                        </Space>
                      ),
                    },
                    {
                      title: '操作',
                      width: 140,
                      render: (_, record) => (
                        <Button type="link" size="small" onClick={() => openStoreDetail(record.productId)}>
                          门店明细
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            }
          })}
        />
      </div>
      <Modal
        title={storeDetail ? `${storeDetail.productName} · 各门店下单份数` : '门店明细'}
        open={!!storeDetail}
        onCancel={() => setStoreDetail(null)}
        footer={null}
        width={560}
      >
        {storeDetail ? (
          <Table
            rowKey="storeId"
            size="small"
            dataSource={storeDetail.list}
            pagination={false}
            columns={[
              { title: '门店编号', dataIndex: 'storeCode', width: 120 },
              { title: '门店', dataIndex: 'storeName' },
              {
                title: '份数',
                dataIndex: 'qty',
                align: 'right',
                render: (value: number) => (
                  <Tag color={value > 0 ? 'orange' : 'default'}>{value}</Tag>
                ),
              },
            ]}
          />
        ) : null}
      </Modal>
    </>
  )
}
