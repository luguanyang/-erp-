import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Button, Space } from 'antd'
import { CloseOutlined, PrinterOutlined } from '@ant-design/icons'
import { mergeVoucherTemplate } from '../printTemplateDefaults'
import type {
  OrderVoucherGroup,
  OrderVoucherLine,
  PrintTemplate,
  VoucherLabels,
  VoucherSizes,
  VoucherSpacing,
} from '../types'

interface OrderVoucherPrintProps {
  open: boolean
  groups: OrderVoucherGroup[]
  template?: PrintTemplate
  onClose: () => void
}

export interface OrderVoucherPageData {
  orderNo: string
  storeName: string
  time: string
  itemCount: number
  operator: string
  logs: OrderVoucherLine[]
  groupQty: number
  groupAmount: number
  pageIndex: number
  pageCount: number
}

type VoucherStyle = CSSProperties & {
  '--voucher-header-size'?: string
  '--voucher-title-size'?: string
  '--voucher-no-size'?: string
  '--voucher-meta-size'?: string
  '--voucher-table-head-size'?: string
  '--voucher-table-body-size'?: string
  '--voucher-table-total-size'?: string
  '--voucher-sign-size'?: string
  '--voucher-footer-size'?: string
  '--voucher-title-gap'?: string
  '--voucher-meta-gap'?: string
  '--voucher-row-height'?: string
  '--voucher-cell-padding'?: string
  '--voucher-line-height'?: number
  '--voucher-sign-gap'?: string
}

type VoucherContentStyle = CSSProperties & {
  '--voucher-fit-scale'?: number
}

const ITEMS_PER_PAGE = 5
const VOUCHERS_PER_SHEET = 3
function chunk<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function resolveTemplate(template?: PrintTemplate) {
  const resolved = mergeVoucherTemplate(template)
  const labels = resolved.voucherLabels as VoucherLabels
  const sizes = resolved.voucherSizes as VoucherSizes
  const spacing = resolved.voucherSpacing as VoucherSpacing
  return { labels, sizes, spacing }
}

function voucherStyle(template?: PrintTemplate): VoucherStyle {
  const { sizes, spacing } = resolveTemplate(template)
  return {
    '--voucher-header-size': `${sizes.header}pt`,
    '--voucher-title-size': `${sizes.title}pt`,
    '--voucher-no-size': `${sizes.no}pt`,
    '--voucher-meta-size': `${sizes.meta}pt`,
    '--voucher-table-head-size': `${sizes.tableHead}pt`,
    '--voucher-table-body-size': `${sizes.tableBody}pt`,
    '--voucher-table-total-size': `${sizes.tableTotal}pt`,
    '--voucher-sign-size': `${sizes.sign}pt`,
    '--voucher-footer-size': `${sizes.footer}pt`,
    '--voucher-title-gap': `${spacing.titleGap}mm`,
    '--voucher-meta-gap': `${spacing.metaGap}mm`,
    '--voucher-row-height': `${spacing.rowHeight}mm`,
    '--voucher-cell-padding': `${spacing.cellPadding}mm`,
    '--voucher-line-height': spacing.lineHeight,
    '--voucher-sign-gap': `${spacing.signGap}mm`,
  }
}

interface OrderVoucherPageProps {
  page: OrderVoucherPageData
  template?: PrintTemplate
}

