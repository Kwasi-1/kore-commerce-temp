import MockAdapter from 'axios-mock-adapter';
import apiClient from './client';

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
  
  const mockProducts = [
    { id: 'p1', name: 'Nike Air Max', sku: 'NK-AM-01', price: 850, cost_price: 500, stock_quantity: 4, reorder_point: 5, category: 'Shoes' },
    { id: 'p2', name: 'Adidas Ultraboost', sku: 'AD-UB-02', price: 920, cost_price: 600, stock_quantity: 12, reorder_point: 5, category: 'Shoes' },
    { id: 'p3', name: 'Apple AirPods Pro', sku: 'AP-AP-03', price: 3500, cost_price: 2800, stock_quantity: 2, reorder_point: 5, category: 'Electronics' },
    { id: 'p4', name: 'Sony WH-1000XM4', sku: 'SN-WH-04', price: 4200, cost_price: 3100, stock_quantity: 8, reorder_point: 3, category: 'Electronics' },
    { id: 'p5', name: 'Basic White Tee', sku: 'AP-WT-05', price: 120, cost_price: 40, stock_quantity: 45, reorder_point: 20, category: 'Apparel' },
    { id: 'p6', name: 'Nike Socks (Out of Stock)', sku: 'NK-SK-06', price: 40, cost_price: 15, stock_quantity: 0, reorder_point: 10, category: 'Apparel' },
  ];

  mock.onGet(/\/tenant\/products/).reply(200, {
    success: true,
    data: { products: mockProducts }
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

  mock.onGet(/\/tenant\/expenses/).reply(200, {
    success: true,
    data: {
      expenses: [
        { id: 'e1', description: 'Electricity Bill', amount: 1500, category: 'utilities', date: new Date().toISOString(), logged_by_name: 'Kwame Mensah' },
        { id: 'e2', description: 'Printer Ink', amount: 450, category: 'supplies', date: new Date().toISOString(), logged_by_name: 'Ama Serwaa' }
      ]
    }
  });
  
  // -----------------------------------------------------
  // SUPPLIERS & POs
  // -----------------------------------------------------
  
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
  
  // Catch-all for any other GET requests to prevent errors during design
  mock.onGet(/.*/).reply(200, { success: true, data: {} });
  mock.onPost(/.*/).reply(200, { success: true, data: {} });
}
