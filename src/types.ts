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
  minStock: number
  costPrice: number | null
  low: boolean
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
  productId: string
  productName: string
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
  storeId: string
  storeName: string
  name: string
  type: string
  sn: string
  status: string
  online: boolean
}

export interface PrintLogItem {
  id: string
  orderNo: string
  printerId: string
  printerName: string
  storeName: string
  copies: number
  status: string
  createdAt: string | Date
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
