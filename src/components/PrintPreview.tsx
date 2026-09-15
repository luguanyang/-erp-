import type { PrintTemplate } from '../types'

interface PrintPreviewProps {
  type: 'thermal' | 'label'
  template?: PrintTemplate
  height?: number
}

const sample = {
  order: {
    orderNo: 'DD202608180001',
    time: '2026-08-18 09:30',
    itemCount: 3,
    totalAmount: 123.5,
    remark: '示例备注：请尽快配送',
  },
  items: [
    {
      productName: '红烧五花肉',
      spec: '1 斤',
      price: 38.5,
      qty: 2,
      subtotal: 77,
      unit: '斤',
      categoryName: '荤菜',
      categorySort: 0,
      storageWarehouseName: '冷库1号',
    },
    {
      productName: '时令绿叶菜',
      spec: '0.8 斤',
      price: 8.5,
      qty: 4,
      subtotal: 34,
      unit: '斤',
      categoryName: '素菜',
      categorySort: 1,
    },
    {
      productName: '一次性餐盒',
      spec: '650ml / 只',
      price: 1.25,
      qty: 10,
      subtotal: 12.5,
      unit: '只',
      categoryName: '物料',
      categorySort: 2,
    },
  ],
  store: { name: '北京朝阳店' },
}

const LABEL_FONT_CODE = 12
const LABEL_BASE_CHAR_DOTS = 24
const LABEL_MARGIN_MM = 2
const LABEL_DOTS_PER_MM = 8

function labelFontConfig(size: number, field?: string) {
  const num = Math.max(8, Math.min(48, Number(size) || 12))
  let w = 1
  let h = 1
  if (field === 'time') {
    if (num >= 33) {
      h = 4
    } else if (num >= 25) {
      h = 3
    } else if (num >= 17) {
      h = 2
    }
    return {
      font: LABEL_FONT_CODE,
      w,
      h,
      charWidthDots: LABEL_BASE_CHAR_DOTS * w,
      charHeightDots: LABEL_BASE_CHAR_DOTS * h,
    }
  }
  if (num >= 33) {
    w = 2
    h = 2
  } else if (num >= 25) {
    w = 2
    h = 2
  } else if (num >= 17) {
    h = 2
  }
  return {
    font: LABEL_FONT_CODE,
    w,
    h,
    charWidthDots: LABEL_BASE_CHAR_DOTS * w,
    charHeightDots: LABEL_BASE_CHAR_DOTS * h,
  }
}

function fitLabelLine(text: string, size: number, labelWidth: number, field?: string) {
  const config = labelFontConfig(size, field)
  const availableWidthDots =
    labelWidth * LABEL_DOTS_PER_MM - LABEL_MARGIN_MM * 2 * LABEL_DOTS_PER_MM
  const maxChars = Math.max(1, Math.floor(availableWidthDots / config.charWidthDots))
  if (text.length > maxChars && config.w > 1) {
    const narrow = {
      ...config,
      w: 1,
      charWidthDots: LABEL_BASE_CHAR_DOTS,
    }
    const narrowMaxChars = Math.max(
      1,
      Math.floor(availableWidthDots / narrow.charWidthDots),
    )
    if (text.length <= narrowMaxChars) {
      return { text, ...narrow }
    }
    const compact = labelFontConfig(21, field)
    const compactMaxChars = Math.max(
      1,
      Math.floor(availableWidthDots / compact.charWidthDots),
    )
    if (text.length <= compactMaxChars) {
      return { text, ...compact }
    }
  }
  return { text: text.slice(0, maxChars), ...config }
}

const LABEL_FIELD_PRIORITY: Record<string, number> = {
  name: 1,
  qty: 2,
  storage: 3,
  store: 4,
  title: 5,
  header: 6,
  price: 7,
  subtotal: 8,
  orderNo: 9,
  time: 10,
  remark: 11,
  footer: 12,
}

