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
  BarChart3,
  List,
  Filter,
  Package,
  MapPin,
  Calendar,
  TrendingUp // Added Icon
} from 'lucide-react';
import * as XLSX from 'xlsx';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const API_URL = import.meta.env.VITE_API_URL;

// --- Storage Area Options ---
const STOCK_ENV_OPTIONS = [
  { id: 1, label: 'Area +20+25' },
  { id: 2, label: 'Area +2+6' },
  { id: 3, label: 'Area +4+8' },
  { id: 4, label: 'Area -26' },
  { id: 5, label: 'Area -26+8' },
  { id: 6, label: 'Area +3+6' },
];

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
      'מזרח', 'מערבי', 'צפון', 'דרום', 'עילית', 'תחתית',
      'טכניון', 'מערבי', 'נווה שאנן', 'חדש', 'רכב 7',
      'מערב', 'דניה', '-', 'הדר',
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
    <div className="fixed inset-0 backdrop-blur-sm bg-slate-900/40 z-50 flex items-center justify-center p-4 transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all scale-100">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Edit Record</h3>
            <p className="text-xs text-slate-400 mt-1">Update details for this order</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Order No.</label>
            <p className="text-base text-slate-800 font-mono font-medium">{formData.so_no || ''}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <label htmlFor="wave_no" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Wave No.
            </label>
            <p className="text-base text-slate-800 font-mono font-medium">{formData.wave_no || ''}</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="customer_city" className="block text-sm font-medium text-slate-700 mb-1">
              City
            </label>
            <input
              type="text"
              id="customer_city"
              name="customer_city"
              value={formData.customer_city ?? ''}
              onChange={handleChange}
              className="block w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <label
              htmlFor="delivery_start_time"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
            >
              Time Slot Raw
            </label>
            <p className="text-sm text-slate-700 font-mono">
              {formData.delivery_start_time || ''}
            </p>
          </div>
        </div>
        <div className="flex justify-end items-center p-5 bg-slate-50 border-t border-slate-100 rounded-b-2xl gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all inline-flex items-center"
          >
            <Save size={18} className="mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const DataSyncPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Tab Management
  const [activeTab, setActiveTab] = useState('sync'); // 'sync' or 'sku'
  
  // Original Data Sync States
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

  // New SKU Sales States
  const [skuSalesData, setSkuSalesData] = useState([]);
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [selectedStockEnv, setSelectedStockEnv] = useState(2);
  
  // --- SKU CHART DATA LOGIC ---
  const top10SkuData = useMemo(() => {
    if (!skuSalesData.length) return [];
    
    // 1. Ensure numbers
    // 2. Sort Descending
    // 3. Take top 10
    const processed = [...skuSalesData]
      .map(item => ({ ...item, accesQty: Number(item.accesQty) || 0 }))
      .sort((a, b) => b.accesQty - a.accesQty)
      .slice(0, 10);
      
    return processed;
  }, [skuSalesData]);

  const maxSkuQty = useMemo(() => {
     if (!top10SkuData.length) return 0;
     return Math.max(...top10SkuData.map(i => i.accesQty));
  }, [top10SkuData]);
  // ----------------------------

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

  const fetchSkuSales = async () => {
    setIsLoading(true);
    setFeedback({ message: '', type: '' });
    try {
      const response = await fetch(
        `${API_URL}/api/sync/sales-by-sku?startDate=${startDate}&endDate=${endDate}&stockEnv=${selectedStockEnv}`
      );
      if (!response.ok) throw new Error('Failed to fetch SKU sales data');
      const data = await response.json();
      setSkuSalesData(data);
      setIsSyncPanelOpen(false);
    } catch (err) {
      setFeedback({ message: `Error: ${err.message}`, type: 'error' });
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

  // Filtering for Original Tab
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

  // Filtering for SKU Tab
  const filteredSkuData = useMemo(() => {
    return skuSalesData.filter(item => 
      String(item.skuId).toLowerCase().includes(skuSearchTerm.toLowerCase())
    );
  }, [skuSalesData, skuSearchTerm]);

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
      return <ChevronsUpDown className="h-3 w-3 text-slate-300 ml-1" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="h-3 w-3 text-indigo-600 ml-1" />;
    }
    return <ArrowDown className="h-3 w-3 text-indigo-600 ml-1" />;
  };

  const handleExportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (activeTab === 'sync') {
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
      
      XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Synced Data');
      XLSX.utils.book_append_sheet(workbook, citySheet, 'City Summary');
      XLSX.utils.book_append_sheet(workbook, waveSheet, 'Wave Summary');
    } else {
      const skuExportData = filteredSkuData.map(item => ({
        'SKU ID': item.skuId,
        'Location': item.locat_code,
        'Qty Picked': item.accesQty
      }));
      const skuSheet = XLSX.utils.json_to_sheet(skuExportData);
      XLSX.utils.book_append_sheet(workbook, skuSheet, 'SKU Sales');
    }

    XLSX.writeFile(workbook, `DataExport_${activeTab.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <>
      <div className="bg-gray-50/80 min-h-screen">
        <Sidebar user={user} />
        <Header user={user} />
        
        <main className="md:ml-20 p-6 lg:p-5 transition-all duration-300">
          <div className="max-w-7xl mx-auto space-y-4">
            
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Data Management</h1>
                <p className="text-slate-500 mt-1 flex items-center gap-2">
                  <Database size={16} /> Sync, filter, and analyze records from the database.
                </p>
              </div>
            </header>

            {/* --- Alert/Feedback Section --- */}
            {feedback.message && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
                feedback.type === 'error' 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : 'bg-green-50 border-green-200 text-green-800'
              }`}>
                {feedback.type === 'error' ? <AlertTriangle className="shrink-0 mt-0.5" size={20} /> : <CheckCircle2 className="shrink-0 mt-0.5" size={20} />}
                <div>
                  <h4 className="font-semibold">{feedback.type === 'error' ? 'Error' : 'Success'}</h4>
                  <p className="text-sm opacity-90">{feedback.message}</p>
                </div>
                <button onClick={() => setFeedback({ message: '', type: '' })} className="ml-auto hover:bg-black/5 p-1 rounded">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* --- Tabs Switcher --- */}
            <div className="bg-white p-1.5 rounded-xl border border-gray-200 inline-flex shadow-sm">
              <button 
                onClick={() => setActiveTab('sync')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'sync' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <List size={18} /> Waves Data
              </button>
              <button 
                onClick={() => setActiveTab('sku')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'sku' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BarChart3 size={18} /> SKU Sales Analysis
              </button>
            </div>

            {/* --- Control Panel Card --- */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setIsSyncPanelOpen(!isSyncPanelOpen)}
                className="w-full flex justify-between items-center p-5 bg-white hover:bg-gray-50/50 transition-colors border-b border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSyncPanelOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Filter size={20} />
                  </div>
                  <span className="font-bold text-slate-700">Control Panel & Configuration</span>
                </div>
                <ChevronsUpDown
                  className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isSyncPanelOpen ? 'rotate-180' : ''}`}
                />
              </button>
              
              {isSyncPanelOpen && (
                <div className="p-6 bg-white animate-in slide-in-from-top-4 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    
                    {/* Date Inputs */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label htmlFor="startDate" className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                          Start Date
                        </label>
                        <div className="relative">
                          <input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            disabled={isLoading}
                            className="w-full pl-4 pr-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="endDate" className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                          End Date
                        </label>
                        <div className="relative">
                          <input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            disabled={isLoading}
                            className="w-full pl-4 pr-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Conditional Select for SKU */}
                    {activeTab === 'sku' ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Storage Area</label>
                        <select 
                          value={selectedStockEnv} 
                          onChange={(e) => setSelectedStockEnv(Number(e.target.value))}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm bg-white"
                        >
                          {STOCK_ENV_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                      </div>
                    ) : <div className="hidden md:block"></div>}

                    {/* Action Button */}
                    <div>
                      <button
                        onClick={activeTab === 'sync' ? handleSync : fetchSkuSales}
                        disabled={isLoading || !startDate || !endDate}
                        className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-70 disabled:shadow-none transition-all duration-200"
                      >
                        {isLoading ? (
                          <>
                            <LoaderCircle className="animate-spin -ml-1 mr-2 h-5 w-5" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="-ml-1 mr-2 h-5 w-5" />
                            {activeTab === 'sync' ? 'Run Sync' : 'Fetch Sales'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* --- Data Display Section --- */}
            
            {/* Filters Bar (Only if data exists) */}
            {((activeTab === 'sync' && syncedData.length > 0) || (activeTab === 'sku' && skuSalesData.length > 0)) && (
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={activeTab === 'sync' ? "Search by order, city, file..." : "Search SKU ID..."}
                        value={activeTab === 'sync' ? searchTerm : skuSearchTerm}
                        onChange={(e) => activeTab === 'sync' ? setSearchTerm(e.target.value) : setSkuSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    
                    {activeTab === 'sync' && (
                      <div className="w-full md:w-64">
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                        >
                          {uniqueCities.map((city) => (
                            <option key={city} value={city}>
                              {city || 'N/A'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleExportToExcel}
                    className="w-full md:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-green-50 text-green-700 border border-green-200 font-semibold rounded-xl hover:bg-green-100 hover:border-green-300 transition-all shadow-sm"
                  >
                    <FileDown className="-ml-1 mr-2 h-5 w-5" />
                    Export Excel
                  </button>
              </div>
            )}

            {/* --- Render Active Tab Content --- */}
            {activeTab === 'sync' ? (
              <>
                {syncedData.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* City Summary Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-80">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                           <MapPin size={18} className="text-indigo-500" /> Orders by City
                        </h3>
                        <span className="text-xs font-medium text-slate-400">Top Locations</span>
                      </div>
                      <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                        {citySummary.map((item, index) => (
                          <div key={item.city} className="flex justify-between items-center text-sm py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-gray-50 last:border-0">
                            <span className="text-slate-600 font-medium flex items-center gap-2">
                               <span className="text-xs text-slate-300 w-4">{index + 1}.</span> {item.city}
                            </span>
                            <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full text-xs">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Wave Summary Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-80">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                          <h3 className="font-bold text-slate-700 flex items-center gap-2">
                           <List size={18} className="text-indigo-500" /> Orders by Wave
                        </h3>
                        <span className="text-xs font-medium text-slate-400">Distribution</span>
                      </div>
                      <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                        {waveSummary.map(([wave, count], index) => (
                          <div key={wave} className="flex justify-between items-center text-sm py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-gray-50 last:border-0">
                            <span className="text-slate-600 font-medium flex items-center gap-2">
                              <span className="text-xs text-slate-300 w-4">{index + 1}. </span>   {wave} 
                            </span>
                            <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs">
                              {count}
                            </span> 
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {syncedData.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-1.5 rounded-md text-indigo-600">
                          <List size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800">Synced Records</h3>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                        Showing {sortedAndFilteredData.length} of {syncedData.length}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <button onClick={() => requestSort('so_no')} className="flex items-center hover:text-indigo-600 transition-colors">
                                Order No. {getSortIcon('so_no')}
                              </button>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <button onClick={() => requestSort('customer_city')} className="flex items-center hover:text-indigo-600 transition-colors">
                                City {getSortIcon('customer_city')}
                              </button>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <button onClick={() => requestSort('delivery_start_time')} className="flex items-center hover:text-indigo-600 transition-colors">
                                Date {getSortIcon('delivery_start_time')}
                              </button>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time Slot</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <button onClick={() => requestSort('wave_no')} className="flex items-center hover:text-indigo-600 transition-colors">
                                Wave No. {getSortIcon('wave_no')}
                              </button>
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {sortedAndFilteredData.map((row) => {
                            const { date, time } = formatTimeSlot(row.delivery_start_time);
                            return (
                              <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4 text-sm font-semibold text-indigo-600">
                                  {row.filename ? (
                                    <a href={`${API_URL}/api/invoices/${row.filename}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1.5">
                                      {row.so_no}
                                      <FileText size={14} className="opacity-50" />
                                    </a>
                                  ) : row.so_no}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{cleanCityName(row.customer_city) || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                   <div className="flex items-center gap-2">
                                     <Calendar size={14} className="text-slate-400" />
                                     {date}
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{time}</td>
                                <td className="px-6 py-4 text-sm">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                    {row.wave_no ?? 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex justify-center items-center gap-1">
                                    {row.filename && (
                                      <a href={`${API_URL}/api/invoices/${row.filename}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Invoice">
                                        <FileText className="h-4 w-4" />
                                      </a>
                                    )}
                                    <button onClick={() => openEditModal(row)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit">
                                      <Edit className="h-4 w-4" />
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
                ) : (
                  <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-2xl">
                    <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Database className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No data available</h3>
                    <p className="mt-2 text-slate-500 max-w-sm mx-auto">
                      Use the control panel above to select a date range and run a synchronization process.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* --- SKU Sales Analysis Tab Content --- */
              skuSalesData.length > 0 ? (
                <>
                {/* --- NEW: TOP 10 CHART COMPONENT --- */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
                   <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                      <TrendingUp className="text-indigo-500" size={20} />
                      Top 10 SKUs by Quantity
                   </h3>
                   <div className="h-64 flex items-end gap-2 sm:gap-4 border-b border-gray-100 pb-2">
                      {top10SkuData.map((item, i) => {
                         const heightPercentage = Math.max((item.accesQty / maxSkuQty) * 100, 5);
                         return (
                            <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                               {/* Tooltip */}
                               <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl pointer-events-none transition-all z-10 whitespace-nowrap transform translate-y-2 group-hover:translate-y-0">
                                  <span className="font-mono font-bold block">{item.skuId}</span>
                                  <span className="text-slate-300">Qty: {item.accesQty}</span>
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                               </div>
                               
                               {/* Bar */}
                               <div className="flex-1 flex items-end w-full">
                                 <div
                                    style={{ height: `${heightPercentage}%` }}
                                    className="w-full bg-indigo-100 group-hover:bg-indigo-500 rounded-t-lg transition-all duration-500 relative overflow-hidden"
                                 >
                                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/10 to-transparent group-hover:from-indigo-600/30"></div>
                                 </div>
                               </div>

                               {/* Label */}
                               <p className="text-[10px] sm:text-xs text-center text-slate-500 mt-3 truncate font-mono w-full px-1">
                                  {item.skuId}
                               </p>
                            </div>
                         )
                      })}
                   </div>
                </div>
                {/* ----------------------------------- */}

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-1.5 rounded-md text-indigo-600">
                          <Package size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800">SKU Sales Data</h3>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                      {filteredSkuData.length} Results
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SKU ID</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Location Code</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity Picked</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredSkuData.map((item, index) => (
                          <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-slate-800 font-mono">{item.skuId}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                               <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                                 {item.locat_code || 'N/A'}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-bold text-indigo-600">{Number(item.accesQty).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              ) : (
                <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-2xl">
                    <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No SKU Sales data</h3>
                    <p className="mt-2 text-slate-500 max-w-sm mx-auto">
                      Select date range and storage area in the Control Panel, then click "Fetch Sales".
                    </p>
                </div>
              )
            )}
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