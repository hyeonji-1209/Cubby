import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import { LoginPage, RegisterPage, AuthCallbackPage } from './pages/auth';
import { DashboardPage } from './pages/dashboard';
import { GroupListPage, GroupDetailPage, GroupCreatePage, SubGroupDetailPage } from './pages/group';
import { SettingsPage } from './pages/settings';
import { NotFoundPage } from './pages';

// Components
import { ProtectedRoute, MainLayout } from './components';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Groups */}
            <Route path="/groups" element={<GroupListPage />} />
            <Route path="/groups/create" element={<GroupCreatePage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            <Route path="/groups/:groupId/subgroups/:subGroupId" element={<SubGroupDetailPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;