import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchTransactionDetails } from '../services/api';

const TransactionDetails = () => {
    const { id } = useParams();
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recalculating, setRecalculating] = useState(false);

    useEffect(() => {
        const getTransactionDetails = async () => {
            try {
                const data = await fetchTransactionDetails(id);
                setTransaction(data);
            } catch (err) {
                setError('Failed to fetch transaction details');
            } finally {
                setLoading(false);
            }
        };

        getTransactionDetails();
    }, [id]);

    const handleRecalculate = () => {
        setRecalculating(true);
        // Perform recalculation logic
        setRecalculating(false);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Transaction Details</h1>
            {transaction && (
                <div className="mt-4">
                    <p><strong>ID:</strong> {transaction.id}</p>
                    <p><strong>Amount:</strong> ${transaction.amount}</p>
                    <p><strong>Date:</strong> {new Date(transaction.date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> {transaction.status}</p>
                    <p><strong>Description:</strong> {transaction.description}</p>
                    <p>Anomaly Score: {transaction.anomalyScore ?? 'Not available yet'}</p>
                    <p>
                        Fraud Probability:{' '}
                        {transaction.fraudProbability == null
                            ? 'Not available yet'
                            : `${Number(transaction.fraudProbability) * 100}%`}
                    </p>
                    <ul>
                        {(Array.isArray(transaction.reasons) ? transaction.reasons : []).map((reason) => (
                            <li key={reason}>{reason}</li>
                        ))}
                    </ul>
                    {canRecalculate && (
                        <button
                            type="button"
                            onClick={handleRecalculate}
                            disabled={recalculating}
                            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                        >
                            {recalculating ? 'Recalculating...' : 'Recalculate Risk'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TransactionDetails;