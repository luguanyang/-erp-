import { createPortal } from 'react-dom'
import { Button, Space } from 'antd'
import { CloseOutlined, PrinterOutlined } from '@ant-design/icons'
import type { StoreCountDocumentDetail } from '../types'

interface StoreCountVoucherPrintProps {
  open: boolean
  data: StoreCountDocumentDetail | null
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

export default function StoreCountVoucherPrint({
  open,
  data,
  onClose,
}: StoreCountVoucherPrintProps) {
  if (!open || !data) return null
  const record = data.document
  const pages = chunk(data.items, ITEMS_PER_PAGE).map((items, pageIndex) => ({
    items,
    pageIndex,
    pageCount: Math.ceil(data.items.length / ITEMS_PER_PAGE),
  }))

  return createPortal(
    <div className="stock-voucher-overlay">
      <div className="stock-voucher-toolbar">
        <div>
          <strong>门店盘点单</strong>
          <span className="stock-voucher-toolbar-desc">
            {record.countNo} · {record.storeName}
          </span>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            打印盘点单
          </Button>
          <Button icon={<CloseOutlined />} onClick={onClose}>
            关闭
          </Button>
        </Space>
      </div>
      <div className="stock-voucher-print">
        {pages.map((page) => (
          <div className="stock-voucher-page" key={`${record.countNo}-${page.pageIndex}`}>
            <div className="stock-voucher-title-row">
              <h2 className="stock-voucher-title">门店盘点单</h2>
              <span className="stock-voucher-no">
                No: {record.countNo}
                {page.pageCount > 1
                  ? `  ${page.pageIndex + 1}/${page.pageCount}`
                  : ''}
              </span>
            </div>
            <div className="stock-voucher-meta">
              <span>门店：{record.storeName || '-'}</span>
              <span>盘点日期：{record.date || '-'}</span>
              <span>操作人：{record.operator || '-'}</span>
            </div>
            <table className="stock-voucher-table">
              <thead>
                <tr>
                  <th className="stock-voucher-col-index">序号</th>
                  <th>商品名称 / 规格</th>
                  <th className="stock-voucher-col-unit">单位</th>
                  <th className="stock-voucher-col-qty">账面数</th>
                  <th className="stock-voucher-col-price">实盘数</th>
                  <th className="stock-voucher-col-amount">差异</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((item, index) => (
                  <tr key={item.id || `${record.countNo}-${index}`}>
                    <td className="stock-voucher-center">
                      {item.lineNo || page.pageIndex * ITEMS_PER_PAGE + index + 1}
                    </td>
                    <td>
                      {item.productName}
                      {item.spec ? `（${item.spec}）` : ''}
                    </td>
                    <td className="stock-voucher-center">{item.unit || '件'}</td>
                    <td className="stock-voucher-center">{item.bookQty}</td>
                    <td className="stock-voucher-center">{item.countedQty}</td>
                    <td className="stock-voucher-center">
                      {item.diff > 0 ? `+${item.diff}` : item.diff}
                    </td>
                    <td>{item.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
              {page.pageIndex === page.pageCount - 1 ? (
                <tfoot>
                  <tr>
                    <td colSpan={3} className="stock-voucher-total-label">
                      合计
                    </td>
                    <td className="stock-voucher-center">{record.totalBookQty}</td>
                    <td className="stock-voucher-center">{record.totalCountedQty}</td>
                    <td className="stock-voucher-center">
                      {record.totalDiff > 0 ? `+${record.totalDiff}` : record.totalDiff}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
            <div className="stock-voucher-sign">
              <span>盘点人：{record.operator || '______________'}</span>
              <span>复核人：______________</span>
            </div>
            <div className="stock-voucher-sign stock-voucher-sign-second">
              <span>门店负责人：______________</span>
              <span>财务确认：______________</span>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}
