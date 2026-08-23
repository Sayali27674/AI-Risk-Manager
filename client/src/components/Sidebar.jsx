import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
    return (
        <div className="bg-gray-800 text-white w-64 h-full p-5">
            <h2 className="text-2xl font-bold mb-5">AI Risk Manager</h2>
            <ul>
                <li className="mb-3">
                    <Link to="/dashboard" className="hover:text-gray-400">Dashboard</Link>
                </li>
                <li className="mb-3">
                    <Link to="/transactions" className="hover:text-gray-400">Transactions</Link>
                </li>
                <li className="mb-3">
                    <Link to="/alerts" className="hover:text-gray-400">Alerts</Link>
                </li>
                <li className="mb-3">
                    <Link to="/vendors" className="hover:text-gray-400">Vendors</Link>
                </li>
                <li className="mb-3">
                    <Link to="/risk-analysis" className="hover:text-gray-400">Risk Analysis</Link>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;