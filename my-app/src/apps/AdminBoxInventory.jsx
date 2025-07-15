'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Package, Thermometer, TrendingUp, TrendingDown, Users, Download } from 'lucide-react';

export default function AdminBoxInventory() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [filterUser, setFilterUser] = useState('all');
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/inventory');
        const data = await res.json();

        const formatted = data.map((item) => ({
          id: item._id,
          user: item.username || 'Unknown',
          role: item.role,
          boxes: item.boxes,
          largeCoolers: item.largeCoolers,
          smallCoolers: item.smallCoolers,
          driverName: item.driverName || '-',
          lastUpdated: new Date(item.updatedAt)
            .toLocaleString('sv-SE')
            .replace('T', ' ')
            .slice(0, 16),
          totalItems: item.boxes + item.largeCoolers + item.smallCoolers,
        }));

        setInventoryData(formatted);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        toast.error('Failed to load inventory data');
      }
    };

    fetchInventory();
  }, []);

  const totals = inventoryData.reduce(
    (acc, item) => ({
      boxes: acc.boxes + item.boxes,
      largeCoolers: acc.largeCoolers + item.largeCoolers,
      smallCoolers: acc.smallCoolers + item.smallCoolers,
      totalItems: acc.totalItems + item.totalItems,
    }),
    { boxes: 0, largeCoolers: 0, smallCoolers: 0, totalItems: 0 }
  );

  const filteredData = inventoryData.filter(
    (item) => filterUser === 'all' || item.user === filterUser
  );

  const exportData = () => {
    const headers = [
      'User',
      'Role',
      'Boxes',
      'Large Coolers',
      'Small Coolers',
      'Total Items',
      'Driver Name',
      'Last Updated',
    ];
    const rows = inventoryData.map((item) => [
      item.user,
      item.role,
      item.boxes,
      item.largeCoolers,
      item.smallCoolers,
      item.totalItems,
      item.driverName,
      item.lastUpdated,
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header user={user} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light text-gray-900 mb-2">Inventory Dashboard</h1>
                <p className="text-gray-600">
                  Monitor and manage all inventory across the organization
                </p>
              </div>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" /> Export Report
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <SummaryCard
                label="Total Boxes"
                value={totals.boxes}
                color="blue"
                icon={<Package className="w-8 h-8 text-blue-500" />}
              />
              <SummaryCard
                label="Large Coolers"
                value={totals.largeCoolers}
                color="green"
                icon={<Thermometer className="w-8 h-8 text-green-500" />}
              />
              <SummaryCard
                label="Small Coolers"
                value={totals.smallCoolers}
                color="purple"
                icon={<Thermometer className="w-8 h-8 text-purple-500" />}
              />
              <SummaryCard
                label="Total Items"
                value={totals.totalItems}
                color="gray"
                icon={<Users className="w-8 h-8 text-gray-500" />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200">
                  <div className="border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Current Inventory</h2>
                    <select
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="px-3 py-1 border border-gray-300 text-sm focus:outline-none"
                    >
                      <option value="all">All Users</option>
                      {[...new Set(inventoryData.map((item) => item.user).filter(Boolean))].map(
                        (username) => (
                          <option key={username} value={username}>
                            {username}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <TableHeader title="User" />
                          <TableHeader title="Boxes" />
                          <TableHeader title="Large Coolers" />
                          <TableHeader title="Small Coolers" />
                          <TableHeader title="Total Items" />
                          <TableHeader title="Driver Name" />
                          <TableHeader title="Updated" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredData.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{item.user}</div>
                              <div className="text-sm text-gray-500">{item.role}</div>
                            </td>
                            <td className="px-6 py-4 text-sm">{item.boxes}</td>
                            <td className="px-6 py-4 text-sm">{item.largeCoolers}</td>
                            <td className="px-6 py-4 text-sm">{item.smallCoolers}</td>
                            <td className="px-6 py-4 text-sm font-medium">{item.totalItems}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{item.driverName}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{item.lastUpdated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="lg:col-span-1">
                  <div className="bg-white border border-gray-200">
                    <div className="border-b border-gray-200 px-6 py-4">
                      <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {inventoryData.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
                              <TrendingUp className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{item.user}</div>
                              <div className="text-sm text-gray-600">
                                Boxes: {item.boxes}, Large: {item.largeCoolers}, Small:{' '}
                                {item.smallCoolers}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{item.lastUpdated}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const SummaryCard = ({ label, value, color, icon }) => (
  <div
    className={`bg-gradient-to-r from-${color}-50 to-${color}-100 border border-${color}-200 p-6`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm text-${color}-600 mb-1`}>{label}</p>
        <p className={`text-3xl font-light text-${color}-900`}>{value}</p>
      </div>
      {icon}
    </div>
  </div>
);

const TableHeader = ({ title }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{title}</th>
);
