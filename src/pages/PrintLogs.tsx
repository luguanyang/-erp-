import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Select, Space, Spin, Table, Tag, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { PrintLogItem } from '../types'

export default function PrintLogs() {
  const [list, setList] = useState<PrintLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ keyword: '', status: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.printLogList({ page, pageSize, ...filters })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载打印记录失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <PageHeader title="打印记录" subtitle="查看订单打印历史和状态。" />
      <div className="filter-bar">
        <Input
          allowClear
          placeholder="搜索订单号"
          prefix={<SearchOutlined />}
          style={{ width: 220 }}
          value={filters.keyword}
          onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
        />
        <Select
          allowClear
          placeholder="全部状态"
          style={{ width: 130 }}
          value={filters.status || undefined}
          options={[
            { value: '成功', label: '成功' },
            { value: '失败', label: '失败' },
          ]}
          onChange={(value) => setFilters((f) => ({ ...f, status: value || '' }))}
        />
        <Button type="primary" onClick={load}>
          查询
        </Button>
      </div>
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<PrintLogItem>
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
              { title: '订单号', dataIndex: 'orderNo', width: 180 },
              { title: '打印机', dataIndex: 'printerName' },
              { title: '门店', dataIndex: 'storeName', width: 160 },
              { title: '份数', dataIndex: 'copies', width: 80, align: 'right' },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (status: string) => (
                  <Tag color={status === '成功' ? 'green' : 'red'}>{status}</Tag>
                ),
              },
              {
                title: '打印时间',
                dataIndex: 'createdAt',
                width: 180,
                render: (value) => (value ? dayjs(String(value)).format('YYYY-MM-DD HH:mm:ss') : '-'),
              },
            ]}
          />
        </Spin>
      </div>
    </>
  )
}
