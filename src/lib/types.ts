/**
 * Response types — these mirror the Phase 3 backend exactly
 * (backend/src/common/serializers.ts and admin.service.ts return shapes).
 * All money is in paise. Field names are snake_case, as the API sends them.
 */

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string; // 'owner' | 'staff'
}

export interface LoginResponse {
  token: string;
  access_token: string;
  admin: AdminSession;
}

export interface DashboardStats {
  total_orders: number;
  new_orders: number;
  pending_orders: number; // received + verification
  printing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  counts_by_status: Record<string, number>;
  total_sales_paise: number;
  sales_today_paise: number;
  sales_month_paise: number;
  delivery_collected_paise: number;
}

export interface OrderCustomerRef {
  id: string;
  name: string | null;
  mobile: string;
}

export interface OrderListItem {
  id: string;
  order_no: string;
  status: string;
  subtotal_paise: number;
  delivery_paise: number;
  discount_paise: number;
  total_paise: number;
  item_count: number;
  customer: OrderCustomerRef | null;
  created_at: string | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Address {
  id: string;
  full_name: string;
  mobile: string;
  house_no: string | null;
  street: string | null;
  village_city: string | null;
  district: string | null;
  state: string | null;
  pin_code: string | null;
  is_default: boolean;
}

export interface UploadedFile {
  id: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  side: string | null; // 'front' | 'back' | null
  created_at: string | null;
  /** Added by the admin order-detail endpoint (not in the base serializer). */
  signed_url: string | null;
  download_available: boolean;
}

export interface OrderItem {
  id: string;
  product_id: string;
  price_id: string | null;
  product_name: string | null;
  option_label: string | null;
  qty: number;
  unit_price_paise: number;
  options: Record<string, unknown>;
  files: UploadedFile[];
}

export interface StatusHistoryEntry {
  status: string;
  changed_by: string; // 'user' | 'admin' | 'system' | 'webhook'
  note: string | null;
  created_at: string | null;
}

export interface Shipment {
  awb_code: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  current_status: string | null;
  etd: string | null;
}

export interface Payment {
  id: string;
  gateway: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null; // UTR for UPI payments
  screenshot_key: string | null; // UPI screenshot proof (storage key)
  screenshot_url: string | null; // time-limited signed URL, when available
  amount_paise: number;
  method: string | null;
  status: string; // created | authorized | captured | failed | refunded
  signature_verified: boolean;
  created_at: string | null;
}

export interface OrderDetail {
  id: string;
  order_no: string;
  status: string;
  subtotal_paise: number;
  delivery_paise: number;
  discount_paise: number;
  total_paise: number;
  customer_note: string | null;
  internal_note: string | null; // admin-only; stamped lines appended by backend
  items: OrderItem[];
  status_history: StatusHistoryEntry[];
  shipment: Shipment | null;
  address: Address | null;
  created_at: string | null;
  customer: (OrderCustomerRef & { email: string | null }) | null;
  payments: Payment[];
}

export interface ProductPrice {
  id: string;
  product_id: string;
  option_label: string;
  price_paise: number;
  delivery_charge_paise: number;
  min_qty: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
  prices: ProductPrice[];
}

/** Payload for POST/PATCH /admin/products (prices replace wholesale on PATCH). */
export interface ProductPayload {
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  category: string;
  is_active?: boolean;
  sort_order?: number;
  prices: Array<{
    option_label: string;
    price_paise: number;
    delivery_charge_paise: number;
    min_qty: number;
  }>;
}

export interface CustomerListItem {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
  is_active: boolean;
  order_count: number;
  total_spent_paise: number;
  created_at: string | null;
}

export interface CustomerDetail {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string | null;
  orders: Array<{
    id: string;
    order_no: string;
    status: string;
    total_paise: number;
    item_count: number;
    created_at: string | null;
  }>;
}

export interface SalesReport {
  daily: Array<{ day: string; orders: number; sales_paise: number }>;
  monthly: Array<{ month: string; orders: number; sales_paise: number }>;
  product_wise: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    sales_paise: number;
  }>;
  delivery_collected_paise: number;
  payments: Array<{
    status: string;
    method: string;
    count: number;
    amount_paise: number;
  }>;
  profit_estimate: {
    is_estimate: boolean;
    note: string;
    sales_paise: number;
    delivery_paise: number;
    gateway_fee_estimate_paise: number;
    estimated_profit_paise: number;
  };
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string; // open | replied | closed
  admin_reply: string | null;
  order_id: string | null;
  created_at: string | null;
  customer: OrderCustomerRef | null;
}
