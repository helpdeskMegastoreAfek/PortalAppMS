// src/pages/DataSyncPage.jsx

import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  LoaderCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  Edit,
  Database,
  ChevronsUpDown,
  X,
  Save,
  FileDown,
  ArrowUp,
  ArrowDown,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const API_URL = import.meta.env.VITE_API_URL;

const cleanCityName = (city) => {
  if (!city) return '';

  let finalCityName;

  const parenthesisMatch = city.match(/\((.*?)\)/);
  if (parenthesisMatch && parenthesisMatch[1]) {
    finalCityName = parenthesisMatch[1].trim();
  } else {
    let cleanedCity = city;
    cleanedCity = cleanedCity.replace(/^רכב\s+\d+\s*-\s*/, '');
    cleanedCity = cleanedCity.replace(/רכב-\d+$/, '');
    const suffixesToRemove = [
      'מזרח',
      'מערבי',
      'צפון',
      'דרום',
      'עילית',
      'תחתית',
      'טכניון',
      'מערבי',
      'נווה שאנן',
      'חדש',
      'רכב 7',
      'מערב',
      'דניה',
      '-',
      'הדר',
    ];
    const suffixRegex = new RegExp(`\\s*-?\\s*(${suffixesToRemove.join('|')})`, 'g');
    cleanedCity = cleanedCity.replace(suffixRegex, '');
    finalCityName = cleanedCity.trim().replace(/\s*-$/, '').trim();
  }

  if (finalCityName.startsWith('קרית')) {
    finalCityName = finalCityName.replace(/^קרית/, 'קריית');
  }

  if (finalCityName === 'קריית שמואל') {
    return 'קריית חיים';
  }

  if (finalCityName === 'יקנעם') {
    return 'יוקנעם';
  }

  return finalCityName;
};

const formatTimeSlot = (timeSlot) => {
  if (typeof timeSlot !== 'string' || timeSlot.length !== 12) {
    return { date: 'N/A', time: 'N/A' };
  }
  try {
    const dateStr = timeSlot.substring(0, 8);
    const timeStr = timeSlot.substring(8);
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const hours = timeStr.substring(0, 2);
    const minutes = timeStr.substring(2, 4);
    const formattedTime = `${hours}:${minutes}`;
    return { date: formattedDate, time: formattedTime };
  } catch (error) {
    console.error('Error formatting time slot:', timeSlot, error);
    return { date: 'Invalid', time: 'Format' };
  }
};