export function OrderVoucherPage({ page, template }: OrderVoucherPageProps) {
  const { labels } = resolveTemplate(template)
  const isLastPage = page.pageIndex === page.pageCount - 1
  const pageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)

  useLayoutEffect(() => {
    const pageElement = pageRef.current
    const contentElement = contentRef.current
    if (!pageElement || !contentElement) return

    let cancelled = false
    const updateScale = () => {
      if (cancelled) return
      const style = window.getComputedStyle(pageElement)
      const paddingTop = Number.parseFloat(style.paddingTop) || 0
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0
      const availableHeight =
        pageElement.getBoundingClientRect().height - paddingTop - paddingBottom
      const contentHeight = contentElement.scrollHeight
      if (availableHeight <= 0 || contentHeight <= 0) return
      const nextScale = Math.min(1, availableHeight / contentHeight)
      setFitScale((current) =>
        Math.abs(current - nextScale) > 0.001 ? nextScale : current,
      )
    }

    updateScale()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateScale)
    observer?.observe(pageElement)
    observer?.observe(contentElement)
    window.addEventListener('resize', updateScale)
    void document.fonts?.ready.then(updateScale)

    return () => {
      cancelled = true
      observer?.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [page, template])

  return (
    <div
      ref={pageRef}
      className="stock-voucher-page"
      style={voucherStyle(template)}
    >
      <div
        ref={contentRef}
        className="stock-voucher-content"
        data-fit-scale={fitScale.toFixed(3)}
        style={{ '--voucher-fit-scale': fitScale } as VoucherContentStyle}
      >
        {template?.headerText ? (
          <div className="stock-voucher-header">{template.headerText}</div>
        ) : null}
        <div className="stock-voucher-title-row">
          <h2 className="stock-voucher-title">{template?.titleText || '订货单'}</h2>
          <span className="stock-voucher-no">
            No: {page.orderNo}
            {page.pageCount > 1 ? `  ${page.pageIndex + 1}/${page.pageCount}` : ''}
          </span>
        </div>
        <div className="stock-voucher-meta">
          <span>{labels.store}：{page.storeName || '-'}</span>
          <span>{labels.time}：{page.time || '-'}</span>
          <span>{labels.itemCount}：{page.itemCount}</span>
        </div>
        <table className="stock-voucher-table">
          <thead>
            <tr>
              <th className="stock-voucher-col-index">{labels.index}</th>
              <th>{labels.product}</th>
              <th className="stock-voucher-col-unit">{labels.unit}</th>
              <th className="stock-voucher-col-qty">{labels.qty}</th>
              <th className="stock-voucher-col-price">{labels.price}</th>
              <th className="stock-voucher-col-amount">{labels.amount}</th>
              <th>{labels.remark}</th>
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
                  {labels.total}
                </td>
                <td className="stock-voucher-center">{page.groupQty}</td>
                <td />
                <td className="stock-voucher-right">{page.groupAmount.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
        <div className="stock-voucher-sign">
          <span>{labels.signStore}：______________</span>
          <span>{labels.signMaker}：{page.operator || '______________'}</span>
        </div>
        <div className="stock-voucher-sign stock-voucher-sign-second">
          <span>{labels.signChecker}：______________</span>
          <span>{labels.signWarehouse}：______________</span>
        </div>
        {template?.footerText ? (
          <div className="stock-voucher-footer">{template.footerText}</div>
        ) : null}
      </div>
    </div>
  )
}

export default function OrderVoucherPrint({
  open,
  groups,
  template,
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
  const sheets = chunk(pages, VOUCHERS_PER_SHEET).map((sheetPages) => [
    ...sheetPages,
    ...Array<null>(Math.max(0, VOUCHERS_PER_SHEET - sheetPages.length)).fill(null),
  ])

  return createPortal(
    <div className="stock-voucher-overlay">
      <div className="stock-voucher-toolbar">
        <div>
          <strong>订单凭证</strong>
          <span className="stock-voucher-toolbar-desc">
            共 {groups.length} 张订单，{pages.length} 张凭证，{sheets.length} 张纸；
            每张纸三等分，每格一张凭证
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
        {sheets.map((sheet, sheetIndex) => {
          const firstPage = sheet[0]
          return (
            <div
              className="stock-voucher-sheet"
              key={`${firstPage?.orderNo || 'sheet'}-${firstPage?.pageIndex || 0}-${sheetIndex}`}
            >
              {sheet.map((page, slotIndex) =>
                page ? (
                  <OrderVoucherPage
                    key={`${page.orderNo}-${page.pageIndex}`}
                    page={page}
                    template={template}
                  />
                ) : (
                  <div
                    className="stock-voucher-empty-slot"
                    key={`empty-${sheetIndex}-${slotIndex}`}
                    aria-hidden="true"
                  />
                ),
              )}
            </div>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
