import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTransactions } from '../services/api';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [riskLevel, setRiskLevel] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
    });

    useEffect(() => {
        const getTransactions = async () => {
            try {
                const response = await fetchTransactions({
                    page,
                    limit,
                    search,
                    status,
                    riskLevel,
                });
                const result = await fetchTransactions({
                    page,
                    limit,
                    search,
                    status,
                    riskLevel,
                });

                setTransactions(Array.isArray(result.items) ? result.items : []);
                setPagination(
                    result.pagination || {
                        page,
                        limit,
                        total: 0,
                        totalPages: 1,
                    },
                );
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getTransactions();
    }, [page, limit, search, status, riskLevel]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Transactions</h1>
            <table className="min-w-full bg-white border border-gray-300">
                <thead>
                    <tr>
                        <th className="py-2 px-4 border-b">ID</th>
                        <th className="py-2 px-4 border-b">Amount</th>
                        <th className="py-2 px-4 border-b">Date</th>
                        <th className="py-2 px-4 border-b">Status</th>
                        <th className="py-2 px-4 border-b">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(transaction => (
                        <tr key={transaction.id}>
                            <td className="py-2 px-4 border-b">{transaction.id}</td>
                            <td className="py-2 px-4 border-b">${transaction.amount}</td>
                            <td className="py-2 px-4 border-b">{new Date(transaction.timestamp).toLocaleDateString()}</td>
                            <td className="py-2 px-4 border-b">{transaction.status}</td>
                            <td className="py-2 px-4 border-b">
                                <Link to={`/transactions/${transaction.id}`} className="text-blue-500 hover:underline">View</Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-4">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</button>
                <button onClick={() => setPage(page + 1)} disabled={page >= 10}>Next</button>
            </div>
        </div>
    );
};

export default Transactions;