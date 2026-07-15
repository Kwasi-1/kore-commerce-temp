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

  const mockSuppliers = [
    { id: 'sup1', name: 'TechWholesale Ghana', contact_person: 'John Doe', email: 'john@techwholesale.gh', phone: '0241234567', is_active: true, status: 'active' },
    { id: 'sup2', name: 'Accra Garments', contact_person: 'Jane Smith', email: 'jane@garments.gh', phone: '0209876543', is_active: true, status: 'active' }
  ];

  let mockProducts = [
    {
      id: 'p1',
      name: 'Nike Air Max',
      description: 'Classic lifestyle sneakers.',
      category: 'Shoes',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v1',
          sku: 'NK-AM-01',
          variant_attributes: {},
          base_unit_name: 'pair',
          cost_price_per_base_unit: 500,
          stock_quantity: 4,
          low_stock_threshold: 5,
          sell_mode: 'unit_only',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p1_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 850 },
                { price_type: 'wholesale', price: 765 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p2',
      name: 'Adidas Ultraboost',
      description: 'High-performance running shoes.',
      category: 'Shoes',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v2',
          sku: 'AD-UB-02',
          variant_attributes: {},
          base_unit_name: 'pair',
          cost_price_per_base_unit: 600,
          stock_quantity: 12,
          low_stock_threshold: 5,
          sell_mode: 'pack_only',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p2_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: false,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 920 },
                { price_type: 'wholesale', price: 850 }
              ]
            },
            {
              id: 'tier_p2_b',
              name: 'Box of 2',
              units_per_tier: 2,
              is_base_unit: false,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 1800 },
                { price_type: 'wholesale', price: 1700 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p3',
      name: 'Apple AirPods Pro',
      description: 'True wireless noise cancelling earbuds.',
      category: 'Electronics',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1588449668338-d15168b5a4c5?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v3',
          sku: 'AP-AP-03',
          variant_attributes: {},
          base_unit_name: 'piece',
          cost_price_per_base_unit: 2800,
          stock_quantity: 2,
          low_stock_threshold: 5,
          sell_mode: 'flexible',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p3_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 3500 },
                { price_type: 'wholesale', price: 3200 }
              ]
            },
            {
              id: 'tier_p3_c',
              name: 'Case of 10',
              units_per_tier: 10,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 32000 },
                { price_type: 'wholesale', price: 30000 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p4',
      name: 'Sony WH-1000XM4',
      description: 'Industry-leading noise cancelling headphones.',
      category: 'Electronics',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v4',
          sku: 'SN-WH-04',
          variant_attributes: {},
          base_unit_name: 'piece',
          cost_price_per_base_unit: 3100,
          stock_quantity: 8,
          low_stock_threshold: 3,
          sell_mode: 'unit_only',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p4_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 4200 },
                { price_type: 'wholesale', price: 3780 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p5',
      name: 'Basic White Tee',
      description: 'Comfy cotton crewneck white t-shirt.',
      category: 'Apparel',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v5',
          sku: 'AP-WT-05',
          variant_attributes: {},
          base_unit_name: 'piece',
          cost_price_per_base_unit: 40,
          stock_quantity: 45,
          low_stock_threshold: 20,
          sell_mode: 'flexible',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p5_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 120 },
                { price_type: 'wholesale', price: 100 }
              ]
            },
            {
              id: 'tier_p5_c',
              name: 'Carton of 24',
              units_per_tier: 24,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 2400 },
                { price_type: 'wholesale', price: 2200 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p6',
      name: 'Nike Socks',
      description: 'Athletic cotton crew socks.',
      category: 'Apparel',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1582966772680-860e372bb558?w=400'],
      has_variants: true,
      variants: [
        {
          id: 'p6_black',
          sku: 'NK-SK-06',
          variant_attributes: { Color: 'Black' },
          base_unit_name: 'pair',
          cost_price_per_base_unit: 15,
          stock_quantity: 15,
          low_stock_threshold: 10,
          sell_mode: 'unit_only',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p6_black_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 40 },
                { price_type: 'wholesale', price: 36 }
              ]
            }
          ]
        },
        {
          id: 'p6_white',
          sku: 'NK-SK-07',
          variant_attributes: { Color: 'White' },
          base_unit_name: 'pair',
          cost_price_per_base_unit: 15,
          stock_quantity: 10,
          low_stock_threshold: 10,
          sell_mode: 'unit_only',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p6_white_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 40 },
                { price_type: 'wholesale', price: 36 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p7',
      name: 'Leather Wallet',
      description: 'Genuine leather bi-fold wallet.',
      category: 'Accessories',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1627124718515-e3d9315b768b?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v7',
          sku: 'LW-07',
          variant_attributes: {},
          base_unit_name: 'piece',
          cost_price_per_base_unit: 100,
          stock_quantity: 20,
          low_stock_threshold: 5,
          sell_mode: 'unit_only',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p7_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 250 },
                { price_type: 'wholesale', price: 225 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p8',
      name: 'Sunglasses Classic',
      description: 'Retro style black sunglasses.',
      category: 'Accessories',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v8',
          sku: 'SG-08',
          variant_attributes: {},
          base_unit_name: 'piece',
          cost_price_per_base_unit: 150,
          stock_quantity: 10,
          low_stock_threshold: 5,
          sell_mode: 'unit_only',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p8_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 380 },
                { price_type: 'wholesale', price: 340 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p9',
      name: 'Samsung Galaxy Tab',
      description: 'Android tablet with premium display.',
      category: 'Electronics',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v9',
          sku: 'SG-TAB-09',
          variant_attributes: {},
          base_unit_name: 'piece',
          cost_price_per_base_unit: 4200,
          stock_quantity: 3,
          low_stock_threshold: 2,
          sell_mode: 'unit_only',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p9_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 5500 },
                { price_type: 'wholesale', price: 4950 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p10',
      name: 'Running Shorts',
      description: 'Lightweight breathable running shorts.',
      category: 'Apparel',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v10',
          sku: 'RS-10',
          variant_attributes: {},
          base_unit_name: 'piece',
          cost_price_per_base_unit: 35,
          stock_quantity: 15,
          low_stock_threshold: 15,
          sell_mode: 'unit_only',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p10_u',
              name: 'Unit',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 95 },
                { price_type: 'wholesale', price: 85 }
              ]
            }
          ]
        }
      ]
    }
  ] as any[];

  let mockPurchaseOrders = [
    {
      id: 'po1',
      reference_number: 'PO-2026-001',
      supplier_id: 'sup1',
      supplier: { id: 'sup1', name: 'TechWholesale Ghana' },
      status: 'draft',
      total_amount: 15000,
      is_credit_purchase: true,
      credit_due_date: new Date(Date.now() + 5*86400000).toISOString().split('T')[0],
      date_created: new Date().toISOString(),
      items: [
        { variant_id: 'v3', packaging_tier_id: 'tier_p3_c', quantity: 1, cost_price: 15000 }
      ]
    },
    {
      id: 'po2',
      reference_number: 'PO-2026-002',
      supplier_id: 'sup2',
      supplier: { id: 'sup2', name: 'Accra Garments' },
      status: 'ordered',
      total_amount: 3400,
      is_credit_purchase: false,
      date_created: new Date().toISOString(),
      items: [
        { variant_id: 'v5', packaging_tier_id: 'tier_p5_c', quantity: 2, cost_price: 1700 }
      ]
    }
  ] as any[];

  // -----------------------------------------------------
  // AUTH & STAFF
  // -----------------------------------------------------
  
  const mockStaff = [
    { id: 'u1', name: 'Kwame Mensah', first_name: 'Kwame', last_name: 'Mensah', email: 'owner@store.com', role: 'owner', is_active: true, last_login: new Date().toISOString() },
    { id: 'u2', name: 'Ama Serwaa', first_name: 'Ama', last_name: 'Serwaa', email: 'ama@store.com', role: 'manager', is_active: true, last_login: new Date().toISOString() },
    { id: 'u3', name: 'Kofi Annan', first_name: 'Kofi', last_name: 'Annan', email: 'kofi@store.com', role: 'cashier', is_active: true, last_login: new Date().toISOString() },
  ];

  let mockTenant = {
    id: 't1',
    name: 'HeadlessPOS Demo Store',
    currency: 'GHS',
    plan: 'full_suite',
    track_expiry_enabled: false
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
      additionalNumber: '',
      track_expiry_enabled: false
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

  // Enable Expiry date tracking
  mock.onPost('/tenant/settings/expiry/enable').reply(() => {
    mockTenant.track_expiry_enabled = true;
    mockTenantSettings.store.track_expiry_enabled = true;
    return [200, { success: true, tenant: mockTenant }];
  });

  // Disable Expiry date tracking
  mock.onPost('/tenant/settings/expiry/disable').reply(() => {
    mockTenant.track_expiry_enabled = false;
    mockTenantSettings.store.track_expiry_enabled = false;
    return [200, { success: true, tenant: mockTenant }];
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
  
  mock.onGet(/\/tenant\/products\/[^/]+$/).reply((config) => {
    const url = config.url || '';
    const id = url.split('/').pop() || '';
    const product = mockProducts.find(p => p.id === id);
    if (product) {
      return [200, { success: true, data: { product } }];
    }
    return [404, { success: false, error: { message: 'Product not found' } }];
  });

  mock.onGet(/\/tenant\/products(\?.*)?$/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const search = (searchParams.get('search') || '').toLowerCase();
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';

    let filtered = [...mockProducts];
    if (search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.variants.some((v: any) => v.sku.toLowerCase().includes(search)) ||
        (p.category || '').toLowerCase().includes(search)
      );
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(p => p.category === category);
    }

    const mapped = filtered.map(p => {
      const totalStock = p.variants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
      let expiryWarning = null;
      if (mockTenant.track_expiry_enabled) {
        const warningVar = p.variants.find((v: any) => v.track_expiry);
        if (warningVar) {
          if (warningVar.id.includes('v3') || warningVar.id.includes('p3')) {
            expiryWarning = {
              has_warning: true,
              earliest_expiry: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
              days_until_expiry: 15
            };
          } else if (warningVar.id.includes('v1') || warningVar.id.includes('p1')) {
            expiryWarning = {
              has_warning: true,
              earliest_expiry: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
              days_until_expiry: -2
            };
          }
        }
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category || 'General',
        images: p.images || [],
        has_variants: !!p.has_variants,
        variant_count: p.variants?.length || 0,
        total_stock_base_units: totalStock,
        status: p.status || 'active',
        expiry_warning: expiryWarning,
        variants: p.variants || [],
        // Compatibility properties:
        quantity: totalStock,
        sku: p.variants?.[0]?.sku || ''
      };
    });

    return [200, { success: true, data: { products: mapped } }];
  });

  const getPosProductsData = (products: any[]) => {
    const grouped: Record<string, any> = {};
    
    products.forEach(p => {
      const variants = p.variants.map((v: any) => {
        const mappedTiers = v.packaging_tiers.map((t: any) => {
          const retailPrice = t.prices?.find((pr: any) => pr.price_type === 'retail')?.price || 0;
          const wholesalePrice = t.prices?.find((pr: any) => pr.price_type === 'wholesale')?.price || null;
          return {
            id: t.id,
            name: t.name,
            units_per_tier: t.units_per_tier,
            is_base_unit: t.is_base_unit,
            is_default_sale_unit: t.is_default_sale_unit,
            is_default_purchase_unit: t.is_default_purchase_unit,
            prices: {
              retail: retailPrice,
              wholesale: wholesalePrice
            }
          };
        });

        let stock_display = v.stock_quantity;
        let stock_display_unit = v.base_unit_name || 'unit';
        const defaultTier = mappedTiers.find((t: any) => t.is_default_sale_unit) || mappedTiers[0];
        if (v.sell_mode === 'pack_only' && defaultTier) {
          stock_display = Math.floor(v.stock_quantity / defaultTier.units_per_tier);
          stock_display_unit = defaultTier.name;
        }

        return {
          variant_id: v.id,
          sku: v.sku,
          variant_attributes: v.variant_attributes || {},
          sell_mode: v.sell_mode || 'unit_only',
          base_unit_name: v.base_unit_name || 'unit',
          stock_quantity: v.stock_quantity,
          stock_display,
          stock_display_unit,
          low_stock: v.stock_quantity <= (v.low_stock_threshold || 5),
          packaging_tiers: mappedTiers,
          expiry_warning: mockTenant.track_expiry_enabled && v.track_expiry ? {
            has_warning: true,
            earliest_expiry: v.id.includes('p1') 
              ? new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] 
              : new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
            days_until_expiry: v.id.includes('p1') ? -2 : 15
          } : null
        };
      });

      grouped[p.name] = {
        id: `parent-${p.id}`,
        name: p.name,
        category: p.category,
        imageUrl: p.images?.[0] || undefined,
        description: p.description,
        variants
      };
    });

    return Object.values(grouped);
  };

  mock.onGet(/\/pos\/products\/search/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const query = (searchParams.get('q') || '').toLowerCase();

    let filtered = [...mockProducts];
    if (query) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.variants.some((v: any) => v.sku.toLowerCase().includes(query)) ||
        (p.category || '').toLowerCase().includes(query)
      );
    }

    return [200, { success: { data: { products: getPosProductsData(filtered) } } }];
  });

  mock.onGet(/\/pos\/products$/).reply(() => {
    return [200, {
      success: {
        data: {
          products: getPosProductsData(mockProducts)
        }
      }
    }];
  });

  mock.onPost('/tenant/products').reply((config) => {
    const payload = JSON.parse(config.data);
    const newId = `p${Date.now()}`;
    
    let variants: any[] = [];
    if (payload.has_variants) {
      variants = (payload.variants || []).map((v: any, index: number) => ({
        id: `v-${newId}-${index}`,
        sku: v.sku,
        variant_attributes: v.variant_attributes || {},
        base_unit_name: v.base_unit_name || 'unit',
        cost_price_per_base_unit: v.cost_price_per_base_unit != null ? Number(v.cost_price_per_base_unit) : null,
        stock_quantity: Number(v.stock_quantity) || 0,
        low_stock_threshold: Number(v.low_stock_threshold) || 5,
        sell_mode: v.sell_mode || 'unit_only',
        track_expiry: !!v.track_expiry,
        packaging_tiers: (v.packaging_tiers || []).map((t: any, tIdx: number) => ({
          id: t.id || `tier-${newId}-${index}-${tIdx}`,
          name: t.name,
          units_per_tier: Number(t.units_per_tier) || 1,
          is_base_unit: !!t.is_base_unit,
          is_default_sale_unit: !!t.is_default_sale_unit,
          is_default_purchase_unit: !!t.is_default_purchase_unit,
          prices: t.prices || []
        }))
      }));
    } else if (payload.variant) {
      const v = payload.variant;
      variants = [
        {
          id: `v-${newId}`,
          sku: v.sku,
          variant_attributes: {},
          base_unit_name: v.base_unit_name || 'unit',
          cost_price_per_base_unit: v.cost_price_per_base_unit != null ? Number(v.cost_price_per_base_unit) : null,
          stock_quantity: Number(v.stock_quantity) || 0,
          low_stock_threshold: Number(v.low_stock_threshold) || 5,
          sell_mode: v.sell_mode || 'unit_only',
          track_expiry: !!v.track_expiry,
          packaging_tiers: (v.packaging_tiers || []).map((t: any, tIdx: number) => ({
            id: t.id || `tier-${newId}-${tIdx}`,
            name: t.name,
            units_per_tier: Number(t.units_per_tier) || 1,
            is_base_unit: !!t.is_base_unit,
            is_default_sale_unit: !!t.is_default_sale_unit,
            is_default_purchase_unit: !!t.is_default_purchase_unit,
            prices: t.prices || []
          }))
        }
      ];
    }

    const newProduct = {
      id: newId,
      name: payload.name,
      description: payload.description || '',
      category: payload.category || 'General',
      status: payload.status || 'active',
      images: payload.images || [],
      has_variants: !!payload.has_variants,
      variants
    };

    mockProducts.push(newProduct);

    return [200, {
      success: {
        status: "OK",
        code: 200,
        data: {
          product: newProduct
        }
      }
    }];
  });

  mock.onPut(/\/tenant\/products\/[^/]+$/).reply((config) => {
    const url = config.url || '';
    const id = url.split('/').pop() || '';
    const payload = JSON.parse(config.data);
    
    const pIdx = mockProducts.findIndex(p => p.id === id);
    if (pIdx !== -1) {
      const p = mockProducts[pIdx];
      p.name = payload.name;
      p.description = payload.description || '';
      p.category = payload.category;
      p.status = payload.status || p.status;
      
      if (payload.has_variants && payload.variants) {
        p.variants = payload.variants.map((v: any, index: number) => ({
          id: v.id || `v-${id}-${index}`,
          sku: v.sku,
          variant_attributes: v.variant_attributes || {},
          base_unit_name: v.base_unit_name || 'unit',
          cost_price_per_base_unit: v.cost_price_per_base_unit != null ? Number(v.cost_price_per_base_unit) : null,
          stock_quantity: Number(v.stock_quantity) || 0,
          low_stock_threshold: Number(v.low_stock_threshold) || 5,
          sell_mode: v.sell_mode || 'unit_only',
          track_expiry: !!v.track_expiry,
          packaging_tiers: (v.packaging_tiers || []).map((t: any, tIdx: number) => ({
            id: t.id || `tier-${id}-${index}-${tIdx}`,
            name: t.name,
            units_per_tier: Number(t.units_per_tier) || 1,
            is_base_unit: !!t.is_base_unit,
            is_default_sale_unit: !!t.is_default_sale_unit,
            is_default_purchase_unit: !!t.is_default_purchase_unit,
            prices: t.prices || []
          }))
        }));
      } else if (payload.variant) {
        const v = payload.variant;
        p.variants = [
          {
            id: v.id || `v-${id}`,
            sku: v.sku,
            variant_attributes: {},
            base_unit_name: v.base_unit_name || 'unit',
            cost_price_per_base_unit: v.cost_price_per_base_unit != null ? Number(v.cost_price_per_base_unit) : null,
            stock_quantity: Number(v.stock_quantity) || 0,
            low_stock_threshold: Number(v.low_stock_threshold) || 5,
            sell_mode: v.sell_mode || 'unit_only',
            track_expiry: !!v.track_expiry,
            packaging_tiers: (v.packaging_tiers || []).map((t: any, tIdx: number) => ({
              id: t.id || `tier-${id}-${tIdx}`,
              name: t.name,
              units_per_tier: Number(t.units_per_tier) || 1,
              is_base_unit: !!t.is_base_unit,
              is_default_sale_unit: !!t.is_default_sale_unit,
              is_default_purchase_unit: !!t.is_default_purchase_unit,
              prices: t.prices || []
            }))
          }
        ];
      }
      
      return [200, { success: true, message: 'Product updated successfully', data: { product: p } }];
    }
    
    return [404, { success: false, error: { message: 'Product not found' } }];
  });

  mock.onPost('/tenant/products/bulk').reply((config) => {
    const data = JSON.parse(config.data);
    if (data.products && Array.isArray(data.products)) {
      data.products.forEach((p: any) => {
        const newId = `p${Math.floor(Math.random() * 10000)}`;
        const newProduct = {
          id: newId,
          name: p.name,
          description: p.description || '',
          category: p.category || 'General',
          status: 'active',
          images: [],
          has_variants: false,
          variants: [
            {
              id: `v-${newId}`,
              sku: p.sku || `SKU-${Math.floor(Math.random() * 10000)}`,
              variant_attributes: {},
              base_unit_name: 'unit',
              cost_price_per_base_unit: p.cost_price || (p.price * 0.7),
              stock_quantity: p.stock_quantity || 0,
              low_stock_threshold: 5,
              sell_mode: 'unit_only',
              track_expiry: false,
              packaging_tiers: [
                {
                  id: `tier-${newId}-u`,
                  name: 'Unit',
                  units_per_tier: 1,
                  is_base_unit: true,
                  is_default_sale_unit: true,
                  is_default_purchase_unit: true,
                  prices: [
                    { price_type: 'retail', price: p.price || 0 }
                  ]
                }
              ]
            }
          ]
        };
        mockProducts.push(newProduct);
      });
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

  mock.onPatch('/tenant/products/stock-update').reply((config) => {
    const { updates } = JSON.parse(config.data);
    (updates || []).forEach((u: any) => {
      const pIdx = mockProducts.findIndex(p => p.id === u.productId);
      if (pIdx !== -1) {
        const p = mockProducts[pIdx];
        if (p.variants && p.variants.length > 0) {
          p.variants[0].stock_quantity = u.quantity;
        }
      }
    });
    return [200, { success: true, message: 'Stock reconciliation updated' }];
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
    if (url.includes('/receipt') || url.includes('/refund')) return [404, {}];
    
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const method = searchParams.get('payment_method') || '';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const cashierName = searchParams.get('cashier_name');

    let filtered = [...mockTransactions];
    if (method) {
      filtered = filtered.filter(t => t.paymentMethod === method);
    }

    if (cashierName) {
      filtered = filtered.filter(t => t.cashierName?.toLowerCase() === cashierName.toLowerCase());
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

  // POST /pos/transactions
  mock.onPost('/pos/transactions').reply((config) => {
    const payload = JSON.parse(config.data);
    const receiptNumber = `RCP-${String(mockTransactions.length + 1).padStart(4, '0')}`;
    const newTxId = `tx${mockTransactions.length + 1}`;
    
    // Deduct stock of variants
    const items = payload.items || [];
    items.forEach((item: any) => {
      for (const p of mockProducts) {
        const variant = p.variants.find((v: any) => v.id === item.variant_id);
        if (variant) {
          const tier = variant.packaging_tiers.find((t: any) => t.id === item.packaging_tier_id);
          const unitsPerTier = tier ? tier.units_per_tier : 1;
          const qtyBaseUnits = item.quantity * unitsPerTier;
          variant.stock_quantity = Math.max(0, variant.stock_quantity - qtyBaseUnits);
          break;
        }
      }
    });

    const newTx = {
      id: newTxId,
      receiptNumber,
      dateCreated: new Date().toISOString(),
      cashierName: payload.cashier_name || 'Kofi Annan',
      paymentMethod: payload.payment_method || 'cash',
      totalAmount: payload.total_amount || items.reduce((sum: number, i: any) => sum + (i.unit_price * i.quantity), 0),
      status: 'completed',
      items: items.map((i: any) => {
        let name = 'Unknown Item';
        for (const p of mockProducts) {
          const v = p.variants.find((v: any) => v.id === i.variant_id);
          if (v) {
            const attrStr = Object.values(v.variant_attributes || {}).join(' / ');
            name = attrStr ? `${p.name} · ${attrStr}` : p.name;
            break;
          }
        }
        return {
          name,
          qty: i.quantity,
          price: i.unit_price
        };
      })
    };

    mockTransactions = [newTx, ...mockTransactions];
    
    return [200, {
      success: true,
      data: {
        transaction: newTx
      }
    }];
  });
  
  mock.onGet(/\/tenant\/inventory\/suppliers/).reply(200, {
    success: true,
    data: {
      suppliers: mockSuppliers
    }
  });

  // GET /tenant/purchase-orders
  mock.onGet(/\/tenant\/purchase-orders(\?.*)?$/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const status = searchParams.get('status') || '';

    let filtered = [...mockPurchaseOrders];
    if (status && status !== 'all') {
      filtered = filtered.filter(po => po.status === status);
    }

    return [200, {
      success: true,
      data: {
        purchaseOrders: filtered
      }
    }];
  });

  // POST /tenant/purchase-orders
  mock.onPost('/tenant/purchase-orders').reply((config) => {
    const payload = JSON.parse(config.data);
    const supplier = mockSuppliers.find(s => s.id === payload.supplier_id) || { id: payload.supplier_id, name: 'Unknown Supplier' };
    
    const totalAmount = (payload.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.cost_price), 0);
    
    const newPO = {
      id: `po-${Date.now()}`,
      reference_number: payload.reference_number,
      supplier_id: payload.supplier_id,
      supplier: { id: supplier.id, name: supplier.name },
      status: 'ordered',
      total_amount: totalAmount,
      is_credit_purchase: !!payload.is_credit_purchase,
      credit_due_date: payload.credit_due_date || null,
      notes: payload.notes || '',
      date_created: new Date().toISOString(),
      items: payload.items || []
    };

    mockPurchaseOrders = [newPO, ...mockPurchaseOrders];
    
    return [200, {
      success: true,
      data: {
        purchaseOrder: newPO
      }
    }];
  });

  // POST /tenant/purchase-orders/:id/receive
  mock.onPost(/\/tenant\/purchase-orders\/[^/]+\/receive/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const poId = urlParts[urlParts.length - 2];
    
    const poIdx = mockPurchaseOrders.findIndex(po => po.id === poId);
    if (poIdx === -1) {
      return [404, { error: { message: 'Purchase order not found' } }];
    }
    
    const po = mockPurchaseOrders[poIdx];
    if (po.status === 'received') {
      return [400, { error: { message: 'Purchase order already received' } }];
    }
    
    po.status = 'received';
    
    // Add units to stock
    let unitsReceived = 0;
    po.items.forEach((item: any) => {
      for (const p of mockProducts) {
        const variant = p.variants.find((v: any) => v.id === item.variant_id);
        if (variant) {
          const tier = variant.packaging_tiers.find((t: any) => t.id === item.packaging_tier_id);
          const unitsPerTier = tier ? tier.units_per_tier : 1;
          const qtyBaseUnits = item.quantity * unitsPerTier;
          variant.stock_quantity += qtyBaseUnits;
          unitsReceived += qtyBaseUnits;
          
          variant.cost_price_per_base_unit = Number((item.cost_price / unitsPerTier).toFixed(4));
          break;
        }
      }
    });
    
    // Create supplier credit if applicable
    if (po.is_credit_purchase) {
      const newCredit = {
        id: `sc-${Date.now()}`,
        supplier_id: po.supplier_id,
        supplier_name: po.supplier.name,
        purchase_order_id: po.id,
        purchase_order_ref: po.reference_number,
        total_amount: po.total_amount,
        amount_paid: 0.00,
        balance_remaining: po.total_amount,
        status: "outstanding" as const,
        due_date: po.credit_due_date || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
        notes: po.notes || `Auto-created from PO ${po.reference_number}`,
        date_created: new Date().toISOString(),
        payments: []
      };
      mockSupplierCredits = [newCredit, ...mockSupplierCredits];
    }
    
    return [200, {
      success: {
        status: "OK",
        code: 200,
        data: {
          purchaseOrder: po,
          unitsReceived
        }
      }
    }];
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
    { 
      id: 'ch1', 
      customer_id: 'c1', 
      type: 'credit_purchase', 
      amount: 1500.00, 
      balance_after: 1500.00, 
      reference: 'RCP-0021', 
      date: new Date(Date.now() - 15*24*60*60*1000).toISOString(),
      items: [
        { name: 'Nike Air Max', quantity: 1, price: 850, subtotal: 850 },
        { name: 'Leather Wallet', quantity: 2, price: 250, subtotal: 500 },
        { name: 'Nike Socks', quantity: 3, price: 50, subtotal: 150 }
      ]
    },
    { id: 'ch2', customer_id: 'c1', type: 'settlement', purchase_id: 'ch1', amount: 650.00, balance_after: 850.00, reference: 'SET-001', payment_method: 'cash', date: new Date(Date.now() - 5*24*60*60*1000).toISOString() },
    { 
      id: 'ch3', 
      customer_id: 'c3', 
      type: 'credit_purchase', 
      amount: 1200.50, 
      balance_after: 1200.50, 
      reference: 'RCP-0044', 
      date: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
      items: [
        { name: 'Adidas Ultraboost', quantity: 1, price: 920, subtotal: 920 },
        { name: 'Leather Wallet', quantity: 1, price: 250, subtotal: 250 },
        { name: 'Nike Socks', quantity: 1, price: 30.50, subtotal: 30.50 }
      ]
    },
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
    const debtors = mockCustomers.map(c => {
      const purchases = mockCreditHistory.filter(h => h.customer_id === c.id && h.type === 'credit_purchase');
      const totalCredit = purchases.reduce((sum, p) => sum + p.amount, 0);
      
      const settlements = mockCreditHistory.filter(h => h.customer_id === c.id && h.type === 'settlement');
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      
      const outstanding = Math.max(0, totalCredit - totalSettled);
      c.outstanding_debt = outstanding;
      
      const lastCreditItem = purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      c.last_credit_date = lastCreditItem ? lastCreditItem.date : null;
      
      return c;
    }).filter(c => c.outstanding_debt > 0);
    
    return [200, { success: true, data: { debtors, total: debtors.length } }];
  });

  mock.onGet(/\/tenant\/customers\/[^/]+\/credit-purchases/).reply((config) => {
    const url = config.url || '';
    const match = url.match(/\/tenant\/customers\/([^/?#]+)\/credit-purchases/);
    const customerId = match ? match[1] : '';
    
    const purchases = mockCreditHistory.filter(h => h.customer_id === customerId && h.type === 'credit_purchase');
    
    const data = purchases.map(p => {
      const settlements = mockCreditHistory.filter(h => h.type === 'settlement' && h.purchase_id === p.id);
      const totalPaid = settlements.reduce((sum, s) => sum + s.amount, 0);
      const outstanding = p.amount - totalPaid;
      const status = outstanding <= 0 ? 'settled' : (totalPaid > 0 ? 'partial' : 'unpaid');
      
      return {
        id: p.id,
        reference: p.reference,
        date: p.date,
        original_amount: p.amount,
        amount_paid: totalPaid,
        outstanding_debt: outstanding,
        status,
        items: p.items,
        repayments: settlements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    });
    
    return [200, { success: true, data: { purchases: data } }];
  });

  mock.onPost(/\/tenant\/customers\/[^/]+\/settle-all-debt/).reply((config) => {
    const url = config.url || '';
    const match = url.match(/\/tenant\/customers\/([^/?#]+)\/settle-all-debt/);
    const customerId = match ? match[1] : '';
    const { amount, payment_method } = JSON.parse(config.data);
    
    const customer = mockCustomers.find(c => c.id === customerId);
    if (!customer) return [404, { success: false, message: 'Customer not found' }];
    
    const purchases = mockCreditHistory.filter(h => h.customer_id === customerId && h.type === 'credit_purchase');
    const settlements = mockCreditHistory.filter(h => h.customer_id === customerId && h.type === 'settlement');
    const totalCredit = purchases.reduce((sum, p) => sum + p.amount, 0);
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    const currentOutstanding = Math.max(0, totalCredit - totalSettled);
    
    if (amount <= 0 || amount > currentOutstanding) {
      return [400, { success: false, message: 'Invalid settlement amount' }];
    }
    
    let remainingPayment = amount;
    const unpaidPurchases = purchases.map(p => {
      const pSettlements = mockCreditHistory.filter(h => h.type === 'settlement' && h.purchase_id === p.id);
      const pPaid = pSettlements.reduce((sum, s) => sum + s.amount, 0);
      return { ...p, outstanding: p.amount - pPaid };
    }).filter(p => p.outstanding > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
       
    const settlementDetails = [];
    
    for (const purchase of unpaidPurchases) {
      if (remainingPayment <= 0) break;
      
      const paymentToApply = Math.min(remainingPayment, purchase.outstanding);
      remainingPayment -= paymentToApply;
      
      const newSettlement = {
        id: `ch${Date.now()}-${Math.random()}`,
        purchase_id: purchase.id,
        customer_id: customerId,
        type: 'settlement',
        amount: paymentToApply,
        balance_after: purchase.outstanding - paymentToApply,
        reference: `SET-${Math.floor(Math.random() * 10000)}`,
        payment_method,
        date: new Date().toISOString()
      };
      
      mockCreditHistory.push(newSettlement);
      settlementDetails.push(newSettlement);
    }
    
    customer.outstanding_debt = Math.max(0, currentOutstanding - amount);
    
    return [200, { 
      success: true, 
      message: 'Consolidated settlement processed successfully', 
      data: { 
        new_balance: customer.outstanding_debt,
        settlements: settlementDetails
      } 
    }];
  });

  mock.onPost(/\/tenant\/credit-ledger\/[^/]+\/settle/).reply((config) => {
    const url = config.url || '';
    const match = url.match(/\/tenant\/credit-ledger\/([^/?#]+)\/settle/);
    const purchaseId = match ? match[1] : '';
    const { amount, payment_method } = JSON.parse(config.data);
    
    const purchase = mockCreditHistory.find(h => h.id === purchaseId);
    if (!purchase) return [404, { success: false, message: 'Credit record not found' }];
    
    const settlements = mockCreditHistory.filter(h => h.type === 'settlement' && h.purchase_id === purchaseId);
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    const remaining = purchase.amount - totalSettled;
    
    if (amount <= 0 || amount > remaining) {
      return [400, { success: false, message: 'Invalid settlement amount' }];
    }
    
    const newSettlement = {
      id: `ch${Date.now()}`,
      purchase_id: purchaseId,
      customer_id: purchase.customer_id,
      type: 'settlement',
      amount,
      balance_after: remaining - amount,
      reference: `SET-${Math.floor(Math.random() * 10000)}`,
      payment_method,
      date: new Date().toISOString()
    };
    
    mockCreditHistory.push(newSettlement);
    
    const customer = mockCustomers.find(c => c.id === purchase.customer_id);
    if (customer) {
      customer.outstanding_debt = Math.max(0, customer.outstanding_debt - amount);
    }
    
    return [200, { success: true, message: 'Payment recorded successfully', data: { new_balance: remaining - amount } }];
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

  // Suppliers list mock
  mock.onGet(/\/tenant\/suppliers/).reply(200, {
    success: true,
    data: {
      suppliers: mockSuppliers,
      pagination: { total_items: mockSuppliers.length, total_pages: 1, current_page: 1, per_page: 100 }
    }
  });

  // Parse stock upload mock
  mock.onPost('/tenant/stock/parse-upload').reply((config) => {
    return [200, {
      success: {
        status: "OK",
        code: 200,
        data: {
          matched: [
            {
              row_data: {
                product_name: "Nike Air Max",
                sku: "NK-AM-01",
                quantity: 15,
                cost_price: 500.0,
                packaging_tier_name: "Unit"
              },
              variant_id: "v1",
              variant_name: "Nike Air Max",
              sku: "NK-AM-01",
              current_stock: 4,
              quantity_to_add: 15,
              cost_price: 500.0,
              packaging_tier_id: "tier_p1_u",
              packaging_tier_name: "Unit"
            },
            {
              row_data: {
                product_name: "Sony WH-1000XM4",
                sku: "SN-WH-04",
                quantity: 5,
                cost_price: 3100.0,
                packaging_tier_name: "Unit"
              },
              variant_id: "v4",
              variant_name: "Sony WH-1000XM4",
              sku: "SN-WH-04",
              current_stock: 8,
              quantity_to_add: 5,
              cost_price: 3100.0,
              packaging_tier_id: "tier_p4_u",
              packaging_tier_name: "Unit"
            }
          ],
          unmatched: [
            {
              row_data: {
                product_name: "Adidas Yeezy Boost",
                sku: "AD-YB-99",
                quantity: 10,
                cost_price: 1200.0,
                packaging_tier_name: "Unit"
              },
              suggested_action: "add_new"
            }
          ],
          ambiguous: [
            {
              row_data: {
                product_name: "Nike Socks Multi",
                sku: "",
                quantity: 50,
                cost_price: 12.0,
                packaging_tier_name: "Unit"
              },
              candidates: [
                {
                  variant_id: "p6_black",
                  name: "Nike Socks (Black)",
                  sku: "NK-SK-06"
                },
                {
                  variant_id: "p6_white",
                  name: "Nike Socks (White)",
                  sku: "NK-SK-07"
                }
              ]
            }
          ]
        }
      }
    }];
  });

  // Confirm stock upload mock
  mock.onPost('/tenant/stock/confirm-upload').reply((config) => {
    const payload = JSON.parse(config.data);
    const matched = payload.matched || [];
    const matchedCount = matched.length;
    const newProductsCount = (payload.new_products || []).length;
    
    // Actually update mock stocks
    matched.forEach((m: any) => {
      for (const p of mockProducts) {
        const v = p.variants.find((v: any) => v.id === m.variant_id);
        if (v) {
          const tier = v.packaging_tiers.find((t: any) => t.id === m.packaging_tier_id);
          const unitsPerTier = tier ? tier.units_per_tier : 1;
          v.stock_quantity += m.quantity_to_add * unitsPerTier;
          if (m.cost_price) {
            v.cost_price_per_base_unit = Number((m.cost_price / unitsPerTier).toFixed(4));
          }
          break;
        }
      }
    });

    if (payload.is_credit_purchase && payload.supplier_id) {
      const supplier = mockSuppliers.find(s => s.id === payload.supplier_id) || { id: payload.supplier_id, name: 'Unknown Supplier' };
      const totalAmount = matched.reduce((sum: number, m: any) => sum + (m.quantity_to_add * (m.cost_price || 0)), 0);
      
      const newCredit = {
        id: `sc-${Date.now()}`,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        purchase_order_id: `po-${Date.now()}`,
        purchase_order_ref: `PO-UPLOAD-${Date.now().toString().slice(-4)}`,
        total_amount: totalAmount,
        amount_paid: 0.00,
        balance_remaining: totalAmount,
        status: "outstanding" as const,
        due_date: payload.credit_due_date || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
        notes: `Bulk stock upload credit purchase`,
        date_created: new Date().toISOString(),
        payments: []
      };
      mockSupplierCredits = [newCredit, ...mockSupplierCredits];
    }
    
    return [200, {
      success: {
        status: "OK",
        code: 200,
        message: "Stock upload confirmed successfully",
        data: {
          purchase_order_id: "po-mock-uuid",
          variants_updated: matchedCount,
          new_products_created: newProductsCount,
          stock_changes: [
            { sku: "NK-AM-01", name: "Nike Air Max", quantity_added: 15, new_stock_total: 19 }
          ]
        }
      }
    }];
  });

  // Mock adjustments database
  let mockAdjustments: Array<{
    id: string;
    variant_id: string;
    variant_name: string;
    sku: string;
    quantity: number;
    reason: string;
    notes: string;
    status: string;
    initiated_by: string;
    initiated_by_name: string;
    approved_by: string | null;
    approved_by_name: string | null;
    approved_at: string | null;
    rejection_note?: string;
    date_created: string;
  }> = [
    {
      id: "adj1",
      variant_id: "v1",
      variant_name: "Nike Air Max",
      sku: "NK-AM-01",
      quantity: -2,
      reason: "damaged",
      notes: "Scuffed leather on display shoe",
      status: "pending",
      initiated_by: "u3",
      initiated_by_name: "Kofi Annan",
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      date_created: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "adj2",
      variant_id: "v2",
      variant_name: "Adidas Ultraboost",
      sku: "AD-UB-02",
      quantity: -5,
      reason: "expired",
      notes: "Demo batch past shelf life",
      status: "approved",
      initiated_by: "u3",
      initiated_by_name: "Kofi Annan",
      approved_by: "u2",
      approved_by_name: "Ama Serwaa",
      approved_at: new Date(Date.now() - 86400000).toISOString(),
      date_created: new Date(Date.now() - 90000000).toISOString()
    },
    {
      id: "adj3",
      variant_id: "v4",
      variant_name: "Sony WH-1000XM4",
      sku: "SN-WH-04",
      quantity: 1,
      reason: "counting_error",
      notes: "Found extra unit behind drawer during shelf recount",
      status: "approved",
      initiated_by: "u2",
      initiated_by_name: "Ama Serwaa",
      approved_by: "u1",
      approved_by_name: "Kwame Mensah",
      approved_at: new Date(Date.now() - 172800000).toISOString(),
      date_created: new Date(Date.now() - 180000000).toISOString()
    }
  ];

  // GET /tenant/adjustments
  mock.onGet(/\/tenant\/adjustments/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const status = searchParams.get('status') || '';
    
    let filtered = [...mockAdjustments];
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }
    
    return [200, {
      success: {
        status: "OK",
        code: 200,
        data: {
          adjustments: filtered,
          pagination: {
            page: 1,
            perPage: 20,
            total: filtered.length,
            pages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    }];
  });

  // POST /tenant/adjustments
  mock.onPost(/\/tenant\/adjustments$/).reply((config) => {
    const { variant_id, quantity, reason, notes } = JSON.parse(config.data);
    
    let variantName = "Unknown Product";
    let sku = "SKU-UNKNOWN";
    
    for (const p of mockProducts) {
      const v = p.variants.find((v: any) => v.id === variant_id);
      if (v) {
        const attrStr = Object.values(v.variant_attributes || {}).join(' / ');
        variantName = attrStr ? `${p.name} · ${attrStr}` : p.name;
        sku = v.sku;
        break;
      }
    }
    
    const newAdj = {
      id: `adj-${Date.now()}`,
      variant_id,
      variant_name: variantName,
      sku,
      quantity: Number(quantity),
      reason,
      notes,
      status: "pending",
      initiated_by: "u1",
      initiated_by_name: "Kwame Mensah",
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      date_created: new Date().toISOString()
    };
    
    mockAdjustments = [newAdj, ...mockAdjustments];
    
    return [201, {
      success: {
        status: "CREATED",
        code: 201,
        data: {
          adjustment: newAdj
        }
      }
    }];
  });

  // POST /tenant/adjustments/:id/approve
  mock.onPost(/\/tenant\/adjustments\/[^/]+\/approve/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const { approver_pin } = JSON.parse(config.data);
    
    if (approver_pin === "9999") {
      return [401, { error: { status: "UNAUTHORIZED", message: "Invalid PIN code", code: 401 } }];
    }
    
    const adjIdx = mockAdjustments.findIndex(a => a.id === id);
    if (adjIdx !== -1) {
      mockAdjustments[adjIdx] = {
        ...mockAdjustments[adjIdx],
        status: "approved",
        approved_by: "u2",
        approved_by_name: "Ama Serwaa",
        approved_at: new Date().toISOString()
      };
      
      // Update quantity on variants if found
      for (const p of mockProducts) {
        const v = p.variants.find((v: any) => v.id === mockAdjustments[adjIdx].variant_id);
        if (v) {
          v.stock_quantity += mockAdjustments[adjIdx].quantity;
          break;
        }
      }
      
      return [200, {
        success: {
          status: "OK",
          code: 200,
          message: "Stock adjustment approved and stock updated successfully",
          data: {
            adjustment: mockAdjustments[adjIdx]
          }
        }
      }];
    }
    
    return [404, { error: { status: "NOT_FOUND", message: "Stock adjustment request not found", code: 404 } }];
  });

  // POST /tenant/adjustments/:id/reject
  mock.onPost(/\/tenant\/adjustments\/[^/]+\/reject/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const { rejection_note } = JSON.parse(config.data);
    
    const adjIdx = mockAdjustments.findIndex(a => a.id === id);
    if (adjIdx !== -1) {
      mockAdjustments[adjIdx] = {
        ...mockAdjustments[adjIdx],
        status: "rejected",
        approved_by: "u2",
        approved_by_name: "Ama Serwaa",
        approved_at: new Date().toISOString(),
        rejection_note
      };
      
      return [200, {
        success: {
          status: "OK",
          code: 200,
          message: "Stock adjustment request rejected",
          data: {
            adjustment: mockAdjustments[adjIdx]
          }
        }
      }];
    }
    
    return [404, { error: { status: "NOT_FOUND", message: "Stock adjustment request not found", code: 404 } }];
  });

  // Mock returns database
  let mockReturns: Array<{
    id: string;
    original_transaction_id: string;
    original_transaction_ref: string;
    reason: string;
    notes: string;
    status: "pending" | "approved" | "rejected";
    refund_method: string;
    total_refund_amount: number;
    initiated_by: string;
    initiated_by_name: string;
    approved_by: string | null;
    approved_by_name: string | null;
    approved_at: string | null;
    date_created: string;
    items: Array<{
      variant_id: string;
      product_name: string;
      packaging_tier_id: string | null;
      packaging_tier_name: string;
      quantity: number;
      unit_price: number;
      condition: "sellable" | "damaged";
    }>;
  }> = [
    {
      id: "ret1",
      original_transaction_id: "tx2",
      original_transaction_ref: "RCP-0002",
      reason: "defective",
      notes: "Left sole glue coming undone",
      status: "approved",
      refund_method: "mobile_money",
      total_refund_amount: 850.00,
      initiated_by: "u3",
      initiated_by_name: "Kofi Annan",
      approved_by: "u2",
      approved_by_name: "Ama Serwaa",
      approved_at: new Date(Date.now() - 3600000).toISOString(),
      date_created: new Date(Date.now() - 7200000).toISOString(),
      items: [
        {
          variant_id: "p1",
          product_name: "Nike Air Max",
          packaging_tier_id: "tier_u1",
          packaging_tier_name: "Unit",
          quantity: 1,
          unit_price: 850.00,
          condition: "damaged"
        }
      ]
    },
    {
      id: "ret2",
      original_transaction_id: "tx4",
      original_transaction_ref: "RCP-0004",
      reason: "wrong_item",
      notes: "Customer ordered White but got Black",
      status: "pending",
      refund_method: "cash",
      total_refund_amount: 240.00,
      initiated_by: "u3",
      initiated_by_name: "Kofi Annan",
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      date_created: new Date().toISOString(),
      items: [
        {
          variant_id: "p5",
          product_name: "Basic White Tee",
          packaging_tier_id: "tier_u5",
          packaging_tier_name: "Unit",
          quantity: 2,
          unit_price: 120.00,
          condition: "sellable"
        }
      ]
    }
  ];

  // GET /pos/returns
  mock.onGet(/\/pos\/returns(\?.*)?$/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const status = searchParams.get('status') || '';
    
    let filtered = [...mockReturns];
    if (status) {
      filtered = filtered.filter(r => r.status === status);
    }
    
    return [200, {
      success: true,
      data: {
        returns: filtered,
        total: filtered.length
      }
    }];
  });

  // GET /pos/returns/:id
  mock.onGet(/\/pos\/returns\/[^/]+$/).reply((config) => {
    const url = config.url || '';
    const id = url.split('/').pop() || '';
    const ret = mockReturns.find(r => r.id === id);
    if (ret) {
      return [200, { success: true, data: { return: ret } }];
    }
    return [404, { success: false, error: { message: 'Return not found' } }];
  });

  // POST /pos/returns
  mock.onPost(/\/pos\/returns$/).reply((config) => {
    const { original_transaction_id, reason, notes, refund_method, items } = JSON.parse(config.data);
    
    // Find transaction reference for transaction number
    const tx = mockTransactions.find(t => t.id === original_transaction_id);
    const txRef = tx ? tx.receiptNumber : "RCP-UNKNOWN";
    
    const newReturn = {
      id: `ret-${Date.now()}`,
      original_transaction_id,
      original_transaction_ref: txRef,
      reason,
      notes: notes || '',
      status: "pending" as const,
      refund_method,
      total_refund_amount: items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0),
      initiated_by: "u3",
      initiated_by_name: "Kofi Annan",
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      date_created: new Date().toISOString(),
      items: items.map((it: any) => ({
        variant_id: it.variant_id,
        product_name: it.product_name || "Unknown Product",
        packaging_tier_id: it.packaging_tier_id || null,
        packaging_tier_name: it.packaging_tier_name || "Unit",
        quantity: it.quantity,
        unit_price: it.unit_price,
        condition: it.condition
      }))
    };
    
    mockReturns = [newReturn, ...mockReturns];
    
    return [201, {
      success: true,
      data: {
        return: newReturn
      }
    }];
  });

  // POST /pos/returns/:id/approve
  mock.onPost(/\/pos\/returns\/[^/]+\/approve/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const { approver_pin } = JSON.parse(config.data);
    
    if (approver_pin === "9999") {
      return [401, { error: { status: "UNAUTHORIZED", message: "Invalid PIN code", code: 401 } }];
    }
    
    const retIdx = mockReturns.findIndex(r => r.id === id);
    if (retIdx !== -1) {
      mockReturns[retIdx] = {
        ...mockReturns[retIdx],
        status: "approved",
        approved_by: "u2",
        approved_by_name: "Ama Serwaa",
        approved_at: new Date().toISOString()
      };
      
      const ret = mockReturns[retIdx];
      // For each item in the return:
      ret.items.forEach(item => {
        if (item.condition === 'sellable') {
          for (const p of mockProducts) {
            const v = p.variants.find((v: any) => v.id === item.variant_id);
            if (v) {
              const tier = v.packaging_tiers.find((t: any) => t.id === item.packaging_tier_id);
              const unitsPerTier = tier ? tier.units_per_tier : 1;
              v.stock_quantity += item.quantity * unitsPerTier;
              break;
            }
          }
        } else if (item.condition === 'damaged') {
          const newAdj = {
            id: `adj-auto-${Date.now()}-${Math.random()}`,
            variant_id: item.variant_id,
            variant_name: item.product_name,
            sku: "SKU-AUTO",
            quantity: -item.quantity,
            reason: "damaged",
            notes: `Auto-created from customer return ${ret.id}`,
            status: "approved",
            initiated_by: "u3",
            initiated_by_name: "Kofi Annan",
            approved_by: "u2",
            approved_by_name: "Ama Serwaa",
            approved_at: new Date().toISOString(),
            date_created: new Date().toISOString()
          };
          mockAdjustments.push(newAdj);
        }
      });

      // Update mock transaction status
      const txIdx = mockTransactions.findIndex(t => t.id === ret.original_transaction_id);
      if (txIdx !== -1) {
        mockTransactions[txIdx].status = 'refunded';
      }
      
      return [200, {
        success: true,
        message: "Return approved successfully",
        data: {
          return: mockReturns[retIdx]
        }
      }];
    }
    
    return [404, { success: false, error: { message: "Return record not found" } }];
  });

  // POST /pos/returns/:id/reject
  mock.onPost(/\/pos\/returns\/[^/]+\/reject/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const { rejection_note } = JSON.parse(config.data);
    
    const retIdx = mockReturns.findIndex(r => r.id === id);
    if (retIdx !== -1) {
      mockReturns[retIdx] = {
        ...mockReturns[retIdx],
        status: "rejected",
        approved_by: "u2",
        approved_by_name: "Ama Serwaa",
        approved_at: new Date().toISOString(),
        notes: rejection_note ? `${mockReturns[retIdx].notes} | Rejection: ${rejection_note}` : mockReturns[retIdx].notes
      };
      
      return [200, {
        success: true,
        message: "Return rejected successfully",
        data: {
          return: mockReturns[retIdx]
        }
      }];
    }
    return [404, { success: false, error: { message: "Return record not found" } }];
  });

  // Mock supplier credit database
  let mockSupplierCredits: Array<{
    id: string;
    supplier_id: string;
    supplier_name: string;
    purchase_order_id: string;
    purchase_order_ref: string;
    total_amount: number;
    amount_paid: number;
    balance_remaining: number;
    status: "outstanding" | "partial" | "settled";
    due_date: string;
    notes: string;
    date_created: string;
    payments: Array<{
      id: string;
      amount: number;
      payment_method: string;
      reference: string;
      notes: string;
      date_created: string;
    }>;
  }> = [
    {
      id: "sc1",
      supplier_id: "sup1",
      supplier_name: "TechWholesale Ghana",
      purchase_order_id: "po1",
      purchase_order_ref: "PO-2026-001",
      total_amount: 15000.00,
      amount_paid: 5000.00,
      balance_remaining: 10000.00,
      status: "partial" as const,
      due_date: new Date(Date.now() + 5*86400000).toISOString().split('T')[0], // 5 days from now
      notes: "Received batch of Sony headphones on 30-day terms",
      date_created: new Date(Date.now() - 10*86400000).toISOString(),
      payments: [
        {
          id: "scp1",
          amount: 5000.00,
          payment_method: "mobile_money",
          reference: "TXN-MOMO-993",
          notes: "First installment",
          date_created: new Date(Date.now() - 5*86400000).toISOString()
        }
      ]
    },
    {
      id: "sc2",
      supplier_id: "sup2",
      supplier_name: "Accra Garments",
      purchase_order_id: "po2",
      purchase_order_ref: "PO-2026-002",
      total_amount: 3400.00,
      amount_paid: 0.00,
      balance_remaining: 3400.00,
      status: "outstanding" as const,
      due_date: new Date(Date.now() - 2*86400000).toISOString().split('T')[0], // 2 days ago (overdue)
      notes: "Apparel invoice for basic white tees",
      date_created: new Date(Date.now() - 15*86400000).toISOString(),
      payments: []
    }
  ];

  // GET /tenant/supplier-credit/summary
  mock.onGet(/\/tenant\/supplier-credit\/summary$/).reply(200, {
    success: true,
    data: {
      total_outstanding: 13400.00,
      total_suppliers_with_debt: 2,
      overdue_count: 1,
      upcoming_due_7_days: 1
    }
  });

  // GET /tenant/supplier-credit
  mock.onGet(/\/tenant\/supplier-credit(\?.*)?$/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const status = searchParams.get('status') || '';
    const supplierId = searchParams.get('supplier_id') || '';

    let filtered = [...mockSupplierCredits];
    if (status) {
      filtered = filtered.filter(s => s.status === status);
    }
    if (supplierId) {
      filtered = filtered.filter(s => s.supplier_id === supplierId);
    }

    return [200, {
      success: true,
      data: {
        supplierCredits: filtered,
        total: filtered.length
      }
    }];
  });

  // GET /tenant/supplier-credit/:id
  mock.onGet(/\/tenant\/supplier-credit\/[^/]+$/).reply((config) => {
    const url = config.url || '';
    const id = url.split('/').pop() || '';
    const credit = mockSupplierCredits.find(s => s.id === id);
    if (credit) {
      return [200, { success: true, data: { supplierCredit: credit } }];
    }
    return [404, { success: false, error: { message: "Supplier credit record not found" } }];
  });

  // POST /tenant/supplier-credit/:id/payments
  mock.onPost(/\/tenant\/supplier-credit\/[^/]+\/payments/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const { amount, payment_method, reference, notes } = JSON.parse(config.data);

    const creditIdx = mockSupplierCredits.findIndex(s => s.id === id);
    if (creditIdx !== -1) {
      const credit = mockSupplierCredits[creditIdx];
      const newPaid = credit.amount_paid + Number(amount);
      const newRemaining = Math.max(0, credit.total_amount - newPaid);
      const newStatus = newRemaining === 0 ? "settled" as const : "partial" as const;

      const newPayment = {
        id: `scp-${Date.now()}`,
        amount: Number(amount),
        payment_method,
        reference: reference || `REF-${Date.now()}`,
        notes: notes || '',
        date_created: new Date().toISOString()
      };

      mockSupplierCredits[creditIdx] = {
        ...credit,
        amount_paid: newPaid,
        balance_remaining: newRemaining,
        status: newStatus,
        payments: [...credit.payments, newPayment]
      };

      return [200, {
        success: true,
        message: "Supplier credit payment recorded successfully",
        data: {
          supplierCredit: mockSupplierCredits[creditIdx]
        }
      }];
    }

    return [404, { success: false, error: { message: "Supplier credit record not found" } }];
  });

  // Catch-all for any other GET requests to prevent errors during design
  mock.onGet(/.*/).reply(200, { success: true, data: {} });
  mock.onPost(/.*/).reply(200, { success: true, data: {} });
}
