// ============================================================
// DOMINOVA OS - MOCK BACKEND FOR SERVERLESS & VERCEL DEMO
// Automatically activates if the backend API is unreachable or returns 404
// ============================================================

const USERS_SEED = [
  { id: 1, name: 'Founder Admin', email: 'admin@dominova.in', role: 'admin', phone: '9000000001', password: 'Admin@123' },
  { id: 2, name: 'Rahul Sharma', email: 'sales1@dominova.in', role: 'sales', phone: '9000000002', password: 'Sales@123' },
  { id: 3, name: 'Priya Patel', email: 'sales2@dominova.in', role: 'sales', phone: '9000000003', password: 'Sales@123' },
  { id: 4, name: 'Arjun Singh', email: 'sales3@dominova.in', role: 'sales', phone: '9000000004', password: 'Sales@123' },
  { id: 5, name: 'Meera Nair', email: 'manager@dominova.in', role: 'manager', phone: '9000000005', password: 'Manager@123' },
  { id: 6, name: 'Vikram Dev', email: 'dev1@dominova.in', role: 'developer', phone: '9000000006', password: 'Dev@123' },
  { id: 7, name: 'Sneha Reddy', email: 'dev2@dominova.in', role: 'developer', phone: '9000000007', password: 'Dev@123' },
  { id: 8, name: 'Kiran Kumar', email: 'dev3@dominova.in', role: 'developer', phone: '9000000008', password: 'Dev@123' },
  { id: 9, name: 'Aditya Verma', email: 'dev4@dominova.in', role: 'developer', phone: '9000000009', password: 'Dev@123' },
  { id: 10, name: 'Deepika Joshi', email: 'dev5@dominova.in', role: 'developer', phone: '9000000010', password: 'Dev@123' },
];

const LEADS_SEED = [
  {
    id: 1,
    lead_id: 'DOM-LEAD-0001',
    client_name: 'Suresh Gupta',
    org_name: 'Gupta Sweets',
    phone: '9876543210',
    email: 'suresh@guptasweets.com',
    google_business_url: 'https://g.co/guptasweets',
    instagram_url: 'https://instagram.com/guptasweets',
    lead_source: 'Instagram',
    assigned_to: null,
    status: 'NEW',
    notes: 'Interested in a restaurant website',
    requirements: 'Online menu and ordering system',
    quoted_amount: 25000,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: 2,
    lead_id: 'DOM-LEAD-0002',
    client_name: 'Anita Mehta',
    org_name: 'Mehta Boutique',
    phone: '9876543211',
    email: 'anita@mehtaboutique.in',
    google_business_url: 'https://g.co/mehtaboutique',
    instagram_url: 'https://instagram.com/mehtaboutique',
    lead_source: 'Google',
    assigned_to: 2,
    status: 'ASSIGNED',
    notes: 'Fashion boutique, wants e-commerce site',
    requirements: 'Product catalog with payment gateway',
    quoted_amount: 30000,
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: 3,
    lead_id: 'DOM-LEAD-0003',
    client_name: 'Ramesh Pillai',
    org_name: 'Pillai Real Estate',
    phone: '9876543212',
    email: 'ramesh@pillai.com',
    google_business_url: 'https://g.co/pillaiestates',
    lead_source: 'Referral',
    assigned_to: 2,
    status: 'FOLLOW_UP',
    notes: 'Called on 5th Sep. Client interested but wants to discuss after Diwali.',
    requirements: 'Property listing website with search filters and contact forms',
    quoted_amount: 35000,
    next_followup_date: new Date().toISOString().split('T')[0],
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
  },
  {
    id: 4,
    lead_id: 'DOM-LEAD-0004',
    client_name: 'Kavitha Rao',
    org_name: 'Kavitha Beauty Salon',
    phone: '9876543213',
    email: 'kavitha@beautysalon.in',
    instagram_url: 'https://instagram.com/kavithabeauty',
    lead_source: 'Instagram',
    assigned_to: 3,
    status: 'INTERESTED',
    notes: 'Very interested. Wants booking system integrated.',
    requirements: 'Salon booking website with appointment calendar',
    quoted_amount: 25000,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 5,
    lead_id: 'DOM-LEAD-0005',
    client_name: 'Harish Agarwal',
    org_name: 'Agarwal Motors',
    phone: '9876543214',
    email: 'harish@agarwalmotors.com',
    google_business_url: 'https://g.co/agarwalmotors',
    lead_source: 'Google',
    assigned_to: 3,
    status: 'MANAGER_REVIEW',
    notes: 'High value client. Needs founder/manager to negotiate price.',
    requirements: 'Car dealership website with inventory management',
    quoted_amount: 85000,
    created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
  },
  {
    id: 6,
    lead_id: 'DOM-LEAD-0006',
    client_name: 'Pooja Iyer',
    org_name: 'Iyer Catering',
    phone: '9876543215',
    email: 'pooja@iyercatering.com',
    google_business_url: 'https://g.co/iyercatering',
    instagram_url: 'https://instagram.com/iyercatering',
    lead_source: 'Referral',
    assigned_to: 2,
    status: 'CONVERTED',
    requirements: 'Full catering website with menu showcase and gallery',
    quoted_amount: 20000,
    advance_amount: 8000,
    full_project_amount: 20000,
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  }
];

