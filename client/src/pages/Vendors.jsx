import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchVendors } from '../services/api';

const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadVendors() {
            try {
                setLoading(true);
                const result = await fetchVendors();
                setVendors(Array.isArray(result) ? result : []);
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
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Vendors</h1>
            <table className="min-w-full bg-white border border-gray-300">
                <thead>
                    <tr>
                        <th className="py-2 px-4 border-b">ID</th>
                        <th className="py-2 px-4 border-b">Name</th>
                        <th className="py-2 px-4 border-b">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {(Array.isArray(vendors) ? vendors : []).map((vendor) => (
                        <tr key={vendor.id}>
                            <td className="py-2 px-4 border-b">{vendor.id}</td>
                            <td className="py-2 px-4 border-b">{vendor.name}</td>
                            <td className="py-2 px-4 border-b">
                                <Link to={`/vendors/${vendor.id}`} className="text-blue-500 hover:underline">
                                    View
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Vendors;