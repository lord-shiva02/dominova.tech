// Complete in-memory/localStorage mock data engine for Dominova OS
// Enables instant preview and full interactivity on static hosts (like Vercel)
// when no live backend server is connected.

const STORAGE_KEY = 'dominova_mock_db_v1';

const INITIAL_USERS = [
  { id: 1, name: 'Founder Admin', email: 'admin@dominova.in', role: 'admin', phone: '9000000001', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 2, name: 'Rahul Sharma', email: 'sales1@dominova.in', role: 'sales', phone: '9000000002', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 3, name: 'Priya Patel', email: 'sales2@dominova.in', role: 'sales', phone: '9000000003', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 4, name: 'Arjun Singh', email: 'sales3@dominova.in', role: 'sales', phone: '9000000004', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 5, name: 'Meera Nair', email: 'manager@dominova.in', role: 'manager', phone: '9000000005', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 6, name: 'Vikram Dev', email: 'dev1@dominova.in', role: 'developer', phone: '9000000006', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 7, name: 'Sneha Reddy', email: 'dev2@dominova.in', role: 'developer', phone: '9000000007', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 8, name: 'Kiran Kumar', email: 'dev3@dominova.in', role: 'developer', phone: '9000000008', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 9, name: 'Aditya Verma', email: 'dev4@dominova.in', role: 'developer', phone: '9000000009', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
  { id: 10, name: 'Deepika Joshi', email: 'dev5@dominova.in', role: 'developer', phone: '9000000010', is_active: 1, created_at: '2026-09-01T00:00:00.000Z' },
];

const INITIAL_LEADS = [
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
    requirements: 'Menu display, ordering, delivery links',
    quoted_amount: 25000,
    created_by: 1,
    created_at: '2026-09-09T10:00:00.000Z'
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
    assigned_to_name: 'Rahul Sharma',
    status: 'ASSIGNED',
    notes: 'Fashion boutique, wants e-commerce site',
    requirements: 'Catalog, online cart, WhatsApp order button',
    quoted_amount: 30000,
    created_by: 1,
    created_at: '2026-09-08T11:00:00.000Z'
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
    assigned_to_name: 'Rahul Sharma',
    status: 'FOLLOW_UP',
    notes: 'Called on 5th Sep. Client interested but wants to discuss after festival.',
    requirements: 'Property listing website with search filters and contact forms',
    quoted_amount: 35000,
    next_followup_date: '2026-10-25',
    last_contacted_at: '2026-09-05T00:00:00.000Z',
    created_by: 1,
    created_at: '2026-09-05T09:30:00.000Z'
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
    assigned_to_name: 'Priya Patel',
    status: 'INTERESTED',
    notes: 'Very interested. Wants booking system integrated.',
    requirements: 'Salon booking website with appointment calendar',
    quoted_amount: 25000,
    last_contacted_at: '2026-09-08T00:00:00.000Z',
    created_by: 1,
    created_at: '2026-09-06T14:00:00.000Z'
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
    assigned_to_name: 'Priya Patel',
    status: 'MANAGER_REVIEW',
    notes: 'High value client. Needs founder/manager to speak with.',
    requirements: 'Car dealership website with inventory management',
    quoted_amount: 85000,
    last_contacted_at: '2026-09-07T00:00:00.000Z',
    created_by: 1,
    created_at: '2026-09-07T12:00:00.000Z'
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
    assigned_to_name: 'Rahul Sharma',
    status: 'CONVERTED',
    requirements: 'Catering website with menu, gallery, and contact',
    quoted_amount: 20000,
    advance_amount: 8000,
    full_project_amount: 20000,
    last_contacted_at: '2026-09-01T00:00:00.000Z',
    created_by: 1,
    created_at: '2026-09-01T10:00:00.000Z'
  }
];