const PROJECTS_SEED = [
  {
    id: 1,
    project_id: 'DOM-PROJ-0001',
    lead_id: 6,
    salesperson_id: 2,
    developer_id: null,
    client_name: 'Pooja Iyer',
    org_name: 'Iyer Catering',
    phone: '9876543215',
    email: 'pooja@iyercatering.com',
    requirements: 'Full catering website with menu showcase, gallery, testimonials, and contact form',
    specifications: 'Mobile-first design, fast loading, SEO optimized',
    website_expectations: 'Professional, warm colors (orange/gold theme)',
    full_project_amount: 20000,
    advance_amount: 8000,
    developer_payout: 6000,
    status: 'PENDING_ADMIN_APPROVAL',
    payment_status: 'PARTIAL',
    created_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
  },
  {
    id: 2,
    project_id: 'DOM-PROJ-0002',
    salesperson_id: 3,
    developer_id: null,
    client_name: 'Akhil Stores',
    org_name: 'Akhil General Stores',
    phone: '9876543220',
    email: 'akhil@stores.com',
    requirements: 'E-commerce website for grocery store with cart and payment gateway',
    specifications: 'Fast catalog loading, Razorpay integration, UPI and card',
    website_expectations: 'Clean, modern grocery store theme',
    full_project_amount: 30000,
    advance_amount: 15000,
    developer_payout: 9000,
    status: 'AVAILABLE_FOR_DEVELOPER',
    payment_status: 'PARTIAL',
    created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
  },
  {
    id: 3,
    project_id: 'DOM-PROJ-0003',
    salesperson_id: 2,
    developer_id: 6,
    client_name: 'TechStart Solutions',
    org_name: 'TechStart Solutions Pvt Ltd',
    phone: '9876543221',
    email: 'info@techstart.in',
    requirements: 'Corporate website with team page, services, portfolio, blog and contact form',
    specifications: 'React-based, fast loading, dark/light mode',
    website_expectations: 'Premium tech startup look with neon accents',
    full_project_amount: 25000,
    advance_amount: 12500,
    developer_payout: 7500,
    status: 'IN_DEVELOPMENT',
    payment_status: 'PARTIAL',
    created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
  },
  {
    id: 4,
    project_id: 'DOM-PROJ-0004',
    salesperson_id: 4,
    developer_id: 7,
    client_name: 'Nisha Fashion House',
    org_name: 'Nisha Fashion',
    phone: '9876543222',
    email: 'nisha@fashionhouse.com',
    requirements: 'Fashion e-commerce with size guide, lookbook, and checkout',
    specifications: 'Elegant feminine design, Instagram feed integration',
    website_expectations: 'Luxury fashion website feel',
    full_project_amount: 35000,
    advance_amount: 20000,
    developer_payout: 10000,
    final_website_url: 'https://nisha-fashion-demo.netlify.app',
    status: 'PENDING_FINAL_APPROVAL',
    payment_status: 'PARTIAL',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  }
];

const ESCALATIONS_SEED = [
  {
    id: 1,
    lead_id: 5,
    salesperson_id: 3,
    manager_id: 5,
    quoted_price: 85000,
    requirements: 'Car dealership website with inventory management',
    reason: 'Client wants 30% discount or custom ERP integration',
    salesperson_notes: 'Client is keen but stuck on commercial terms. Needs manager approval.',
    status: 'PENDING_MANAGER',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    client_name: 'Harish Agarwal',
    org_name: 'Agarwal Motors',
    phone: '9876543214',
    salesperson_name: 'Priya Patel',
  }
];

const NOTIFICATIONS_SEED = [
  { id: 1, user_id: 1, title: 'Welcome to Dominova OS', message: 'System running with full offline & cloud capabilities', is_read: 0, created_at: new Date().toISOString() },
  { id: 2, user_id: 1, title: 'New Project Pending Approval', message: 'Project DOM-PROJ-0001 is awaiting admin review', is_read: 0, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, user_id: 2, title: 'Lead Assigned', message: 'Anita Mehta (Mehta Boutique) has been assigned to you', is_read: 1, created_at: new Date(Date.now() - 7200000).toISOString() },
];

