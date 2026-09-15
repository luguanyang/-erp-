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

export default function PurchaseVoucherPrint({
  open,
  groups,
  onClose,
}: PurchaseVoucherPrintProps) {
  if (!open) return null

  const totalLogs = groups.reduce((sum, group) => sum + group.logs.length, 0)

  return createPortal(
    <div className="stock-voucher-overlay">
      <div className="stock-voucher-toolbar">
        <div>
          <strong>采购流水凭证</strong>
          <span className="stock-voucher-toolbar-desc">
            {totalLogs > 1
              ? `共 ${totalLogs} 条采购记录，${groups.length} 张凭证`
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
        {groups.map((group, groupIndex) => {
          const totalQty = group.logs.reduce(
            (sum, log) => sum + Number(log.qty || 0),
            0,
          )
          const totalAmount = group.logs.reduce(
            (sum, log) => sum + Number(log.amount || 0),
            0,
          )
          return (
            <div
              className="stock-voucher-page"
              key={`${group.warehouseName}-${group.date}-${groupIndex}`}
            >
              <h2 className="stock-voucher-title">采购流水凭证</h2>
              <div className="stock-voucher-subtitle">
                {totalLogs > 1 ? '（汇总）' : '（单条）'}
              </div>
              <div className="stock-voucher-meta">
                <span>仓库/部门：{group.warehouseName || '默认'}</span>
                <span>日期：{group.date}</span>
                <span>打印时间：{dayjs().format('YYYY-MM-DD HH:mm')}</span>
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
                  {group.logs.map((log, index) => (
                    <tr key={log.id || `${group.date}-${index}`}>
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
                共 {group.logs.length} 条采购记录
                {group.logs.length === 1 && group.logs[0].id
                  ? `，流水号：${group.logs[0].id}`
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
