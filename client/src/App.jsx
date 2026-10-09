import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedRouteByRole from './components/ProtectedRouteByRole';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AnalystDashboard from './pages/AnalystDashboard';
import Users from './pages/Users';
import Transactions from './pages/Transactions';
import TransactionDetails from './pages/TransactionDetails';
import Alerts from './pages/Alerts';
import Vendors from './pages/Vendors';
import RiskAnalysis from './pages/RiskAnalysis';
import RiskProfile from './pages/RiskProfile';
import RiskInvestigation from './pages/RiskInvestigation';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            element={
              <ProtectedRouteByRole allowedRoles={['USER']} />
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          <Route
            element={
              <ProtectedRouteByRole allowedRoles={['USER', 'ADMIN', 'ANALYST']} />
            }
          >
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:id" element={<TransactionDetails />} />
            <Route path="/risk-analysis" element={<RiskAnalysis />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route
            element={
              <ProtectedRouteByRole allowedRoles={['ADMIN', 'ANALYST']} />
            }
          >
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/risk-profile" element={<RiskProfile />} />
            <Route path="/investigation" element={<RiskInvestigation />} />
          </Route>

          <Route
            element={<ProtectedRouteByRole allowedRoles={['ANALYST']} />}
          >
            <Route path="/analyst/dashboard" element={<AnalystDashboard />} />
          </Route>

          <Route
            element={<ProtectedRouteByRole allowedRoles={['ADMIN']} />}
          >
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