function getStore(key, seed) {
  try {
    const raw = localStorage.getItem(`dom_mock_${key}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem(`dom_mock_${key}`, JSON.stringify(seed));
  return seed;
}

function setStore(key, data) {
  try {
    localStorage.setItem(`dom_mock_${key}`, JSON.stringify(data));
  } catch (e) {}
}

export async function handleMockRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body || {};
  const currentToken = localStorage.getItem('dom_token');
  
  let currentUser = null;
  if (currentToken) {
    try {
      const stored = localStorage.getItem('dom_current_user');
      if (stored) currentUser = JSON.parse(stored);
    } catch (e) {}
  }
  if (!currentUser) {
    currentUser = USERS_SEED[0]; // default admin for mock
  }

  // --- AUTH ROUTES ---
  if (path === '/auth/login' && method === 'POST') {
    const { email, password } = body;
    const user = USERS_SEED.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
    if (!user || user.password !== password) {
      // Also allow common demo passwords
      if (user && (password === 'Admin@123' || password === 'Sales@123' || password === 'Manager@123' || password === 'Dev@123')) {
        // match
      } else {
        throw new Error('Invalid email or password');
      }
    }
    const token = `mock-token-${user.role}-${Date.now()}`;
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
    localStorage.setItem('dom_current_user', JSON.stringify(safeUser));
    return { token, user: safeUser };
  }

  if (path === '/auth/me') {
    return { user: currentUser };
  }

  if (path === '/auth/logout') {
    localStorage.removeItem('dom_current_user');
    return { message: 'Logged out' };
  }

  if (path === '/auth/change-password') {
    return { message: 'Password changed successfully' };
  }

  // --- USERS ---
  if (path.startsWith('/users/by-role/sales')) {
    return { users: USERS_SEED.filter(u => u.role === 'sales') };
  }
  if (path.startsWith('/users/by-role/developers')) {
    return { users: USERS_SEED.filter(u => u.role === 'developer') };
  }
  if (path.startsWith('/users')) {
    return { users: USERS_SEED.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone })) };
  }

  // --- LEADS ---
  if (path.startsWith('/leads/stats')) {
    const leads = getStore('leads', LEADS_SEED);
    return {
      stats: {
        total: leads.length,
        new: leads.filter(l => l.status === 'NEW').length,
        assigned: leads.filter(l => l.status === 'ASSIGNED').length,
        contacted: leads.filter(l => l.status === 'CONTACTED').length,
        interested: leads.filter(l => l.status === 'INTERESTED').length,
        follow_up: leads.filter(l => l.status === 'FOLLOW_UP').length,
        manager_review: leads.filter(l => l.status === 'MANAGER_REVIEW').length,
        converted: leads.filter(l => l.status === 'CONVERTED').length,
        lost: leads.filter(l => l.status === 'LOST').length,
        followups_due_today: 1,
      }
    };
  }

  if (path.startsWith('/leads') && method === 'GET') {
    let leads = getStore('leads', LEADS_SEED);
    const url = new URL(`http://localhost${path}`);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');

    if (currentUser && currentUser.role === 'sales') {
      leads = leads.filter(l => l.assigned_to === currentUser.id);
    }
    if (status) {
      leads = leads.filter(l => l.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      leads = leads.filter(l => 
        (l.client_name && l.client_name.toLowerCase().includes(q)) ||
        (l.lead_id && l.lead_id.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q))
      );
    }
    return {
      leads,
      total: leads.length,
      page: 1,
      limit: 50,
    };
  }

  if (path.startsWith('/leads') && method === 'POST') {
    const leads = getStore('leads', LEADS_SEED);
    const newLead = {
      id: Date.now(),
      lead_id: `DOM-LEAD-${String(leads.length + 1).padStart(4, '0')}`,
      ...body,
      status: body.status || 'NEW',
      created_at: new Date().toISOString(),
      created_by: currentUser.id,
    };
    leads.unshift(newLead);
    setStore('leads', leads);
    return { lead: newLead, message: 'Lead created successfully' };
  }

  // --- ESCALATIONS ---
  if (path.startsWith('/escalations')) {
    const escalations = getStore('escalations', ESCALATIONS_SEED);
    return { escalations, total: escalations.length };
  }

  // --- PROJECTS ---
  if (path.startsWith('/projects/stats')) {
    const projects = getStore('projects', PROJECTS_SEED);
    return {
      pending_admin_approval: projects.filter(p => p.status === 'PENDING_ADMIN_APPROVAL').length,
      available_for_developer: projects.filter(p => p.status === 'AVAILABLE_FOR_DEVELOPER').length,
      assigned: projects.filter(p => p.status === 'ASSIGNED').length,
      in_development: projects.filter(p => p.status === 'IN_DEVELOPMENT').length,
      pending_final_approval: projects.filter(p => p.status === 'PENDING_FINAL_APPROVAL').length,
      revision_required: projects.filter(p => p.status === 'REVISION_REQUIRED').length,
      completed: projects.filter(p => p.status === 'COMPLETED').length,
      total: projects.length,
      total_revenue: projects.reduce((acc, p) => acc + (p.full_project_amount || 0), 0),
      total_advance: projects.reduce((acc, p) => acc + (p.advance_amount || 0), 0),
    };
  }

  if (path.startsWith('/projects') && method === 'GET') {
    let projects = getStore('projects', PROJECTS_SEED);
    if (currentUser && currentUser.role === 'developer') {
      projects = projects.filter(p => p.developer_id === currentUser.id || p.status === 'AVAILABLE_FOR_DEVELOPER');
    }
    return { projects, total: projects.length };
  }

  // --- WALLETS ---
  if (path === '/wallets/me' || path.startsWith('/wallets/')) {
    return {
      wallet: {
        id: 1,
        user_id: currentUser.id,
        available_balance: 28500,
        total_earned: 45000,
        total_withdrawn: 16500,
        pending_withdrawal: 0,
      },
      transactions: [
        { id: 1, amount: 7500, type: 'CREDIT', description: 'Payout for project DOM-PROJ-0003', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 2, amount: 10000, type: 'CREDIT', description: 'Commission for project DOM-PROJ-0004', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: 3, amount: 16500, type: 'DEBIT', description: 'Bank Withdrawal to HDFC A/C ***8821', created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
      ]
    };
  }

  // --- NOTIFICATIONS ---
  if (path.startsWith('/notifications/count')) {
    return { unreadCount: 2 };
  }
  if (path.startsWith('/notifications')) {
    const notifs = getStore('notifications', NOTIFICATIONS_SEED);
    return { notifications: notifs, unreadCount: notifs.filter(n => !n.is_read).length };
  }

  // --- REPORTS / OVERVIEW ---
  if (path.startsWith('/reports/overview')) {
    const leads = getStore('leads', LEADS_SEED);
    const projects = getStore('projects', PROJECTS_SEED);

    return {
      leads: {
        total: leads.length,
        new: leads.filter(l => l.status === 'NEW').length,
        follow_up: leads.filter(l => l.status === 'FOLLOW_UP').length,
        manager_review: leads.filter(l => l.status === 'MANAGER_REVIEW').length,
        converted: leads.filter(l => l.status === 'CONVERTED').length,
        lost: leads.filter(l => l.status === 'LOST').length,
        followups_due_today: 1,
        followups_overdue: 0,
      },
      projects: {
        pending_admin_approval: projects.filter(p => p.status === 'PENDING_ADMIN_APPROVAL').length,
        available_for_developer: projects.filter(p => p.status === 'AVAILABLE_FOR_DEVELOPER').length,
        in_development: projects.filter(p => p.status === 'IN_DEVELOPMENT').length,
        pending_final_approval: projects.filter(p => p.status === 'PENDING_FINAL_APPROVAL').length,
        revision_required: 0,
        completed: 1,
        total: projects.length,
      },
      finance: {
        total_project_value: 110000,
        total_advance: 55500,
        total_developer_payouts: 32500,
        total_sales_commissions: 18000,
        total_wallets_balance: 45000,
        pending_withdrawals: 0,
        pending_withdrawal_amount: 0,
      },
      salesByPerson: [
        { id: 2, name: 'Rahul Sharma', active_leads: 3, conversions: 2, lost: 0, follow_ups: 1, escalations: 0, revenue_generated: 45000 },
        { id: 3, name: 'Priya Patel', active_leads: 2, conversions: 1, lost: 0, follow_ups: 0, escalations: 1, revenue_generated: 30000 },
        { id: 4, name: 'Arjun Singh', active_leads: 1, conversions: 1, lost: 1, follow_ups: 0, escalations: 0, revenue_generated: 35000 },
      ],
      developerStats: [
        { id: 6, name: 'Vikram Dev', is_available: 0, active_project: 'DOM-PROJ-0003' },
        { id: 7, name: 'Sneha Reddy', is_available: 0, active_project: 'DOM-PROJ-0004' },
        { id: 8, name: 'Kiran Kumar', is_available: 1, active_project: null },
      ]
    };
  }

  // Generic fallback
  return { success: true };
}
