import type {
  PrintTemplate,
  VoucherLabels,
  VoucherSizes,
  VoucherSpacing,
} from './types'

export const thermalFallback: PrintTemplate = {
  headerText: '金港连锁门店下单系统',
  titleText: '订货单',
  footerText: '谢谢惠顾',
  showDailyNo: true,
  showStore: true,
  showOrderNo: true,
  showTime: true,
  showRemark: true,
  showUnit: true,
  showPrice: true,
  showSubtotal: true,
  showTotal: true,
  showStorage: true,
  align: 'center',
  separator: '--------------------------------',
  itemGap: 1,
  showItemIndex: true,
  showCategory: true,
  thermalSizes: {
    header: 20,
    title: 12,
    dailyNo: 20,
    category: 12,
    head: 12,
    store: 12,
    orderNo: 12,
    time: 12,
    remark: 12,
    storage: 12,
    name: 12,
    qty: 12,
    price: 12,
    subtotal: 12,
    total: 12,
    footer: 12,
  },
}

export const labelFallback: PrintTemplate = {
  headerText: '金港订货单',
  titleText: '订货单',
  footerText: '',
  showDailyNo: true,
  showStore: true,
  showOrderNo: true,
  showTime: true,
  showRemark: true,
  showUnit: true,
  showPrice: true,
  showSubtotal: true,
  showTotal: true,
  showStorage: true,
  align: 'left',
  separator: '',
  labelWidth: 60,
  labelHeight: 40,
  fontSize: 12,
  lineGap: 6,
  emphasizeName: false,
  fontSizes: {
    header: 12,
    title: 12,
    dailyNo: 12,
    store: 12,
    orderNo: 12,
    time: 12,
    remark: 12,
    storage: 12,
    name: 12,
    qty: 12,
    price: 12,
    subtotal: 12,
    footer: 12,
  },
}

export const voucherFallback: PrintTemplate = {
  headerText: '',
  titleText: '订货单',
  footerText: '',
  showDailyNo: false,
  showStore: true,
  showOrderNo: true,
  showTime: true,
  showRemark: true,
  showUnit: true,
  showPrice: true,
  showSubtotal: true,
  showTotal: true,
  showStorage: false,
  align: 'center',
  separator: '',
  voucherLabels: {
    store: '门店',
    time: '下单时间',
    itemCount: '商品件数',
    index: '序号',
    product: '商品名称 / 规格',
    unit: '单位',
    qty: '数量',
    price: '单价（元）',
    amount: '金额（元）',
    remark: '备注',
    total: '合计',
    signStore: '门店签收',
    signMaker: '制单人',
    signChecker: '核单人',
    signWarehouse: '仓库确认',
  },
  voucherSizes: {
    header: 7.5,
    title: 12,
    no: 7.5,
    meta: 7.5,
    tableHead: 7.5,
    tableBody: 7.5,
    tableTotal: 7.5,
    sign: 8,
    footer: 7.5,
  },
  voucherSpacing: {
    titleGap: 1,
    metaGap: 1,
    rowHeight: 10,
    cellPadding: 0.6,
    lineHeight: 1.08,
    signGap: 1,
  },
}

function mergeDefined<T extends object>(base: T, override?: Partial<T>): T {
  const next = { ...base }
  if (!override) return next
  ;(Object.keys(base) as Array<keyof T>).forEach((key) => {
    const value = override[key]
    if (value !== undefined && value !== null) next[key] = value as T[keyof T]
  })
  return next
}

export function mergeVoucherTemplate(template?: PrintTemplate): PrintTemplate {
  return {
    ...voucherFallback,
    ...template,
    voucherLabels: mergeDefined(
      voucherFallback.voucherLabels as VoucherLabels,
      template?.voucherLabels,
    ),
    voucherSizes: mergeDefined(
      voucherFallback.voucherSizes as VoucherSizes,
      template?.voucherSizes,
    ),
    voucherSpacing: mergeDefined(
      voucherFallback.voucherSpacing as VoucherSpacing,
      template?.voucherSpacing,
    ),
  }
}