function buildThermalLines(template: PrintTemplate) {
  const lines: Array<{ text: string; field: string }> = []
  const push = (text: string, field: string) => {
    if (text !== '') lines.push({ text, field })
  }
  if (template.showStore) {
    push(`门店：${sample.store.name}`, 'store')
  } else if (template.headerText) {
    push(template.headerText, 'header')
  }
  if (template.titleText) push(template.titleText, 'title')
  if (template.separator) lines.push({ text: template.separator, field: '' })
  if (template.showOrderNo) push(`订单号：${sample.order.orderNo}`, 'orderNo')
  if (template.showTime) push(`下单时间：${sample.order.time}`, 'time')
  if (template.showRemark && sample.order.remark) push(`备注：${sample.order.remark}`, 'remark')
  if (template.separator) lines.push({ text: template.separator, field: '' })
  const head = ['名称']
  if (template.showUnit) head.push('单位')
  if (template.showPrice) head.push('单价')
  if (template.showSubtotal) head.push('金额')
  push(head.join(' '), 'head')
  const sizes = template.thermalSizes || {}
  const shouldSplit = ['name', 'qty', 'price', 'subtotal'].some(
    (field) => Number(sizes[field] || 12) >= 17,
  )
  const groups: Array<{
    key: string
    name: string
    sort: number
    items: Array<(typeof sample.items)[number]>
  }> = []
  const groupMap: Record<string, (typeof groups)[number]> = {}
  sample.items.forEach((item, rawIndex) => {
    const key = String(item.categoryName || '')
    if (!groupMap[key]) {
      const sort = item.categorySort !== undefined ? Number(item.categorySort) : rawIndex
      const group = { key, name: item.categoryName || '', sort, items: [] as Array<(typeof sample.items)[number]> }
      groupMap[key] = group
      groups.push(group)
    }
    groupMap[key].items.push(item)
  })
  groups.sort((a, b) => a.sort - b.sort)
  let itemIndex = 0
  groups.forEach((group) => {
    if (template.showCategory && group.name) {
      lines.push({ text: `【${group.name}】`, field: 'category' })
    }
    group.items.forEach((item) => {
      itemIndex += 1
      const name = `${item.productName}${item.spec ? `(${item.spec})` : ''}`
      const itemName = template.showItemIndex ? `${itemIndex}. ${name}` : name
      if (shouldSplit) {
        const qtyText = `${Number(item.qty || 0)}${template.showUnit && item.unit ? ` ${item.unit}` : ''}`
        push(qtyText ? `${itemName} ${qtyText}` : itemName, 'name')
        if (template.showPrice) push(`单价：¥${Number(item.price || 0).toFixed(2)}`, 'price')
        if (template.showSubtotal) push(`小计：¥${Number(item.subtotal || 0).toFixed(2)}`, 'subtotal')
      } else {
        const parts = [itemName, Number(item.qty || 0)]
        if (template.showUnit) parts.push(item.unit || '')
        if (template.showPrice) parts.push(Number(item.price || 0).toFixed(2))
        if (template.showSubtotal) parts.push(Number(item.subtotal || 0).toFixed(2))
        push(parts.join(' '), 'name')
      }
      if (template.showStorage) {
        push(`暂存：${item.storageWarehouseName || ''}`, 'storage')
      }
      if (Number(template.itemGap || 0) > 0 && itemIndex < sample.items.length) {
        const gapLines = Math.min(5, Math.max(0, Number(template.itemGap || 0)))
        for (let i = 0; i < gapLines; i += 1) {
          lines.push({ text: '', field: '' })
        }
      }
    })
  })
  if (template.separator) lines.push({ text: template.separator, field: '' })
  if (template.showTotal) {
    push(`共 ${sample.order.itemCount} 项，合计：¥${Number(sample.order.totalAmount).toFixed(2)}`, 'total')
  }
  if (template.footerText) push(template.footerText, 'footer')
  return lines
}

function thermalLineStyle(
  line: { text: string; field: string },
  template: PrintTemplate,
): Record<string, string | number> {
  const size = Math.max(8, Math.min(48, Number((template.thermalSizes || {})[line.field] || 12)))
  const style: Record<string, string | number> = {}
  const displaySize = size >= 17 ? Math.min(24, size) : size
  style.fontSize = displaySize
  if (size >= 17) {
    style.fontWeight = 700
    // 热敏放大档位为等比放大，不模拟加高/加宽，避免预览出现扁字。
    style.letterSpacing = 0
  }
  if (
    template.align === 'center' &&
    (line.field === 'header' ||
      line.field === 'title' ||
      line.field === 'footer' ||
      line.field === 'store' ||
      line.field === 'category')
  ) {
    style.textAlign = 'center'
  }
  return style
}

