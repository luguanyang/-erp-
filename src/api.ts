import { callAdmin } from './cloudbase'
import type {
  AdminProfile,
  CategoryItem,
  DashboardStats,
  DepartmentItem,
  DepartmentLogItem,
  DepartmentStockItem,
  InventoryItem,
  OrderDetailData,
  OrderItem,
  PageResult,
  ProcessLogItem,
  StockLogItem,
  PrinterItem,
  PrintLogItem,
  PrintTemplate,
  ProductItem,
  StatsSummary,
  StockCountLogItem,
  StoreDetailData,
  StoreItem,
  StockMoveResult,
  UserItem,
  WarehouseItem,
} from './types'

export const api = {
  profile: (authUsername?: string) =>
    callAdmin<AdminProfile>({ action: 'admin.profile', authUsername: authUsername || '' }),

  dashboardStats: () => callAdmin<DashboardStats>({ action: 'dashboard.stats' }),

  storeList: () => callAdmin<{ list: StoreItem[] }>({ action: 'store.list' }),
  storeCreate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'store.create', ...data }),
  storeUpdate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'store.update', ...data }),
  storeDelete: (id: string) => callAdmin<{ id: string }>({ action: 'store.delete', id }),

  warehouseList: () => callAdmin<{ list: WarehouseItem[] }>({ action: 'warehouse.list' }),
  warehouseCreate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'warehouse.create', ...data }),
  warehouseUpdate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'warehouse.update', ...data }),
  warehouseReorder: (ids: string[]) =>
    callAdmin<{ updated: number }>({ action: 'warehouse.reorder', ids }),
  warehouseDelete: (id: string) =>
    callAdmin<{ id: string; deleted: boolean }>({ action: 'warehouse.delete', id }),
  warehouseInventory: (data: object) =>
    callAdmin<PageResult<InventoryItem>>({ action: 'warehouse.inventory', ...data }),

  departmentList: () => callAdmin<{ list: DepartmentItem[] }>({ action: 'department.list' }),
  departmentCreate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'department.create', ...data }),
  departmentUpdate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'department.update', ...data }),
  departmentDelete: (id: string) =>
    callAdmin<{ id: string; deleted: boolean }>({ action: 'department.delete', id }),
  departmentReorder: (ids: string[]) =>
    callAdmin<{ updated: number }>({ action: 'department.reorder', ids }),
  departmentStock: (data: object) =>
    callAdmin<PageResult<DepartmentStockItem>>({ action: 'department.stock', ...data }),
  departmentPurchase: (data: object) =>
    callAdmin<{ handled: number }>({ action: 'department.purchase', ...data }),
  departmentMove: (data: object) =>
    callAdmin<{ handled: number }>({ action: 'department.move', ...data }),
  departmentCount: (data: object) =>
    callAdmin<{ handled: number }>({ action: 'department.count', ...data }),
  departmentLogs: (data: object) =>
    callAdmin<PageResult<DepartmentLogItem>>({ action: 'department.logs', ...data }),
  departmentLogRecall: (id: string) =>
    callAdmin<{ id: string; recalled: boolean }>({
      action: 'department.logs.recall',
      id,
    }),

  categoryList: () => callAdmin<{ list: CategoryItem[] }>({ action: 'category.list' }),
  categoryCreate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'category.create', ...data }),
  categoryUpdate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'category.update', ...data }),
  categoryDelete: (id: string) => callAdmin<{ id: string }>({ action: 'category.delete', id }),

  productList: (data: object) =>
    callAdmin<PageResult<ProductItem>>({ action: 'product.list', ...data }),
  productCreate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'product.create', ...data }),
  productUpdate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'product.update', ...data }),
  productDelete: (id: string) => callAdmin<{ id: string }>({ action: 'product.delete', id }),

  inventoryList: (data: object) =>
    callAdmin<PageResult<InventoryItem>>({ action: 'inventory.list', ...data }),
  inventoryUpdate: (items: object[]) =>
    callAdmin<{ updated: number }>({ action: 'inventory.update', items }),
  stockMove: (data: object) =>
    callAdmin<StockMoveResult>({
      action: 'stock.move',
      ...data,
    }),
  stockLogList: (data: object) =>
    callAdmin<PageResult<StockLogItem>>({ action: 'stock.logs', ...data }),
  stockLogRecall: (id: string) =>
    callAdmin<{ id: string; recalled: boolean; stockBefore: number; stockAfter: number }>({
      action: 'stock.logs.recall',
      id,
    }),
  stockProductWarehouses: (productId: string) =>
    callAdmin<{
      list: Array<{ warehouseId: string; warehouseName: string; stock: number; unit: string }>
    }>({ action: 'stock.productWarehouses', productId }),
  stockProcess: (data: object) =>
    callAdmin<{ productId: string; warehouseId: string; processed: number; loss: number }>({
      action: 'stock.process',
      ...data,
    }),
  stockCount: (data: object) =>
    callAdmin<{ productId: string; warehouseId: string; counted: number; diff: number }>({
      action: 'stock.count',
      ...data,
    }),
  stockCountLogList: (data: object) =>
    callAdmin<PageResult<StockCountLogItem>>({ action: 'stock.countLog.list', ...data }),
  processLogList: (data: object) =>
    callAdmin<PageResult<ProcessLogItem>>({ action: 'process.log.list', ...data }),

  orderList: (data: object) =>
    callAdmin<PageResult<OrderItem>>({ action: 'order.list', ...data }),
  orderDetail: (orderNo: string) =>
    callAdmin<OrderDetailData>({ action: 'order.detail', orderNo }),
  orderCancel: (orderNo: string) =>
    callAdmin<{ orderNo: string; status: string }>({ action: 'order.cancel', orderNo }),

  userList: (data: object) =>
    callAdmin<PageResult<UserItem>>({ action: 'user.list', ...data }),
  userCreate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'user.create', ...data }),
  userUpdate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'user.update', ...data }),
  userDelete: (id: string) => callAdmin<{ id: string }>({ action: 'user.delete', id }),

  printerList: (data: object) =>
    callAdmin<PageResult<PrinterItem>>({ action: 'printer.list', ...data }),
  printerCreate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'printer.create', ...data }),
  printerUpdate: (data: object) =>
    callAdmin<{ id: string }>({ action: 'printer.update', ...data }),
  printerDelete: (id: string) => callAdmin<{ id: string }>({ action: 'printer.delete', id }),

  printSend: (data: object) =>
    callAdmin<{ sent: number; failed: number; errMsg?: string }>({
      action: 'print.send',
      ...data,
    }),

  printLogList: (data: object) =>
    callAdmin<PageResult<PrintLogItem>>({ action: 'printLog.list', ...data }),

  printTemplateGet: (type: 'thermal' | 'label') =>
    callAdmin<{ type: 'thermal' | 'label'; template: PrintTemplate }>({
      action: 'printTemplate.get',
      type,
    }),
  printTemplateUpdate: (type: 'thermal' | 'label', template: PrintTemplate) =>
    callAdmin<{ type: 'thermal' | 'label'; template: PrintTemplate }>({
      action: 'printTemplate.update',
      type,
      template,
    }),
  printTemplatePreview: (type: 'thermal' | 'label', template: PrintTemplate) =>
    callAdmin<{ type: 'thermal' | 'label'; content: string; contents: string[]; apiname: string }>({
      action: 'printTemplate.preview',
      type,
      template,
    }),

  statsProductSummary: (data: object) =>
    callAdmin<StatsSummary>({ action: 'stats.productSummary', ...data }),
  statsProductStoreDetail: (data: object) =>
    callAdmin<StoreDetailData>({ action: 'stats.productStoreDetail', ...data }),
}