const INITIAL_PROJECTS = [
  {
    id: 1,
    project_id: 'DOM-PROJ-0001',
    lead_id: 6,
    salesperson_id: 2,
    salesperson_name: 'Rahul Sharma',
    developer_id: null,
    developer_name: null,
    client_name: 'Pooja Iyer',
    org_name: 'Iyer Catering',
    phone: '9876543215',
    email: 'pooja@iyercatering.com',
    requirements: 'Full catering website with menu showcase, gallery, testimonials, contact form and WhatsApp integration',
    specifications: 'Mobile-first design, fast loading, SEO optimized, CMS for menu updates',
    website_expectations: 'Professional, warm colors (orange/gold theme), easy to navigate',
    full_project_amount: 20000,
    advance_amount: 8000,
    developer_payout: 6000,
    status: 'PENDING_ADMIN_APPROVAL',
    payment_status: 'PARTIAL',
    salesperson_notes: 'Client very happy with our portfolio. Advance paid via UPI. Wants delivery in 3 weeks.',
    created_at: '2026-09-02T10:00:00.000Z'
  },
  {
    id: 2,
    project_id: 'DOM-PROJ-0002',
    salesperson_id: 3,
    salesperson_name: 'Priya Patel',
    developer_id: null,
    developer_name: null,
    client_name: 'Akhil Stores',
    org_name: 'Akhil General Stores',
    phone: '9876543220',
    email: 'akhil@stores.com',
    requirements: 'E-commerce website for grocery store with cart, payment gateway and delivery tracking',
    specifications: 'WooCommerce style, Razorpay integration, UPI and card payment, WhatsApp order confirmation',
    website_expectations: 'Clean, modern grocery store theme. Must work perfectly on mobile.',
    full_project_amount: 30000,
    advance_amount: 15000,
    developer_payout: 9000,
    status: 'AVAILABLE_FOR_DEVELOPER',
    payment_status: 'PARTIAL',
    salesperson_notes: 'High-priority. Client wants launch before next month.',
    created_at: '2026-09-03T11:00:00.000Z'
  },
  {
    id: 3,
    project_id: 'DOM-PROJ-0003',
    salesperson_id: 2,
    salesperson_name: 'Rahul Sharma',
    developer_id: 6,
    developer_name: 'Vikram Dev',
    client_name: 'TechStart Solutions',
    org_name: 'TechStart Solutions Pvt Ltd',
    phone: '9876543221',
    email: 'info@techstart.in',
    requirements: 'Corporate website with team page, services, portfolio, blog and contact form',
    specifications: 'React-based, fast loading, dark/light mode, AOS animations',
    website_expectations: 'Premium tech startup look. Dark theme with neon accents.',
    full_project_amount: 25000,
    advance_amount: 12500,
    developer_payout: 7500,
    status: 'IN_DEVELOPMENT',
    payment_status: 'PARTIAL',
    salesperson_notes: 'Tech-savvy client. Gave very detailed requirements.',
    created_at: '2026-09-04T12:00:00.000Z'
  },
  {
    id: 4,
    project_id: 'DOM-PROJ-0004',
    salesperson_id: 4,
    salesperson_name: 'Arjun Singh',
    developer_id: 7,
    developer_name: 'Sneha Reddy',
    client_name: 'Nisha Fashion House',
    org_name: 'Nisha Fashion',
    phone: '9876543222',
    email: 'nisha@fashionhouse.com',
    requirements: 'Fashion e-commerce with size guide, lookbook, wishlist and checkout',
    specifications: 'Elegant feminine design, Instagram feed integration, fast image loading',
    website_expectations: 'Luxury fashion website feel. Pink and gold theme.',
    full_project_amount: 35000,
    advance_amount: 20000,
    developer_payout: 10000,
    final_website_url: 'https://nisha-fashion-demo.netlify.app',
    status: 'PENDING_FINAL_APPROVAL',
    payment_status: 'PARTIAL',
    salesperson_notes: 'Premium client, very specific about design.',
    created_at: '2026-09-05T13:00:00.000Z'
  }
];