function buildSingleLabelLines(template: PrintTemplate, item: (typeof sample.items)[number]) {
  const lines: Array<{ text: string; field: string }> = []
  if (template.showStore) {
    lines.push({ text: `门店：${sample.store.name}`, field: 'store' })
  } else if (template.headerText) {
    lines.push({ text: template.headerText, field: 'header' })
  }
  if (template.titleText) lines.push({ text: template.titleText, field: 'title' })
  const name = `${item.productName}${item.spec ? `(${item.spec})` : ''}`
  lines.push({ text: name, field: 'name' })
  lines.push({ text: `数量：${Number(item.qty || 0)}${item.unit || ''}`, field: 'qty' })
  if (template.showStorage) {
    lines.push({ text: `暂存：${item.storageWarehouseName || ''}`, field: 'storage' })
  }
  if (template.showPrice) lines.push({ text: `单价：¥${Number(item.price || 0).toFixed(2)}`, field: 'price' })
  if (template.showSubtotal) lines.push({ text: `小计：¥${Number(item.subtotal || 0).toFixed(2)}`, field: 'subtotal' })
  if (template.showOrderNo) lines.push({ text: `订单号：${sample.order.orderNo}`, field: 'orderNo' })
  if (template.showRemark && sample.order.remark) lines.push({ text: `备注：${sample.order.remark}`, field: 'remark' })
  if (template.footerText) lines.push({ text: template.footerText, field: 'footer' })
  if (template.showTime) {
    const orderDate = String(sample.order.time || '').slice(0, 10) || String(sample.order.time || '')
    if (orderDate) lines.push({ text: `日期：${orderDate}`, field: 'time' })
  }
  return lines
}

interface SizedLabelLine {
  text: string
  field: string
  index: number
  priority: number
  lineHeightMm: number
  font: number
  w: number
  h: number
  charWidthDots: number
  charHeightDots: number
}

function buildLabelRenderLines(
  template: PrintTemplate,
  item: (typeof sample.items)[number],
  pxPerMm: number,
) {
  const lines = buildSingleLabelLines(template, item)
  const labelWidth = Math.max(20, template.labelWidth || 60)
  const labelHeight = Math.max(20, template.labelHeight || 40)
  const availableHeightMm = labelHeight - LABEL_MARGIN_MM * 2
  const originalLineGap = Number(template.lineGap || 0)
  const sized = lines.map((line, index) => {
    const size =
      Number((template.fontSizes || {})[line.field] || template.fontSize || 12)
    const config = fitLabelLine(line.text, size, labelWidth, line.field)
    return {
      ...line,
      ...config,
      index,
      priority: LABEL_FIELD_PRIORITY[line.field] || 99,
    }
  })
  const essentialFields = new Set(['name', 'qty', 'storage'])
  if (template.showTime) essentialFields.add('time')
  const protectedLargeFields = new Set(['name', 'qty', 'time', 'store'])
  const pickWithGap = (lineGap: number) => {
    const next: SizedLabelLine[] = []
    let used = 0
    sized
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .forEach((line) => {
        const lineHeightMm = line.charHeightDots / LABEL_DOTS_PER_MM + lineGap * 0.2
        if (!essentialFields.has(line.field) && used + lineHeightMm > availableHeightMm) {
          return
        }
        next.push({ ...line, lineHeightMm })
        used += lineHeightMm
      })
    return { next, used }
  }
  const fitGapFor = (pickedLines: SizedLabelLine[]) => {
    for (let gap = originalLineGap; gap >= 0; gap -= 1) {
      const total = pickedLines.reduce(
        (sum, line) => sum + line.charHeightDots / LABEL_DOTS_PER_MM + gap * 0.2,
        0,
      )
      if (total <= availableHeightMm) return gap
    }
    return 0
  }
  let lineGap = originalLineGap
  let selection = pickWithGap(lineGap)
  if (selection.used > availableHeightMm) {
    const compactable = selection.next
      .filter((line) => !protectedLargeFields.has(line.field))
      .sort((a, b) => b.priority - a.priority)
    for (const line of compactable) {
      if (selection.used <= availableHeightMm) break
      const compact = fitLabelLine(line.text, 12, labelWidth, line.field)
      const nextHeight = compact.charHeightDots / LABEL_DOTS_PER_MM + lineGap * 0.2
      const idx = selection.next.indexOf(line)
      if (idx === -1 || nextHeight >= line.lineHeightMm) continue
      selection.next[idx] = { ...line, ...compact, lineHeightMm: nextHeight }
      selection.used = selection.used - line.lineHeightMm + nextHeight
    }
  }
  lineGap = fitGapFor(selection.next)
  if (lineGap < originalLineGap) {
    selection.next.forEach((line) => {
      line.lineHeightMm = line.charHeightDots / LABEL_DOTS_PER_MM + lineGap * 0.2
    })
    selection.used = selection.next.reduce((sum, line) => sum + line.lineHeightMm, 0)
  }
  let picked = selection.next
  let usedHeight = selection.used
  picked
    .filter((line) => !protectedLargeFields.has(line.field))
    .sort((a, b) => b.priority - a.priority)
    .forEach((line) => {
      if (usedHeight <= availableHeightMm) return
      const compact = fitLabelLine(line.text, 12, labelWidth, line.field)
      const nextHeight = compact.charHeightDots / LABEL_DOTS_PER_MM + lineGap * 0.2
      const idx = picked.indexOf(line)
      if (idx === -1 || nextHeight >= line.lineHeightMm) return
      picked[idx] = { ...line, ...compact, lineHeightMm: nextHeight }
      usedHeight = usedHeight - line.lineHeightMm + nextHeight
    })
  picked
    .filter((line) => !essentialFields.has(line.field))
    .sort((a, b) => b.priority - a.priority)
    .forEach((line) => {
      if (usedHeight <= availableHeightMm) return
      const idx = picked.indexOf(line)
      if (idx === -1) return
      picked.splice(idx, 1)
      usedHeight -= line.lineHeightMm
    })
  picked.sort((a, b) => a.index - b.index)
  return picked.map((line) => ({
    text: line.text,
    key: `${line.index}-${line.text}`,
    fontSize: Math.max(
      10,
      Math.round((line.charHeightDots / LABEL_DOTS_PER_MM) * pxPerMm * 0.8),
    ),
    lineHeight: Math.max(14, Math.round(line.lineHeightMm * pxPerMm)),
  }))
}

