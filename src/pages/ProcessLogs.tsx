import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Space, Spin, Table, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import type { ProcessLogItem } from '../types'

export default function ProcessLogs() {
  const [list, setList] = useState<ProcessLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.processLogList({ page, pageSize, keyword })
      setList(res.list)
      setTotal(res.total)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载加工记录失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <PageHeader title="加工记录" subtitle="查看加工后数量、损耗、操作人和时间。" />
      <div className="filter-bar">
        <Input
          allowClear
          placeholder="搜索商品"
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
          <Table<ProcessLogItem>
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
              {
                title: '加工后库存',
                dataIndex: 'processed',
                width: 120,
                render: (v: number) => <strong style={{ color: 'var(--success)' }}>{v}</strong>,
              },
              {
                title: '损耗',
                dataIndex: 'loss',
                width: 100,
                render: (v: number) => (
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{v}</span>
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
