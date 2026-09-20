import { createPortal } from 'react-dom'
import { Button, Space } from 'antd'
import { CloseOutlined, PrinterOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { DepartmentLogItem } from '../types'

export interface PurchaseVoucherGroup {
  warehouseName: string
  date: string
  logType: string
  creator?: string
  inspector?: string
  departmentManager?: string
  logs: DepartmentLogItem[]
}

interface PurchaseVoucherPrintProps {
  open: boolean
  groups: PurchaseVoucherGroup[]
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  daily: '日常采购单',
  direct: '直拨单',
  purchase_return: '采购退货单',
}

const ITEMS_PER_PAGE = 5

function voucherNo(group: PurchaseVoucherGroup, pageIndex: number) {
  const prefix =
    group.logType === 'direct' ? 'ZB' : group.logType === 'daily' ? 'CG' : 'TH'
  return `${prefix}-${group.date}-${String(pageIndex + 1).padStart(4, '0')}`
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

export default function PurchaseVoucherPrint({
  open,
  groups,
  onClose,
}: PurchaseVoucherPrintProps) {
  if (!open) return null

  const pages = groups.flatMap((group) => {
    const chunks = chunk(group.logs, ITEMS_PER_PAGE)
    return chunks.map((logs, pageIndex) => ({
      ...group,
      logs,
      pageIndex,
      pageCount: chunks.length,
    }))
  })
  const totalLogs = groups.reduce((sum, group) => sum + group.logs.length, 0)

  return createPortal(
    <div className="stock-voucher-overlay">
      <div className="stock-voucher-toolbar">
        <div>
          <strong>采购流水凭证</strong>
          <span className="stock-voucher-toolbar-desc">
            {totalLogs > 1
              ? `共 ${totalLogs} 条采购记录，${pages.length} 张凭证`
              : '单条采购记录'}
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
          const totalQty = page.logs.reduce(
            (sum, log) => sum + Number(log.qty || 0),
            0,
          )
          const totalAmount = page.logs.reduce(
            (sum, log) => sum + Number(log.amount || 0),
            0,
          )
          return (
            <div
              className="stock-voucher-page"
              key={`${page.warehouseName}-${page.date}-${pageIndex}-${page.pageIndex}`}
            >
              <div className="stock-voucher-title-row">
                <h2 className="stock-voucher-title">
                  {TYPE_LABELS[page.logType] || '采购单'}
                </h2>
                <span className="stock-voucher-no">
                  No: {voucherNo(page, page.pageIndex)}
                  {page.pageCount > 1 ? `  ${page.pageIndex + 1}/${page.pageCount}` : ''}
                </span>
              </div>
              <div className="stock-voucher-meta">
                <span>供应商：{page.logs[0]?.supplier || '-'}</span>
                <span>收货部门：{page.warehouseName || '默认'}</span>
                <span>制表日期：{page.date}</span>
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
                    <tr key={log.id || `${page.date}-${index}`}>
                      <td className="stock-voucher-center">{index + 1}</td>
                      <td>{log.productName}</td>
                      <td className="stock-voucher-center">{log.unit || '件'}</td>
                      <td className="stock-voucher-center">
                        {Number(log.qty || 0)}
                      </td>
                      <td className="stock-voucher-right">
                        {Number(log.price || 0).toFixed(2)}
                      </td>
                      <td className="stock-voucher-right">
                        {Number(log.amount || 0).toFixed(2)}
                      </td>
                      <td>{log.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
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
              </table>
              <div className="stock-voucher-sign">
                <span>供应商：______________</span>
                <span>部门主管：{page.departmentManager || '______________'}</span>
              </div>
              <div className="stock-voucher-sign stock-voucher-sign-second">
                <span>验货人：{page.inspector || '______________'}</span>
                <span>制单人：{page.creator || page.logs[0]?.operator || '______________'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
