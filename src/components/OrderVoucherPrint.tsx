import { createPortal } from 'react-dom'
import { Button, Space } from 'antd'
import { CloseOutlined, PrinterOutlined } from '@ant-design/icons'
import type { OrderVoucherGroup } from '../types'

interface OrderVoucherPrintProps {
  open: boolean
  groups: OrderVoucherGroup[]
  onClose: () => void
}

const ITEMS_PER_PAGE = 5

function chunk<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

export default function OrderVoucherPrint({
  open,
  groups,
  onClose,
}: OrderVoucherPrintProps) {
  if (!open) return null

  const pages = groups.flatMap((group) => {
    const chunks = chunk(group.logs, ITEMS_PER_PAGE)
    const groupQty = group.logs.reduce(
      (sum, log) => sum + Number(log.qty || 0),
      0,
    )
    const groupAmount = group.logs.reduce(
      (sum, log) => sum + Number(log.amount || 0),
      0,
    )
    return chunks.map((logs, pageIndex) => ({
      ...group,
      logs,
      groupQty,
      groupAmount,
      pageIndex,
      pageCount: chunks.length,
    }))
  })
  const totalLogs = groups.reduce((sum, group) => sum + group.logs.length, 0)

  return createPortal(
    <div className="stock-voucher-overlay">
      <div className="stock-voucher-toolbar">
        <div>
          <strong>订单凭证</strong>
          <span className="stock-voucher-toolbar-desc">
            {totalLogs > 1
              ? `共 ${groups.length} 张订单，${pages.length} 张凭证`
              : '单张订单凭证'}
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
        {pages.map((page) => {
          const isLastPage = page.pageIndex === page.pageCount - 1
          return (
            <div
              className="stock-voucher-page"
              key={`${page.orderNo}-${page.pageIndex}`}
            >
              <div className="stock-voucher-title-row">
                <h2 className="stock-voucher-title">订货单</h2>
                <span className="stock-voucher-no">
                  No: {page.orderNo}
                  {page.pageCount > 1
                    ? `  ${page.pageIndex + 1}/${page.pageCount}`
                    : ''}
                </span>
              </div>
              <div className="stock-voucher-meta">
                <span>门店：{page.storeName || '-'}</span>
                <span>下单时间：{page.time || '-'}</span>
                <span>商品件数：{page.itemCount}</span>
              </div>
              <table className="stock-voucher-table">
                <thead>
                  <tr>
                    <th className="stock-voucher-col-index">序号</th>
                    <th>商品名称 / 规格</th>
                    <th className="stock-voucher-col-unit">单位</th>
                    <th className="stock-voucher-col-qty">数量</th>
                    <th className="stock-voucher-col-price">单价（元）</th>
                    <th className="stock-voucher-col-amount">金额（元）</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {page.logs.map((log, index) => (
                    <tr key={log.id || `${page.orderNo}-${index}`}>
                      <td className="stock-voucher-center">
                        {page.pageIndex * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td>
                        {log.productName}
                        {log.spec ? `（${log.spec}）` : ''}
                      </td>
                      <td className="stock-voucher-center">{log.unit || '件'}</td>
                      <td className="stock-voucher-center">{Number(log.qty || 0)}</td>
                      <td className="stock-voucher-right">
                        {Number(log.price || 0).toFixed(2)}
                      </td>
                      <td className="stock-voucher-right">
                        {Number(log.amount || 0).toFixed(2)}
                      </td>
                      <td>{log.remark || '-'}</td>
                    </tr>
                  ))}
                  {Array.from(
                    { length: Math.max(0, ITEMS_PER_PAGE - page.logs.length) },
                    (_, index) => (
                      <tr
                        className="stock-voucher-empty-row"
                        key={`empty-${page.orderNo}-${page.pageIndex}-${index}`}
                        aria-hidden="true"
                      >
                        <td className="stock-voucher-center">&#160;</td>
                        <td>&#160;</td>
                        <td className="stock-voucher-center">&#160;</td>
                        <td className="stock-voucher-center">&#160;</td>
                        <td className="stock-voucher-right">&#160;</td>
                        <td className="stock-voucher-right">&#160;</td>
                        <td>&#160;</td>
                      </tr>
                    ),
                  )}
                </tbody>
                {isLastPage ? (
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="stock-voucher-total-label">
                        合计
                      </td>
                      <td className="stock-voucher-center">{page.groupQty}</td>
                      <td />
                      <td className="stock-voucher-right">
                        {page.groupAmount.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
              <div className="stock-voucher-sign">
                <span>门店签收：______________</span>
                <span>制单人：{page.operator || '______________'}</span>
              </div>
              <div className="stock-voucher-sign stock-voucher-sign-second">
                <span>核单人：______________</span>
                <span>仓库确认：______________</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