const INITIAL_WALLETS = {
  1: { id: 1, user_id: 1, available_balance: 45000, total_earned: 95000, total_withdrawn: 50000, pending_withdrawal: 0 },
  2: { id: 2, user_id: 2, available_balance: 14000, total_earned: 24000, total_withdrawn: 10000, pending_withdrawal: 0 },
  3: { id: 3, user_id: 3, available_balance: 11500, total_earned: 19500, total_withdrawn: 8000, pending_withdrawal: 0 },
  4: { id: 4, user_id: 4, available_balance: 8500, total_earned: 12500, total_withdrawn: 4000, pending_withdrawal: 0 },
  5: { id: 5, user_id: 5, available_balance: 18000, total_earned: 38000, total_withdrawn: 20000, pending_withdrawal: 0 },
  6: { id: 6, user_id: 6, available_balance: 15000, total_earned: 35000, total_withdrawn: 20000, pending_withdrawal: 0 },
  7: { id: 7, user_id: 7, available_balance: 12000, total_earned: 22000, total_withdrawn: 10000, pending_withdrawal: 0 },
  8: { id: 8, user_id: 8, available_balance: 9000, total_earned: 15000, total_withdrawn: 6000, pending_withdrawal: 0 },
  9: { id: 9, user_id: 9, available_balance: 7500, total_earned: 12500, total_withdrawn: 5000, pending_withdrawal: 0 },
  10: { id: 10, user_id: 10, available_balance: 6000, total_earned: 10000, total_withdrawn: 4000, pending_withdrawal: 0 },
};

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const db = {
    users: INITIAL_USERS,
    leads: INITIAL_LEADS,
    projects: INITIAL_PROJECTS,
    wallets: INITIAL_WALLETS,
    escalations: [
      {
        id: 1,
        lead_id: 5,
        lead: INITIAL_LEADS[4],
        salesperson_id: 3,
        salesperson_name: 'Priya Patel',
        manager_id: 5,
        manager_name: 'Meera Nair',
        quoted_price: 85000,
        requirements: 'Car dealership website with full inventory management system',
        reason: 'High-value client. Price negotiation needed.',
        status: 'PENDING_MANAGER',
        created_at: '2026-09-07T12:00:00.000Z'
      }
    ],
    notifications: [
      { id: 1, user_id: 1, title: 'New Project Submitted', message: 'Project DOM-PROJ-0004 is waiting for your final review', is_read: 0, created_at: new Date().toISOString() },
      { id: 2, user_id: 1, title: 'Manager Escalation', message: 'Lead DOM-LEAD-0005 has been escalated for senior review', is_read: 0, created_at: new Date().toISOString() },
      { id: 3, user_id: 2, title: 'Follow-up Reminder', message: 'Upcoming follow-up for Ramesh Pillai', is_read: 0, created_at: new Date().toISOString() }
    ],
    messages: {}
  };
  saveDb(db);
  return db;
}

function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {}
}