export default function PrintPreview({ type, template, height }: PrintPreviewProps) {
  if (!template) {
    return <div className="print-preview-empty">请先在左侧填写模板内容</div>
  }
  if (type === 'label') {
    const baseWidth = 340
    const labelWidth = Math.max(20, template.labelWidth || 60)
    const labelHeight = Math.max(20, template.labelHeight || 40)
    const previewWidth = Math.min(baseWidth, 420)
    const previewHeight = Math.max(180, Math.round((previewWidth * labelHeight) / labelWidth))
    const pxPerMm = previewWidth / labelWidth
    const labels = sample.items.map((item) => buildLabelRenderLines(template, item, pxPerMm))
    return (
      <div className="print-label-list">
        <div className="print-label-count">共 {labels.length} 张</div>
        <div className="print-label-current-size">当前标签尺寸：{labelWidth} × {labelHeight} mm</div>
        {labels.map((labelLines, labelIndex) => (
          <div
            key={`${labelIndex}-${labelLines.map((line) => line.text).join('|')}`}
            className="print-preview label"
            style={{
              width: previewWidth,
              minHeight: previewHeight,
            }}
          >
            {labelLines.map((line) => (
              <div
                key={line.key}
                style={{ fontSize: line.fontSize, lineHeight: `${line.lineHeight}px` }}
              >
                {line.text}
              </div>
            ))}
            <div className="print-label-size">
              {labelWidth} × {labelHeight} mm
            </div>
            <div className="print-label-index">
              {labelIndex + 1} / {labels.length}
            </div>
          </div>
        ))}
      </div>
    )
  }
  const lines = buildThermalLines(template)
  return (
    <div className="print-preview thermal" style={{ minHeight: height || 360 }}>
      {lines.map((line, index) => (
        <div key={`${index}-${line.text}`} style={thermalLineStyle(line, template)}>
          {line.text || '\u00A0'}
        </div>
      ))}
      <div className="print-thermal-size">58mm</div>
    </div>
  )
}
