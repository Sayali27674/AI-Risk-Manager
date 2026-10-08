import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchVendors } from '../services/api';
import {
  EmptyState,
  ErrorState,
  SecondaryButton,
} from '../components/dashboard/ui';
import { ArrowRightIcon, RefreshIcon, VendorIcon } from '../components/icons';

const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        async function loadVendors() {
            try {
                setLoading(true);
                const result = await fetchVendors();
                setVendors(Array.isArray(result) ? result : []);
                setError(null);
            } catch (requestError) {
                setError(
                    requestError.response?.data?.message || 'Unable to load vendors',
                );
                setVendors([]);
            } finally {
                setLoading(false);
            }
        }

        loadVendors();
    }, [reloadKey]);

    if (loading) {
        return (
            <div className="space-y-4">
                <header className="card p-5">
                    <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
                </header>
                <div className="card space-y-3 p-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card p-6">
                <ErrorState
                    message={error}
                    onRetry={() => setReloadKey((current) => current + 1)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <header className="card flex flex-wrap items-end justify-between gap-4 p-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Vendors
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Counterparties monitored by the risk engine.
                    </p>
                </div>
                <SecondaryButton onClick={() => setReloadKey((current) => current + 1)}>
                    <RefreshIcon className="h-4 w-4" />
                    Refresh
                </SecondaryButton>
            </header>

            <div className="card overflow-x-auto">
                {vendors.length === 0 ? (
                    <div className="p-4">
                        <EmptyState message="No vendors found." />
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead>
                            <tr className="bg-slate-50/70 text-left">
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {vendors.map((vendor) => (
                                <tr
                                    key={vendor.id}
                                    className="transition-colors hover:bg-slate-50"
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                        #{vendor.id}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="flex items-center gap-2.5 text-sm text-slate-700">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                                <VendorIcon className="h-4 w-4" />
                                            </span>
                                            {vendor.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            to={`/vendors/${vendor.id}`}
                                            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                                        >
                                            View
                                            <ArrowRightIcon className="h-3.5 w-3.5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Vendors;