export function handleMockRequest(path, options = {}) {
  const db = loadDb();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const token = localStorage.getItem('dom_token');
  let currentUserId = 1;

  if (token && token.startsWith('mock_token_')) {
    currentUserId = parseInt(token.replace('mock_token_', ''), 10) || 1;
  }
  const currentUser = db.users.find(u => u.id === currentUserId) || db.users[0];

  // AUTH
  if (path === '/auth/login' && method === 'POST') {
    const email = (body.email || '').toLowerCase().trim();
    const user = db.users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    const token = `mock_token_${user.id}`;
    return { token, user };
  }

  if (path === '/auth/me') {
    return { user: currentUser };
  }

  if (path === '/auth/logout') {
    return { success: true };
  }

  // NOTIFICATIONS
  if (path === '/notifications/count') {
    const unread = db.notifications.filter(n => (n.user_id === currentUser.id || n.user_id === 1) && !n.is_read).length;
    return { unreadCount: unread };
  }

  if (path.startsWith('/notifications')) {
    if (path.includes('/read') && method === 'PUT') {
      const notifId = parseInt(path.split('/')[2]);
      const n = db.notifications.find(x => x.id === notifId);
      if (n) n.is_read = 1;
      saveDb(db);
      return { success: true };
    }
    if (path.includes('/mark-all-read') && method === 'PUT') {
      db.notifications.forEach(n => { n.is_read = 1; });
      saveDb(db);
      return { success: true };
    }
    return db.notifications.filter(n => n.user_id === currentUser.id || currentUser.role === 'admin');
  }

  // REPORTS OVERVIEW
  if (path === '/reports/overview') {
    const leads = {
      total: db.leads.length,
      new: db.leads.filter(l => l.status === 'NEW').length,
      follow_up: db.leads.filter(l => l.status === 'FOLLOW_UP').length,
      manager_review: db.leads.filter(l => l.status === 'MANAGER_REVIEW').length,
      converted: db.leads.filter(l => l.status === 'CONVERTED').length,
      lost: db.leads.filter(l => l.status === 'LOST').length,
      followups_due_today: 1,
      followups_overdue: 0,
    };

    const projects = {
      pending_admin_approval: db.projects.filter(p => p.status === 'PENDING_ADMIN_APPROVAL').length,
      available_for_developer: db.projects.filter(p => p.status === 'AVAILABLE_FOR_DEVELOPER').length,
      in_development: db.projects.filter(p => ['ASSIGNED','IN_DEVELOPMENT','TESTING'].includes(p.status)).length,
      pending_final_approval: db.projects.filter(p => p.status === 'PENDING_FINAL_APPROVAL').length,
      revision_required: db.projects.filter(p => p.status === 'REVISION_REQUIRED').length,
      completed: db.projects.filter(p => p.status === 'COMPLETED').length,
      total: db.projects.length,
    };

    const finance = {
      total_project_value: db.projects.reduce((sum, p) => sum + (p.full_project_amount || 0), 0),
      total_advance: db.projects.reduce((sum, p) => sum + (p.advance_amount || 0), 0),
      total_developer_payouts: 32500,
      total_sales_commissions: 18000,
      total_wallets_balance: Object.values(db.wallets).reduce((s, w) => s + (w.available_balance || 0), 0),
      pending_withdrawals: 0,
      pending_withdrawal_amount: 0,
    };

    const salesByPerson = db.users.filter(u => u.role === 'sales').map(u => ({
      id: u.id,
      name: u.name,
      active_leads: db.leads.filter(l => l.assigned_to === u.id && l.status !== 'LOST').length,
      conversions: db.leads.filter(l => l.assigned_to === u.id && l.status === 'CONVERTED').length,
      lost: db.leads.filter(l => l.assigned_to === u.id && l.status === 'LOST').length,
      follow_ups: db.leads.filter(l => l.assigned_to === u.id && l.status === 'FOLLOW_UP').length,
      escalations: db.leads.filter(l => l.assigned_to === u.id && l.status === 'MANAGER_REVIEW').length,
      revenue_generated: db.leads.filter(l => l.assigned_to === u.id && l.status === 'CONVERTED').reduce((s, l) => s + (l.full_project_amount || 0), 0)
    }));

    const developerStats = db.users.filter(u => u.role === 'developer').map(u => {
      const activeProj = db.projects.find(p => p.developer_id === u.id && ['ASSIGNED','IN_DEVELOPMENT','TESTING'].includes(p.status));
      return {
        id: u.id,
        name: u.name,
        is_available: activeProj ? 0 : 1,
        active_project: activeProj ? activeProj.project_id : null,
        active_project_id: activeProj ? activeProj.id : null,
        completed_projects: 3,
        total_earned: 24000
      };
    });

    return { leads, projects, finance, salesByPerson, developerStats };
  }

  // LEADS
  if (path.startsWith('/leads/stats')) {
    return {
      stats: {
        total: db.leads.length,
        new: db.leads.filter(l => l.status === 'NEW').length,
        assigned: db.leads.filter(l => l.status === 'ASSIGNED').length,
        contacted: db.leads.filter(l => l.status === 'CONTACTED').length,
        interested: db.leads.filter(l => l.status === 'INTERESTED').length,
        follow_up: db.leads.filter(l => l.status === 'FOLLOW_UP').length,
        manager_review: db.leads.filter(l => l.status === 'MANAGER_REVIEW').length,
        converted: db.leads.filter(l => l.status === 'CONVERTED').length,
        lost: db.leads.filter(l => l.status === 'LOST').length,
        followups_due_today: 1,
      }
    };
  }

  if (path === '/leads' && method === 'POST') {
    const nextId = db.leads.length + 1;
    const newLead = {
      id: nextId,
      lead_id: `DOM-LEAD-${String(nextId).padStart(4, '0')}`,
      ...body,
      status: body.status || 'NEW',
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    };
    db.leads.unshift(newLead);
    saveDb(db);
    return newLead;
  }

  if (path.startsWith('/leads') && method === 'GET') {
    const url = new URL(`http://localhost${path}`);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    let list = [...db.leads];
    if (status) list = list.filter(l => l.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => (l.client_name || '').toLowerCase().includes(q) || (l.org_name || '').toLowerCase().includes(q) || (l.phone || '').includes(q));
    }
    return list;
  }

  // SINGLE LEAD
  const leadMatch = path.match(/^\/leads\/(\d+)$/);
  if (leadMatch) {
    const id = parseInt(leadMatch[1]);
    const lead = db.leads.find(l => l.id === id);
    if (!lead) throw new Error('Lead not found');
    if (method === 'PUT') {
      Object.assign(lead, body, { updated_at: new Date().toISOString() });
      saveDb(db);
      return lead;
    }
    return {
      ...lead,
      followups: [
        { id: 1, lead_id: id, followup_date: '2026-10-25', reason: 'Scheduled follow up call', status: 'PENDING' }
      ],
      escalations: []
    };
  }

  // PROJECTS
  if (path.startsWith('/projects/stats')) {
    return {
      pending_admin_approval: db.projects.filter(p => p.status === 'PENDING_ADMIN_APPROVAL').length,
      available_for_developer: db.projects.filter(p => p.status === 'AVAILABLE_FOR_DEVELOPER').length,
      assigned: db.projects.filter(p => p.status === 'ASSIGNED').length,
      in_development: db.projects.filter(p => p.status === 'IN_DEVELOPMENT').length,
      pending_final_approval: db.projects.filter(p => p.status === 'PENDING_FINAL_APPROVAL').length,
      revision_required: db.projects.filter(p => p.status === 'REVISION_REQUIRED').length,
      completed: db.projects.filter(p => p.status === 'COMPLETED').length,
      total: db.projects.length,
      total_revenue: db.projects.reduce((s, p) => s + (p.full_project_amount || 0), 0),
      total_advance: db.projects.reduce((s, p) => s + (p.advance_amount || 0), 0),
    };
  }

  if (path.startsWith('/projects') && method === 'GET') {
    const projMatch = path.match(/^\/projects\/(\d+)$/);
    if (projMatch) {
      const id = parseInt(projMatch[1]);
      const project = db.projects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return {
        ...project,
        messages: db.messages[id] || [
          { id: 1, sender_id: 1, sender_name: 'Founder Admin', message: 'Project specifications reviewed and verified.', created_at: '2026-09-06T10:00:00.000Z' }
        ]
      };
    }
    return db.projects;
  }

  // PROJECT ACTIONS
  const projActionMatch = path.match(/^\/projects\/(\d+)\/(approve|reject|accept|status|submit|final-approve|final-reject|message)$/);
  if (projActionMatch && method === 'POST') {
    const id = parseInt(projActionMatch[1]);
    const action = projActionMatch[2];
    const project = db.projects.find(p => p.id === id);
    if (project) {
      if (action === 'approve') {
        project.status = 'AVAILABLE_FOR_DEVELOPER';
        project.developer_payout = body.developer_payout || project.developer_payout || 8000;
      } else if (action === 'accept') {
        project.status = 'IN_DEVELOPMENT';
        project.developer_id = currentUser.id;
        project.developer_name = currentUser.name;
      } else if (action === 'status') {
        project.status = body.status || project.status;
      } else if (action === 'submit') {
        project.status = 'PENDING_FINAL_APPROVAL';
        project.final_website_url = body.final_website_url || project.final_website_url;
      } else if (action === 'final-approve') {
        project.status = 'COMPLETED';
      } else if (action === 'message') {
        if (!db.messages[id]) db.messages[id] = [];
        db.messages[id].push({
          id: Date.now(),
          sender_id: currentUser.id,
          sender_name: currentUser.name,
          message: body.message,
          created_at: new Date().toISOString()
        });
      }
      saveDb(db);
      return project;
    }
  }

  // USERS
  if (path.startsWith('/users')) {
    if (path.includes('/by-role/sales')) {
      return db.users.filter(u => u.role === 'sales');
    }
    if (path.includes('/by-role/developers')) {
      return db.users.filter(u => u.role === 'developer').map(d => ({
        ...d,
        is_available: 1
      }));
    }
    return db.users;
  }

  // WALLETS
  if (path === '/wallets/me' || path.startsWith('/wallets/')) {
    const uid = path === '/wallets/me' ? currentUser.id : parseInt(path.split('/')[2]) || currentUser.id;
    const wallet = db.wallets[uid] || { id: uid, user_id: uid, available_balance: 10000, total_earned: 20000, total_withdrawn: 10000, pending_withdrawal: 0 };
    return {
      wallet,
      transactions: [
        { id: 'TXN-000001', amount: 5000, type: 'CREDIT', description: 'Commission payout - DOM-PROJ-0001', created_at: '2026-09-08T10:00:00.000Z' },
        { id: 'TXN-000002', amount: 2500, type: 'WITHDRAWAL', description: 'Bank transfer', created_at: '2026-09-09T14:30:00.000Z' }
      ]
    };
  }

  // ESCALATIONS
  if (path.startsWith('/escalations')) {
    return db.escalations;
  }

  // DEFAULT FALLBACK
  return { status: 'ok', success: true };
}
