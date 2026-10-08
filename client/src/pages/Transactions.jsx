import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchTransactions } from '../services/api';
import {
    EmptyState,
    ErrorState,
    SecondaryButton,
    StatusBadge,
} from '../components/dashboard/ui';
import { ArrowRightIcon, SearchIcon } from '../components/icons';

const SELECT_CLASS = 'input appearance-none bg-white !py-2.5 pr-8';

const Transactions = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [riskLevel, setRiskLevel] = useState(searchParams.get('riskLevel') || '');
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
    });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        setRiskLevel(searchParams.get('riskLevel') || '');
        setStatus(searchParams.get('status') || '');
        setPage(1);
    }, [searchParams]);

    useEffect(() => {
        const getTransactions = async () => {
            try {
                setLoading(true);
                const result = await fetchTransactions({
                    page,
                    limit: 10,
                    search,
                    status,
                    riskLevel,
                });

                setTransactions(Array.isArray(result.items) ? result.items : []);
                setPagination(
                    result.pagination || {
                        page,
                        limit: 10,
                        total: 0,
                        totalPages: 1,
                    },
                );
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getTransactions();
    }, [page, search, status, riskLevel, reloadKey]);

    function updateFilter(key, value) {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        setSearchParams(next);
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <header className="card p-5">
                    <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
                </header>
                <div className="card space-y-3 p-4">
                    {Array.from({ length: 6 }).map((_, index) => (
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
                        Transactions
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Search, filter and drill into scored transactions.
                    </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                    Page {pagination.page} of {pagination.totalPages || 1}
                </span>
            </header>

            <div className="card grid gap-3 p-4 md:grid-cols-3">
                <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search transactions"
                        aria-label="Search transactions"
                        className="input !pl-9"
                    />
                </div>
                <select
                    value={status}
                    onChange={(event) => updateFilter('status', event.target.value)}
                    aria-label="Filter by status"
                    className={SELECT_CLASS}
                >
                    <option value="">All statuses</option>
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="FLAGGED">FLAGGED</option>
                </select>
                <select
                    value={riskLevel}
                    onChange={(event) => updateFilter('riskLevel', event.target.value)}
                    aria-label="Filter by risk level"
                    className={SELECT_CLASS}
                >
                    <option value="">All risk levels</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                </select>
            </div>
            <div className="card overflow-x-auto">
                {transactions.length === 0 ? (
                    <div className="p-4">
                        <EmptyState message="No transactions match the current filters." />
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead>
                            <tr className="bg-slate-50/70 text-left">
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {transactions.map((transaction) => (
                                <tr
                                    key={transaction.id}
                                    className="transition-colors hover:bg-slate-50"
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                        #{transaction.id}
                                    </td>
                                    <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
                                        ${transaction.amount}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {new Date(transaction.timestamp).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={transaction.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            to={`/transactions/${transaction.id}`}
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

            <div className="flex items-center justify-between gap-3">
                <SecondaryButton
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                >
                    Previous
                </SecondaryButton>
                <span className="text-xs font-medium text-slate-500">
                    Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <SecondaryButton
                    onClick={() => setPage(page + 1)}
                    disabled={page >= (pagination.totalPages || 1)}
                >
                    Next
                </SecondaryButton>
            </div>
        </div>
    );
};

export default Transactions;
