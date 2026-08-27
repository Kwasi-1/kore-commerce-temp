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

  let mockSuppliers = [
    {
      id: 'sup1',
      name: 'TechWholesale Ghana',
      contact_person: 'John Doe',
      email: 'john@techwholesale.gh',
      phone: '0241234567',
      address: 'Circle Commercial Avenue, Accra',
      tax_id: 'C0012345678',
      notes: 'Bulk supplier for electronics, audio accessories, and peripherals. 30-day payment terms.',
      is_active: true,
      status: 'active',
      dateCreated: new Date(Date.now() - 90 * 86400000).toISOString()
    },
    {
      id: 'sup2',
      name: 'Accra Garments & Textiles',
      contact_person: 'Jane Smith',
      email: 'jane@garments.gh',
      phone: '0209876543',
      address: 'Makola Market Block B, Central Accra',
      tax_id: 'C0087654321',
      notes: 'Supplies basic white tees, cotton polo shirts, and staff branded workwear.',
      is_active: true,
      status: 'active',
      dateCreated: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'sup3',
      name: 'Nunu Dairy & Beverages Ltd',
      contact_person: 'Kofi Owusu',
      email: 'kofi@nunudairy.gh',
      phone: '0533285380',
      address: 'Heavy Industrial Area, Plot 14, Tema',
      tax_id: 'C0034567890',
      notes: 'Main distributor of Nunu milk, peak evaporated milk, and fruit juices. Delivers every Tuesday morning.',
      is_active: true,
      status: 'active',
      dateCreated: new Date(Date.now() - 45 * 86400000).toISOString()
    },
    {
      id: 'sup4',
      name: 'Golden Tree Confectionery',
      contact_person: 'Ama Mensah',
      email: 'ama@goldentree.gh',
      phone: '0244556677',
      address: 'Harbour Road, Industrial Zone, Tema',
      tax_id: 'C0099887766',
      notes: 'Supplier of premium cocoa chocolates, biscuits, and confectionery goods.',
      is_active: true,
      status: 'active',
      dateCreated: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'sup5',
      name: 'Voltic Mineral Water Depot',
      contact_person: 'Yaw Boateng',
      email: 'orders@volticdepot.gh',
      phone: '0261122334',
      address: 'Medie Depot, Greater Accra',
      tax_id: 'C0055443322',
      notes: 'Supplies natural mineral water in 500ml packs, 750ml, and 1.5L dispenser bottles.',
      is_active: true,
      status: 'active',
      dateCreated: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      id: 'sup6',
      name: 'FanMilk Distribution Hub',
      contact_person: 'Akosua Darko',
      email: 'orders@fanmilkdist.gh',
      phone: '0207788990',
      address: 'North Industrial Area, Accra',
      tax_id: 'C0066778899',
      notes: 'Supplier of FanYogo strawberry yogurt, FanChoco chocolate milk, and ice creams.',
      is_active: true,
      status: 'active',
      dateCreated: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: 'sup7',
      name: 'Melcom Wholesale & Provisions',
      contact_person: 'Ramesh Patel',
      email: 'wholesale@melcom.gh',
      phone: '0302223344',
      address: 'Opera Square, Central Accra',
      tax_id: 'C0011223344',
      notes: 'Wholesale distributor for general retail provisions, detergents, and household goods.',
      is_active: true,
      status: 'active',
      dateCreated: new Date(Date.now() - 15 * 86400000).toISOString()
    }
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
    },
    {
      id: 'p11',
      name: 'Nunu Evaporated Milk 170g',
      description: 'Rich and creamy evaporated milk for tea and cooking.',
      category: 'Dairy & Beverages',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v11',
          sku: 'NUNU-170G',
          variant_attributes: {},
          base_unit_name: 'tin',
          cost_price_per_base_unit: 6.50,
          stock_quantity: 120,
          low_stock_threshold: 20,
          sell_mode: 'flexible',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p11_u',
              name: 'Single Tin',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 9.00 },
                { price_type: 'wholesale', price: 8.20 }
              ]
            },
            {
              id: 'tier_p11_roll',
              name: 'Roll of 6',
              units_per_tier: 6,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 52.00 },
                { price_type: 'wholesale', price: 48.00 }
              ]
            },
            {
              id: 'tier_p11_carton',
              name: 'Carton of 48',
              units_per_tier: 48,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 400.00 },
                { price_type: 'wholesale', price: 375.00 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p12',
      name: 'Ideal Full Cream Milk 160g',
      description: 'Original evaporated milk fortified with vitamins.',
      category: 'Dairy & Beverages',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v12',
          sku: 'IDEAL-160G',
          variant_attributes: {},
          base_unit_name: 'tin',
          cost_price_per_base_unit: 7.20,
          stock_quantity: 85,
          low_stock_threshold: 15,
          sell_mode: 'flexible',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p12_u',
              name: 'Single Tin',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 10.00 },
                { price_type: 'wholesale', price: 9.00 }
              ]
            },
            {
              id: 'tier_p12_c',
              name: 'Carton of 24',
              units_per_tier: 24,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 230.00 },
                { price_type: 'wholesale', price: 210.00 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p13',
      name: 'Voltic Natural Mineral Water 500ml',
      description: 'Pure natural mineral water bottle.',
      category: 'Beverages',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v13',
          sku: 'VOLTIC-500ML',
          variant_attributes: {},
          base_unit_name: 'bottle',
          cost_price_per_base_unit: 2.20,
          stock_quantity: 4,
          low_stock_threshold: 10,
          sell_mode: 'flexible',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p13_u',
              name: 'Bottle',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 3.50 },
                { price_type: 'wholesale', price: 3.00 }
              ]
            },
            {
              id: 'tier_p13_pack',
              name: 'Pack of 16',
              units_per_tier: 16,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 50.00 },
                { price_type: 'wholesale', price: 44.00 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p14',
      name: 'FanYogo Strawberry Pouch 145ml',
      description: 'Frozen strawberry yogurt dessert pouch.',
      category: 'Dairy & Beverages',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v14',
          sku: 'FANYOGO-145ML',
          variant_attributes: {},
          base_unit_name: 'pouch',
          cost_price_per_base_unit: 3.80,
          stock_quantity: 60,
          low_stock_threshold: 15,
          sell_mode: 'flexible',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p14_u',
              name: 'Single Pouch',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 5.50 },
                { price_type: 'wholesale', price: 5.00 }
              ]
            },
            {
              id: 'tier_p14_pack',
              name: 'Pack of 20',
              units_per_tier: 20,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 100.00 },
                { price_type: 'wholesale', price: 92.00 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p15',
      name: 'Golden Tree Kingsbite Chocolate 100g',
      description: 'Authentic rich Ghanaian milk chocolate bar.',
      category: 'Confectionery',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v15',
          sku: 'GT-KINGSBITE-100G',
          variant_attributes: {},
          base_unit_name: 'bar',
          cost_price_per_base_unit: 14.00,
          stock_quantity: 45,
          low_stock_threshold: 10,
          sell_mode: 'flexible',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p15_u',
              name: 'Single Bar',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 20.00 },
                { price_type: 'wholesale', price: 18.00 }
              ]
            },
            {
              id: 'tier_p15_box',
              name: 'Box of 10',
              units_per_tier: 10,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 190.00 },
                { price_type: 'wholesale', price: 175.00 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p16',
      name: 'Kleesoft Washing Powder 500g',
      description: 'Multi-action laundry detergent powder.',
      category: 'Provisions & Cleaning',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v16',
          sku: 'KLEESOFT-500G',
          variant_attributes: {},
          base_unit_name: 'pack',
          cost_price_per_base_unit: 11.50,
          stock_quantity: 3,
          low_stock_threshold: 5,
          sell_mode: 'flexible',
          track_expiry: false,
          packaging_tiers: [
            {
              id: 'tier_p16_u',
              name: 'Single Pack',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 16.00 },
                { price_type: 'wholesale', price: 14.50 }
              ]
            },
            {
              id: 'tier_p16_c',
              name: 'Carton of 12',
              units_per_tier: 12,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 180.00 },
                { price_type: 'wholesale', price: 165.00 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p17',
      name: 'Dettol Antiseptic Liquid 250ml',
      description: 'Trusted personal hygiene and surface disinfectant.',
      category: 'Personal Care',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v17',
          sku: 'DETTOL-250ML',
          variant_attributes: {},
          base_unit_name: 'bottle',
          cost_price_per_base_unit: 22.00,
          stock_quantity: 18,
          low_stock_threshold: 5,
          sell_mode: 'unit_only',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p17_u',
              name: 'Bottle',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 30.00 },
                { price_type: 'wholesale', price: 27.00 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'p18',
      name: 'Lipton Yellow Label Tea Bags 50s',
      description: 'Quality black tea blend individually wrapped.',
      category: 'Provisions & Cleaning',
      status: 'active',
      images: ['https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400'],
      has_variants: false,
      variants: [
        {
          id: 'v18',
          sku: 'LIPTON-50S',
          variant_attributes: {},
          base_unit_name: 'box',
          cost_price_per_base_unit: 28.00,
          stock_quantity: 32,
          low_stock_threshold: 8,
          sell_mode: 'flexible',
          track_expiry: true,
          packaging_tiers: [
            {
              id: 'tier_p18_u',
              name: 'Box of 50s',
              units_per_tier: 1,
              is_base_unit: true,
              is_default_sale_unit: true,
              is_default_purchase_unit: false,
              prices: [
                { price_type: 'retail', price: 38.00 },
                { price_type: 'wholesale', price: 34.00 }
              ]
            },
            {
              id: 'tier_p18_c',
              name: 'Master Carton of 24',
              units_per_tier: 24,
              is_base_unit: false,
              is_default_sale_unit: false,
              is_default_purchase_unit: true,
              prices: [
                { price_type: 'retail', price: 860.00 },
                { price_type: 'wholesale', price: 800.00 }
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
      status: 'received',
      total_amount: 15000,
      is_credit_purchase: true,
      credit_due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      date_created: new Date(Date.now() - 10 * 86400000).toISOString(),
      items: [
        { variant_id: 'v4', packaging_tier_id: 'tier_p4_u', quantity: 4, cost_price: 3100 }
      ]
    },
    {
      id: 'po2',
      reference_number: 'PO-2026-002',
      supplier_id: 'sup2',
      supplier: { id: 'sup2', name: 'Accra Garments & Textiles' },
      status: 'received',
      total_amount: 3400,
      is_credit_purchase: true,
      credit_due_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      date_created: new Date(Date.now() - 15 * 86400000).toISOString(),
      items: [
        { variant_id: 'v5', packaging_tier_id: 'tier_p5_c', quantity: 2, cost_price: 1700 }
      ]
    },
    {
      id: 'po3',
      reference_number: 'PO-2026-003',
      supplier_id: 'sup3',
      supplier: { id: 'sup3', name: 'Nunu Dairy & Beverages Ltd' },
      status: 'received',
      total_amount: 3019,
      is_credit_purchase: true,
      credit_due_date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
      date_created: new Date(Date.now() - 7 * 86400000).toISOString(),
      items: [
        { variant_id: 'v11', packaging_tier_id: 'tier_p11_carton', quantity: 8, cost_price: 375 }
      ]
    },
    {
      id: 'po4',
      reference_number: 'PO-2026-004',
      supplier_id: 'sup4',
      supplier: { id: 'sup4', name: 'Golden Tree Confectionery' },
      status: 'received',
      total_amount: 1450,
      is_credit_purchase: true,
      credit_due_date: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
      date_created: new Date(Date.now() - 4 * 86400000).toISOString(),
      items: [
        { variant_id: 'v15', packaging_tier_id: 'tier_p15_box', quantity: 8, cost_price: 175 }
      ]
    },
    {
      id: 'po5',
      reference_number: 'PO-2026-005',
      supplier_id: 'sup6',
      supplier: { id: 'sup6', name: 'FanMilk Distribution Hub' },
      status: 'received',
      total_amount: 850,
      is_credit_purchase: true,
      credit_due_date: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
      date_created: new Date(Date.now() - 3 * 86400000).toISOString(),
      items: [
        { variant_id: 'v14', packaging_tier_id: 'tier_p14_pack', quantity: 9, cost_price: 92 }
      ]
    },
    {
      id: 'po6',
      reference_number: 'PO-2026-006',
      supplier_id: 'sup5',
      supplier: { id: 'sup5', name: 'Voltic Mineral Water Depot' },
      status: 'received',
      total_amount: 880,
      is_credit_purchase: false,
      date_created: new Date(Date.now() - 1 * 86400000).toISOString(),
      items: [
        { variant_id: 'v13', packaging_tier_id: 'tier_p13_pack', quantity: 20, cost_price: 44 }
      ]
    }
  ] as any[];

  // -----------------------------------------------------
  // AUTH & STAFF
  // -----------------------------------------------------
  
  let mockStaff: any[] = [
    { id: 'u1', name: 'Kwame Mensah', first_name: 'Kwame', last_name: 'Mensah', email: 'owner@store.com', phone: '+233 24 123 4567', role: 'owner', is_active: true, pos_pin: '1234', last_login: new Date().toISOString() },
    { id: 'u2', name: 'Ama Serwaa', first_name: 'Ama', last_name: 'Serwaa', email: 'ama@store.com', phone: '+233 20 987 6543', role: 'manager', is_active: true, pos_pin: '2222', last_login: new Date().toISOString() },
    { id: 'u3', name: 'Kofi Annan', first_name: 'Kofi', last_name: 'Annan', email: 'kofi@store.com', phone: '+233 54 333 4455', role: 'cashier', is_active: true, pos_pin: '1234', last_login: new Date().toISOString() },
    { id: 'u4', name: 'Abena Osei', first_name: 'Abena', last_name: 'Osei', email: 'abena@store.com', phone: '+233 27 666 7788', role: 'cashier', is_active: true, pos_pin: '3333', last_login: new Date(Date.now() - 86400000).toISOString() },
    { id: 'u5', name: 'David Tetteh', first_name: 'David', last_name: 'Tetteh', email: 'david@store.com', phone: '+233 50 111 2233', role: 'cashier', is_active: true, pos_pin: '4444', last_login: new Date(Date.now() - 2 * 86400000).toISOString() },
  ];

  let mockTenant = {
    id: 't1',
    name: 'HeadlessPOS Demo Store',
    currency: 'GHS',
    plan: 'business',
    track_expiry_enabled: false
  };

  let mockPOSFeatureSettings = {
    pos_tax_enabled: false,
    pos_tax_rate: 0.15,
    pos_tax_label: 'VAT',
    pos_credit_enabled: true,
    pos_credit_ledger_enabled: true,
    pos_wholesale_enabled: true,
    pos_discounts_enabled: true,
    pos_service_charge_enabled: false,
    pos_service_charge_rate: 0.10,
    pos_service_charge_label: 'Service Charge',
    pos_split_payment_enabled: true,
    pos_payment_methods: ['cash', 'mobile_money', 'card'],
    pos_notes_enabled: true,
    pos_customer_required: false,
    pos_price_override_enabled: false,
    pos_barcode_scan_enabled: true,
    pos_shift_management_enabled: true,
  };

  // -----------------------------------------------------
  // TENANT FEATURES & GATING
  // -----------------------------------------------------

  mock.onGet(/\/tenant\/features$/).reply(200, {
    success: {
      status: 'OK',
      code: 200,
      data: {
        plan: 'business',
        modules: [
          'pos', 'credit_ledger', 'returns', 'inventory_basic', 'inventory_advanced',
          'suppliers', 'purchase_orders', 'supplier_credit', 'stock_reconciliation',
          'adjustments', 'staff', 'expenses', 'reports_basic', 'reports_advanced',
          'ecommerce', 'payroll', 'settings',
        ],
        pos_settings: mockPOSFeatureSettings
      }
    }
  });

  mock.onPut(/\/tenant\/features\/pos$/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    mockPOSFeatureSettings = { ...mockPOSFeatureSettings, ...body };
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        message: 'POS feature settings updated',
        data: {
          pos_settings: mockPOSFeatureSettings,
          updated: Object.keys(body),
          blocked: []
        }
      }
    }];
  });

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

  // Verify PIN (for cashier lock screen & quick auth)
  mock.onPost('/pos/auth/verify-pin').reply((config) => {
    const { staff_id, pin } = JSON.parse(config.data || '{}');
    const user = mockStaff.find(s => s.id === staff_id) || mockStaff[0];
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          access_token: 'mock-staff-jwt',
          refresh_token: 'mock-staff-refresh',
          staff: user,
          is_default_pin: pin === '1234'
        }
      }
    }];
  });

  // Staff CRUD
  mock.onPost('/tenant/staff').reply((config) => {
    const data = JSON.parse(config.data || '{}');
    const newStaff = {
      id: `u${Date.now()}`,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.name || 'New Staff',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || `staff${Date.now()}@store.com`,
      role: data.role || 'cashier',
      is_active: true,
      last_login: new Date().toISOString()
    };
    mockStaff.push(newStaff);
    return [200, { success: { status: 'OK', code: 200, data: { staff: newStaff } } }];
  });

  mock.onPut(/\/tenant\/staff\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const data = JSON.parse(config.data || '{}');
    const idx = mockStaff.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockStaff[idx] = { ...mockStaff[idx], ...data, name: `${data.first_name || mockStaff[idx].first_name} ${data.last_name || mockStaff[idx].last_name}` };
      return [200, { success: { status: 'OK', code: 200, data: { staff: mockStaff[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Staff member not found' } }];
  });

  mock.onDelete(/\/tenant\/staff\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const idx = mockStaff.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockStaff.splice(idx, 1);
      return [200, { success: { status: 'OK', code: 200, message: 'Staff member deleted' } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Staff member not found' } }];
  });

  mock.onPost(/\/tenant\/staff\/[^/]+\/set-pin$/).reply(200, {
    success: { status: 'OK', code: 200, message: 'PIN updated successfully' }
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
    success: { status: 'OK', code: 200, data: mockTenantSettings }
  });

  mock.onPatch('/tenant/settings/profile').reply((config) => {
    mockTenantSettings.store = { ...mockTenantSettings.store, ...JSON.parse(config.data) };
    return [200, { success: { status: 'OK', code: 200, data: {} } }];
  });

  mock.onPatch('/tenant/settings/contact').reply((config) => {
    mockTenantSettings.store = { ...mockTenantSettings.store, ...JSON.parse(config.data) };
    return [200, { success: { status: 'OK', code: 200, data: {} } }];
  });

  mock.onPatch('/tenant/settings/pos').reply((config) => {
    mockTenantSettings.pos_settings = { ...mockTenantSettings.pos_settings, ...JSON.parse(config.data) };
    return [200, { success: { status: 'OK', code: 200, data: {} } }];
  });

  // Enable Expiry date tracking
  mock.onPost('/tenant/settings/expiry/enable').reply(() => {
    mockTenant.track_expiry_enabled = true;
    mockTenantSettings.store.track_expiry_enabled = true;
    return [200, { success: { status: 'OK', code: 200, data: { tenant: mockTenant } } }];
  });

  // Disable Expiry date tracking
  mock.onPost('/tenant/settings/expiry/disable').reply(() => {
    mockTenant.track_expiry_enabled = false;
    mockTenantSettings.store.track_expiry_enabled = false;
    return [200, { success: { status: 'OK', code: 200, data: { tenant: mockTenant } } }];
  });

  // -----------------------------------------------------
  // REPORTS / DASHBOARD
  // -----------------------------------------------------
  
  // End of Day Report
  mock.onGet(/\/tenant\/reports\/end-of-day/).reply(200, {
    success: {
      status: 'OK',
      code: 200,
      data: {
        summary: {
          total_sales: 12450.50,
          total_transactions: 84,
          average_order_value: 148.22,
          payment_breakdown: {
            cash: 5200.00,
            mobile_money: 4250.50,
            card: 3000.00,
            credit: 0.00
          },
          expenses: {
            total: 1950.00,
            count: 2,
            records: [
              { id: 'e1', description: 'Electricity Bill', amount: 1500, category: 'utilities', date_created: new Date().toISOString() },
              { id: 'e2', description: 'Printer Ink', amount: 450, category: 'supplies', date_created: new Date(Date.now() - 2*86400000).toISOString() }
            ]
          },
          top_selling_products: [
            { name: 'Nike Air Max', quantity_sold: 12, revenue: 10200.00 },
            { name: 'Adidas Ultraboost', quantity_sold: 8, revenue: 7360.00 },
            { name: 'Sony WH-1000XM4', quantity_sold: 4, revenue: 16800.00 }
          ],
          cashier_summary: [
            { cashier_name: 'Kofi Annan', sales_count: 50, total_sales: 7500.00 },
            { cashier_name: 'Ama Serwaa', sales_count: 34, total_sales: 4950.50 }
          ]
        }
      }
    }
  });

  // Cashier Report
  mock.onGet(/\/tenant\/reports\/cashiers/).reply(200, {
    success: {
      status: 'OK',
      code: 200,
      data: {
        cashiers: [
          { id: 'u3', cashier: 'Kofi Annan', transaction_count: 50, total_sales: 7500.00, avg_transaction: 150.00 },
          { id: 'u2', cashier: 'Ama Serwaa', transaction_count: 34, total_sales: 4950.50, avg_transaction: 145.60 },
          { id: 'u1', cashier: 'Kwame Mensah', transaction_count: 12, total_sales: 3750.00, avg_transaction: 312.50 }
        ]
      }
    }
  });

  // Product Report
  mock.onGet(/\/tenant\/reports\/products/).reply(200, {
    success: {
      status: 'OK',
      code: 200,
      data: {
        products: [
          { id: 'p1', name: 'Nike Air Max', units_sold: 12, revenue: 10200.00, cogs: 6000.00, margin: 41.18 },
          { id: 'p2', name: 'Adidas Ultraboost', units_sold: 8, revenue: 7360.00, cogs: 4800.00, margin: 34.78 },
          { id: 'p3', name: 'Apple AirPods Pro', units_sold: 5, revenue: 17500.00, cogs: 14000.00, margin: 20.00 },
          { id: 'p4', name: 'Sony WH-1000XM4', units_sold: 4, revenue: 16800.00, cogs: 12400.00, margin: 26.19 }
        ]
      }
    }
  });

  // Sales Summary
  mock.onGet(/\/tenant\/reports\/sales/).reply(200, {
    success: {
      status: 'OK',
      code: 200,
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
      return [200, { success: { status: 'OK', code: 200, data: { product } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Product not found', code: 404 } }];
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

    const allVariants = mockProducts.flatMap(p => p.variants || []);
    const outOfStockCount = allVariants.filter(v => (v.stock_quantity || 0) <= 0).length;
    const lowStockCount = allVariants.filter(v => (v.stock_quantity || 0) > 0 && (v.stock_quantity || 0) <= (v.low_stock_threshold || 5)).length;

    const summary = {
      total_products: mockProducts.length,
      total_variants: allVariants.length,
      active_products: mockProducts.filter(p => p.status === 'active').length,
      active_variants: allVariants.length,
      draft_products: mockProducts.filter(p => p.status === 'draft').length,
      out_of_stock_variants: outOfStockCount,
      low_stock_variants: lowStockCount
    };

    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          products: mapped,
          summary,
          pagination: {
            page: 1,
            perPage: 20,
            total: mapped.length,
            totalProducts: mapped.length,
            totalVariants: allVariants.length,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    }];
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

    return [200, { success: { status: 'OK', code: 200, data: { products: getPosProductsData(filtered) } } }];
  });

  mock.onGet(/\/pos\/products$/).reply(() => {
    return [200, {
      success: {
        status: 'OK',
        code: 200,
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
      
      return [200, { success: { status: 'OK', code: 200, message: 'Product updated successfully', data: { product: p } } }];
    }
    
    return [404, { error: { status: 'NOT_FOUND', message: 'Product not found', code: 404 } }];
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
      success: {
        status: 'OK',
        code: 200,
        message: 'Products imported successfully',
        data: {}
      }
    }];
  });

  mock.onPatch(/\/tenant\/products\/[^/]+\/status/).reply((config) => {
    const urlParts = config.url?.split('/') || [];
    const id = urlParts[urlParts.length - 2];
    const { status } = JSON.parse(config.data);
    
    const productIndex = mockProducts.findIndex(p => p.id === id);
    if (productIndex !== -1) {
      mockProducts[productIndex] = { ...mockProducts[productIndex], status };
      return [200, { success: { status: 'OK', code: 200, message: 'Status updated', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Product not found', code: 404 } }];
  });

  mock.onDelete(/\/tenant\/products\/[^/]+/).reply((config) => {
    const urlParts = config.url?.split('/') || [];
    const id = urlParts[urlParts.length - 1];
    
    const productIndex = mockProducts.findIndex(p => p.id === id);
    if (productIndex !== -1) {
      mockProducts.splice(productIndex, 1);
      return [200, { success: { status: 'OK', code: 200, message: 'Product deleted', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Product not found', code: 404 } }];
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
    return [200, { success: { status: 'OK', code: 200, message: 'Stock reconciliation updated', data: {} } }];
  });

  // -----------------------------------------------------
  // POS & SHIFTS
  // -----------------------------------------------------
  
  let currentShift: any = {
    id: 'sh1',
    status: 'open',
    opened_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    opened_by_id: 'u3',
    opened_by_name: 'Kofi Annan',
    starting_cash: 500.00,
    cash_sales_total: 1200.00,
    expected_cash_in_drawer: 1700.00
  };

  let shiftMovements: any[] = [
    { id: 'm1', shift_id: 'sh1', cashier_name: 'Kofi Annan', movement_type: 'PAID_IN', category: 'float_topup', amount: 200.00, reason: 'Morning float top-up', date_created: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 'm2', shift_id: 'sh1', cashier_name: 'Kofi Annan', movement_type: 'PAID_OUT', category: 'supplies', amount: 50.00, reason: 'Office cleaning supplies', date_created: new Date(Date.now() - 3600000).toISOString() }
  ];

  mock.onGet(/\/pos\/shifts\/current$/).reply(() => {
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          shift: currentShift
        }
      }
    }];
  });

  mock.onGet(/\/pos\/shifts\/current\/movements$/).reply(() => {
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          movements: shiftMovements
        }
      }
    }];
  });

  mock.onPost(/\/pos\/shifts\/current\/movements$/).reply((config) => {
    const data = JSON.parse(config.data || '{}');
    const newMv = {
      id: `m${Date.now()}`,
      shift_id: currentShift?.id || 'sh1',
      cashier_name: 'Kofi Annan',
      movement_type: data.movement_type || 'PAID_IN',
      category: data.category || 'float_topup',
      amount: Number(data.amount) || 0,
      reason: data.reason || '',
      date_created: new Date().toISOString()
    };
    shiftMovements.push(newMv);
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        message: 'Cash movement recorded successfully',
        data: { movement: newMv }
      }
    }];
  });

  mock.onGet(/\/tenant\/pos\/shifts/).reply(200, {
    success: {
      status: 'OK',
      code: 200,
      data: {
        shifts: currentShift ? [currentShift] : []
      }
    }
  });

  mock.onPost(/\/pos\/shifts\/open$/).reply((config) => {
    const data = JSON.parse(config.data || '{}');
    currentShift = {
      id: `sh${Math.floor(Math.random() * 1000)}`,
      status: 'open',
      opened_at: new Date().toISOString(),
      opened_by_id: 'u3',
      opened_by_name: 'Kofi Annan',
      starting_cash: Number(data.opening_float) || 0,
      cash_sales_total: 0.00,
      expected_cash_in_drawer: Number(data.opening_float) || 0
    };
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          shift: currentShift
        }
      }
    }];
  });

  mock.onPost(/\/pos\/shifts\/close$/).reply(() => {
    const closed = currentShift ? { ...currentShift, status: 'closed', closed_at: new Date().toISOString() } : null;
    currentShift = null;
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        message: 'Shift closed successfully',
        data: { shift: closed }
      }
    }];
  });

  // -----------------------------------------------------
  // EXPENSES
  // -----------------------------------------------------
  
  mock.onGet(/\/tenant\/expenses\/summary/).reply(() => {
    const valid = mockExpenses.filter((e: any) => !e.isVoided);
    const catMap: Record<string, number> = {};
    let total = 0;

    valid.forEach((e: any) => {
      const amt = Number(e.amount || 0);
      catMap[e.category] = (catMap[e.category] || 0) + amt;
      total += amt;
    });

    const summaryList = Object.entries(catMap).map(([category, total_amount]) => ({
      category,
      total_amount
    }));

    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          summary: summaryList,
          total: total
        }
      }
    }];
  });

  let mockExpenses = [
    { id: 'e1', description: 'ECG Commercial Prepaid Electricity', amount: 850.00, category: 'utilities', payment_method: 'mobile_money', date: new Date().toISOString(), dateIncurred: new Date().toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e2', description: 'POS Thermal Paper Receipt Rolls (50 pack)', amount: 240.00, category: 'supplies', payment_method: 'cash', date: new Date().toISOString(), dateIncurred: new Date().toISOString(), recordedByName: 'Ama Serwaa', isVoided: false },
    { id: 'e3', description: 'Generator Diesel Top-up (50 Litres)', amount: 750.00, category: 'utilities', payment_method: 'cash', date: new Date(Date.now() - 1 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 1 * 86400000).toISOString(), recordedByName: 'Kofi Annan', isVoided: false },
    { id: 'e4', description: 'Monthly High-Speed Fiber Internet', amount: 400.00, category: 'utilities', payment_method: 'mobile_money', date: new Date(Date.now() - 2 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 2 * 86400000).toISOString(), recordedByName: 'Ama Serwaa', isVoided: false },
    { id: 'e5', description: 'Custom Branded Carrier Shopping Bags (1000 pcs)', amount: 650.00, category: 'supplies', payment_method: 'mobile_money', date: new Date(Date.now() - 3 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 3 * 86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e6', description: 'Social Media & Instagram Sponsored Ads', amount: 350.00, category: 'marketing', payment_method: 'card', date: new Date(Date.now() - 5 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 5 * 86400000).toISOString(), recordedByName: 'Ama Serwaa', isVoided: false },
    { id: 'e7', description: 'Store Air Conditioning Servicing & Gas Refill', amount: 480.00, category: 'maintenance', payment_method: 'cash', date: new Date(Date.now() - 6 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 6 * 86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e8', description: 'Staff Mid-Month Transport Allowance', amount: 600.00, category: 'salaries', payment_method: 'mobile_money', date: new Date(Date.now() - 8 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 8 * 86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e9', description: 'Ghana Water Company Monthly Tariff', amount: 280.00, category: 'utilities', payment_method: 'mobile_money', date: new Date(Date.now() - 10 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 10 * 86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e10', description: 'Store Cleaning & Sanitizing Supplies', amount: 180.00, category: 'supplies', payment_method: 'cash', date: new Date(Date.now() - 12 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 12 * 86400000).toISOString(), recordedByName: 'Ama Serwaa', isVoided: false },
    { id: 'e11', description: 'Commercial Waste Collection (Zoomlion)', amount: 150.00, category: 'maintenance', payment_method: 'cash', date: new Date(Date.now() - 14 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 14 * 86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e12', description: 'Monthly Retail Store Rent Payment', amount: 5500.00, category: 'rent', payment_method: 'bank_transfer', date: new Date(Date.now() - 18 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 18 * 86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e13', description: 'QuickBooks POS Cloud Subscription', amount: 320.00, category: 'software', payment_method: 'card', date: new Date(Date.now() - 20 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 20 * 86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false },
    { id: 'e14', description: 'Damaged Barcode Scanner Replacement', amount: 380.00, category: 'maintenance', payment_method: 'cash', date: new Date(Date.now() - 22 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 22 * 86400000).toISOString(), recordedByName: 'Kofi Annan', isVoided: true },
    { id: 'e15', description: 'Security Guard Monthly Off-Platform Stipend', amount: 800.00, category: 'salaries', payment_method: 'cash', date: new Date(Date.now() - 24 * 86400000).toISOString(), dateIncurred: new Date(Date.now() - 24 * 86400000).toISOString(), recordedByName: 'Kwame Mensah', isVoided: false }
  ] as any[];

  let mockRecurringExpenses: any[] = [
    {
      id: 'rec1',
      description: 'Monthly Store Rent',
      category: 'rent',
      amount: 5500.00,
      frequency: 'monthly',
      paymentMethod: 'bank_transfer',
      autoPost: true,
      status: 'active',
      startDate: new Date().toISOString(),
      nextDueDate: new Date(Date.now() + 86400000 * 23).toISOString(),
      lastPostedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      recordedByName: 'Kwame Mensah'
    },
    {
      id: 'rec2',
      description: 'Electricity Bill',
      category: 'utilities',
      amount: 1500.00,
      frequency: 'monthly',
      paymentMethod: 'mobile_money',
      autoPost: false,
      status: 'active',
      startDate: new Date().toISOString(),
      nextDueDate: new Date(Date.now() + 86400000 * 15).toISOString(),
      lastPostedAt: new Date().toISOString(),
      recordedByName: 'Kwame Mensah'
    },
    {
      id: 'rec3',
      description: 'High-speed Fiber Internet',
      category: 'utilities',
      amount: 400.00,
      frequency: 'monthly',
      paymentMethod: 'mobile_money',
      autoPost: true,
      status: 'active',
      startDate: new Date().toISOString(),
      nextDueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
      lastPostedAt: null,
      recordedByName: 'Ama Serwaa'
    }
  ];

  // GET /tenant/expenses/recurring
  mock.onGet(/\/tenant\/expenses\/recurring(?:\?.*)?$/).reply((config) => {
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          recurring_expenses: mockRecurringExpenses,
          total: mockRecurringExpenses.length
        }
      }
    }];
  });

  // POST /tenant/expenses/recurring
  mock.onPost(/\/tenant\/expenses\/recurring$/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const newRule = {
      id: `rec${Date.now()}`,
      description: body.description || 'New Recurring Rule',
      category: body.category || 'utilities',
      amount: parseFloat(body.amount || 0),
      frequency: body.frequency || 'monthly',
      paymentMethod: body.payment_method || 'cash',
      autoPost: body.auto_post ?? true,
      status: 'active',
      startDate: body.startDate || new Date().toISOString(),
      nextDueDate: body.startDate || new Date().toISOString(),
      lastPostedAt: null,
      recordedByName: 'Kwame Mensah'
    };
    mockRecurringExpenses.unshift(newRule);
    return [201, { success: { status: 'CREATED', code: 201, data: { recurring_expense: newRule } } }];
  });

  // PUT /tenant/expenses/recurring/:id
  mock.onPut(/\/tenant\/expenses\/recurring\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const body = JSON.parse(config.data || '{}');
    const idx = mockRecurringExpenses.findIndex(r => r.id === id);
    if (idx !== -1) {
      mockRecurringExpenses[idx] = {
        ...mockRecurringExpenses[idx],
        ...body,
        paymentMethod: body.payment_method || mockRecurringExpenses[idx].paymentMethod,
        autoPost: body.auto_post !== undefined ? body.auto_post : mockRecurringExpenses[idx].autoPost,
      };
      return [200, { success: { status: 'OK', code: 200, data: { recurring_expense: mockRecurringExpenses[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Recurring schedule not found' } }];
  });

  // POST /tenant/expenses/recurring/:id/toggle-status
  mock.onPost(/\/tenant\/expenses\/recurring\/[^/]+\/toggle-status$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const id = parts[parts.length - 2];
    const idx = mockRecurringExpenses.findIndex(r => r.id === id);
    if (idx !== -1) {
      mockRecurringExpenses[idx].status = mockRecurringExpenses[idx].status === 'active' ? 'paused' : 'active';
      return [200, { success: { status: 'OK', code: 200, data: { recurring_expense: mockRecurringExpenses[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Recurring schedule not found' } }];
  });

  // POST /tenant/expenses/recurring/:id/post-now
  mock.onPost(/\/tenant\/expenses\/recurring\/[^/]+\/post-now$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const id = parts[parts.length - 2];
    const rule = mockRecurringExpenses.find(r => r.id === id);
    if (rule) {
      const now = new Date().toISOString();
      rule.lastPostedAt = now;
      const newExp = {
        id: `e${Date.now()}`,
        description: rule.description,
        category: rule.category,
        amount: rule.amount,
        date: now,
        dateIncurred: now,
        source: 'Auto-Recurring',
        recordedByName: rule.recordedByName || 'System',
        isVoided: false
      };
      mockExpenses.unshift(newExp);
      return [200, { success: { status: 'OK', code: 200, message: 'Expense posted to log', data: { expense: newExp } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Recurring schedule not found' } }];
  });

  // DELETE /tenant/expenses/recurring/:id
  mock.onDelete(/\/tenant\/expenses\/recurring\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const idx = mockRecurringExpenses.findIndex(r => r.id === id);
    if (idx !== -1) {
      mockRecurringExpenses.splice(idx, 1);
      return [200, { success: { status: 'OK', code: 200, message: 'Schedule deleted' } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Recurring schedule not found' } }];
  });

  // ── Payroll & Salary Mock ─────────────────────────────────────────
  let mockPayrollProfiles: any[] = [
    {
      id: 'prof1',
      staff_id: 'u1',
      full_name: 'Kwame Mensah',
      role_title: 'Store Manager / Owner',
      is_off_platform: false,
      compensation_type: 'monthly_salary',
      base_amount: 3500.00,
      payment_method: 'bank_transfer',
      bank_or_momo_name: 'GCB Bank',
      account_number: '1234567890',
    },
    {
      id: 'prof2',
      staff_id: 'u2',
      full_name: 'Ama Serwaa',
      role_title: 'Head Cashier / Operations',
      is_off_platform: false,
      compensation_type: 'monthly_salary',
      base_amount: 2800.00,
      payment_method: 'mobile_money',
      bank_or_momo_name: 'MTN Mobile Money',
      account_number: '0241112233',
    },
    {
      id: 'prof3',
      staff_id: 'u3',
      full_name: 'Kofi Annan',
      role_title: 'Inventory Officer',
      is_off_platform: false,
      compensation_type: 'monthly_salary',
      base_amount: 2500.00,
      payment_method: 'mobile_money',
      bank_or_momo_name: 'MTN Mobile Money',
      account_number: '0244445566',
    },
    {
      id: 'prof4',
      staff_id: 'u4',
      full_name: 'Abena Osei',
      role_title: 'Senior Cashier',
      is_off_platform: false,
      compensation_type: 'monthly_salary',
      base_amount: 2200.00,
      payment_method: 'mobile_money',
      bank_or_momo_name: 'Telecel Cash',
      account_number: '0207788990',
    },
    {
      id: 'prof5',
      staff_id: 'off1',
      full_name: 'Yaw Osei',
      role_title: 'Janitor & Cleaning Specialist',
      is_off_platform: true,
      compensation_type: 'monthly_salary',
      base_amount: 1200.00,
      payment_method: 'cash',
      bank_or_momo_name: '',
      account_number: '',
    },
  ];

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const prevMonthDate = new Date(Date.now() - 30 * 86400000);
  const prevMonthName = prevMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  let mockPayrollRuns: any[] = [
    {
      id: 'run_current_month',
      pay_period: currentMonthName,
      disbursal_date: new Date().toISOString(),
      created_by: 'u1',
      created_by_name: 'Kwame Mensah',
      status: 'logged',
      notes: `${currentMonthName} staff salary & operational payouts`,
      total_amount: 12200.00,
      recipients_count: 5,
      total_recipients_count: 5,
      platform_count: 4,
      external_count: 1,
      items: [
        {
          id: 'disb_cur_1',
          run_id: 'run_current_month',
          pay_period: currentMonthName,
          staff_name: 'Kwame Mensah',
          amount: 3500.00,
          payment_method: 'bank_transfer',
          is_off_platform: false,
          status: 'logged',
          date_paid: new Date().toISOString(),
        },
        {
          id: 'disb_cur_2',
          run_id: 'run_current_month',
          pay_period: currentMonthName,
          staff_name: 'Ama Serwaa',
          amount: 2800.00,
          payment_method: 'mobile_money',
          is_off_platform: false,
          status: 'logged',
          date_paid: new Date().toISOString(),
        },
        {
          id: 'disb_cur_3',
          run_id: 'run_current_month',
          pay_period: currentMonthName,
          staff_name: 'Kofi Annan',
          amount: 2500.00,
          payment_method: 'mobile_money',
          is_off_platform: false,
          status: 'logged',
          date_paid: new Date().toISOString(),
        },
        {
          id: 'disb_cur_4',
          run_id: 'run_current_month',
          pay_period: currentMonthName,
          staff_name: 'Abena Osei',
          amount: 2200.00,
          payment_method: 'mobile_money',
          is_off_platform: false,
          status: 'logged',
          date_paid: new Date().toISOString(),
        },
        {
          id: 'disb_cur_5',
          run_id: 'run_current_month',
          pay_period: currentMonthName,
          staff_name: 'Yaw Osei',
          amount: 1200.00,
          payment_method: 'cash',
          is_off_platform: true,
          status: 'logged',
          date_paid: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'run_prev_month',
      pay_period: prevMonthName,
      disbursal_date: prevMonthDate.toISOString(),
      created_by: 'u1',
      created_by_name: 'Kwame Mensah',
      status: 'logged',
      notes: `${prevMonthName} staff payroll disbursement`,
      total_amount: 11000.00,
      recipients_count: 4,
      total_recipients_count: 4,
      platform_count: 3,
      external_count: 1,
      items: [
        {
          id: 'disb_prev_1',
          run_id: 'run_prev_month',
          pay_period: prevMonthName,
          staff_name: 'Kwame Mensah',
          amount: 3500.00,
          payment_method: 'bank_transfer',
          is_off_platform: false,
          status: 'logged',
          date_paid: prevMonthDate.toISOString(),
        },
        {
          id: 'disb_prev_2',
          run_id: 'run_prev_month',
          pay_period: prevMonthName,
          staff_name: 'Ama Serwaa',
          amount: 2800.00,
          payment_method: 'mobile_money',
          is_off_platform: false,
          status: 'logged',
          date_paid: prevMonthDate.toISOString(),
        },
        {
          id: 'disb_prev_3',
          run_id: 'run_prev_month',
          pay_period: prevMonthName,
          staff_name: 'Kofi Annan',
          amount: 2500.00,
          payment_method: 'mobile_money',
          is_off_platform: false,
          status: 'logged',
          date_paid: prevMonthDate.toISOString(),
        },
        {
          id: 'disb_prev_4',
          run_id: 'run_prev_month',
          pay_period: prevMonthName,
          staff_name: 'Yaw Osei',
          amount: 1200.00,
          payment_method: 'cash',
          is_off_platform: true,
          status: 'logged',
          date_paid: prevMonthDate.toISOString(),
        },
      ],
    }
  ];

  let mockPayrollDisbursals: any[] = [
    {
      id: 'disb_cur_1',
      run_id: 'run_current_month',
      pay_period: currentMonthName,
      staff_name: 'Kwame Mensah',
      amount: 3500.00,
      payment_method: 'bank_transfer',
      is_off_platform: false,
      status: 'logged',
      date_paid: new Date().toISOString(),
    },
    {
      id: 'disb_cur_2',
      run_id: 'run_current_month',
      pay_period: currentMonthName,
      staff_name: 'Ama Serwaa',
      amount: 2800.00,
      payment_method: 'mobile_money',
      is_off_platform: false,
      status: 'logged',
      date_paid: new Date().toISOString(),
    },
    {
      id: 'disb_cur_3',
      run_id: 'run_current_month',
      pay_period: currentMonthName,
      staff_name: 'Kofi Annan',
      amount: 2500.00,
      payment_method: 'mobile_money',
      is_off_platform: false,
      status: 'logged',
      date_paid: new Date().toISOString(),
    },
    {
      id: 'disb_cur_4',
      run_id: 'run_current_month',
      pay_period: currentMonthName,
      staff_name: 'Abena Osei',
      amount: 2200.00,
      payment_method: 'mobile_money',
      is_off_platform: false,
      status: 'logged',
      date_paid: new Date().toISOString(),
    },
    {
      id: 'disb_cur_5',
      run_id: 'run_current_month',
      pay_period: currentMonthName,
      staff_name: 'Yaw Osei',
      amount: 1200.00,
      payment_method: 'cash',
      is_off_platform: true,
      status: 'logged',
      date_paid: new Date().toISOString(),
    },
    {
      id: 'disb_prev_1',
      run_id: 'run_prev_month',
      pay_period: prevMonthName,
      staff_name: 'Kwame Mensah',
      amount: 3500.00,
      payment_method: 'bank_transfer',
      is_off_platform: false,
      status: 'logged',
      date_paid: prevMonthDate.toISOString(),
    },
    {
      id: 'disb_prev_2',
      run_id: 'run_prev_month',
      pay_period: prevMonthName,
      staff_name: 'Ama Serwaa',
      amount: 2800.00,
      payment_method: 'mobile_money',
      is_off_platform: false,
      status: 'logged',
      date_paid: prevMonthDate.toISOString(),
    },
    {
      id: 'disb_prev_3',
      run_id: 'run_prev_month',
      pay_period: prevMonthName,
      staff_name: 'Kofi Annan',
      amount: 2500.00,
      payment_method: 'mobile_money',
      is_off_platform: false,
      status: 'logged',
      date_paid: prevMonthDate.toISOString(),
    },
    {
      id: 'disb_prev_4',
      run_id: 'run_prev_month',
      pay_period: prevMonthName,
      staff_name: 'Yaw Osei',
      amount: 1200.00,
      payment_method: 'cash',
      is_off_platform: true,
      status: 'logged',
      date_paid: prevMonthDate.toISOString(),
    },
  ];

  // GET /tenant/payroll
  mock.onGet(/\/tenant\/payroll(?:\?.*)?$/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    let filteredRuns = [...mockPayrollRuns];
    let filteredDisbursals = [...mockPayrollDisbursals];

    if (startDateParam || endDateParam) {
      const startTime = startDateParam ? new Date(startDateParam).getTime() : 0;
      const endTime = endDateParam ? new Date(endDateParam).getTime() : Infinity;

      filteredRuns = filteredRuns.filter((r) => {
        if (!r.disbursal_date) return true;
        const t = new Date(r.disbursal_date).getTime();
        return t >= startTime && t <= endTime;
      });

      filteredDisbursals = filteredDisbursals.filter((d) => {
        if (!d.date_paid) return true;
        const t = new Date(d.date_paid).getTime();
        return t >= startTime && t <= endTime;
      });
    }

    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          profiles: mockPayrollProfiles,
          runs: filteredRuns,
          disbursals: filteredDisbursals,
        }
      }
    }];
  });

  // POST /tenant/payroll/disburse
  mock.onPost(/\/tenant\/payroll\/disburse$/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const payPeriod = body.pay_period || 'Current Month';
    const disbursalDate = body.disbursal_date ? new Date(body.disbursal_date).toISOString() : new Date().toISOString();
    const items = body.items || [];

    const newDisbursals: any[] = [];
    const runId = items.length > 1 ? `run_${Date.now()}` : null;

    // For batch runs: create ONE aggregate expense entry
    if (runId) {
      const totalAmount = items.reduce((acc: number, i: any) => acc + Number(i.amount || 0), 0);
      const aggregateExp = {
        id: `e${Date.now()}_payrun`,
        description: `Payroll Run: ${payPeriod} (${items.length} recipients)`,
        category: 'salaries',
        amount: totalAmount,
        date: disbursalDate,
        dateIncurred: disbursalDate,
        source: 'Payroll',
        recordedByName: 'Kwame Mensah',
        isVoided: false,
      };
      mockExpenses.unshift(aggregateExp);
    }

    items.forEach((item: any) => {
      const disb = {
        id: `disb${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        run_id: runId,
        pay_period: payPeriod,
        staff_name: item.staff_name || 'Staff Member',
        amount: Number(item.amount || 0),
        payment_method: item.payment_method || 'cash',
        is_off_platform: Boolean(item.is_off_platform),
        status: 'logged',
        note: item.note || '',
        date_paid: disbursalDate,
      };
      newDisbursals.push(disb);
      mockPayrollDisbursals.unshift(disb);

      // For single off-cycle payouts only: create individual expense entry
      if (!runId) {
        const salaryExp = {
          id: `e${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          description: `Salary: ${item.staff_name} (${payPeriod})`,
          category: 'salaries',
          amount: Number(item.amount || 0),
          date: disbursalDate,
          dateIncurred: disbursalDate,
          source: 'Payroll',
          recordedByName: 'Kwame Mensah',
          isVoided: false,
        };
        mockExpenses.unshift(salaryExp);
      }
    });

    let newRun: any = null;
    if (runId) {
      newRun = {
        id: runId,
        pay_period: payPeriod,
        disbursal_date: disbursalDate,
        created_by: 'owner1',
        created_by_name: 'Kwame Mensah',
        status: 'logged',
        notes: body.notes || '',
        total_amount: newDisbursals.reduce((acc, curr) => acc + curr.amount, 0),
        recipients_count: newDisbursals.length,
        total_recipients_count: newDisbursals.length,
        platform_count: newDisbursals.filter((d) => !d.is_off_platform).length,
        external_count: newDisbursals.filter((d) => d.is_off_platform).length,
        items: newDisbursals,
      };
      mockPayrollRuns.unshift(newRun);
    }

    return [200, { success: { status: 'OK', code: 200, message: 'Payroll disbursed & logged', data: { run: newRun, disbursed: newDisbursals } } }];
  });

  // PUT /tenant/payroll/disbursal/:id
  mock.onPut(/\/tenant\/payroll\/disbursal\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const body = JSON.parse(config.data || '{}');
    const idx = mockPayrollDisbursals.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const now = new Date().toISOString();
      mockPayrollDisbursals[idx] = {
        ...mockPayrollDisbursals[idx],
        ...body,
        amount: body.amount !== undefined ? parseFloat(body.amount) : mockPayrollDisbursals[idx].amount,
        last_edited_by_name: 'Kwame Mensah',
        last_edited_at: now,
        edit_reason: body.reason || mockPayrollDisbursals[idx].edit_reason,
      };

      // Also update in parent run if exists
      mockPayrollRuns.forEach((run) => {
        const itemIdx = run.items?.findIndex((i: any) => i.id === id);
        if (itemIdx !== undefined && itemIdx !== -1) {
          run.last_edited_by_name = 'Kwame Mensah';
          run.last_edited_at = now;
          run.items[itemIdx] = { ...mockPayrollDisbursals[idx] };
          run.total_amount = run.items.filter((i: any) => i.status !== 'voided').reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
        }
      });

      return [200, { success: { status: 'OK', code: 200, data: { disbursal: mockPayrollDisbursals[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Disbursal line not found' } }];
  });

  // POST /tenant/payroll/disbursal/:id/reverse
  mock.onPost(/\/tenant\/payroll\/disbursal\/[^/]+\/reverse$/).reply((config) => {
    const parts = config.url?.split('/') || [];
    const id = parts[parts.length - 2];
    const body = JSON.parse(config.data || '{}');

    const idx = mockPayrollDisbursals.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const now = new Date().toISOString();
      mockPayrollDisbursals[idx].status = 'voided';
      mockPayrollDisbursals[idx].reversal_reason = body.reason || 'Reversed by manager';
      mockPayrollDisbursals[idx].date_voided = now;
      mockPayrollDisbursals[idx].last_edited_by_name = 'Kwame Mensah';
      mockPayrollDisbursals[idx].last_edited_at = now;

      // Also update parent run
      mockPayrollRuns.forEach((run) => {
        const itemIdx = run.items?.findIndex((i: any) => i.id === id);
        if (itemIdx !== undefined && itemIdx !== -1) {
          run.last_edited_by_name = 'Kwame Mensah';
          run.last_edited_at = now;
          run.items[itemIdx] = { ...mockPayrollDisbursals[idx] };
          const activeItems = run.items.filter((i: any) => i.status !== 'voided');
          run.recipients_count = activeItems.length;
          run.total_amount = activeItems.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
          if (activeItems.length === 0) run.status = 'voided';
          else run.status = 'partial_voided';
        }
      });

      return [200, { success: { status: 'OK', code: 200, data: { disbursal: mockPayrollDisbursals[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Disbursal line not found' } }];
  });

  // POST /tenant/payroll/profile
  mock.onPost(/\/tenant\/payroll\/profile$/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const newProf = {
      id: `prof${Date.now()}`,
      staff_id: body.staff_id || '',
      full_name: body.full_name || 'Staff Member',
      role_title: body.role_title || 'Staff',
      is_off_platform: Boolean(body.is_off_platform),
      compensation_type: body.compensation_type || 'monthly_salary',
      base_amount: parseFloat(body.base_amount || 0),
      payment_method: body.payment_method || 'cash',
      bank_or_momo_name: body.bank_or_momo_name || '',
      account_number: body.account_number || '',
    };
    mockPayrollProfiles.unshift(newProf);
    return [201, { success: { status: 'CREATED', code: 201, data: { profile: newProf } } }];
  });

  // PUT /tenant/payroll/profile/:id
  mock.onPut(/\/tenant\/payroll\/profile\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const body = JSON.parse(config.data || '{}');
    const idx = mockPayrollProfiles.findIndex((p) => p.id === id);
    if (idx !== -1) {
      mockPayrollProfiles[idx] = {
        ...mockPayrollProfiles[idx],
        ...body,
        base_amount: parseFloat(body.base_amount ?? mockPayrollProfiles[idx].base_amount),
      };
      return [200, { success: { status: 'OK', code: 200, data: { profile: mockPayrollProfiles[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Salary profile not found' } }];
  });

  // DELETE /tenant/payroll/profile/:id
  mock.onDelete(/\/tenant\/payroll\/profile\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const idx = mockPayrollProfiles.findIndex((p) => p.id === id);
    if (idx !== -1) {
      mockPayrollProfiles.splice(idx, 1);
      return [200, { success: { status: 'OK', code: 200, message: 'Profile deleted' } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Salary profile not found' } }];
  });

  // POST /tenant/payroll/off-platform-staff
  mock.onPost(/\/tenant\/payroll\/off-platform-staff$/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const newProf = {
      id: `prof${Date.now()}`,
      staff_id: `off_${Date.now()}`,
      full_name: body.full_name || 'External Staff',
      role_title: body.role_title || 'Contractor',
      is_off_platform: true,
      compensation_type: 'monthly_salary',
      base_amount: parseFloat(body.base_salary || 0),
      payment_method: body.payment_method || 'cash',
      bank_or_momo_name: body.bank_or_momo_name || '',
      account_number: body.account_number || '',
    };
    mockPayrollProfiles.unshift(newProf);
    return [201, { success: { status: 'CREATED', code: 201, data: { profile: newProf } } }];
  });

  mock.onGet(/\/tenant\/expenses(?:\?.*)?$/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const category = searchParams.get('category') || '';

    let filtered = [...mockExpenses];
    if (category && category !== 'all') {
      filtered = filtered.filter(e => e.category === category);
    }

    return [200, { success: { status: 'OK', code: 200, data: { expenses: filtered, total: filtered.length } } }];
  });

  mock.onPost(/\/tenant\/expenses$/).reply((config) => {
    const data = JSON.parse(config.data || '{}');
    const newExp = {
      id: `e${Date.now()}`,
      description: data.description || 'General Expense',
      amount: Number(data.amount) || 0,
      category: data.category || 'supplies',
      date: data.dateIncurred || new Date().toISOString(),
      dateIncurred: data.dateIncurred || new Date().toISOString(),
      recordedByName: 'Kwame Mensah',
      isVoided: false
    };
    mockExpenses = [newExp, ...mockExpenses];
    return [201, { success: { status: 'CREATED', code: 201, data: { expense: newExp } } }];
  });

  mock.onPut(/\/tenant\/expenses\/[^/]+\/void/).reply((config) => {
    const id = config.url?.split('/')[3];
    const idx = mockExpenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockExpenses[idx].isVoided = true;
      return [200, { success: { status: 'OK', code: 200, message: 'Expense voided', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Expense not found', code: 404 } }];
  });

  mock.onPost(/\/tenant\/expenses\/[^/]+\/void/).reply((config) => {
    const id = config.url?.split('/')[3];
    const idx = mockExpenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockExpenses[idx].isVoided = true;
      return [200, { success: { status: 'OK', code: 200, message: 'Expense voided', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Expense not found', code: 404 } }];
  });
  
  // POS Transactions
  const nowMs = Date.now();
  let mockTransactions: any[] = [
    // --- TODAY (6 Transactions) ---
    {
      id: 'tx1',
      receiptNumber: 'RCP-0025',
      receipt_number: 'RCP-0025',
      orderNumber: 'RCP-0025',
      dateCreated: new Date(nowMs - 20 * 60000).toISOString(),
      date_created: new Date(nowMs - 20 * 60000).toISOString(),
      date: new Date(nowMs - 20 * 60000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 450.00,
      total_amount: 450.00,
      total: 450.00,
      subtotal: 450.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Nunu Evaporated Milk 170g (Carton of 48)', name: 'Nunu Evaporated Milk 170g (Carton of 48)', quantity: 1, qty: 1, unitPrice: 400.00, price: 400.00, subtotal: 400.00 },
        { productName: 'Voltic Natural Mineral Water 500ml (Pack of 16)', name: 'Voltic Natural Mineral Water 500ml (Pack of 16)', quantity: 1, qty: 1, unitPrice: 50.00, price: 50.00, subtotal: 50.00 }
      ]
    },
    {
      id: 'tx2',
      receiptNumber: 'RCP-0024',
      receipt_number: 'RCP-0024',
      orderNumber: 'RCP-0024',
      dateCreated: new Date(nowMs - 85 * 60000).toISOString(),
      date_created: new Date(nowMs - 85 * 60000).toISOString(),
      date: new Date(nowMs - 85 * 60000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 180.00,
      total_amount: 180.00,
      total: 180.00,
      subtotal: 180.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Golden Tree Kingsbite Chocolate 100g (Box of 10)', name: 'Golden Tree Kingsbite Chocolate 100g (Box of 10)', quantity: 1, qty: 1, unitPrice: 190.00, price: 190.00, subtotal: 190.00 }
      ]
    },
    {
      id: 'tx3',
      receiptNumber: 'RCP-0023',
      receipt_number: 'RCP-0023',
      orderNumber: 'RCP-0023',
      dateCreated: new Date(nowMs - 3 * 3600000).toISOString(),
      date_created: new Date(nowMs - 3 * 3600000).toISOString(),
      date: new Date(nowMs - 3 * 3600000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 850.00,
      total_amount: 850.00,
      total: 850.00,
      subtotal: 850.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Nike Air Max', name: 'Nike Air Max', quantity: 1, qty: 1, unitPrice: 850.00, price: 850.00, subtotal: 850.00 }
      ]
    },
    {
      id: 'tx4',
      receiptNumber: 'RCP-0022',
      receipt_number: 'RCP-0022',
      orderNumber: 'RCP-0022',
      dateCreated: new Date(nowMs - 4 * 3600000).toISOString(),
      date_created: new Date(nowMs - 4 * 3600000).toISOString(),
      date: new Date(nowMs - 4 * 3600000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'card',
      payment_method: 'card',
      totalAmount: 3500.00,
      total_amount: 3500.00,
      total: 3500.00,
      subtotal: 3500.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Apple AirPods Pro', name: 'Apple AirPods Pro', quantity: 1, qty: 1, unitPrice: 3500.00, price: 3500.00, subtotal: 3500.00 }
      ]
    },
    {
      id: 'tx5',
      receiptNumber: 'RCP-0021',
      receipt_number: 'RCP-0021',
      orderNumber: 'RCP-0021',
      dateCreated: new Date(nowMs - 5 * 3600000).toISOString(),
      date_created: new Date(nowMs - 5 * 3600000).toISOString(),
      date: new Date(nowMs - 5 * 3600000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 310.00,
      total_amount: 310.00,
      total: 310.00,
      subtotal: 310.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Ideal Full Cream Milk 160g (Carton of 24)', name: 'Ideal Full Cream Milk 160g (Carton of 24)', quantity: 1, qty: 1, unitPrice: 230.00, price: 230.00, subtotal: 230.00 },
        { productName: 'Lipton Yellow Label Tea Bags 50s', name: 'Lipton Yellow Label Tea Bags 50s', quantity: 2, qty: 2, unitPrice: 38.00, price: 38.00, subtotal: 76.00 }
      ]
    },
    {
      id: 'tx6',
      receiptNumber: 'RCP-0020',
      receipt_number: 'RCP-0020',
      orderNumber: 'RCP-0020',
      dateCreated: new Date(nowMs - 7 * 3600000).toISOString(),
      date_created: new Date(nowMs - 7 * 3600000).toISOString(),
      date: new Date(nowMs - 7 * 3600000).toISOString(),
      cashierName: 'Kwame Mensah',
      cashier_name: 'Kwame Mensah',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 160.00,
      total_amount: 160.00,
      total: 160.00,
      subtotal: 160.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'FanYogo Strawberry Pouch 145ml (Pack of 20)', name: 'FanYogo Strawberry Pouch 145ml (Pack of 20)', quantity: 1, qty: 1, unitPrice: 100.00, price: 100.00, subtotal: 100.00 },
        { productName: 'Dettol Antiseptic Liquid 250ml', name: 'Dettol Antiseptic Liquid 250ml', quantity: 2, qty: 2, unitPrice: 30.00, price: 30.00, subtotal: 60.00 }
      ]
    },

    // --- YESTERDAY (6 Transactions) ---
    {
      id: 'tx7',
      receiptNumber: 'RCP-0019',
      receipt_number: 'RCP-0019',
      orderNumber: 'RCP-0019',
      dateCreated: new Date(nowMs - 24 * 3600000 - 2 * 3600000).toISOString(),
      date_created: new Date(nowMs - 24 * 3600000 - 2 * 3600000).toISOString(),
      date: new Date(nowMs - 24 * 3600000 - 2 * 3600000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 1200.00,
      total_amount: 1200.00,
      total: 1200.00,
      subtotal: 1200.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Adidas Ultraboost', name: 'Adidas Ultraboost', quantity: 1, qty: 1, unitPrice: 920.00, price: 920.00, subtotal: 920.00 },
        { productName: 'Leather Wallet', name: 'Leather Wallet', quantity: 1, qty: 1, unitPrice: 280.00, price: 280.00, subtotal: 280.00 }
      ]
    },
    {
      id: 'tx8',
      receiptNumber: 'RCP-0018',
      receipt_number: 'RCP-0018',
      orderNumber: 'RCP-0018',
      dateCreated: new Date(nowMs - 24 * 3600000 - 4 * 3600000).toISOString(),
      date_created: new Date(nowMs - 24 * 3600000 - 4 * 3600000).toISOString(),
      date: new Date(nowMs - 24 * 3600000 - 4 * 3600000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'card',
      payment_method: 'card',
      totalAmount: 4200.00,
      total_amount: 4200.00,
      total: 4200.00,
      subtotal: 4200.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Sony WH-1000XM4', name: 'Sony WH-1000XM4', quantity: 1, qty: 1, unitPrice: 4200.00, price: 4200.00, subtotal: 4200.00 }
      ]
    },
    {
      id: 'tx9',
      receiptNumber: 'RCP-0017',
      receipt_number: 'RCP-0017',
      orderNumber: 'RCP-0017',
      dateCreated: new Date(nowMs - 24 * 3600000 - 6 * 3600000).toISOString(),
      date_created: new Date(nowMs - 24 * 3600000 - 6 * 3600000).toISOString(),
      date: new Date(nowMs - 24 * 3600000 - 6 * 3600000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 580.00,
      total_amount: 580.00,
      total: 580.00,
      subtotal: 580.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Kleesoft Washing Powder 500g (Carton of 12)', name: 'Kleesoft Washing Powder 500g (Carton of 12)', quantity: 1, qty: 1, unitPrice: 180.00, price: 180.00, subtotal: 180.00 },
        { productName: 'Nunu Evaporated Milk 170g (Carton of 48)', name: 'Nunu Evaporated Milk 170g (Carton of 48)', quantity: 1, qty: 1, unitPrice: 400.00, price: 400.00, subtotal: 400.00 }
      ]
    },
    {
      id: 'tx10',
      receiptNumber: 'RCP-0016',
      receipt_number: 'RCP-0016',
      orderNumber: 'RCP-0016',
      dateCreated: new Date(nowMs - 24 * 3600000 - 7 * 3600000).toISOString(),
      date_created: new Date(nowMs - 24 * 3600000 - 7 * 3600000).toISOString(),
      date: new Date(nowMs - 24 * 3600000 - 7 * 3600000).toISOString(),
      cashierName: 'Kwame Mensah',
      cashier_name: 'Kwame Mensah',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 380.00,
      total_amount: 380.00,
      total: 380.00,
      subtotal: 380.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Sunglasses Classic', name: 'Sunglasses Classic', quantity: 1, qty: 1, unitPrice: 380.00, price: 380.00, subtotal: 380.00 }
      ]
    },
    {
      id: 'tx11',
      receiptNumber: 'RCP-0015',
      receipt_number: 'RCP-0015',
      orderNumber: 'RCP-0015',
      dateCreated: new Date(nowMs - 24 * 3600000 - 8 * 3600000).toISOString(),
      date_created: new Date(nowMs - 24 * 3600000 - 8 * 3600000).toISOString(),
      date: new Date(nowMs - 24 * 3600000 - 8 * 3600000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 250.00,
      total_amount: 250.00,
      total: 250.00,
      subtotal: 250.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Leather Wallet', name: 'Leather Wallet', quantity: 1, qty: 1, unitPrice: 250.00, price: 250.00, subtotal: 250.00 }
      ]
    },
    {
      id: 'tx12',
      receiptNumber: 'RCP-0014',
      receipt_number: 'RCP-0014',
      orderNumber: 'RCP-0014',
      dateCreated: new Date(nowMs - 24 * 3600000 - 9 * 3600000).toISOString(),
      date_created: new Date(nowMs - 24 * 3600000 - 9 * 3600000).toISOString(),
      date: new Date(nowMs - 24 * 3600000 - 9 * 3600000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'card',
      payment_method: 'card',
      totalAmount: 5500.00,
      total_amount: 5500.00,
      total: 5500.00,
      subtotal: 5500.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Samsung Galaxy Tab', name: 'Samsung Galaxy Tab', quantity: 1, qty: 1, unitPrice: 5500.00, price: 5500.00, subtotal: 5500.00 }
      ]
    },

    // --- THIS WEEK & MONTH (13 Additional Transactions) ---
    {
      id: 'tx13',
      receiptNumber: 'RCP-0013',
      receipt_number: 'RCP-0013',
      orderNumber: 'RCP-0013',
      dateCreated: new Date(nowMs - 3 * 86400000).toISOString(),
      date_created: new Date(nowMs - 3 * 86400000).toISOString(),
      date: new Date(nowMs - 3 * 86400000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 650.00,
      total_amount: 650.00,
      total: 650.00,
      subtotal: 650.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Leather Wallet', name: 'Leather Wallet', quantity: 2, qty: 2, unitPrice: 250.00, price: 250.00, subtotal: 500.00 },
        { productName: 'Basic White Tee', name: 'Basic White Tee', quantity: 1, qty: 1, unitPrice: 150.00, price: 150.00, subtotal: 150.00 }
      ]
    },
    {
      id: 'tx14',
      receiptNumber: 'RCP-0012',
      receipt_number: 'RCP-0012',
      orderNumber: 'RCP-0012',
      dateCreated: new Date(nowMs - 4 * 86400000).toISOString(),
      date_created: new Date(nowMs - 4 * 86400000).toISOString(),
      date: new Date(nowMs - 4 * 86400000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 1800.00,
      total_amount: 1800.00,
      total: 1800.00,
      subtotal: 1800.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Nike Air Max', name: 'Nike Air Max', quantity: 2, qty: 2, unitPrice: 850.00, price: 850.00, subtotal: 1700.00 },
        { productName: 'Voltic Natural Mineral Water 500ml (Pack of 16)', name: 'Voltic Natural Mineral Water 500ml (Pack of 16)', quantity: 2, qty: 2, unitPrice: 50.00, price: 50.00, subtotal: 100.00 }
      ]
    },
    {
      id: 'tx15',
      receiptNumber: 'RCP-0011',
      receipt_number: 'RCP-0011',
      orderNumber: 'RCP-0011',
      dateCreated: new Date(nowMs - 5 * 86400000).toISOString(),
      date_created: new Date(nowMs - 5 * 86400000).toISOString(),
      date: new Date(nowMs - 5 * 86400000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 920.00,
      total_amount: 920.00,
      total: 920.00,
      subtotal: 920.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Adidas Ultraboost', name: 'Adidas Ultraboost', quantity: 1, qty: 1, unitPrice: 920.00, price: 920.00, subtotal: 920.00 }
      ]
    },
    {
      id: 'tx16',
      receiptNumber: 'RCP-0010',
      receipt_number: 'RCP-0010',
      orderNumber: 'RCP-0010',
      dateCreated: new Date(nowMs - 6 * 86400000).toISOString(),
      date_created: new Date(nowMs - 6 * 86400000).toISOString(),
      date: new Date(nowMs - 6 * 86400000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'card',
      payment_method: 'card',
      totalAmount: 4200.00,
      total_amount: 4200.00,
      total: 4200.00,
      subtotal: 4200.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Sony WH-1000XM4', name: 'Sony WH-1000XM4', quantity: 1, qty: 1, unitPrice: 4200.00, price: 4200.00, subtotal: 4200.00 }
      ]
    },
    {
      id: 'tx17',
      receiptNumber: 'RCP-0009',
      receipt_number: 'RCP-0009',
      orderNumber: 'RCP-0009',
      dateCreated: new Date(nowMs - 7 * 86400000).toISOString(),
      date_created: new Date(nowMs - 7 * 86400000).toISOString(),
      date: new Date(nowMs - 7 * 86400000).toISOString(),
      cashierName: 'Kwame Mensah',
      cashier_name: 'Kwame Mensah',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 250.00,
      total_amount: 250.00,
      total: 250.00,
      subtotal: 250.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Leather Wallet', name: 'Leather Wallet', quantity: 1, qty: 1, unitPrice: 250.00, price: 250.00, subtotal: 250.00 }
      ]
    },
    {
      id: 'tx18',
      receiptNumber: 'RCP-0008',
      receipt_number: 'RCP-0008',
      orderNumber: 'RCP-0008',
      dateCreated: new Date(nowMs - 9 * 86400000).toISOString(),
      date_created: new Date(nowMs - 9 * 86400000).toISOString(),
      date: new Date(nowMs - 9 * 86400000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 850.00,
      total_amount: 850.00,
      total: 850.00,
      subtotal: 850.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Nike Air Max', name: 'Nike Air Max', quantity: 1, qty: 1, unitPrice: 850.00, price: 850.00, subtotal: 850.00 }
      ]
    },
    {
      id: 'tx19',
      receiptNumber: 'RCP-0007',
      receipt_number: 'RCP-0007',
      orderNumber: 'RCP-0007',
      dateCreated: new Date(nowMs - 12 * 86400000).toISOString(),
      date_created: new Date(nowMs - 12 * 86400000).toISOString(),
      date: new Date(nowMs - 12 * 86400000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 120.00,
      total_amount: 120.00,
      total: 120.00,
      subtotal: 120.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Basic White Tee', name: 'Basic White Tee', quantity: 1, qty: 1, unitPrice: 120.00, price: 120.00, subtotal: 120.00 }
      ]
    },
    {
      id: 'tx20',
      receiptNumber: 'RCP-0006',
      receipt_number: 'RCP-0006',
      orderNumber: 'RCP-0006',
      dateCreated: new Date(nowMs - 15 * 86400000).toISOString(),
      date_created: new Date(nowMs - 15 * 86400000).toISOString(),
      date: new Date(nowMs - 15 * 86400000).toISOString(),
      cashierName: 'Kwame Mensah',
      cashier_name: 'Kwame Mensah',
      paymentMethod: 'card',
      payment_method: 'card',
      totalAmount: 3500.00,
      total_amount: 3500.00,
      total: 3500.00,
      subtotal: 3500.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Apple AirPods Pro', name: 'Apple AirPods Pro', quantity: 1, qty: 1, unitPrice: 3500.00, price: 3500.00, subtotal: 3500.00 }
      ]
    },
    {
      id: 'tx21',
      receiptNumber: 'RCP-0005',
      receipt_number: 'RCP-0005',
      orderNumber: 'RCP-0005',
      dateCreated: new Date(nowMs - 18 * 86400000).toISOString(),
      date_created: new Date(nowMs - 18 * 86400000).toISOString(),
      date: new Date(nowMs - 18 * 86400000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 920.00,
      total_amount: 920.00,
      total: 920.00,
      subtotal: 920.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Adidas Ultraboost', name: 'Adidas Ultraboost', quantity: 1, qty: 1, unitPrice: 920.00, price: 920.00, subtotal: 920.00 }
      ]
    },
    {
      id: 'tx22',
      receiptNumber: 'RCP-0004',
      receipt_number: 'RCP-0004',
      orderNumber: 'RCP-0004',
      dateCreated: new Date(nowMs - 20 * 86400000).toISOString(),
      date_created: new Date(nowMs - 20 * 86400000).toISOString(),
      date: new Date(nowMs - 20 * 86400000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 380.00,
      total_amount: 380.00,
      total: 380.00,
      subtotal: 380.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Sunglasses Classic', name: 'Sunglasses Classic', quantity: 1, qty: 1, unitPrice: 380.00, price: 380.00, subtotal: 380.00 }
      ]
    },
    {
      id: 'tx23',
      receiptNumber: 'RCP-0003',
      receipt_number: 'RCP-0003',
      orderNumber: 'RCP-0003',
      dateCreated: new Date(nowMs - 22 * 86400000).toISOString(),
      date_created: new Date(nowMs - 22 * 86400000).toISOString(),
      date: new Date(nowMs - 22 * 86400000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'card',
      payment_method: 'card',
      totalAmount: 4200.00,
      total_amount: 4200.00,
      total: 4200.00,
      subtotal: 4200.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Sony WH-1000XM4', name: 'Sony WH-1000XM4', quantity: 1, qty: 1, unitPrice: 4200.00, price: 4200.00, subtotal: 4200.00 }
      ]
    },
    {
      id: 'tx24',
      receiptNumber: 'RCP-0002',
      receipt_number: 'RCP-0002',
      orderNumber: 'RCP-0002',
      dateCreated: new Date(nowMs - 25 * 86400000).toISOString(),
      date_created: new Date(nowMs - 25 * 86400000).toISOString(),
      date: new Date(nowMs - 25 * 86400000).toISOString(),
      cashierName: 'Ama Serwaa',
      cashier_name: 'Ama Serwaa',
      paymentMethod: 'mobile_money',
      payment_method: 'mobile_money',
      totalAmount: 1200.00,
      total_amount: 1200.00,
      total: 1200.00,
      subtotal: 1200.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Adidas Ultraboost', name: 'Adidas Ultraboost', quantity: 1, qty: 1, unitPrice: 920.00, price: 920.00, subtotal: 920.00 },
        { productName: 'Leather Wallet', name: 'Leather Wallet', quantity: 1, qty: 1, unitPrice: 280.00, price: 280.00, subtotal: 280.00 }
      ]
    },
    {
      id: 'tx25',
      receiptNumber: 'RCP-0001',
      receipt_number: 'RCP-0001',
      orderNumber: 'RCP-0001',
      dateCreated: new Date(nowMs - 28 * 86400000).toISOString(),
      date_created: new Date(nowMs - 28 * 86400000).toISOString(),
      date: new Date(nowMs - 28 * 86400000).toISOString(),
      cashierName: 'Kofi Annan',
      cashier_name: 'Kofi Annan',
      paymentMethod: 'cash',
      payment_method: 'cash',
      totalAmount: 850.00,
      total_amount: 850.00,
      total: 850.00,
      subtotal: 850.00,
      discount: 0.00,
      status: 'completed',
      items: [
        { productName: 'Nike Air Max', name: 'Nike Air Max', quantity: 1, qty: 1, unitPrice: 850.00, price: 850.00, subtotal: 850.00 }
      ]
    }
  ];

  mock.onGet(/\/pos\/transactions\/[^/]+\/receipt/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const tx = mockTransactions.find(t => t.id === id);
    if (tx) {
      return [200, {
        success: {
          status: 'OK',
          code: 200,
          data: {
            receipt: {
              ...tx,
              receiptNumber: tx.receiptNumber || tx.receipt_number || tx.orderNumber,
              date: tx.date || tx.date_created || tx.dateCreated,
              cashierName: tx.cashierName || tx.cashier_name,
              paymentMethod: tx.paymentMethod || tx.payment_method,
              subtotal: tx.subtotal || tx.totalAmount || tx.total,
              totalAmount: tx.totalAmount || tx.total || tx.total_amount,
              total: tx.total || tx.totalAmount || tx.total_amount,
              discount: tx.discount || 0,
              storeName: 'HeadlessPOS Demo Store',
              storeAddress: '123 Commerce St, Accra, Ghana',
              storePhone: '+233 24 123 4567',
              items: (tx.items || []).map((item: any) => ({
                productName: item.productName || item.name || 'Sample Product',
                name: item.name || item.productName || 'Sample Product',
                quantity: item.quantity ?? item.qty ?? 1,
                qty: item.qty ?? item.quantity ?? 1,
                unitPrice: item.unitPrice ?? item.price ?? tx.totalAmount,
                price: item.price ?? item.unitPrice ?? tx.totalAmount,
                subtotal: item.subtotal ?? ((item.unitPrice ?? item.price ?? tx.totalAmount) * (item.quantity ?? item.qty ?? 1))
              }))
            }
          }
        }
      }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Receipt not found', code: 404 } }];
  });

  mock.onPost(/\/pos\/transactions\/[^/]+\/refund/).reply((config) => {
    const url = config.url || '';
    const urlParts = url.split('/');
    const id = urlParts[urlParts.length - 2];
    const { type, amount } = JSON.parse(config.data);
    const txIndex = mockTransactions.findIndex(t => t.id === id);
    
    if (txIndex !== -1) {
      const tx = mockTransactions[txIndex];
      const refundAmt = type === 'full' ? tx.totalAmount : amount;
      if (type === 'full' || amount >= tx.totalAmount) {
        mockTransactions[txIndex] = { ...tx, status: 'refunded', totalAmount: 0, total_amount: 0, total: 0 };
      } else {
        const newTotal = tx.totalAmount - amount;
        mockTransactions[txIndex] = { ...tx, status: 'partially_refunded', totalAmount: newTotal, total_amount: newTotal, total: newTotal };
      }
      return [200, { success: { status: 'OK', code: 200, message: 'Refund processed', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Transaction not found', code: 404 } }];
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
      filtered = filtered.filter(t => t.paymentMethod === method || t.payment_method === method);
    }

    if (cashierName) {
      filtered = filtered.filter(t =>
        t.cashierName?.toLowerCase() === cashierName.toLowerCase() ||
        t.cashier_name?.toLowerCase() === cashierName.toLowerCase()
      );
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      filtered = filtered.filter(t => {
        const tTime = new Date(t.date_created || t.dateCreated || t.date).getTime();
        return tTime >= start && tTime <= end;
      });
    }

    return [200, { success: { status: 'OK', code: 200, data: { transactions: filtered, total: filtered.length } } }];
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

    const totalCalc = payload.total_amount || items.reduce((sum: number, i: any) => sum + ((i.unit_price || i.price || 0) * (i.quantity || i.qty || 1)), 0);
    const formattedItems = items.map((i: any) => {
      let name = 'Unknown Item';
      for (const p of mockProducts) {
        const v = p.variants?.find((v: any) => v.id === i.variant_id);
        if (v) {
          const attrStr = Object.values(v.variant_attributes || {}).join(' / ');
          name = attrStr ? `${p.name} · ${attrStr}` : p.name;
          break;
        }
      }
      const itemPrice = i.unit_price || i.price || 0;
      const itemQty = i.quantity || i.qty || 1;
      return {
        productName: name,
        name: name,
        quantity: itemQty,
        qty: itemQty,
        unitPrice: itemPrice,
        price: itemPrice,
        subtotal: itemPrice * itemQty
      };
    });

    const nowIso = new Date().toISOString();

    const newTx = {
      id: newTxId,
      receiptNumber,
      receipt_number: receiptNumber,
      orderNumber: receiptNumber,
      dateCreated: nowIso,
      date_created: nowIso,
      date: nowIso,
      cashierName: payload.cashier_name || 'Kofi Annan',
      cashier_name: payload.cashier_name || 'Kofi Annan',
      paymentMethod: payload.payment_method || 'cash',
      payment_method: payload.payment_method || 'cash',
      totalAmount: totalCalc,
      total_amount: totalCalc,
      total: totalCalc,
      subtotal: totalCalc,
      discount: payload.discount || 0,
      status: 'completed',
      items: formattedItems
    };

    mockTransactions = [newTx, ...mockTransactions];
    
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          transaction: newTx
        }
      }
    }];
  });
  
  mock.onGet(/\/tenant\/inventory\/suppliers/).reply(200, {
    success: {
      status: 'OK',
      code: 200,
      data: {
        suppliers: mockSuppliers
      }
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
      success: {
        status: 'OK',
        code: 200,
        data: {
          purchaseOrders: filtered
        }
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
      success: {
        status: 'OK',
        code: 200,
        data: {
          purchaseOrder: newPO
        }
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
      return [404, { error: { status: 'NOT_FOUND', message: 'Purchase order not found', code: 404 } }];
    }
    
    const po = mockPurchaseOrders[poIdx];
    if (po.status === 'received') {
      return [400, { error: { status: 'BAD_REQUEST', message: 'Purchase order already received', code: 400 } }];
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
    success: {
      status: 'OK',
      code: 200,
      data: {
        orders: [
          { id: 'o1', reference: 'ORD-1001', total_amount: 850.00, status: 'delivered', created_at: new Date().toISOString() }
        ]
      }
    }
  });

  mock.onGet(/\/tenant\/customers\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const customer = mockCustomers.find(c => c.id === id);
    if (customer) return [200, { success: { status: 'OK', code: 200, data: { customer } } }];
    return [404, { error: { status: 'NOT_FOUND', message: 'Customer not found', code: 404 } }];
  });

  mock.onGet(/\/tenant\/customers/).reply(200, {
    success: { status: 'OK', code: 200, data: { customers: mockCustomers, total: mockCustomers.length, page: 1, limit: 50 } }
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
    
    return [200, { success: { status: 'OK', code: 200, data: { debtors, total: debtors.length } } }];
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
    
    return [200, { success: { status: 'OK', code: 200, data: { purchases: data } } }];
  });

  mock.onPost(/\/tenant\/customers\/[^/]+\/settle-all-debt/).reply((config) => {
    const url = config.url || '';
    const match = url.match(/\/tenant\/customers\/([^/?#]+)\/settle-all-debt/);
    const customerId = match ? match[1] : '';
    const { amount, payment_method } = JSON.parse(config.data);
    
    const customer = mockCustomers.find(c => c.id === customerId);
    if (!customer) return [404, { error: { status: 'NOT_FOUND', message: 'Customer not found', code: 404 } }];
    
    const purchases = mockCreditHistory.filter(h => h.customer_id === customerId && h.type === 'credit_purchase');
    const settlements = mockCreditHistory.filter(h => h.customer_id === customerId && h.type === 'settlement');
    const totalCredit = purchases.reduce((sum, p) => sum + p.amount, 0);
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    const currentOutstanding = Math.max(0, totalCredit - totalSettled);
    
    if (amount <= 0 || amount > currentOutstanding) {
      return [400, { error: { status: 'BAD_REQUEST', message: 'Invalid settlement amount', code: 400 } }];
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
      success: { 
        status: 'OK',
        code: 200,
        message: 'Consolidated settlement processed successfully', 
        data: { 
          new_balance: customer.outstanding_debt,
          settlements: settlementDetails
        } 
      } 
    }];
  });

  mock.onPost(/\/tenant\/credit-ledger\/[^/]+\/settle/).reply((config) => {
    const url = config.url || '';
    const match = url.match(/\/tenant\/credit-ledger\/([^/?#]+)\/settle/);
    const purchaseId = match ? match[1] : '';
    const { amount, payment_method } = JSON.parse(config.data);
    
    const purchase = mockCreditHistory.find(h => h.id === purchaseId);
    if (!purchase) return [404, { error: { status: 'NOT_FOUND', message: 'Credit record not found', code: 404 } }];
    
    const settlements = mockCreditHistory.filter(h => h.type === 'settlement' && h.purchase_id === purchaseId);
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    const remaining = purchase.amount - totalSettled;
    
    if (amount <= 0 || amount > remaining) {
      return [400, { error: { status: 'BAD_REQUEST', message: 'Invalid settlement amount', code: 400 } }];
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
    
    return [200, { success: { status: 'OK', code: 200, message: 'Payment recorded successfully', data: { new_balance: remaining - amount } } }];
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
    success: {
      status: 'OK',
      code: 200,
      data: {
        items: [
          { id: 'oi1', product_name: 'Nike Air Max', sku: 'NK-AM-01', quantity: 1, unit_price: 850.00, total_price: 850.00, image_url: null }
        ]
      }
    }
  });

  mock.onPut(/\/tenant\/orders\/[^/]+\/status/).reply((config) => {
    const id = config.url?.split('/')[3];
    const { status } = JSON.parse(config.data);
    const orderIndex = mockOrders.findIndex(o => o.id === id);
    if (orderIndex !== -1) {
      mockOrders[orderIndex].status = status;
      return [200, { success: { status: 'OK', code: 200, message: 'Order status updated', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Order not found', code: 404 } }];
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
      return [200, { success: { status: 'OK', code: 200, message: 'Refund processed', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Order not found', code: 404 } }];
  });

  mock.onGet(/\/tenant\/orders\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const order = mockOrders.find(o => o.id === id);
    if (order) return [200, { success: { status: 'OK', code: 200, data: { order } } }];
    return [404, { error: { status: 'NOT_FOUND', message: 'Order not found', code: 404 } }];
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

    return [200, { success: { status: 'OK', code: 200, data: { orders: filtered, total: filtered.length, page: 1, limit: 50 } } }];
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
    success: { status: 'OK', code: 200, data: { settings: mockStorefrontSettings } }
  });

  mock.onPut(/\/tenant\/storefront\/settings/).reply((config) => {
    mockStorefrontSettings = { ...mockStorefrontSettings, ...JSON.parse(config.data) };
    return [200, { success: { status: 'OK', code: 200, message: 'Settings updated', data: {} } }];
  });

  mock.onGet(/\/tenant\/storefront\/deployment/).reply(200, {
    success: { status: 'OK', code: 200, data: { deployment: { url: 'https://demo-store.headlesspos.com', deployed_at: new Date().toISOString(), template: 'modern' } } }
  });

  // Discounts
  let mockDiscounts = [
    { id: 'd1', code: 'WELCOME10', type: 'percentage', value: 10, min_order_amount: null, max_uses: null, uses_count: 45, is_active: true, expires_at: null },
    { id: 'd2', code: 'MINUS50', type: 'fixed', value: 50, min_order_amount: 500, max_uses: 100, uses_count: 100, is_active: false, expires_at: new Date(Date.now() + 7*86400000).toISOString() }
  ];

  mock.onGet(/\/tenant\/discounts/).reply(200, {
    success: { status: 'OK', code: 200, data: { discounts: mockDiscounts } }
  });

  mock.onPost(/\/tenant\/discounts\/[^/]+\/toggle/).reply((config) => {
    const id = config.url?.split('/')[3];
    const dIndex = mockDiscounts.findIndex(d => d.id === id);
    if (dIndex !== -1) {
      mockDiscounts[dIndex].is_active = !mockDiscounts[dIndex].is_active;
      return [200, { success: { status: 'OK', code: 200, data: { discount: mockDiscounts[dIndex] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Discount not found', code: 404 } }];
  });

  mock.onPost(/\/tenant\/discounts/).reply((config) => {
    const newD = { id: `d${Date.now()}`, ...JSON.parse(config.data), uses_count: 0 };
    mockDiscounts.push(newD);
    return [200, { success: { status: 'OK', code: 200, data: { discount: newD } } }];
  });

  mock.onPut(/\/tenant\/discounts\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const dIndex = mockDiscounts.findIndex(d => d.id === id);
    if (dIndex !== -1) {
      mockDiscounts[dIndex] = { ...mockDiscounts[dIndex], ...JSON.parse(config.data) };
      return [200, { success: { status: 'OK', code: 200, data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Discount not found', code: 404 } }];
  });

  mock.onDelete(/\/tenant\/discounts\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    mockDiscounts = mockDiscounts.filter(d => d.id !== id);
    return [200, { success: { status: 'OK', code: 200, data: {} } }];
  });

  // Suppliers list mock
  mock.onGet(/\/tenant\/suppliers(?:\?.*)?$/).reply((config) => {
    const url = config.url || '';
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

    const enrichedSuppliers = mockSuppliers.map(s => {
      const debt = mockSupplierCredits
        .filter(c => c.supplier_id === s.id && c.balance_remaining > 0)
        .reduce((sum, c) => sum + c.balance_remaining, 0);
      return {
        ...s,
        outstanding_debt: debt > 0 ? debt : null
      };
    });

    let filtered = [...enrichedSuppliers];
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchQuery) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery)) ||
        (s.email && s.email.toLowerCase().includes(searchQuery)) ||
        (s.phone && s.phone.includes(searchQuery)) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery))
      );
    }

    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          suppliers: filtered,
          pagination: { total_items: filtered.length, total: filtered.length, total_pages: 1, current_page: 1, per_page: 100 }
        }
      }
    }];
  });

  // GET /tenant/suppliers/:id
  mock.onGet(/\/tenant\/suppliers\/[^/]+$/).reply((config) => {
    const url = config.url || '';
    const id = url.split('/').pop() || '';
    const s = mockSuppliers.find(sup => sup.id === id);
    if (!s) return [404, { error: { status: 'NOT_FOUND', message: 'Supplier not found' } }];

    const debt = mockSupplierCredits
      .filter(c => c.supplier_id === s.id && c.balance_remaining > 0)
      .reduce((sum, c) => sum + c.balance_remaining, 0);

    const relatedPOs = mockPurchaseOrders.filter(po => po.supplier_id === s.id);

    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          supplier: {
            ...s,
            outstanding_debt: debt > 0 ? debt : null,
            total_orders: relatedPOs.length,
            recent_purchase_orders: relatedPOs.slice(0, 5)
          }
        }
      }
    }];
  });

  mock.onPost(/\/tenant\/suppliers$/).reply((config) => {
    const data = JSON.parse(config.data || '{}');
    const newSup = {
      id: `sup${Date.now()}`,
      name: data.name || 'New Supplier',
      contact_person: data.contact_person || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      tax_id: data.tax_id || '',
      notes: data.notes || '',
      is_active: true,
      status: 'active',
      dateCreated: new Date().toISOString()
    };
    mockSuppliers.push(newSup);
    return [201, { success: { status: 'CREATED', code: 201, data: { supplier: newSup } } }];
  });

  mock.onPut(/\/tenant\/suppliers\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const data = JSON.parse(config.data || '{}');
    const idx = mockSuppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockSuppliers[idx] = { ...mockSuppliers[idx], ...data };
      return [200, { success: { status: 'OK', code: 200, data: { supplier: mockSuppliers[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Supplier not found' } }];
  });

  mock.onDelete(/\/tenant\/suppliers\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const idx = mockSuppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockSuppliers.splice(idx, 1);
      return [200, { success: { status: 'OK', code: 200, message: 'Supplier deleted' } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Supplier not found' } }];
  });

  // Customer CRUD mock
  mock.onPost(/\/tenant\/customers$/).reply((config) => {
    const data = JSON.parse(config.data || '{}');
    const newCust = {
      id: `c${Date.now()}`,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'New Customer',
      email: data.email || '',
      phone: data.phone || '',
      total_orders: 0,
      total_spent: 0.00,
      created_at: new Date().toISOString(),
      outstanding_debt: 0.00,
      last_credit_date: null
    };
    mockCustomers.push(newCust);
    return [201, { success: { status: 'CREATED', code: 201, data: { customer: newCust } } }];
  });

  mock.onPut(/\/tenant\/customers\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const data = JSON.parse(config.data || '{}');
    const idx = mockCustomers.findIndex(c => c.id === id);
    if (idx !== -1) {
      mockCustomers[idx] = { ...mockCustomers[idx], ...data, name: `${data.first_name || mockCustomers[idx].first_name} ${data.last_name || mockCustomers[idx].last_name}` };
      return [200, { success: { status: 'OK', code: 200, data: { customer: mockCustomers[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Customer not found' } }];
  });

  // ── Staff Management Mock ───────────────────────────────────────────
  // GET /tenant/staff
  mock.onGet(/\/tenant\/staff/).reply((config) => {
    const url = config.url || '';
    if (url.includes('/role') || url.includes('/set-pin')) return [404, {}];
    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          staff: mockStaff,
          total: mockStaff.length
        }
      }
    }];
  });

  // POST /tenant/staff
  mock.onPost(/\/tenant\/staff$/).reply((config) => {
    const data = JSON.parse(config.data || '{}');
    const newStaff = {
      id: `st${Date.now()}`,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'New Staff',
      email: data.email || '',
      role: data.role || 'cashier',
      is_active: true,
      pos_pin: data.pos_pin || '1234',
      last_login: null
    };
    mockStaff.push(newStaff);
    return [201, {
      success: {
        status: 'CREATED',
        code: 201,
        data: { staff: newStaff }
      }
    }];
  });

  // PUT /tenant/staff/:id/role
  mock.onPut(/\/tenant\/staff\/[^/]+\/role$/).reply((config) => {
    const urlParts = (config.url || '').split('/');
    const id = urlParts[urlParts.length - 2];
    const data = JSON.parse(config.data || '{}');
    const idx = mockStaff.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockStaff[idx].role = data.role || mockStaff[idx].role;
      return [200, { success: { status: 'OK', code: 200, message: 'Role updated', data: { staff: mockStaff[idx] } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Staff member not found', code: 404 } }];
  });

  // POST /tenant/staff/:id/set-pin
  mock.onPost(/\/tenant\/staff\/[^/]+\/set-pin$/).reply((config) => {
    const urlParts = (config.url || '').split('/');
    const id = urlParts[urlParts.length - 2];
    const data = JSON.parse(config.data || '{}');
    const idx = mockStaff.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockStaff[idx].pos_pin = data.pin;
      return [200, { success: { status: 'OK', code: 200, message: 'PIN set successfully', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Staff member not found', code: 404 } }];
  });

  // DELETE /tenant/staff/:id
  mock.onDelete(/\/tenant\/staff\/[^/]+$/).reply((config) => {
    const id = (config.url || '').split('/').pop();
    const idx = mockStaff.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockStaff[idx].is_active = false;
      return [200, { success: { status: 'OK', code: 200, message: 'Staff member deactivated', data: {} } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Staff member not found', code: 404 } }];
  });

  // ── Stock Upload Parse Mock ─────────────────────────────────────────

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
      success: {
        status: 'OK',
        code: 200,
        data: {
          returns: filtered,
          total: filtered.length
        }
      }
    }];
  });

  // GET /pos/returns/:id
  mock.onGet(/\/pos\/returns\/[^/]+$/).reply((config) => {
    const url = config.url || '';
    const id = url.split('/').pop() || '';
    const ret = mockReturns.find(r => r.id === id);
    if (ret) {
      return [200, { success: { status: 'OK', code: 200, data: { return: ret } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Return not found', code: 404 } }];
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
      success: {
        status: 'CREATED',
        code: 201,
        data: {
          return: newReturn
        }
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
        success: {
          status: 'OK',
          code: 200,
          message: "Return approved successfully",
          data: {
            return: mockReturns[retIdx]
          }
        }
      }];
    }
    
    return [404, { error: { status: "NOT_FOUND", message: "Return record not found", code: 404 } }];
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
        success: {
          status: 'OK',
          code: 200,
          message: "Return rejected successfully",
          data: {
            return: mockReturns[retIdx]
          }
        }
      }];
    }
    return [404, { error: { status: "NOT_FOUND", message: "Return record not found", code: 404 } }];
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
      due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], // 5 days from now
      notes: "Received batch of Sony headphones on 30-day terms",
      date_created: new Date(Date.now() - 10 * 86400000).toISOString(),
      payments: [
        {
          id: "scp1",
          amount: 5000.00,
          payment_method: "mobile_money",
          reference: "TXN-MOMO-993",
          notes: "First installment via MTN MoMo",
          date_created: new Date(Date.now() - 5 * 86400000).toISOString()
        }
      ]
    },
    {
      id: "sc2",
      supplier_id: "sup2",
      supplier_name: "Accra Garments & Textiles",
      purchase_order_id: "po2",
      purchase_order_ref: "PO-2026-002",
      total_amount: 3400.00,
      amount_paid: 0.00,
      balance_remaining: 3400.00,
      status: "outstanding" as const,
      due_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // 2 days ago (overdue)
      notes: "Apparel invoice for basic white tees",
      date_created: new Date(Date.now() - 15 * 86400000).toISOString(),
      payments: []
    },
    {
      id: "sc3",
      supplier_id: "sup3",
      supplier_name: "Nunu Dairy & Beverages Ltd",
      purchase_order_id: "po3",
      purchase_order_ref: "PO-2026-003",
      total_amount: 3019.00,
      amount_paid: 0.00,
      balance_remaining: 3019.00,
      status: "outstanding" as const,
      due_date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0], // 12 days from now
      notes: "Weekly restock of 8 cartons Nunu Evaporated Milk",
      date_created: new Date(Date.now() - 7 * 86400000).toISOString(),
      payments: []
    },
    {
      id: "sc4",
      supplier_id: "sup4",
      supplier_name: "Golden Tree Confectionery",
      purchase_order_id: "po4",
      purchase_order_ref: "PO-2026-004",
      total_amount: 1450.00,
      amount_paid: 0.00,
      balance_remaining: 1450.00,
      status: "outstanding" as const,
      due_date: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
      notes: "Kingsbite chocolate bars bulk delivery",
      date_created: new Date(Date.now() - 4 * 86400000).toISOString(),
      payments: []
    },
    {
      id: "sc5",
      supplier_id: "sup6",
      supplier_name: "FanMilk Distribution Hub",
      purchase_order_id: "po5",
      purchase_order_ref: "PO-2026-005",
      total_amount: 850.00,
      amount_paid: 0.00,
      balance_remaining: 850.00,
      status: "outstanding" as const,
      due_date: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
      notes: "FanYogo frozen yogurt packs",
      date_created: new Date(Date.now() - 3 * 86400000).toISOString(),
      payments: []
    },
    {
      id: "sc6",
      supplier_id: "sup5",
      supplier_name: "Voltic Mineral Water Depot",
      purchase_order_id: "po0",
      purchase_order_ref: "PO-2026-000",
      total_amount: 1200.00,
      amount_paid: 1200.00,
      balance_remaining: 0.00,
      status: "settled" as const,
      due_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      notes: "Mineral water bulk pallet (fully settled)",
      date_created: new Date(Date.now() - 25 * 86400000).toISOString(),
      payments: [
        {
          id: "scp6",
          amount: 1200.00,
          payment_method: "bank_transfer",
          reference: "TXN-BNK-441",
          notes: "Settled in full via GCB transfer",
          date_created: new Date(Date.now() - 12 * 86400000).toISOString()
        }
      ]
    }
  ];

  // GET /tenant/supplier-credit/summary
  mock.onGet(/\/tenant\/supplier-credit\/summary$/).reply(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const activeCredits = mockSupplierCredits.filter(s => s.balance_remaining > 0);
    const totalOutstanding = activeCredits.reduce((sum, s) => sum + s.balance_remaining, 0);
    const uniqueSuppliersWithDebt = new Set(activeCredits.map(s => s.supplier_id)).size;
    const overdueCount = activeCredits.filter(s => s.due_date < todayStr).length;
    const upcoming7Days = activeCredits.filter(s => s.due_date >= todayStr && s.due_date <= in7Days).length;

    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          total_outstanding: totalOutstanding,
          total_suppliers_with_debt: uniqueSuppliersWithDebt,
          overdue_count: overdueCount,
          upcoming_due_7_days: upcoming7Days
        }
      }
    }];
  });

  // GET /tenant/supplier-credit
  mock.onGet(/\/tenant\/supplier-credit(?:\?.*)?$/).reply((config) => {
    const url = config.url || '';
    if (url.includes('/summary')) return [404, {}];
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const status = searchParams.get('status') || '';
    const supplierId = searchParams.get('supplier_id') || '';
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

    let filtered = [...mockSupplierCredits];
    if (status && status !== 'all') {
      filtered = filtered.filter(s => s.status === status);
    }
    if (supplierId && supplierId !== 'all') {
      filtered = filtered.filter(s => s.supplier_id === supplierId);
    }
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.supplier_name.toLowerCase().includes(searchQuery) ||
        s.purchase_order_ref.toLowerCase().includes(searchQuery) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery))
      );
    }

    return [200, {
      success: {
        status: 'OK',
        code: 200,
        data: {
          supplierCredits: filtered,
          pagination: {
            page: 1,
            pages: 1,
            perPage: 20,
            total: filtered.length,
            hasNext: false,
            hasPrev: false
          },
          total: filtered.length
        }
      }
    }];
  });

  // GET /tenant/supplier-credit/:id
  mock.onGet(/\/tenant\/supplier-credit\/[^/]+$/).reply((config) => {
    const url = config.url || '';
    const id = url.split('/').pop() || '';
    const credit = mockSupplierCredits.find(s => s.id === id);
    if (credit) {
      return [200, { success: { status: 'OK', code: 200, data: { supplierCredit: credit } } }];
    }
    return [404, { error: { status: 'NOT_FOUND', message: 'Supplier credit not found', code: 404 } }];
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
        success: {
          status: 'OK',
          code: 200,
          message: "Supplier credit payment recorded successfully",
          data: {
            supplierCredit: mockSupplierCredits[creditIdx]
          }
        }
      }];
    }

    return [404, { error: { status: "NOT_FOUND", message: "Supplier credit record not found", code: 404 } }];
  });

  // ═══════════════════════════════════════════════════════════════════
  // TENANT NOTIFICATIONS MOCKS
  // ═══════════════════════════════════════════════════════════════════
  let mockNotifications = [
    {
      id: 'n1',
      title: 'Low Stock Alert: Voltic 500ml',
      message: 'Voltic Natural Mineral Water reached critical stock level (4 bottles remaining). Consider ordering a new pack.',
      category: 'inventory',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      read: false,
      actionUrl: '/inventory/products',
      actionLabel: 'Restock Item',
    },
    {
      id: 'n2',
      title: 'Supplier Credit Overdue',
      message: 'Payment of GHS 3,400.00 to Accra Garments & Textiles was due 2 days ago for PO-2026-002.',
      category: 'financial',
      type: 'alert',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      read: false,
      actionUrl: '/inventory/suppliers',
      actionLabel: 'View Credit',
    },
    {
      id: 'n3',
      title: 'New Online Order #ORD-1006',
      message: 'Customer Ama Owusu placed an order for 4 items via Paystack (GHS 2,100.00).',
      category: 'orders',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      read: false,
      actionUrl: '/ecommerce/orders',
      actionLabel: 'Process Order',
    },
    {
      id: 'n4',
      title: 'Supplier Credit Due in 5 Days',
      message: 'TechWholesale Ghana credit balance of GHS 10,000.00 is due on PO-2026-001.',
      category: 'financial',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      read: false,
      actionUrl: '/inventory/suppliers',
      actionLabel: 'Inspect Ledger',
    },
    {
      id: 'n5',
      title: 'Low Stock Alert: Kleesoft Powder',
      message: 'Kleesoft Washing Powder stock quantity is low (3 packs left in storage).',
      category: 'inventory',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      read: true,
      actionUrl: '/inventory/products',
      actionLabel: 'Restock Item',
    },
    {
      id: 'n6',
      title: 'Payroll Disbursal Completed',
      message: 'Monthly staff salaries totaling GHS 12,200.00 successfully logged and disbursed across 5 recipients.',
      category: 'financial',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      read: true,
      actionUrl: '/staff/payroll',
      actionLabel: 'Review Run',
    },
    {
      id: 'n7',
      title: 'System Security Engine Online',
      message: 'POS receipt printing and end-of-day reconciliation engine upgraded to v2.4.0.',
      category: 'system',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      read: true,
      actionUrl: '/settings',
      actionLabel: 'System Settings',
    },
  ];

  // GET /tenant/notifications
  mock.onGet(/\/tenant\/notifications$/).reply((config) => {
    const params = config.params || {};
    let filtered = [...mockNotifications];

    if (params.is_read !== undefined) {
      const isRead = String(params.is_read) === 'true';
      filtered = filtered.filter((n) => n.read === isRead);
    }

    if (params.category) {
      filtered = filtered.filter((n) => n.category === params.category);
    }

    if (params.search) {
      const q = String(params.search).toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q)
      );
    }

    const unreadCount = mockNotifications.filter((n) => !n.read).length;

    return [
      200,
      {
        success: {
          message: 'Notifications fetched successfully',
          data: {
            notifications: filtered,
            unreadCount,
            total: filtered.length,
          },
        },
      },
    ];
  });

  // PATCH /tenant/notifications/:id/read
  mock.onPatch(/\/tenant\/notifications\/[^/]+\/read$/).reply((config) => {
    const url = config.url || '';
    const parts = url.split('/');
    const id = parts[parts.length - 2];

    const idx = mockNotifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      mockNotifications[idx].read = true;
    }

    return [
      200,
      {
        success: {
          message: 'Notification marked as read',
          data: { id, read: true },
        },
      },
    ];
  });

  // POST /tenant/notifications/read-all
  mock.onPost('/tenant/notifications/read-all').reply(() => {
    mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
    return [
      200,
      {
        success: {
          message: 'All notifications marked as read',
        },
      },
    ];
  });

  // DELETE /tenant/notifications/clear-read
  mock.onDelete('/tenant/notifications/clear-read').reply(() => {
    mockNotifications = mockNotifications.filter((n) => !n.read);
    return [
      200,
      {
        success: {
          message: 'Read notifications cleared',
        },
      },
    ];
  });

  // DELETE /tenant/notifications/:id
  mock.onDelete(/\/tenant\/notifications\/[^/]+$/).reply((config) => {
    const url = config.url || '';
    const parts = url.split('/');
    const id = parts[parts.length - 1];

    mockNotifications = mockNotifications.filter((n) => n.id !== id);

    return [
      200,
      {
        success: {
          message: 'Notification deleted successfully',
        },
      },
    ];
  });

  // ─── REPORTS & TRANSACTIONS MOCKS ──────────────────────────────────────────
  // GET /tenant/reports/sales
  mock.onGet(/\/tenant\/reports\/sales/).reply(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate timeseries for the last 10 days
    const timeseries = [];
    for (let i = 9; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
      
      // Calculate from mockTransactions for that day
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const dayTxns = mockTransactions.filter(t => {
        const txTime = new Date(t.date || t.date_created || t.dateCreated).getTime();
        return txTime >= dayStart && txTime < dayEnd && t.status === 'completed';
      });

      const daySales = dayTxns.reduce((sum, t) => sum + (t.totalAmount || t.total || 0), 0);
      timeseries.push({
        date: label,
        sales: daySales > 0 ? daySales : (i === 0 ? 5450 : (i === 1 ? 7380 : 1200 + (i * 350))),
        orders: dayTxns.length > 0 ? dayTxns.length : (i === 0 ? 6 : (i === 1 ? 6 : 2 + (i % 3)))
      });
    }

    const summary = {
      gross_sales: 32450.00,
      total_refunds: 941.00,
      net_sales: 31509.00,
      total_discounts: 150.00,
      cogs: 11200.00,
      gross_profit: 20309.00,
      gross_margin_pct: 64.5,
      cost_coverage_pct: 78.2,
      total_orders: mockTransactions.length,
      completed_orders_count: mockTransactions.filter(t => t.status === 'completed').length,
      refunded_orders_count: mockTransactions.filter(t => t.status === 'refunded').length,
      average_order_value: 1260.00,
      max_order_value: 5500.00,
      costed_items_count: 55,
      costed_revenue: 28400.00,
      uncosted_items_count: 8,
      uncosted_revenue: 3109.00,
      period_expenses: 5800.00,
      net_operating_profit: 14509.00,
      breakdown_by_channel: {
        pos: { count: mockTransactions.length, gross: 32450.00, total: 31509.00 },
        online: { count: 6, gross: 4200.00, total: 4200.00 }
      },
      payment_distribution: [
        { name: 'Cash', value: 14200.00, percentage: 43.8, color: '#10b981' },
        { name: 'MoMo', value: 9850.00, percentage: 30.3, color: '#f59e0b' },
        { name: 'Card', value: 8400.00, percentage: 25.9, color: '#6366f1' }
      ]
    };

    return [
      200,
      {
        success: {
          code: 200,
          data: {
            summary,
            timeseries,
            payment_distribution: summary.payment_distribution
          }
        }
      }
    ];
  });

  // GET /tenant/reports/products
  mock.onGet(/\/tenant\/reports\/products/).reply((config) => {
    const url = new URL(`http://localhost${config.url || ''}`);
    const sort = url.searchParams.get('sort') || 'top_selling';
    const search = (url.searchParams.get('search') || '').toLowerCase();

    let products = [
      {
        id: 'p1',
        name: 'Graphic Cotton T-Shirt',
        sku: 'TSH-BLK-01',
        category: 'Apparel',
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200',
        units_sold: 30,
        revenue: 1029.00,
        cost_of_goods: 450.00,
        cost_price: 15.00,
        gross_profit: 579.00,
        gross_margin: 56.3,
        has_cost: true,
        stock_quantity: 45,
        low_stock_threshold: 5,
        stock_status: 'in_stock'
      },
      {
        id: 'p2',
        name: 'Voltic Mineral Water 500ml',
        sku: 'WAT-VOL-01',
        category: 'Beverages',
        image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=200',
        units_sold: 14,
        revenue: 360.00,
        cost_of_goods: 140.00,
        cost_price: 10.00,
        gross_profit: 220.00,
        gross_margin: 61.1,
        has_cost: true,
        stock_quantity: 75,
        low_stock_threshold: 10,
        stock_status: 'in_stock'
      },
      {
        id: 'p3',
        name: 'Coca Cola 330ml Can',
        sku: 'BEV-COK-02',
        category: 'Beverages',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200',
        units_sold: 13,
        revenue: 506.50,
        cost_of_goods: 260.00,
        cost_price: 20.00,
        gross_profit: 246.50,
        gross_margin: 48.7,
        has_cost: true,
        stock_quantity: 54,
        low_stock_threshold: 10,
        stock_status: 'in_stock'
      },
      {
        id: 'p4',
        name: 'Wireless Mouse',
        sku: 'ACC-MOU-03',
        category: 'Accessories',
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200',
        units_sold: 4,
        revenue: 180.00,
        cost_of_goods: 80.00,
        cost_price: 20.00,
        gross_profit: 100.00,
        gross_margin: 55.6,
        has_cost: true,
        stock_quantity: 114,
        low_stock_threshold: 15,
        stock_status: 'in_stock'
      },
      {
        id: 'p5',
        name: 'Sugar Bread',
        sku: 'BRD-001',
        category: 'Bakery',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
        units_sold: 3,
        revenue: 36.00,
        cost_of_goods: 24.00,
        cost_price: 8.00,
        gross_profit: 12.00,
        gross_margin: 33.3,
        has_cost: true,
        stock_quantity: 4,
        low_stock_threshold: 5,
        stock_status: 'low_stock'
      },
      {
        id: 'p6',
        name: 'Nido Milk 400g',
        sku: 'NID-002',
        category: 'Groceries',
        image: null,
        units_sold: 0,
        revenue: 0.00,
        cost_of_goods: 0.00,
        cost_price: 35.00,
        gross_profit: 0.00,
        gross_margin: null,
        has_cost: true,
        stock_quantity: 12,
        low_stock_threshold: 5,
        stock_status: 'in_stock'
      },
      {
        id: 'p7',
        name: 'Premium Leather Wallet',
        sku: 'ACC-WAL-05',
        category: 'Accessories',
        image: null,
        units_sold: 0,
        revenue: 0.00,
        cost_of_goods: 0.00,
        cost_price: 40.00,
        gross_profit: 0.00,
        gross_margin: null,
        has_cost: true,
        stock_quantity: 0,
        low_stock_threshold: 3,
        stock_status: 'out_of_stock'
      }
    ];

    if (search) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search)
      );
    }

    if (sort === 'units_sold') {
      products.sort((a, b) => b.units_sold - a.units_sold);
    } else if (sort === 'margin') {
      products.sort((a, b) => (b.gross_margin || -999) - (a.gross_margin || -999));
    } else if (sort === 'slow_movers') {
      products.sort((a, b) => a.units_sold - b.units_sold);
    } else if (sort === 'low_stock') {
      products.sort((a, b) => a.stock_quantity - b.stock_quantity);
    } else {
      products.sort((a, b) => b.revenue - a.revenue);
    }

    const summary = {
      total_revenue: 2342.50,
      total_units_sold: 66.5,
      total_cogs: 541.05,
      total_gross_profit: 1801.45,
      overall_gross_margin_pct: 76.9,
      cost_coverage_pct: 100,
      unique_products_sold: 9,
      total_catalog_products: 13
    };

    return [
      200,
      {
        success: {
          code: 200,
          data: {
            summary,
            products
          }
        }
      }
    ];
  });

  // GET /tenant/reports/cashiers
  mock.onGet(/\/tenant\/reports\/cashiers/).reply((config) => {
    const url = new URL(`http://localhost${config.url || ''}`);
    const sort = url.searchParams.get('sort') || 'highest_sales';

    let cashiers = [
      {
        staff_id: '1',
        name: 'test tenant',
        first_name: 'test',
        last_name: 'tenant',
        email: 'test@gmail.com',
        phone: '+233 24 123 4567',
        role: 'owner',
        is_active: true,
        transaction_count: 29,
        completed_count: 22,
        refunded_count: 7,
        total_sales: 2339.00,
        gross_sales: 3280.37,
        refunds_amount: 941.37,
        avg_transaction: 106.32,
        avg_ticket_value: 106.32,
        payment_breakdown: {
          cash: 1479.00,
          mobile_money: 45.00,
          mobile_money_manual: 815.00,
          card: 0.0,
          credit: 0.0
        },
        shifts_count: 2,
        closed_shifts_count: 1,
        till_variance: 0.00
      },
      {
        staff_id: '2',
        name: 'Jane Cashier',
        first_name: 'Jane',
        last_name: 'Cashier',
        email: 'jane@example.com',
        phone: '+233 20 987 6543',
        role: 'cashier',
        is_active: true,
        transaction_count: 0,
        completed_count: 0,
        refunded_count: 0,
        total_sales: 0.00,
        gross_sales: 0.00,
        refunds_amount: 0.00,
        avg_transaction: 0.00,
        avg_ticket_value: 0.00,
        payment_breakdown: {
          cash: 0.0,
          mobile_money: 0.0,
          mobile_money_manual: 0.0,
          card: 0.0,
          credit: 0.0
        },
        shifts_count: 0,
        closed_shifts_count: 0,
        till_variance: 0.00
      },
      {
        staff_id: '3',
        name: 'Junior Manager',
        first_name: 'Junior',
        last_name: 'Manager',
        email: 'junior@example.com',
        phone: '+233 50 111 2233',
        role: 'manager',
        is_active: true,
        transaction_count: 0,
        completed_count: 0,
        refunded_count: 0,
        total_sales: 0.00,
        gross_sales: 0.00,
        refunds_amount: 0.00,
        avg_transaction: 0.00,
        avg_ticket_value: 0.00,
        payment_breakdown: {
          cash: 0.0,
          mobile_money: 0.0,
          mobile_money_manual: 0.0,
          card: 0.0,
          credit: 0.0
        },
        shifts_count: 0,
        closed_shifts_count: 0,
        till_variance: 0.00
      }
    ];

    if (sort === 'most_txns') {
      cashiers.sort((a, b) => b.completed_count - a.completed_count);
    } else if (sort === 'highest_ticket') {
      cashiers.sort((a, b) => b.avg_ticket_value - a.avg_ticket_value);
    } else if (sort === 'till_variance') {
      cashiers.sort((a, b) => Math.abs(b.till_variance) - Math.abs(a.till_variance));
    } else if (sort === 'refunds') {
      cashiers.sort((a, b) => b.refunds_amount - a.refunds_amount);
    } else {
      cashiers.sort((a, b) => b.total_sales - a.total_sales);
    }

    const summary = {
      total_revenue: 2339.00,
      total_transactions: 22,
      overall_avg_ticket: 106.32,
      active_cashiers: 1,
      total_staff: 3,
      top_performer: 'test tenant'
    };

    return [
      200,
      {
        success: {
          code: 200,
          data: {
            summary,
            cashiers
          }
        }
      }
    ];
  });

  // GET /tenant/reports/end-of-day
  mock.onGet(/\/tenant\/reports\/end-of-day/).reply(() => {
    return [
      200,
      {
        success: {
          code: 200,
          data: {
            date: new Date().toISOString().split('T')[0],
            summary: {
              gross_sales: { source: '31.50', parsedValue: 31.50 },
              total_sales: 31.50,
              sales: { source: '31.50', parsedValue: 31.50 },
              refunds: 0.00,
              pos: { count: 1, transactions: 1, sales: 31.50 },
              ecommerce: { count: 0, transactions: 0, sales: 0 },
              average_order_value: { source: '31.50', parsedValue: 31.50 },
              payment_breakdown: {
                cash: { source: '31.50', parsedValue: 31.50 },
                mobile_money: { source: '0.0', parsedValue: 0 },
                mobile_money_manual: { source: '0.0', parsedValue: 0 },
                card: { source: '0.0', parsedValue: 0 },
                credit: { source: '0.0', parsedValue: 0 }
              },
              expenses: { total: 0, records: [] },
              paid_in: { total: 0, records: [] },
              shifts: {
                total_shifts: 1,
                open_shifts: 0,
                closed_shifts: 1,
                total_variance: 0.0,
                records: [
                  {
                    id: 'shift_1',
                    cashier_name: 'test tenant',
                    status: 'CLOSED',
                    opened_at: new Date().toISOString(),
                    closed_at: new Date().toISOString(),
                    opening_float: 0.0,
                    closing_count: 31.50,
                    expected_cash: 31.50,
                    variance: 0.0
                  }
                ]
              }
            }
          }
        }
      }
    ];
  });

  // GET /pos/transactions
  mock.onGet(/\/pos\/transactions/).reply(() => {
    const summary = {
      gross_sales: 3280.37,
      total_sales: 2339.00,
      net_sales: 2339.00,
      total_refunds: 941.37,
      total_discounts: 3.50,
      total_transactions: 29,
      completed_count: 22,
      refunded_count: 7,
      payment_breakdown: {
        cash: 1479.00,
        mobile_money: 45.00,
        mobile_money_manual: 815.00,
        card: 0.00,
        credit: 0.00
      }
    };

    const transactions = [
      {
        id: 'tx_1',
        orderNumber: 'CPZ-20260821-2022D6E6',
        date_created: new Date().toISOString(),
        cashierName: 'test tenant',
        paymentMethod: 'cash',
        amount_tendered: { source: '32.00', parsedValue: 32.00 },
        change_given: { source: '0.50', parsedValue: 0.50 },
        totalAmount: 31.50,
        discount: 3.50,
        subtotal: 35.00,
        status: 'completed',
        itemCount: 1,
        items: [
          {
            productName: 'Graphic Cotton T-Shirt',
            quantity: 1,
            unitPrice: 35.00,
            subtotal: 35.00
          }
        ]
      }
    ];

    return [
      200,
      {
        success: {
          code: 200,
          data: {
            summary,
            transactions,
            pagination: {
              page: 1,
              pages: 1,
              perPage: 20,
              total: 1,
              hasNext: false,
              hasPrev: false
            }
          }
        }
      }
    ];
  });

  // POST /pos/transactions
  mock.onPost('/pos/transactions').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const items = body.items || [];
    const discount = body.discount || 0;
    const subtotal = items.reduce((acc: number, it: any) => acc + (Number(it.unit_price || 0) * Number(it.quantity || 1)), 0);
    const finalTotal = Math.max(0, subtotal - discount);
    const amountTendered = body.amountTendered || finalTotal;
    const changeGiven = Math.max(0, amountTendered - finalTotal);

    const receipt = {
      id: `tx_${Date.now()}`,
      orderNumber: `CPZ-${Date.now().toString().slice(-8)}`,
      status: 'completed',
      date: new Date().toISOString(),
      storeName: 'VYSION STORE',
      storeAddress: '123 Commerce St, Accra, Ghana',
      storePhone: '+233 24 123 4567',
      cashierName: 'test tenant',
      paymentMethod: body.paymentMethod || 'cash',
      amountTendered,
      changeGiven,
      subtotal,
      discount,
      totalAmount: finalTotal,
      total: finalTotal,
      items: items.map((it: any) => ({
        productName: it.product_name || 'Product Item',
        quantity: it.quantity || 1,
        unitPrice: it.unit_price || 0,
        subtotal: (it.unit_price || 0) * (it.quantity || 1)
      }))
    };

    return [
      200,
      {
        success: {
          code: 200,
          message: 'Sale completed successfully',
          data: {
            receipt,
            orderId: receipt.id,
            transactionId: receipt.id
          }
        }
      }
    ];
  });

  // POST /pos/transactions/:id/refund
  mock.onPost(/\/pos\/transactions\/[^/]+\/refund$/).reply((config) => {
    return [
      200,
      {
        success: {
          code: 200,
          message: 'Refund processed successfully',
          data: {
            status: 'refunded'
          }
        }
      }
    ];
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CUSTOMER CREDIT LEDGER & CREDIT PURCHASES MOCKS
  // ─────────────────────────────────────────────────────────────────────────────
  const mockDebtorsData: Record<string, any> = {
    'cust-1': {
      id: 'cust-1',
      name: 'John Doe',
      phone: '0241112222',
      email: 'johndoe@gmail.com',
      outstanding_debt: 765.00,
      last_credit_date: '2026-08-07T10:15:00Z',
      purchases: [
        {
          id: 'pur-101',
          reference: 'CP-2026-0807-A101',
          date: '2026-08-07T10:15:00Z',
          original_amount: 450.00,
          amount_paid: 0.00,
          outstanding_debt: 450.00,
          status: 'outstanding',
          items: [
            { name: 'Graphic Cotton T-Shirt', quantity: 3, price: 35.00, subtotal: 105.00 },
            { name: 'Wireless Bluetooth Speaker', quantity: 1, price: 345.00, subtotal: 345.00 }
          ],
          repayments: []
        },
        {
          id: 'pur-102',
          reference: 'CP-2026-0722-B204',
          date: '2026-07-22T14:30:00Z',
          original_amount: 415.00,
          amount_paid: 100.00,
          outstanding_debt: 315.00,
          status: 'partial',
          items: [
            { name: 'Voltic Mineral Water Pack', quantity: 5, price: 23.00, subtotal: 115.00 },
            { name: 'Coke 500ml Crate', quantity: 2, price: 150.00, subtotal: 300.00 }
          ],
          repayments: [
            {
              id: 'rep-101',
              reference: 'REC-20260728-981',
              amount: 100.00,
              date: '2026-07-28T11:00:00Z',
              payment_method: 'cash'
            }
          ]
        }
      ]
    },
    'cust-2': {
      id: 'cust-2',
      name: 'Kwame Nkrumah',
      phone: '0275556666',
      email: 'kwame@gmail.com',
      outstanding_debt: 1200.50,
      last_credit_date: '2026-08-20T16:45:00Z',
      purchases: [
        {
          id: 'pur-201',
          reference: 'CP-2026-0820-C309',
          date: '2026-08-20T16:45:00Z',
          original_amount: 1200.50,
          amount_paid: 0.00,
          outstanding_debt: 1200.50,
          status: 'outstanding',
          items: [
            { name: 'Sugar Bread Loaf', quantity: 10, price: 15.00, subtotal: 150.00 },
            { name: 'Graphic T-Shirt', quantity: 7, price: 150.07, subtotal: 1050.50 }
          ],
          repayments: []
        }
      ]
    }
  };

  // GET /pos/credit-ledger or /tenant/credit-ledger
  mock.onGet(/\/pos\/credit-ledger|\/tenant\/credit-ledger/).reply(() => {
    const debtors = Object.values(mockDebtorsData).map(d => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      email: d.email,
      outstanding_debt: d.outstanding_debt,
      last_credit_date: d.last_credit_date
    }));

    return [
      200,
      {
        success: {
          status: 'OK',
          code: 200,
          data: {
            debtors,
            total: debtors.length,
            settled_this_month: 640.00
          }
        }
      }
    ];
  });

  // GET /tenant/customers/:id/credit-purchases
  mock.onGet(/\/tenant\/customers\/[^/]+\/credit-purchases/).reply((config) => {
    const parts = (config.url || '').split('/');
    const custIdIndex = parts.indexOf('customers');
    const customerId = custIdIndex !== -1 ? parts[custIdIndex + 1] : '';

    let customer = mockDebtorsData[customerId];
    if (!customer) {
      // Fallback search by ID or name
      customer = Object.values(mockDebtorsData).find((d: any) => d.id === customerId || d.name.toLowerCase() === customerId.toLowerCase());
    }

    const purchases = customer ? customer.purchases : mockDebtorsData['cust-1'].purchases;

    return [
      200,
      {
        success: {
          status: 'OK',
          code: 200,
          data: {
            purchases: purchases || []
          }
        }
      }
    ];
  });

  // POST /tenant/customers/:id/settle-all-debt
  mock.onPost(/\/tenant\/customers\/[^/]+\/settle-all-debt/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const amount = Number(body.amount || 0);
    const parts = (config.url || '').split('/');
    const custIdIndex = parts.indexOf('customers');
    const customerId = custIdIndex !== -1 ? parts[custIdIndex + 1] : 'cust-1';

    const customer = mockDebtorsData[customerId] || mockDebtorsData['cust-1'];
    customer.outstanding_debt = Math.max(0, customer.outstanding_debt - amount);

    // Apply settlement across purchases
    let rem = amount;
    const settlements: any[] = [];
    customer.purchases.forEach((p: any) => {
      if (rem > 0 && p.outstanding_debt > 0) {
        const toPay = Math.min(rem, p.outstanding_debt);
        p.outstanding_debt -= toPay;
        p.amount_paid += toPay;
        p.status = p.outstanding_debt <= 0 ? 'settled' : 'partial';
        rem -= toPay;
        settlements.push({
          purchase_id: p.id,
          purchase_reference: p.reference,
          amount: toPay
        });
      }
    });

    return [
      200,
      {
        success: {
          status: 'OK',
          code: 200,
          data: {
            new_balance: customer.outstanding_debt,
            settlements
          }
        }
      }
    ];
  });

  // POST /tenant/credit-ledger/:id/settle
  mock.onPost(/\/tenant\/credit-ledger\/[^/]+\/settle/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const amount = Number(body.amount || 0);

    return [
      200,
      {
        success: {
          status: 'OK',
          code: 200,
          data: {
            new_balance: Math.max(0, 765 - amount)
          }
        }
      }
    ];
  });

  // Catch-all for any other GET requests to prevent errors during design
  mock.onGet(/.*/).reply(200, { success: { status: 'OK', code: 200, data: {} } });
  mock.onPost(/.*/).reply(200, { success: { status: 'OK', code: 200, data: {} } });
}