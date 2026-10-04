export interface AdminProfile {
  id: string
  name: string
  account: string
  role: 'head' | 'store'
  storeId: string
  storeName: string
  authUsername: string
}

export interface StoreItem {
  id: string
  code: string
  name: string
  address: string
  phone: string
  manager: string
  status: 'active' | 'disabled'
}

export interface WarehouseItem {
  id: string
  code: string
  name: string
  remark: string
  sort: number
}

export interface DepartmentItem {
  id: string
  name: string
  code: string
  remark: string
  sort: number
  status: 'active' | 'disabled'
  stockCount: number
  createdAt: string | Date
}

export interface DepartmentStockItem {
  id: string
  departmentId: string
  departmentName: string
  productId: string
  productName: string
  categoryKey: string
  categoryName: string
  subcategory: string
  spec: string
  stock: number
  minStock: number
  unit: string
  low: boolean
}

export interface DepartmentLogItem {
  id: string
  receiptNo: string
  lineNo: number | null
  logType: string
  direction: string
  supplier: string
  targetName: string
  productId: string
  productName: string
  unit: string
  qty: number
  counted: number | null
  diff: number | null
  price: number
  amount: number
  date: string
  fromType: string
  fromId: string
  fromName: string
  toType: string
  toId: string
  toName: string
  operator: string
  remark: string
  recalled: boolean
  recalledAt: string | Date | null
  createdAt: string | Date
}

export interface CategoryItem {
  id: string
  key: string
  name: string
  subcategories: string[]
  sort: number
  productCount: number
}

export interface ProductItem {
  id: string
  name: string
  categoryKey: string
  categoryName: string
  subcategory: string
  spec: string
  price: number
  costMultiplier: number
  storageWarehouseId: string
  storageWarehouseName: string
  printGroupIds: string[]
  printGroupNames: string[]
  unit: string
  emoji: string
  color: string
  image?: string
  outOfStock: boolean
  status: 'active' | 'disabled'
  sort: number
  stock: number
  minStock: number
  low: boolean
}

export interface ProductOption {
  id: string
  name: string
  spec: string
  unit: string
  price: number
  outOfStock: boolean
  status: 'active' | 'disabled'
}

export interface InventoryItem {
  id: string
  storeId: string
  storeName: string
  productId: string
  productName: string
  spec: string
  categoryKey: string
  unit: string
  stock: number
  processed: number
  loss: number
  issued: number
  counted: number | null
  minStock: number
  costPrice: number | null
  low: boolean
}

export interface StoreStockItem {
  id: string
  storeId: string
  storeName: string
  productId: string
  productName: string
  spec: string
  categoryKey: string
  categoryName: string
  subcategory: string
  unit: string
  stock: number
  counted: number | null
  diff: number | null
  lastLogId: string
  lastCountedAt: string | Date | null
  lastOperator: string
}

export interface StoreCountLogItem {
  id: string
  documentNo: string
  countNo: string
  lineNo: number | null
  storeId: string
  storeName: string
  productId: string
  productName: string
  spec: string
  unit: string
  stockBefore: number
  bookQty: number
  counted: number
  countedQty: number
  stockAfter: number
  diff: number
  price: number
  amount: number
  operator: string
  operatorAccount: string
  source: string
  correctionOf: string
  date: string
  remark: string
  createdAt: string | Date
  voided: boolean
  voidedAt: string | Date | null
  voidedBy: string
  isLatest: boolean
}

export interface StoreCountDocumentItem {
  id: string
  lineNo: number | null
  productId: string
  productName: string
  spec: string
  unit: string
  bookQty: number
  countedQty: number
  diff: number
  price: number
  amount: number
  remark: string
  operator: string
  source: string
  isLatest: boolean
  documentVoided: boolean
}

export interface StoreCountDocumentSummary {
  id: string
  countNo: string
  storeId: string
  storeName: string
  date: string
  scopeType: 'all' | 'selected'
  includeZero: boolean
  onlyBusiness: boolean
  status: 'active' | 'voided'
  itemCount: number
  totalBookQty: number
  totalCountedQty: number
  totalDiff: number
  gainQty: number
  lossQty: number
  gainAmount: number
  lossAmount: number
  netAmount: number
  operator: string
  remark: string
  createdAt: string | Date
  updatedAt: string | Date
  voidedAt?: string | Date | null
  voidedBy?: string
}

export interface StoreCountDocumentDetail {
  document: StoreCountDocumentSummary
  items: StoreCountDocumentItem[]
}

export interface StockCountLogItem {
  id: string
  productId: string
  productName: string
  warehouseId: string
  warehouseName: string
  counted: number
  stockBefore: number
  stockAfter: number
  diff: number
  unit: string
  operator: string
  remark: string
  createdAt: string | Date
}

export interface ProcessLogItem {
  id: string
  productId: string
  productName: string
  warehouseId: string
  warehouseName: string
  processed: number
  loss: number
  unit: string
  operator: string
  remark: string
  createdAt: string | Date
}

export interface StockLogItem {
  id: string
  documentNo: string
  lineNo: number | null
  sourceType: string
  sourceId: string
  productId: string
  productName: string
  spec: string
  categoryKey: string
  categoryName: string
  subcategory: string
  type: 'in' | 'out'
  qty: number
  stockBefore: number
  stockAfter: number
  unit: string
  price: number
  warehouseId: string
  warehouseName: string
  inboundBy: string
  operatorName: string
  recalled: boolean
  recalledAt: string | Date | null
  reason: string
  operator: string
  createdAt: string | Date
}

