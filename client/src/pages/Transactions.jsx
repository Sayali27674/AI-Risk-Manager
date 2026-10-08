import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchTransactions } from '../services/api';

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
    }, [page, search, status, riskLevel]);

    function updateFilter(key, value) {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        setSearchParams(next);
    }

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h1 className="mb-4 text-2xl font-bold">Transactions</h1>
            <div className="mb-4 grid gap-2 md:grid-cols-3">
                <input
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder="Search"
                    className="border border-slate-300 px-3 py-2"
                />
                <select
                    value={status}
                    onChange={(event) => updateFilter('status', event.target.value)}
                    className="border border-slate-300 px-3 py-2"
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
                    className="border border-slate-300 px-3 py-2"
                >
                    <option value="">All risk levels</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                </select>
            </div>
            <div className="overflow-x-auto bg-white">
                <table className="min-w-full border border-gray-300">
                    <thead>
                        <tr>
                            <th className="border-b px-4 py-2">ID</th>
                            <th className="border-b px-4 py-2">Amount</th>
                            <th className="border-b px-4 py-2">Date</th>
                            <th className="border-b px-4 py-2">Status</th>
                            <th className="border-b px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((transaction) => (
                            <tr key={transaction.id}>
                                <td className="border-b px-4 py-2">{transaction.id}</td>
                                <td className="border-b px-4 py-2">${transaction.amount}</td>
                                <td className="border-b px-4 py-2">
                                    {new Date(transaction.timestamp).toLocaleDateString()}
                                </td>
                                <td className="border-b px-4 py-2">{transaction.status}</td>
                                <td className="border-b px-4 py-2">
                                    <Link
                                        to={`/transactions/${transaction.id}`}
                                        className="text-blue-500 hover:underline"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex gap-2">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1}>
                    Previous
                </button>
                <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= (pagination.totalPages || 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Transactions;
