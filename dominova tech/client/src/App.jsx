import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthLayout, MainLayout } from './components/Layouts';

// Shared Components used as pages
import LeadsList from './components/LeadsList';
import LeadDetail from './components/LeadDetail';
import ProjectsList from './components/ProjectsList';
import ProjectDetail from './components/ProjectDetail';
import WalletPage from './components/WalletPage';
import NotificationsPage from './components/NotificationsPage';

// Dashboard Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import SalesDashboard from './pages/sales/SalesDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import DeveloperDashboard from './pages/developer/DeveloperDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          
          {/* ==============================
              ADMIN ROUTES
              ============================== */}
          <Route element={<MainLayout allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/leads" element={<LeadsList role="admin" />} />
            <Route path="/admin/leads/:id" element={<LeadDetail />} />
            <Route path="/admin/projects" element={<ProjectsList />} />
            <Route path="/admin/projects/:id" element={<ProjectDetail />} />
            <Route path="/admin/wallets" element={<div className="page-content"><h1>Wallets Overview</h1><p className="text-muted">Not implemented in MVP slice.</p></div>} />
            <Route path="/admin/notifications" element={<NotificationsPage />} />
          </Route>
          
          {/* ==============================
              SALES ROUTES
              ============================== */}
          <Route element={<MainLayout allowedRoles={['sales']} />}>
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/sales/leads" element={<LeadsList role="sales" />} />
            <Route path="/sales/leads/:id" element={<LeadDetail />} />
            <Route path="/sales/projects" element={<ProjectsList />} />
            <Route path="/sales/projects/:id" element={<ProjectDetail />} />
            <Route path="/sales/wallet" element={<WalletPage />} />
            <Route path="/sales/notifications" element={<NotificationsPage />} />
          </Route>

          {/* ==============================
              MANAGER ROUTES
              ============================== */}
          <Route element={<MainLayout allowedRoles={['manager']} />}>
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/manager/leads/:id" element={<LeadDetail />} />
            <Route path="/manager/notifications" element={<NotificationsPage />} />
          </Route>

          {/* ==============================
              DEVELOPER ROUTES
              ============================== */}
          <Route element={<MainLayout allowedRoles={['developer']} />}>
            <Route path="/developer" element={<DeveloperDashboard />} />
            <Route path="/developer/projects" element={<ProjectsList />} />
            <Route path="/developer/projects/:id" element={<ProjectDetail />} />
            <Route path="/developer/my-project" element={<ProjectsList />} />
            <Route path="/developer/completed" element={<ProjectsList />} />
            <Route path="/developer/wallet" element={<WalletPage />} />
            <Route path="/developer/notifications" element={<NotificationsPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
