import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getDashboardRoute, useAuth } from '../context/AuthContext';

export default function ProtectedRouteByRole({ allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-brand-600" />
        <p className="text-sm font-medium text-slate-500">
          Loading your session…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  const allowed = Array.isArray(allowedRoles)
    && allowedRoles.length > 0
    && allowedRoles.includes(user.role);

  if (!allowed) {
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }

  return <Outlet />;
}
