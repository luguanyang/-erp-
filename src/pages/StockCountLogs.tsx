import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Space, Spin, Table, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { StockCountLogItem } from '../types'

export default function StockCountLogs() {
  const [list, setList] = useState<StockCountLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.stockCountLogList({ page, pageSize, keyword })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载盘存记录失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <PageHeader title="盘存记录" subtitle="查看盘存数、盘盈/盘亏差异、操作人和时间。" />
      <div className="filter-bar">
        <Input
          allowClear
          placeholder="搜索商品或操作人"
          prefix={<SearchOutlined />}
          style={{ width: 220 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => {
            setPage(1)
            load()
          }}
        />
        <Button
          type="primary"
          onClick={() => {
            setPage(1)
            load()
          }}
        >
          查询
        </Button>
      </div>
      <div className="panel-card">
        <Spin spinning={loading}>
          <Table<StockCountLogItem>
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
              { title: '仓库', dataIndex: 'warehouseName', width: 140 },
              { title: '盘存前', dataIndex: 'stockBefore', width: 100 },
              { title: '盘存数', dataIndex: 'counted', width: 100 },
              {
                title: '差异',
                dataIndex: 'diff',
                width: 100,
                render: (v: number) => (
                  <span
                    style={{
                      fontWeight: 600,
                      color: v > 0 ? 'var(--success)' : v < 0 ? 'var(--danger)' : 'inherit',
                    }}
                  >
                    {v > 0 ? `+${v}` : v}
                  </span>
                ),
              },
              { title: '单位', dataIndex: 'unit', width: 80 },
              { title: '操作人', dataIndex: 'operator', width: 120 },
              { title: '备注', dataIndex: 'remark', ellipsis: true },
              {
                title: '时间',
                dataIndex: 'createdAt',
                width: 180,
                render: (v: string | Date) => new Date(v).toLocaleString('zh-CN'),
              },
            ]}
          />
        </Spin>
      </div>
    </>
  )
}
