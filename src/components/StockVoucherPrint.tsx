import { createPortal } from 'react-dom'
import { Button, Space } from 'antd'
import { CloseOutlined, PrinterOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { StockVoucherGroup } from '../types'

const ITEMS_PER_PAGE = 5

function chunk<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

interface StockVoucherPrintProps {
  open: boolean
  groups: StockVoucherGroup[]
  onClose: () => void
}

export default function StockVoucherPrint({
  open,
  groups,
  onClose,
}: StockVoucherPrintProps) {
  if (!open) return null

  const allLogs = groups.flatMap((group) => group.logs)
  const pages = groups.flatMap((group) => {
    const chunks = chunk(group.logs, ITEMS_PER_PAGE)
    return chunks.map((logs, pageIndex) => ({
      documentNo: group.documentNo || '',
      warehouseName: logs[0]?.warehouseName || group.warehouseName || '默认仓库',
      date: group.date || '',
      logs,
      pageIndex,
      pageCount: chunks.length,
    }))
  })
  const totalLogs = groups.reduce((sum, group) => sum + group.logs.length, 0)
  const totalQty = allLogs.reduce((sum, log) => sum + Number(log.qty || 0), 0)
  const totalAmount = allLogs.reduce(
    (sum, log) => sum + Number(log.price || 0) * Number(log.qty || 0),
    0,
  )

  return createPortal(
    <div className="stock-voucher-overlay">
      <div className="stock-voucher-toolbar">
        <div>
          <strong>入库凭证</strong>
          <span className="stock-voucher-toolbar-desc">
            {totalLogs > 1
              ? `共 ${totalLogs} 条入库记录，${pages.length} 张凭证`
              : '单条入库记录'}
          </span>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            打印凭证
          </Button>
          <Button icon={<CloseOutlined />} onClick={onClose}>
            关闭
          </Button>
        </Space>
      </div>
      <div className="stock-voucher-print">
        {pages.map((page, pageIndex) => {
          const globalStart = pages
            .slice(0, pageIndex)
            .reduce((sum, item) => sum + item.logs.length, 0)
          return (
            <div
              className="stock-voucher-page"
              key={`${page.warehouseName}-${page.date}-${pageIndex}-${page.pageIndex}`}
            >
              <div className="stock-voucher-title-row">
                <h2 className="stock-voucher-title">入库单</h2>
                <span className="stock-voucher-no">
                  No:{' '}
                  {page.documentNo ||
                    `RK-${page.date}-${String(page.pageIndex + 1).padStart(4, '0')}`}
                  {page.pageCount > 1 ? `  ${page.pageIndex + 1}/${page.pageCount}` : ''}
                </span>
              </div>
              <div className="stock-voucher-meta">
                <span>申报人：{page.logs[0]?.inboundBy || '-'}</span>
                <span>仓库：{page.warehouseName || '默认仓库'}</span>
                <span>制表日期：{page.date}</span>
              </div>
              <table className="stock-voucher-table">
                <thead>
                  <tr>
                    <th className="stock-voucher-col-index">序号</th>
                    <th>商品 / 规格</th>
                    <th className="stock-voucher-col-unit">单位</th>
                    <th className="stock-voucher-col-qty">数量</th>
                    <th className="stock-voucher-col-price">单价（元）</th>
                    <th className="stock-voucher-col-amount">金额（元）</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {page.logs.map((log, index) => {
                    const amount = Number(log.price || 0) * Number(log.qty || 0)
                    return (
                      <tr key={log.id || `${page.date}-${index}`}>
                        <td className="stock-voucher-center">{globalStart + index + 1}</td>
                        <td>
                          {log.productName}
                          {log.spec ? `（${log.spec}）` : ''}
                        </td>
                        <td className="stock-voucher-center">{log.unit || '件'}</td>
                        <td className="stock-voucher-center">
                          {Number(log.qty || 0)}
                        </td>
                        <td className="stock-voucher-right">
                          {Number(log.price || 0).toFixed(2)}
                        </td>
                        <td className="stock-voucher-right">
                          {amount.toFixed(2)}
                        </td>
                        <td>{log.reason || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                {page.pageIndex === page.pageCount - 1 ? (
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="stock-voucher-total-label">
                        合计
                      </td>
                      <td className="stock-voucher-center">{totalQty}</td>
                      <td />
                      <td className="stock-voucher-right">
                        {totalAmount.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
              <div className="stock-voucher-sign">
                <span>申报人：{page.logs[0]?.inboundBy || '______________'}</span>
                <span>仓库负责人：______________</span>
              </div>
              <div className="stock-voucher-sign stock-voucher-sign-second">
                <span>验货人：______________</span>
                <span>制单人：{page.logs[0]?.operatorName || '______________'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