const EditModal = ({ isOpen, onClose, onSave, rowData }) => {
  const [formData, setFormData] = useState({});
  useEffect(() => {
    setFormData(rowData || {});
  }, [rowData]);
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSave = () => {
    onSave(formData);
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg z-50">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-800">Edit Record</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">Order No.</label>
            <p className="mt-1 text-sm text-slate-800 font-medium p-2">{formData.so_no || ''}</p>
          </div>
          <div>
            <label htmlFor="wave_no" className="block text-sm font-medium text-slate-600">
              Wave No.
            </label>
            <p className="mt-1 text-sm text-slate-800 font-medium p-2">{formData.wave_no || ''}</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="customer_city" className="block text-sm font-medium text-slate-600">
              City
            </label>
            <input
              type="text"
              id="customer_city"
              name="customer_city"
              value={formData.customer_city ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="delivery_start_time"
              className="block text-sm font-medium text-slate-600"
            >
              Time Slot
            </label>
            <p className="mt-1 text-sm text-slate-800 font-medium p-2">
              {formData.delivery_start_time || ''}
            </p>
          </div>
        </div>
        <div className="flex justify-end items-center p-4 bg-slate-50 border-t rounded-b-lg gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center"
          >
            <Save size={16} className="mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const DataSyncPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [syncedData, setSyncedData] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRowData, setCurrentRowData] = useState(null);
  const [isSyncPanelOpen, setIsSyncPanelOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'so_no', direction: 'ascending' });

  const handleSync = async () => {
    setIsLoading(true);
    setFeedback({ message: '', type: '' });
    try {
      if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
        throw new Error('Invalid date range selected.');
      }
      const syncApiUrl = `${API_URL}/api/sync/mysql-to-mongo`;
      const syncResponse = await fetch(syncApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!syncResponse.ok) {
        const errorData = await syncResponse.json().catch(() => null);
        throw new Error(errorData?.message || `Server Error: ${syncResponse.statusText}`);
      }
      const syncedDocs = await syncResponse.json();
      if (syncedDocs.length === 0) {
        setFeedback({
          message: 'Synchronization complete. No new records found in the selected date range.',
          type: 'success',
        });
        setSyncedData([]);
        return;
      }
      const invoicesApiUrl = `${API_URL}/api/invoices`;
      const invoicesResponse = await fetch(invoicesApiUrl);
      if (!invoicesResponse.ok) {
        throw new Error('Could not fetch invoice files data.');
      }
      const allInvoices = await invoicesResponse.json();
      const filenameMap = new Map();
      allInvoices.forEach((inv) => {
        if (inv.source_path && inv.order_reference) {
          const filename = inv.source_path.split(/[\\/]/).pop();
          const key = String(inv.order_reference).trim();
          filenameMap.set(key, filename);
        }
      });
      const enrichedData = syncedDocs.map((doc) => ({
        ...doc,
        filename: filenameMap.get(String(doc.so_no).trim()) || null,
      }));
      setSyncedData(enrichedData);
      setFeedback({
        message: `Successfully synced and enriched ${enrichedData.length} records.`,
        type: 'success',
      });
      setIsSyncPanelOpen(false);
    } catch (err) {
      setFeedback({ message: `Error: ${err.message}`, type: 'error' });
      console.error('Sync error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedRowData) => {
    try {
      const { so_no } = updatedRowData;
      const response = await fetch(`${API_URL}/api/sync/synced-invoices/${so_no}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRowData),
      });
      if (!response.ok) {
        throw new Error('Failed to save changes.');
      }
      const updatedRow = await response.json();
      setSyncedData((prevData) =>
        prevData.map((row) => (row.so_no === so_no ? { ...row, ...updatedRow } : row))
      );
      setIsModalOpen(false);
    } catch (error) {
      console.error('Save error:', error);
      alert(error.message);
    }
  };

  const openEditModal = (row) => {
    setCurrentRowData(row);
    setIsModalOpen(true);
  };

  const filteredData = useMemo(
    () =>
      syncedData.filter(
        (item) =>
          (selectedCity === 'All' || cleanCityName(item.customer_city) === selectedCity) &&
          (searchTerm === '' ||
            Object.values(item).some((val) =>
              String(val).toLowerCase().includes(searchTerm.toLowerCase())
            ))
      ),
    [syncedData, searchTerm, selectedCity]
  );
  const uniqueCities = useMemo(
    () => [
      'All',
      ...Array.from(
        new Set(syncedData.map((item) => cleanCityName(item.customer_city)).filter(Boolean))
      ).sort(),
    ],
    [syncedData]
  );

  const citySummary = useMemo(() => {
    const summary = filteredData.reduce((acc, item) => {
      const city = cleanCityName(item.customer_city) || 'Unknown';
      if (!acc[city]) {
        acc[city] = { count: 0, timeSlots: new Set() };
      }
      acc[city].count++;
      if (item.delivery_start_time) {
        acc[city].timeSlots.add(formatTimeSlot(item.delivery_start_time).time);
      }
      return acc;
    }, {});
    return Object.entries(summary)
      .map(([city, data]) => ({
        city,
        count: data.count,
        timeSlots: Array.from(data.timeSlots).join(', '),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const waveSummary = useMemo(
    () =>
      Object.entries(
        filteredData.reduce((acc, item) => {
          const wave = item.wave_no || 'Unknown';
          acc[wave] = (acc[wave] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => a[0].localeCompare(b[0])),
    [filteredData]
  );

  const sortedAndFilteredData = useMemo(() => {
    let sortableData = [...filteredData];
    if (sortConfig.key !== null) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key] ?? '';
        let bValue = b[sortConfig.key] ?? '';
        if (sortConfig.key === 'customer_city') {
          aValue = cleanCityName(aValue);
          bValue = cleanCityName(bValue);
        }
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-slate-400" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="h-4 w-4 text-slate-800" />;
    }
    return <ArrowDown className="h-4 w-4 text-slate-800" />;
  };

  const handleExportToExcel = () => {
    const dataWorksheetData = sortedAndFilteredData.map((row) => ({
      'Order No.': row.so_no,
      City: cleanCityName(row.customer_city),
      Date: formatTimeSlot(row.delivery_start_time).date,
      'Time Slot': formatTimeSlot(row.delivery_start_time).time,
      'Wave No.': row.wave_no,
      Filename: row.filename,
    }));
    const dataWorksheet = XLSX.utils.json_to_sheet(dataWorksheetData);
    const citySummaryExport = citySummary.map((item) => ({
      City: item.city,
      'Order Count': item.count,
      'Time Slots': item.timeSlots,
    }));
    const waveSummaryExport = waveSummary.map(([wave, count]) => ({ Wave: wave, Count: count }));
    const citySheet = XLSX.utils.json_to_sheet(citySummaryExport);
    const waveSheet = XLSX.utils.json_to_sheet(waveSummaryExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Synced Data');
    XLSX.utils.book_append_sheet(workbook, citySheet, 'City Summary');
    XLSX.utils.book_append_sheet(workbook, waveSheet, 'Wave Summary');
    XLSX.writeFile(workbook, `DataExport_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <>
      <div className="bg-slate-50 min-h-screen">
        <Sidebar user={user} />
        <Header user={user} />
        <main className="md:ml-18 p-4 sm:p-6 lg:p-6">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800">Data Management</h1>
            <p className="text-slate-500 mt-2">
              Sync, filter, and edit data fetched from the database.
            </p>
          </header>
          <div className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <button
                onClick={() => setIsSyncPanelOpen(!isSyncPanelOpen)}
                className="w-full flex justify-between items-center p-4"
              >
                <span className="font-semibold text-slate-700">Control Panel</span>
                <ChevronsUpDown
                  className={`h-5 w-5 text-slate-500 transition-transform ${isSyncPanelOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isSyncPanelOpen && (
                <div className="p-6 border-t grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="startDate"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Start Date
                      </label>
                      <input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="endDate"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        End Date
                      </label>
                      <input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="w-full">
                    <button
                      onClick={handleSync}
                      disabled={isLoading || !startDate || !endDate}
                      className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                      {isLoading ? (
                        <>
                          <LoaderCircle className="animate-spin -ml-1 mr-2 h-5 w-5" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Zap className="-ml-1 mr-2 h-5 w-5" />
                          Run Sync
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              {syncedData.length > 0 && (
                <div className="p-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full py-2 pl-3 pr-8 border border-gray-300 rounded-md"
                    >
                      {uniqueCities.map((city) => (
                        <option key={city} value={city}>
                          {city || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={handleExportToExcel}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700"
                    >
                      <FileDown className="-ml-1 mr-2 h-5 w-5" />
                      Export Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
            {syncedData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <h3 className="font-semibold text-slate-700 mb-3">Orders by City</h3>
                  <div className="max-h-60 overflow-y-auto pr-2">
                    {citySummary.map((item) => (
                      <div
                        key={item.city}
                        className="flex justify-between items-center text-sm py-1"
                      >
                        <span className="text-slate-600">{item.city}</span>
                        <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <h3 className="font-semibold text-slate-700 mb-3">Orders by Wave</h3>
                  <div className="max-h-60 overflow-y-auto pr-2">
                    {waveSummary.map(([wave, count]) => (
                      <div key={wave} className="flex justify-between items-center text-sm py-1">
                        <span className="text-slate-600">{wave}</span>
                        <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div>
              {!isLoading && !syncedData.length && (
                <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Database className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-slate-800">No data to display</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Run a sync to fetch data from the database.
                  </p>
                </div>
              )}
              {syncedData.length > 0 && (
                <div className="bg-white overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-4 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Synced Records</h3>
                    <span className="text-sm text-slate-500">
                      {sortedAndFilteredData.length} of {syncedData.length} records shown
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            <button
                              onClick={() => requestSort('so_no')}
                              className="flex items-center gap-2"
                            >
                              Order No. {getSortIcon('so_no')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            <button
                              onClick={() => requestSort('customer_city')}
                              className="flex items-center gap-2"
                            >
                              City {getSortIcon('customer_city')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            <button
                              onClick={() => requestSort('delivery_start_time')}
                              className="flex items-center gap-2"
                            >
                              Date {getSortIcon('delivery_start_time')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            Time Slot
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            <button
                              onClick={() => requestSort('wave_no')}
                              className="flex items-center gap-2"
                            >
                              Wave No. {getSortIcon('wave_no')}
                            </button>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {sortedAndFilteredData.map((row) => {
                          const { date, time } = formatTimeSlot(row.delivery_start_time);
                          return (
                            <tr key={row._id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                {row.filename ? (
                                  <a
                                    href={`${API_URL}/api/invoices/${row.filename}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-900 hover:underline"
                                  >
                                    {row.so_no}
                                  </a>
                                ) : (
                                  row.so_no
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {cleanCityName(row.customer_city) || 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{date}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{time}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {row.wave_no ?? 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  {row.filename && (
                                    <a
                                      href={`${API_URL}/api/invoices/${row.filename}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-blue-600 hover:text-blue-900"
                                      title="View Invoice"
                                    >
                                      <FileText className="h-5 w-5" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => openEditModal(row)}
                                    className="p-1 text-indigo-600 hover:text-indigo-900"
                                    title="Edit"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        rowData={currentRowData}
      />
    </>
  );
};

export default DataSyncPage;
