import { createPortal } from 'react-dom'
import { Button, Space } from 'antd'
import { CloseOutlined, PrinterOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { DepartmentLogItem } from '../types'

export interface PurchaseVoucherGroup {
  warehouseName: string
  date: string
  logs: DepartmentLogItem[]
}

interface PurchaseVoucherPrintProps {
  open: boolean
  groups: PurchaseVoucherGroup[]
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  daily: '日常采购',
  direct: '直拨进货',
  purchase_return: '采购退货',
}

const ITEMS_PER_PAGE = 5

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
              <h2 className="stock-voucher-title">采购流水凭证</h2>
              <div className="stock-voucher-subtitle">
                {totalLogs > 1 ? '（汇总）' : '（单条）'}
              </div>
              <div className="stock-voucher-meta">
                <span>仓库/部门：{page.warehouseName || '默认'}</span>
                <span>日期：{page.date}</span>
                <span>打印时间：{dayjs().format('YYYY-MM-DD HH:mm')}</span>
                {page.pageCount > 1 ? (
                  <span>
                    第 {page.pageIndex + 1} / {page.pageCount} 张
                  </span>
                ) : null}
              </div>
              <table className="stock-voucher-table">
                <thead>
                  <tr>
                    <th className="stock-voucher-col-index">序号</th>
                    <th>类型</th>
                    <th>商品</th>
                    <th className="stock-voucher-col-qty">数量</th>
                    <th className="stock-voucher-col-price">单价（元）</th>
                    <th className="stock-voucher-col-amount">金额（元）</th>
                    <th>供货商</th>
                    <th>操作人</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {page.logs.map((log, index) => (
                    <tr key={log.id || `${page.date}-${index}`}>
                      <td className="stock-voucher-center">{index + 1}</td>
                      <td>{TYPE_LABELS[log.logType] || log.logType}</td>
                      <td>
                        {log.productName}
                        {log.unit ? `（${log.unit}）` : ''}
                      </td>
                      <td className="stock-voucher-center">
                        {Number(log.qty || 0)}
                      </td>
                      <td className="stock-voucher-right">
                        {Number(log.price || 0).toFixed(2)}
                      </td>
                      <td className="stock-voucher-right">
                        {Number(log.amount || 0).toFixed(2)}
                      </td>
                      <td>{log.supplier || '-'}</td>
                      <td>{log.operator || '-'}</td>
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
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
              <div className="stock-voucher-note">
                本页 {page.logs.length} 条采购记录
                {page.logs.length === 1 && page.logs[0].id
                  ? `，流水号：${page.logs[0].id}`
                  : ''}
              </div>
              <div className="stock-voucher-sign">
                <span>经办人签字：______________</span>
                <span>审核人签字：______________</span>
              </div>
              <div className="stock-voucher-sign stock-voucher-sign-second">
                仓库/部门负责人签字：______________
              </div>
            </div>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
