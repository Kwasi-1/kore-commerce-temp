import MockAdapter from 'axios-mock-adapter';
import apiClient from './client';

export const MOCK_CASHIERS = [
  { id: '1', name: 'Kwame Mensah', role: 'Cashier', initials: 'KM', color: 'bg-blue-500' },
  { id: '2', name: 'Abena Osei', role: 'Senior Cashier', initials: 'AO', color: 'bg-emerald-500' },
  { id: '3', name: 'David Tetteh', role: 'Cashier', initials: 'DT', color: 'bg-amber-500' },
  { id: '4', name: 'Sarah Kumi', role: 'Cashier', initials: 'SK', color: 'bg-purple-500' },
  { id: '5', name: 'Kwame Mensah', role: 'Cashier', initials: 'KM', color: 'bg-blue-500' },
  { id: '6', name: 'Abena Osei', role: 'Senior Cashier', initials: 'AO', color: 'bg-emerald-500' },
  { id: '7', name: 'David Tetteh', role: 'Cashier', initials: 'DT', color: 'bg-amber-500' },
  { id: '8', name: 'Sarah Kumi', role: 'Cashier', initials: 'SK', color: 'bg-purple-500' },
];

export function setupMockApi() {
  console.log('🚀 Initializing API Mocks (VITE_USE_MOCK_API is true)');
  
  // Set delay to simulate network latency for better frontend auditing (e.g. loading states)
  const mock = new MockAdapter(apiClient, { delayResponse: 600 });

  // -----------------------------------------------------
  // AUTH & STAFF
  // -----------------------------------------------------
  
  const mockStaff = [
    { id: 'u1', name: 'Kwame Mensah', first_name: 'Kwame', last_name: 'Mensah', email: 'owner@store.com', role: 'owner', is_active: true, last_login: new Date().toISOString() },
    { id: 'u2', name: 'Ama Serwaa', first_name: 'Ama', last_name: 'Serwaa', email: 'ama@store.com', role: 'manager', is_active: true, last_login: new Date().toISOString() },
    { id: 'u3', name: 'Kofi Annan', first_name: 'Kofi', last_name: 'Annan', email: 'kofi@store.com', role: 'cashier', is_active: true, last_login: new Date().toISOString() },
  ];

  const mockTenant = {
    id: 't1',
    name: 'HeadlessPOS Demo Store',
    currency: 'GHS',
    plan: 'full_suite'
  };

  mock.onGet('/tenant/staff').reply(200, {
    success: true,
    data: { staff: mockStaff }
  });

  // PIN Login (Accepts any 4-digit PIN for demo)
  mock.onPost('/auth/staff/pin-login').reply((config) => {
    const { email } = JSON.parse(config.data);
    const user = mockStaff.find(s => s.email === email);
    if (!user) return [401, { error: { message: 'Invalid PIN' } }];
    
    return [200, {
      success: true,
      access_token: 'mock-jwt-token',
      refresh_token: 'mock-refresh-token',
      staff: user,
      tenant: mockTenant
    }];
  });

  // Password Login (Accepts any password for demo)
  mock.onPost('/auth/staff/login').reply((config) => {
    const { email } = JSON.parse(config.data);
    const user = mockStaff.find(s => s.email === email) || mockStaff[0]; // Fallback to owner if unknown
    
    return [200, {
      success: true,
      access_token: 'mock-jwt-token',
      refresh_token: 'mock-refresh-token',
      staff: user,
      tenant: mockTenant
    }];
  });

  // -----------------------------------------------------
  // TENANT SETTINGS
  // -----------------------------------------------------
  
  let mockTenantSettings = {
    store: {
      name: 'HeadlessPOS Demo Store',
      description: 'Your one stop shop for everything.',
      email: 'hello@store.com',
      phoneNumber: '0241234567',
      additionalNumber: ''
    },
    pos_settings: {
      auto_print: 'ask', // 'always' | 'never' | 'ask'
      require_customer_for_credit: true,
      receipt_footer: 'Thank you for your business!'
    }
  };

  mock.onGet('/tenant/settings').reply(200, {
    success: { data: mockTenantSettings }
  });

  mock.onPatch('/tenant/settings/profile').reply((config) => {
    mockTenantSettings.store = { ...mockTenantSettings.store, ...JSON.parse(config.data) };
    return [200, { success: true }];
  });

  mock.onPatch('/tenant/settings/contact').reply((config) => {
    mockTenantSettings.store = { ...mockTenantSettings.store, ...JSON.parse(config.data) };
    return [200, { success: true }];
  });

  mock.onPatch('/tenant/settings/pos').reply((config) => {
    mockTenantSettings.pos_settings = { ...mockTenantSettings.pos_settings, ...JSON.parse(config.data) };
    return [200, { success: true }];
  });

  // -----------------------------------------------------
  // REPORTS / DASHBOARD
  // -----------------------------------------------------
  
  // Sales Summary
  mock.onGet(/\/tenant\/reports\/sales/).reply(200, {
    success: true,
    data: {
      summary: {
        total_sales: 12450.50,
        total_transactions: 84,
        breakdown_by_channel: {
          pos: { total: 8200.00, count: 60 },
          storefront: { total: 4250.50, count: 24 }
        }
      }
    }
  });

  // -----------------------------------------------------
  // INVENTORY
  // -----------------------------------------------------
  
  let mockProducts = [
    { id: 'p1', name: 'Nike Air Max', sku: 'NK-AM-01', price: 850, cost_price: 500, stock_quantity: 4, reorder_point: 5, category: 'Shoes', status: 'active' },
    { id: 'p2', name: 'Adidas Ultraboost', sku: 'AD-UB-02', price: 920, cost_price: 600, stock_quantity: 12, reorder_point: 5, category: 'Shoes', status: 'active' },
    { id: 'p3', name: 'Apple AirPods Pro', sku: 'AP-AP-03', price: 3500, cost_price: 2800, stock_quantity: 2, reorder_point: 5, category: 'Electronics', status: 'active' },
    { id: 'p4', name: 'Sony WH-1000XM4', sku: 'SN-WH-04', price: 4200, cost_price: 3100, stock_quantity: 8, reorder_point: 3, category: 'Electronics', status: 'active' },
    { id: 'p5', name: 'Basic White Tee', sku: 'AP-WT-05', price: 120, cost_price: 40, stock_quantity: 45, reorder_point: 20, category: 'Apparel', status: 'active' },
    { id: 'p6', name: 'Nike Socks', sku: 'NK-SK-06', price: 40, cost_price: 15, stock_quantity: 0, reorder_point: 10, category: 'Apparel', status: 'out_of_stock' },
    { id: 'p7', name: 'Leather Wallet', sku: 'LW-07', price: 250, cost_price: 100, stock_quantity: 20, reorder_point: 5, category: 'Accessories', status: 'active' },
    { id: 'p8', name: 'Sunglasses Classic', sku: 'SG-08', price: 380, cost_price: 150, stock_quantity: 0, reorder_point: 5, category: 'Accessories', status: 'out_of_stock' },
    { id: 'p9', name: 'Samsung Galaxy Tab', sku: 'SG-TAB-09', price: 5500, cost_price: 4200, stock_quantity: 3, reorder_point: 2, category: 'Electronics', status: 'active' },
    { id: 'p10', name: 'Running Shorts', sku: 'RS-10', price: 95, cost_price: 35, stock_quantity: 0, reorder_point: 15, category: 'Apparel', status: 'draft' },
  ] as any[];

  mock.onGet(/\/tenant\/products/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const search = (searchParams.get('search') || '').toLowerCase();
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';

    let filtered = [...mockProducts];
    if (search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        (p.category || '').toLowerCase().includes(search)
      );
    }
    if (status) {
      filtered = filtered.filter(p => p.status === status);
    }
    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }

    return [200, { success: true, data: { products: filtered } }];
  });

  mock.onPost('/tenant/products/bulk').reply((config) => {
    const data = JSON.parse(config.data);
    if (data.products && Array.isArray(data.products)) {
      const newProducts = data.products.map((p: any) => ({
        id: `p${Math.floor(Math.random() * 10000)}`,
        name: p.name,
        sku: p.sku || `SKU-${Math.floor(Math.random() * 10000)}`,
        price: p.price,
        cost_price: p.cost_price || (p.price * 0.7),
        stock_quantity: p.stock_quantity || 0,
        reorder_point: 5,
        category: p.category || 'General',
        description: p.description
      }));
      mockProducts = [...mockProducts, ...newProducts];
    }
    return [200, {
      success: true,
      message: 'Products imported successfully'
    }];
  });

  mock.onPatch(/\/tenant\/products\/[^/]+\/status/).reply((config) => {
    const urlParts = config.url?.split('/') || [];
    const id = urlParts[urlParts.length - 2];
    const { status } = JSON.parse(config.data);
    
    const productIndex = mockProducts.findIndex(p => p.id === id);
    if (productIndex !== -1) {
      mockProducts[productIndex] = { ...mockProducts[productIndex], status };
      return [200, { success: true, message: 'Status updated' }];
    }
    return [404, { success: false, message: 'Product not found' }];
  });

  mock.onDelete(/\/tenant\/products\/[^/]+/).reply((config) => {
    const urlParts = config.url?.split('/') || [];
    const id = urlParts[urlParts.length - 1];
    
    const productIndex = mockProducts.findIndex(p => p.id === id);
    if (productIndex !== -1) {
      mockProducts.splice(productIndex, 1);
      return [200, { success: true, message: 'Product deleted' }];
    }
    return [404, { success: false, message: 'Product not found' }];
  });

  // -----------------------------------------------------
  // POS & SHIFTS
  // -----------------------------------------------------
  
  mock.onGet(/\/tenant\/pos\/shifts/).reply(200, {
    success: true,
    data: {
      shifts: [
        { id: 'sh1', status: 'open', opened_at: new Date().toISOString(), opened_by_name: 'Kofi Annan', starting_cash: 500 }
      ]
    }
  });

  mock.onPost('/pos/shifts/open').reply((config) => {
    const data = JSON.parse(config.data);
    return [200, {
      success: {
        data: {
          shift: {
            id: `sh${Math.floor(Math.random() * 1000)}`,
            status: 'open',
            opened_at: new Date().toISOString(),
            starting_cash: data.opening_float || 0
          }
        }
      }
    }];
  });

  // -----------------------------------------------------
  // EXPENSES
  // -----------------------------------------------------
  
  mock.onGet(/\/tenant\/expenses\/summary/).reply(200, {
    success: true,
    data: {
      summary: [
        { category: 'utilities', total_amount: 1500 },
        { category: 'supplies', total_amount: 450 },
        { category: 'maintenance', total_amount: 200 }
      ]
    }
  });

  let mockExpenses = [
    { id: 'e1', description: 'Electricity Bill', amount: 1500, category: 'utilities', date: new Date().toISOString(), dateIncurred: new Date().toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e2', description: 'Printer Ink', amount: 450, category: 'supplies', date: new Date(Date.now() - 2*86400000).toISOString(), dateIncurred: new Date(Date.now() - 2*86400000).toISOString(), recordedByName: 'Ama Serwaa', isVoided: false },
    { id: 'e3', description: 'Office Rent - June', amount: 5500, category: 'rent', date: new Date(Date.now() - 5*86400000).toISOString(), dateIncurred: new Date(Date.now() - 5*86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e4', description: 'Cashier Salaries', amount: 12000, category: 'salaries', date: new Date(Date.now() - 7*86400000).toISOString(), dateIncurred: new Date(Date.now() - 7*86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e5', description: 'Google Ads Campaign', amount: 800, category: 'marketing', date: new Date(Date.now() - 10*86400000).toISOString(), dateIncurred: new Date(Date.now() - 10*86400000).toISOString(), recordedByName: 'Ama Serwaa', isVoided: false },
    { id: 'e6', description: 'AC Repair', amount: 650, category: 'maintenance', date: new Date(Date.now() - 12*86400000).toISOString(), dateIncurred: new Date(Date.now() - 12*86400000).toISOString(), recordedByName: 'Kofi Annan', isVoided: true },
    { id: 'e7', description: 'QuickBooks Subscription', amount: 320, category: 'software', date: new Date(Date.now() - 15*86400000).toISOString(), dateIncurred: new Date(Date.now() - 15*86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
  ] as any[];

  mock.onGet(/\/tenant\/expenses/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const category = searchParams.get('category') || '';

    let filtered = [...mockExpenses];
    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }

    return [200, { success: true, data: { expenses: filtered } }];
  });

  mock.onPut(/\/tenant\/expenses\/[^/]+\/void/).reply((config) => {
    const id = config.url?.split('/')[3];
    const idx = mockExpenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockExpenses[idx].isVoided = true;
      return [200, { success: true, message: 'Expense voided' }];
    }
    return [404, { success: false }];
  });
  
  // POS Transactions
  let mockTransactions = [
    { id: 'tx1', receiptNumber: 'RCP-0001', dateCreated: new Date().toISOString(), cashierName: 'Kofi Annan', paymentMethod: 'cash', totalAmount: 850.00, status: 'completed' },
    { id: 'tx2', receiptNumber: 'RCP-0002', dateCreated: new Date(Date.now() - 2*3600000).toISOString(), cashierName: 'Ama Serwaa', paymentMethod: 'mobile_money', totalAmount: 1200.00, status: 'completed' },
    { id: 'tx3', receiptNumber: 'RCP-0003', dateCreated: new Date(Date.now() - 5*3600000).toISOString(), cashierName: 'Kofi Annan', paymentMethod: 'card', totalAmount: 4200.00, status: 'completed' },
    { id: 'tx4', receiptNumber: 'RCP-0004', dateCreated: new Date(Date.now() - 86400000).toISOString(), cashierName: 'Ama Serwaa', paymentMethod: 'cash', totalAmount: 380.00, status: 'completed' },
    { id: 'tx5', receiptNumber: 'RCP-0005', dateCreated: new Date(Date.now() - 86400000 - 3600000).toISOString(), cashierName: 'Kofi Annan', paymentMethod: 'mobile_money', totalAmount: 920.00, status: 'completed' },
    { id: 'tx6', receiptNumber: 'RCP-0006', dateCreated: new Date(Date.now() - 2*86400000).toISOString(), cashierName: 'Kwame Mensah', paymentMethod: 'card', totalAmount: 3500.00, status: 'completed' },
    { id: 'tx7', receiptNumber: 'RCP-0007', dateCreated: new Date(Date.now() - 2*86400000 - 1800000).toISOString(), cashierName: 'Ama Serwaa', paymentMethod: 'cash', totalAmount: 120.00, status: 'completed' },
    { id: 'tx8', receiptNumber: 'RCP-0008', dateCreated: new Date(Date.now() - 3*86400000).toISOString(), cashierName: 'Kofi Annan', paymentMethod: 'mobile_money', totalAmount: 650.00, status: 'completed' },
    { id: 'tx9', receiptNumber: 'RCP-0009', dateCreated: new Date(Date.now() - 3*86400000 - 7200000).toISOString(), cashierName: 'Kwame Mensah', paymentMethod: 'cash', totalAmount: 250.00, status: 'completed' },
    { id: 'tx10', receiptNumber: 'RCP-0010', dateCreated: new Date(Date.now() - 4*86400000).toISOString(), cashierName: 'Ama Serwaa', paymentMethod: 'card', totalAmount: 5500.00, status: 'completed' },
  ];

  mock.onGet(/\/pos\/transactions\/[^/]+\/receipt/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const tx = mockTransactions.find(t => t.id === id);
    if (tx) {
      return [200, { success: true, data: { receipt: { ...tx, items: [{ name: 'Sample Product', qty: 1, price: tx.totalAmount }], tenant_name: 'HeadlessPOS Demo Store' } } }];
    }
    return [404, { success: false }];
  });

  mock.onPost(/\/pos\/transactions\/[^/]+\/refund/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const { type, amount } = JSON.parse(config.data);
    const txIndex = mockTransactions.findIndex(t => t.id === id);
    
    if (txIndex !== -1) {
      const tx = mockTransactions[txIndex];
      if (type === 'full' || amount >= tx.totalAmount) {
        mockTransactions[txIndex] = { ...tx, status: 'refunded', totalAmount: 0 };
      } else {
        mockTransactions[txIndex] = { ...tx, status: 'partially_refunded', totalAmount: tx.totalAmount - amount };
      }
      return [200, { success: true, message: 'Refund processed' }];
    }
    return [404, { success: false, message: 'Transaction not found' }];
  });

  mock.onGet(/^\/pos\/transactions/).reply((config) => {
    const url = config.url || '';
    // if url contains receipt or refund, skip it since we already handled it above (just in case)
    if (url.includes('/receipt') || url.includes('/refund')) return [404, {}];
    
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const method = searchParams.get('payment_method') || '';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let filtered = [...mockTransactions];
    if (method) {
      filtered = filtered.filter(t => t.paymentMethod === method);
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      filtered = filtered.filter(t => {
        const tTime = new Date(t.dateCreated).getTime();
        return tTime >= start && tTime <= end;
      });
    }

    return [200, { success: true, data: { transactions: filtered, total: filtered.length } }];
  });
  
  mock.onGet(/\/tenant\/inventory\/suppliers/).reply(200, {
    success: true,
    data: {
      suppliers: [
        { id: 'sup1', name: 'TechWholesale Ghana', contact_person: 'John Doe', email: 'john@techwholesale.gh', phone: '0241234567', status: 'active' },
        { id: 'sup2', name: 'Accra Garments', contact_person: 'Jane Smith', email: 'jane@garments.gh', phone: '0209876543', status: 'active' }
      ]
    }
  });

  mock.onGet(/\/tenant\/purchase-orders/).reply(200, {
    success: true,
    data: {
      purchaseOrders: [
        { id: 'po1', reference_number: 'PO-2026-001', supplier_name: 'TechWholesale Ghana', status: 'draft', total_cost: 15000, expected_date: new Date().toISOString() },
        { id: 'po2', reference_number: 'PO-2026-002', supplier_name: 'Accra Garments', status: 'ordered', total_cost: 3400, expected_date: new Date().toISOString() }
      ]
    }
  });
  
  // -----------------------------------------------------
  // ECOMMERCE MODULE
  // -----------------------------------------------------
  
  // Customers
  let mockCustomers = [
    { id: 'c1', first_name: 'John', last_name: 'Doe', name: 'John Doe', email: 'john.doe@example.com', phone: '0241112222', total_orders: 5, total_spent: 4250.00, created_at: new Date(Date.now() - 30*24*60*60*1000).toISOString(), outstanding_debt: 850.00, last_credit_date: new Date(Date.now() - 5*24*60*60*1000).toISOString() },
    { id: 'c2', first_name: 'Jane', last_name: 'Smith', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '0203334444', total_orders: 1, total_spent: 850.00, created_at: new Date(Date.now() - 5*24*60*60*1000).toISOString(), outstanding_debt: 0.00, last_credit_date: null },
    { id: 'c3', first_name: 'Kwame', last_name: 'Nkrumah', name: 'Kwame Nkrumah', email: 'kwame@ghana.com', phone: '0275556666', total_orders: 12, total_spent: 12400.00, created_at: new Date(Date.now() - 100*24*60*60*1000).toISOString(), outstanding_debt: 1200.50, last_credit_date: new Date(Date.now() - 2*24*60*60*1000).toISOString() }
  ];

  let mockCreditHistory = [
    { id: 'ch1', customer_id: 'c1', type: 'credit_purchase', amount: 1500.00, balance_after: 1500.00, reference: 'RCP-0021', date: new Date(Date.now() - 15*24*60*60*1000).toISOString() },
    { id: 'ch2', customer_id: 'c1', type: 'settlement', amount: 650.00, balance_after: 850.00, reference: 'SET-001', payment_method: 'cash', date: new Date(Date.now() - 5*24*60*60*1000).toISOString() },
    { id: 'ch3', customer_id: 'c3', type: 'credit_purchase', amount: 1200.50, balance_after: 1200.50, reference: 'RCP-0044', date: new Date(Date.now() - 2*24*60*60*1000).toISOString() },
  ];

  mock.onGet(/\/tenant\/customers\/.+\/orders/).reply(200, {
    success: true,
    data: {
      orders: [
        { id: 'o1', reference: 'ORD-1001', total_amount: 850.00, status: 'delivered', created_at: new Date().toISOString() }
      ]
    }
  });

  mock.onGet(/\/tenant\/customers\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const customer = mockCustomers.find(c => c.id === id);
    if (customer) return [200, { success: true, data: { customer } }];
    return [404, { success: false, error: { message: 'Customer not found' } }];
  });

  mock.onGet(/\/tenant\/customers/).reply(200, {
    success: true,
    data: { customers: mockCustomers, total: mockCustomers.length, page: 1, limit: 50 }
  });

  mock.onGet(/^\/pos\/credit-ledger/).reply((config) => {
    const debtors = mockCustomers.filter(c => (c.outstanding_debt || 0) > 0);
    return [200, { success: true, data: { debtors, total: debtors.length } }];
  });

  mock.onGet(/\/tenant\/customers\/[^/]+\/credit-history/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const history = mockCreditHistory.filter(h => h.customer_id === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return [200, { success: true, data: { history } }];
  });

  mock.onPost(/\/tenant\/customers\/[^/]+\/settle-debt/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const { amount, payment_method } = JSON.parse(config.data);
    
    const customer = mockCustomers.find(c => c.id === id);
    if (!customer) return [404, { success: false, message: 'Customer not found' }];
    if (amount <= 0 || amount > customer.outstanding_debt) return [400, { success: false, message: 'Invalid amount' }];
    
    customer.outstanding_debt -= amount;
    
    mockCreditHistory.push({
      id: `ch${Date.now()}`,
      customer_id: id,
      type: 'settlement',
      amount,
      balance_after: customer.outstanding_debt,
      reference: `SET-${Math.floor(Math.random() * 10000)}`,
      payment_method,
      date: new Date().toISOString()
    });
    
    return [200, { success: true, message: 'Debt settled successfully', data: { new_balance: customer.outstanding_debt } }];
  });

  // Orders
  let mockOrders = [
    { id: 'o1', reference: 'ORD-1001', channel: 'online', customer_name: 'John Doe', customer_email: 'john@example.com', total_amount: 850.00, items_count: 1, status: 'pending', payment_method: 'paystack', created_at: new Date().toISOString() },
    { id: 'o2', reference: 'ORD-1002', channel: 'online', customer_name: 'Jane Smith', customer_email: 'jane@example.com', total_amount: 920.00, items_count: 2, status: 'processing', payment_method: 'paystack', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'o3', reference: 'ORD-1003', channel: 'online', customer_name: 'Kwame Nkrumah', customer_email: 'kwame@ghana.com', total_amount: 4500.00, items_count: 3, status: 'delivered', payment_method: 'cash_on_delivery', created_at: new Date(Date.now() - 3*86400000).toISOString() },
    { id: 'o4', reference: 'ORD-1004', channel: 'online', customer_name: 'Abena Asante', customer_email: 'abena@gh.com', total_amount: 1250.00, items_count: 1, status: 'shipped', payment_method: 'paystack', created_at: new Date(Date.now() - 2*86400000).toISOString() },
    { id: 'o5', reference: 'ORD-1005', channel: 'pos', customer_name: 'Kofi Boateng', customer_email: 'kofi@gh.com', total_amount: 380.00, items_count: 2, status: 'cancelled', payment_method: 'cash', created_at: new Date(Date.now() - 5*86400000).toISOString() },
    { id: 'o6', reference: 'ORD-1006', channel: 'online', customer_name: 'Ama Owusu', customer_email: 'ama@gh.com', total_amount: 2100.00, items_count: 4, status: 'pending', payment_method: 'paystack', created_at: new Date(Date.now() - 1*86400000).toISOString() },
  ];

  mock.onGet(/\/tenant\/orders\/[^/]+\/items/).reply(200, {
    success: true,
    data: {
      items: [
        { id: 'oi1', product_name: 'Nike Air Max', sku: 'NK-AM-01', quantity: 1, unit_price: 850.00, total_price: 850.00, image_url: null }
      ]
    }
  });

  mock.onPut(/\/tenant\/orders\/[^/]+\/status/).reply((config) => {
    const id = config.url?.split('/')[3];
    const { status } = JSON.parse(config.data);
    const orderIndex = mockOrders.findIndex(o => o.id === id);
    if (orderIndex !== -1) {
      mockOrders[orderIndex].status = status;
      return [200, { success: true, message: 'Order status updated' }];
    }
    return [404, { success: false, error: { message: 'Order not found' } }];
  });

  mock.onPost(/\/tenant\/orders\/[^/]+\/refund/).reply((config) => {
    const id = config.url?.split('/')[3];
    const { type, amount } = JSON.parse(config.data);
    const orderIndex = mockOrders.findIndex(o => o.id === id);
    
    if (orderIndex !== -1) {
      const order = mockOrders[orderIndex];
      if (type === 'full' || amount >= order.total_amount) {
        mockOrders[orderIndex] = { ...order, status: 'refunded', total_amount: 0 };
      } else {
        mockOrders[orderIndex] = { ...order, status: 'partially_refunded', total_amount: order.total_amount - amount };
      }
      return [200, { success: true, message: 'Refund processed' }];
    }
    return [404, { success: false, message: 'Order not found' }];
  });

  mock.onGet(/\/tenant\/orders\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const order = mockOrders.find(o => o.id === id);
    if (order) return [200, { success: true, data: { order } }];
    return [404, { success: false, error: { message: 'Order not found' } }];
  });

  mock.onGet(/\/tenant\/orders/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const status = searchParams.get('status') || '';
    const channel = searchParams.get('channel') || '';

    let filtered = [...mockOrders];
    if (status) {
      filtered = filtered.filter(o => o.status === status);
    }
    if (channel) {
      filtered = filtered.filter(o => o.channel === channel);
    }

    return [200, { success: true, data: { orders: filtered, total: filtered.length, page: 1, limit: 50 } }];
  });

  // Storefront Settings
  let mockStorefrontSettings = {
    store_name: 'HeadlessPOS Demo Store',
    tagline: 'The best products in Ghana',
    logo_url: '',
    banner_url: '',
    primary_color: '#4f46e5',
    announcement_text: 'Free delivery on orders over GHS 1000!',
    announcement_active: true,
    featured_product_ids: ['p1', 'p2']
  };

  mock.onGet(/\/tenant\/storefront\/settings/).reply(200, {
    success: true,
    data: { settings: mockStorefrontSettings }
  });

  mock.onPut(/\/tenant\/storefront\/settings/).reply((config) => {
    mockStorefrontSettings = { ...mockStorefrontSettings, ...JSON.parse(config.data) };
    return [200, { success: true, message: 'Settings updated' }];
  });

  mock.onGet(/\/tenant\/storefront\/deployment/).reply(200, {
    success: true,
    data: { deployment: { url: 'https://demo-store.headlesspos.com', deployed_at: new Date().toISOString(), template: 'modern' } }
  });

  // Discounts
  let mockDiscounts = [
    { id: 'd1', code: 'WELCOME10', type: 'percentage', value: 10, min_order_amount: null, max_uses: null, uses_count: 45, is_active: true, expires_at: null },
    { id: 'd2', code: 'MINUS50', type: 'fixed', value: 50, min_order_amount: 500, max_uses: 100, uses_count: 100, is_active: false, expires_at: new Date(Date.now() + 7*86400000).toISOString() }
  ];

  mock.onGet(/\/tenant\/discounts/).reply(200, {
    success: true,
    data: { discounts: mockDiscounts }
  });

  mock.onPost(/\/tenant\/discounts\/[^/]+\/toggle/).reply((config) => {
    const id = config.url?.split('/')[3];
    const dIndex = mockDiscounts.findIndex(d => d.id === id);
    if (dIndex !== -1) {
      mockDiscounts[dIndex].is_active = !mockDiscounts[dIndex].is_active;
      return [200, { success: true, data: { discount: mockDiscounts[dIndex] } }];
    }
    return [404, { success: false }];
  });

  mock.onPost(/\/tenant\/discounts/).reply((config) => {
    const newD = { id: `d${Date.now()}`, ...JSON.parse(config.data), uses_count: 0 };
    mockDiscounts.push(newD);
    return [200, { success: true, data: { discount: newD } }];
  });

  mock.onPut(/\/tenant\/discounts\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const dIndex = mockDiscounts.findIndex(d => d.id === id);
    if (dIndex !== -1) {
      mockDiscounts[dIndex] = { ...mockDiscounts[dIndex], ...JSON.parse(config.data) };
      return [200, { success: true }];
    }
    return [404, { success: false }];
  });

  mock.onDelete(/\/tenant\/discounts\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    mockDiscounts = mockDiscounts.filter(d => d.id !== id);
    return [200, { success: true }];
  });

  // Catch-all for any other GET requests to prevent errors during design
  mock.onGet(/.*/).reply(200, { success: true, data: {} });
  mock.onPost(/.*/).reply(200, { success: true, data: {} });
}