export interface StockMoveResult {
  logId: string
  documentNo: string
  lineNo: number
  sourceType: string
  sourceId: string
  productId: string
  type: 'in' | 'out'
  qty: number
  stockBefore: number
  stockAfter: number
  issued: number
  unit: string
  productName: string
  spec: string
  price: number | null
  warehouseName: string
  inboundBy: string
  operatorName: string
  reason: string
  createdAt: string | Date
}

export interface StockVoucherLine {
  id: string
  lineNo?: number | null
  productName: string
  spec: string
  unit: string
  qty: number
  price: number
  warehouseName: string
  inboundBy: string
  operatorName: string
  reason: string
  createdAt: string | Date
}

export interface StockVoucherGroup {
  documentNo?: string
  warehouseName: string
  date: string
  logs: StockVoucherLine[]
}

export interface StockDocumentSummary {
  key: string
  documentNo: string
  sourceType: string
  sourceId: string
  date: string
  type: 'in' | 'out'
  warehouseId: string
  warehouseName: string
  operator: string
  reason: string
  itemCount: number
  totalQty: number
  totalAmount: number
  items: StockLogItem[]
}

export interface OrderItem {
  id: string
  orderNo: string
  storeId: string
  storeName: string
  storeCode: string
  status: '已下单' | '已取消'
  time: string
  itemCount: number
  totalAmount: number
  remark: string
}

export interface OrderDetailLine {
  productId: string
  productName: string
  spec: string
  price: number
  qty: number
  subtotal: number
  unit: string
}

export interface PrintLogLine {
  id: string
  printerId: string
  printerName: string
  copies: number
  status: string
  createdAt: string | Date
}

export interface OrderDetailData {
  order: OrderItem
  items: OrderDetailLine[]
  printLogs: PrintLogLine[]
}

export interface OrderQuantityChange {
  productId: string
  qty: number
}

export interface OrderQuantityUpdateResult {
  orderNo: string
  itemCount: number
  totalAmount: number
}

export interface OrderReplaceItemResult {
  orderNo: string
  itemCount: number
  totalAmount: number
  merged: boolean
}

export interface OrderVoucherLine {
  id: string
  productName: string
  spec: string
  unit: string
  qty: number
  price: number
  amount: number
  remark: string
}

export interface OrderVoucherGroup {
  orderNo: string
  storeName: string
  time: string
  itemCount: number
  operator: string
  logs: OrderVoucherLine[]
}

export interface UserItem {
  id: string
  account: string
  name: string
  role: 'store' | 'head'
  storeId: string
  storeName: string
  phone: string
  authUsername: string
  hasOpenid: boolean
  createdAt: string | Date
}

export interface PrinterItem {
  id: string
  scope: 'store' | 'global'
  storeId: string
  storeName: string
  name: string
  type: string
  sn: string
  printGroupId: string
  printGroupName: string
  status: string
  online: boolean
  templateOverride: PrintTemplate | null
  hasTemplateOverride: boolean
}

export interface PrintLogItem {
  id: string
  orderNo: string
  printerId: string
  printerName: string
  sn: string
  storeName: string
  copies: number
  labelCount: number
  status: string
  errMsg: string
  createdAt: string | Date
}

export type PrintTemplateType = 'thermal' | 'label' | 'voucher'

export type VoucherSizeKey =
  | 'header'
  | 'title'
  | 'no'
  | 'meta'
  | 'tableHead'
  | 'tableBody'
  | 'tableTotal'
  | 'sign'
  | 'footer'

export type VoucherSizes = Record<VoucherSizeKey, number>

export interface VoucherLabels {
  store: string
  time: string
  itemCount: string
  index: string
  product: string
  unit: string
  qty: string
  price: string
  amount: string
  remark: string
  total: string
  signStore: string
  signMaker: string
  signChecker: string
  signWarehouse: string
}

export interface VoucherSpacing {
  titleGap: number
  metaGap: number
  rowHeight: number
  cellPadding: number
  lineHeight: number
  signGap: number
}

export interface PrintTemplate {
  headerText: string
  titleText: string
  footerText: string
  showDailyNo: boolean
  showStore: boolean
  showOrderNo: boolean
  showTime: boolean
  showRemark: boolean
  showUnit: boolean
  showPrice: boolean
  showSubtotal: boolean
  showTotal: boolean
  showStorage: boolean
  align: 'left' | 'center'
  separator: string
  labelWidth?: number
  labelHeight?: number
  fontSize?: number
  lineGap?: number
  emphasizeName?: boolean
  fontSizes?: Record<string, number>
  itemGap?: number
  showItemIndex?: boolean
  showCategory?: boolean
  thermalSizes?: Record<string, number>
  voucherLabels?: VoucherLabels
  voucherSizes?: VoucherSizes
  voucherSpacing?: VoucherSpacing
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardStats {
  storeCount: number
  activeStoreCount: number
  productCount: number
  activeProductCount: number
  orderCount: number
  todayOrderCount: number
  totalAmount: number
  todayTotalAmount: number
  lowStockCount: number
  lowStockItems: Array<{
    productId: string
    name: string
    spec: string
    stock: number
    minStock: number
    unit: string
  }>
  recentOrders: Array<{
    orderNo: string
    storeName: string
    storeCode: string
    status: string
    time: string
    itemCount: number
    totalAmount: number
  }>
  operator: string
}

export interface StatsSummary {
  kindCount: number
  itemCount: number
  totalAmount: number
  groups: Array<{
    categoryKey: string
    items: Array<{
      productId: string
      name: string
      spec: string
      qty: number
      unit: string
    }>
  }>
}

export interface StoreQtyLine {
  storeId: string
  storeName: string
  storeCode: string
  qty: number
}

export interface StoreDetailData {
  productId: string
  productName: string
  spec: string
  list: StoreQtyLine[]
}
