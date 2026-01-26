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
  TrendingUp,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
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
  { id: 'AGV', label: 'AGV' },
  { id: 'BULK', label: 'BULK' },
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

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300 ${
      type === 'error' 
        ? 'bg-red-50 border-red-200 text-red-800' 
        : type === 'success'
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-blue-50 border-blue-200 text-blue-800'
    } border rounded-xl shadow-lg p-4 min-w-[300px] max-w-md`}>
      <div className="flex items-start gap-3">
        {type === 'error' ? (
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
        ) : type === 'success' ? (
          <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
        ) : (
          <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded">
          <X size={16} />
        </button>
      </div>
    </div>
  );
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
    <div className="fixed inset-0 backdrop-blur-md bg-slate-900/50 z-50 flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Edit Record</h3>
            <p className="text-xs text-slate-500 mt-1">Update details for this order</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-all hover:rotate-90">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
            <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Order No.</label>
            <p className="text-base text-slate-800 font-mono font-bold">{formData.so_no || 'N/A'}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100 shadow-sm">
            <label htmlFor="wave_no" className="block text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">
              Wave No.
            </label>
            <p className="text-base text-slate-800 font-mono font-bold">{formData.wave_no || 'N/A'}</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="customer_city" className="block text-sm font-semibold text-slate-700 mb-2">
              City
            </label>
            <input
              type="text"
              id="customer_city"
              name="customer_city"
              value={formData.customer_city ?? ''}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm hover:shadow-md"
              placeholder="Enter city name"
            />
          </div>
          <div className="sm:col-span-2 bg-gradient-to-br from-slate-50 to-gray-50 p-4 rounded-xl border border-slate-200 shadow-sm">
            <label
              htmlFor="delivery_start_time"
              className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2"
            >
              Time Slot Raw
            </label>
            <p className="text-sm text-slate-700 font-mono bg-white px-3 py-2 rounded-lg border border-slate-200">
              {formData.delivery_start_time || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex justify-end items-center p-6 bg-gradient-to-r from-slate-50 to-gray-50 border-t border-gray-200 rounded-b-2xl gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm hover:shadow-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all inline-flex items-center transform hover:scale-105"
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
  const [activeTab, setActiveTab] = useState('sync'); // 'sync', 'sku', or 'cancelled'
  
  // Original Data Sync States
  const [syncedData, setSyncedData] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRowData, setCurrentRowData] = useState(null);
  const [isSyncPanelOpen, setIsSyncPanelOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'so_no', direction: 'ascending' });
  const [lastRefresh, setLastRefresh] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState({
    sync: { orderNo: true, city: true, date: true, timeSlot: true, waveNo: true, actions: true },
    sku: { skuId: true, skuName: true, location: true, quantity: true }
  });

  // New SKU Sales States
  const [skuSalesData, setSkuSalesData] = useState([]);
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [selectedStockEnv, setSelectedStockEnv] = useState(2); // Can be number, 'AGV', or 'BULK'
  
  // Cancelled Orders States
  const [cancelledOrdersData, setCancelledOrdersData] = useState([]);
  const [cancelledSearchTerm, setCancelledSearchTerm] = useState('');
  const [cancelledFilterType, setCancelledFilterType] = useState('all'); // 'all', 'picked', 'notPicked'
  
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

  // Date Range Presets
  const setDatePreset = (preset) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let start, end;
    
    switch(preset) {
      case 'today': {
        start = today.toISOString().substring(0, 10);
        end = today.toISOString().substring(0, 10);
        break;
      }
      case 'yesterday': {
        start = yesterday.toISOString().substring(0, 10);
        end = yesterday.toISOString().substring(0, 10);
        break;
      }
      case 'last7': {
        start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        end = today.toISOString().substring(0, 10);
        break;
      }
      case 'last30': {
        start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        end = today.toISOString().substring(0, 10);
        break;
      }
      case 'thisMonth': {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
        end = today.toISOString().substring(0, 10);
        break;
      }
      case 'lastMonth': {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        start = lastMonth.toISOString().substring(0, 10);
        end = lastDayOfLastMonth.toISOString().substring(0, 10);
        break;
      }
      default:
        return;
    }
    
    setStartDate(start);
    setEndDate(end);
    setToast({ message: `Date range set to ${preset}`, type: 'success' });
  };

  const handleSync = async () => {
    setIsLoading(true);
    setFeedback({ message: '', type: '' });
    setCurrentPage(1); // Reset to first page
    try {
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates.');
      }
      // Ensure dates are in correct order for the query
      const start = new Date(startDate);
      const end = new Date(endDate);
      const actualStartDate = start <= end ? startDate : endDate;
      const actualEndDate = start <= end ? endDate : startDate;
      
      const syncApiUrl = `${API_URL}/api/sync/mysql-to-mongo`;
      const syncResponse = await fetch(syncApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: actualStartDate, endDate: actualEndDate }),
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
      setLastRefresh(new Date());
      setToast({
        message: `Successfully synced and enriched ${enrichedData.length} records.`,
        type: 'success',
      });
      setIsSyncPanelOpen(false);
    } catch (err) {
      setToast({ message: `Error: ${err.message}`, type: 'error' });
      console.error('Sync error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSkuSales = async () => {
    setIsLoading(true);
    setFeedback({ message: '', type: '' });
    setCurrentPage(1); // Reset to first page
    try {
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates.');
      }
      // Ensure dates are in correct order for the query
      const start = new Date(startDate);
      const end = new Date(endDate);
      const actualStartDate = start <= end ? startDate : endDate;
      const actualEndDate = start <= end ? endDate : startDate;
      
      const response = await fetch(
        `${API_URL}/api/sync/sales-by-sku?startDate=${actualStartDate}&endDate=${actualEndDate}&stockEnv=${selectedStockEnv}`
      );
      if (!response.ok) throw new Error('Failed to fetch SKU sales data');
      const data = await response.json();
      setSkuSalesData(data);
      setLastRefresh(new Date());
      setToast({
        message: `Successfully fetched ${data.length} SKU records.`,
        type: 'success',
      });
      setIsSyncPanelOpen(false);
    } catch (err) {
      setToast({ message: `Error: ${err.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCancelledOrders = async () => {
    setIsLoading(true);
    setFeedback({ message: '', type: '' });
    setCurrentPage(1); // Reset to first page
    try {
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates.');
      }
      // Ensure dates are in correct order for the query
      const start = new Date(startDate);
      const end = new Date(endDate);
      const actualStartDate = start <= end ? startDate : endDate;
      const actualEndDate = start <= end ? endDate : startDate;
      
      const response = await fetch(
        `${API_URL}/api/sync/cancelled-orders?startDate=${actualStartDate}&endDate=${actualEndDate}`
      );
      if (!response.ok) throw new Error('Failed to fetch cancelled orders');
      const data = await response.json();
      setCancelledOrdersData(data);
      setLastRefresh(new Date());
      setToast({
        message: `Successfully fetched ${data.length} cancelled orders.`,
        type: 'success',
      });
      setIsSyncPanelOpen(false);
    } catch (err) {
      setToast({ message: `Error: ${err.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'sync' && syncedData.length > 0) {
      handleSync();
    } else if (activeTab === 'sku' && skuSalesData.length > 0) {
      fetchSkuSales();
    } else if (activeTab === 'cancelled' && cancelledOrdersData.length > 0) {
      fetchCancelledOrders();
    } else {
      setToast({ message: 'No data to refresh', type: 'error' });
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

  // Filtering for Cancelled Orders Tab
  const filteredCancelledData = useMemo(() => {
    if (!cancelledOrdersData.length) return [];
    return cancelledOrdersData.filter((item) => {
      // Filter by picked/not picked
      if (cancelledFilterType === 'picked') {
        const hasWaveNo = item.wave_no && item.wave_no !== null && item.wave_no !== '';
        if (!hasWaveNo) return false;
      } else if (cancelledFilterType === 'notPicked') {
        const hasWaveNo = item.wave_no && item.wave_no !== null && item.wave_no !== '';
        if (hasWaveNo) return false;
      }
      
      // Filter by search term
      if (cancelledSearchTerm) {
        const term = cancelledSearchTerm.toLowerCase();
        const searchableText = `${item.so_no || ''} ${item.wave_no || ''} ${item.customer_city || ''}`.toLowerCase();
        if (!searchableText.includes(term)) return false;
      }
      return true;
    });
  }, [cancelledOrdersData, cancelledSearchTerm, cancelledFilterType]);

  const filteredSkuData = useMemo(() => {
    return skuSalesData.filter(item => 
      String(item.skuId).toLowerCase().includes(skuSearchTerm.toLowerCase()) ||
      String(item.sku_name || '').toLowerCase().includes(skuSearchTerm.toLowerCase())
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

  // Pagination Logic
  const totalPages = useMemo(() => {
    const data = activeTab === 'sync' ? sortedAndFilteredData : activeTab === 'sku' ? filteredSkuData : filteredCancelledData;
    return Math.ceil(data.length / itemsPerPage);
  }, [activeTab, sortedAndFilteredData, filteredSkuData, filteredCancelledData, itemsPerPage]);

  const paginatedData = useMemo(() => {
    const data = activeTab === 'sync' ? sortedAndFilteredData : activeTab === 'sku' ? filteredSkuData : filteredCancelledData;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [activeTab, sortedAndFilteredData, filteredSkuData, filteredCancelledData, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

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
    } else if (activeTab === 'sku') {
      const skuExportData = filteredSkuData.map(item => ({
        'SKU ID': item.skuId,
        'SKU Name': item.sku_name || 'N/A',
        'Location': item.locat_code,
        'Qty Picked': item.accesQty
      }));
      const skuSheet = XLSX.utils.json_to_sheet(skuExportData);
      XLSX.utils.book_append_sheet(workbook, skuSheet, 'SKU Sales');
    } else if (activeTab === 'cancelled') {
      const cancelledExportData = filteredCancelledData.map(item => ({
        'Order No': item.so_no || 'N/A',
        'Wave No': item.wave_no || 'N/A',
        'Customer City': item.customer_city || 'N/A',
        'Create Date': item.create_at ? new Date(item.create_at).toLocaleDateString('he-IL') : 'N/A',
        'Cancel Flag': item.so_cancel_flag === 1 ? 'Yes' : 'No',
        'Cancel Status': item.so_cancel_status === 1 ? 'Yes' : 'No',
        'Picked and Cancelled': (item.wave_no && item.wave_no !== null && item.wave_no !== '') ? 'Yes' : 'No'
      }));
      const cancelledSheet = XLSX.utils.json_to_sheet(cancelledExportData);
      
      // הגדרת רוחב עמודות
      cancelledSheet['!cols'] = [
        { wch: 15 }, // Order No
        { wch: 15 }, // Wave No
        { wch: 20 }, // Customer City
        { wch: 15 }, // Create Date
        { wch: 12 }, // Cancel Flag
        { wch: 15 }, // Cancel Status
        { wch: 20 }  // Picked and Cancelled
      ];
      
      XLSX.utils.book_append_sheet(workbook, cancelledSheet, 'Cancelled Orders');
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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
                  Data Management
                </h1>
                <p className="text-slate-500 mt-2 flex items-center gap-2 text-sm">
                  <Database size={16} className="text-indigo-500" /> 
                  Sync, filter, and analyze records from the database with advanced insights.
                </p>
              </div>
              {lastRefresh && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh data"
                  >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                  <div className="text-xs text-slate-500">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </div>
                </div>
              )}
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
            <div className="bg-white p-1.5 rounded-xl border border-gray-200 inline-flex shadow-md">
              <button 
                onClick={() => setActiveTab('sync')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'sync' 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200 scale-105' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <List size={18} /> Waves Data
              </button>
              <button 
                onClick={() => setActiveTab('sku')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'sku' 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200 scale-105' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BarChart3 size={18} /> SKU Sales Analysis
              </button>
              <button 
                onClick={() => setActiveTab('cancelled')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'cancelled' 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200 scale-105' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <AlertTriangle size={18} /> Cancelled Orders
              </button>
            </div>

            {/* --- Control Panel Card --- */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
              <button
                onClick={() => setIsSyncPanelOpen(!isSyncPanelOpen)}
                className="w-full flex justify-between items-center p-6 bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 transition-all border-b border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shadow-sm transition-all ${
                    isSyncPanelOpen 
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-200' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Filter size={20} />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-slate-800 text-lg block">Control Panel & Configuration</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">Configure your data sync parameters</span>
                  </div>
                </div>
                <ChevronsUpDown
                  className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isSyncPanelOpen ? 'rotate-180' : ''}`}
                />
              </button>
              
              {isSyncPanelOpen && (
                <div className="p-6 bg-white animate-in slide-in-from-top-4 duration-200">
                  {/* Date Range Presets */}
                  <div className="mb-6">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">Quick Date Presets</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'today', label: 'Today' },
                        { key: 'yesterday', label: 'Yesterday' },
                        { key: 'last7', label: 'Last 7 Days' },
                        { key: 'last30', label: 'Last 30 Days' },
                        { key: 'thisMonth', label: 'This Month' },
                        { key: 'lastMonth', label: 'Last Month' }
                      ].map(preset => (
                        <button
                          key={preset.key}
                          onClick={() => setDatePreset(preset.key)}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-all border border-slate-200 hover:border-indigo-300"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    
                    {/* Date Inputs */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label htmlFor="startDate" className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                          <Calendar size={14} className="text-indigo-500" />
                          Start Date
                        </label>
                        <div className="relative">
                          <input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            disabled={isLoading}
                            className="w-full pl-4 pr-3 py-3 border-2 border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm bg-white hover:shadow-md"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="endDate" className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                          <Calendar size={14} className="text-indigo-500" />
                          End Date
                        </label>
                        <div className="relative">
                          <input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            disabled={isLoading}
                            className="w-full pl-4 pr-3 py-3 border-2 border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm bg-white hover:shadow-md"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Conditional Select for SKU */}
                    {activeTab === 'sku' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                          <Package size={14} className="text-indigo-500" />
                          Storage Area
                        </label>
                        <select 
                          value={selectedStockEnv} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedStockEnv(val === 'AGV' || val === 'BULK' ? val : Number(val));
                          }}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm bg-white hover:shadow-md"
                        >
                          {STOCK_ENV_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                      </div>
                    ) : <div className="hidden md:block"></div>}

                    {/* Action Button */}
                    <div>
                      <button
                        onClick={activeTab === 'sync' ? handleSync : activeTab === 'sku' ? fetchSkuSales : fetchCancelledOrders}
                        disabled={isLoading || !startDate || !endDate}
                        className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:from-indigo-700 hover:via-indigo-800 hover:to-indigo-900 disabled:opacity-70 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                      >
                        {isLoading ? (
                          <>
                            <LoaderCircle className="animate-spin -ml-1 mr-2 h-5 w-5" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="-ml-1 mr-2 h-5 w-5" />
                            {activeTab === 'sync' ? 'Run Sync' : activeTab === 'sku' ? 'Fetch Sales' : 'Fetch Cancelled Orders'}
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
            {((activeTab === 'sync' && syncedData.length > 0) || (activeTab === 'sku' && skuSalesData.length > 0) || (activeTab === 'cancelled' && cancelledOrdersData.length > 0)) && (
              <div className="bg-gradient-to-r from-white to-slate-50 p-5 rounded-xl border border-gray-200 shadow-md">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                  <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder={activeTab === 'sync' ? "Search by order, city, file..." : activeTab === 'sku' ? "Search SKU ID or name..." : "Search order number..."}
                        value={activeTab === 'sync' ? searchTerm : activeTab === 'sku' ? skuSearchTerm : cancelledSearchTerm}
                        onChange={(e) => {
                          if (activeTab === 'sync') setSearchTerm(e.target.value);
                          else if (activeTab === 'sku') setSkuSearchTerm(e.target.value);
                          else setCancelledSearchTerm(e.target.value);
                          setCurrentPage(1); // Reset to first page on search
                        }}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm hover:shadow-md bg-white"
                      />
                    </div>
                    
                    {activeTab === 'cancelled' && (
                      <div className="w-full md:w-64">
                        <select
                          value={cancelledFilterType}
                          onChange={(e) => {
                            setCancelledFilterType(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm hover:shadow-md"
                        >
                          <option value="all">כל ההזמנות</option>
                          <option value="picked">שלוקטו ובוטלו (עם WAVE NO)</option>
                          <option value="notPicked">בוטלו ללא ליקוט</option>
                        </select>
                      </div>
                    )}
                    
                    {activeTab === 'sync' && (
                      <div className="w-full md:w-64">
                        <select
                          value={selectedCity}
                          onChange={(e) => {
                            setSelectedCity(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm hover:shadow-md"
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

                  {(activeTab === 'sync' || activeTab === 'sku') && (
                    <div className="flex gap-3">
                      {/* Column Visibility Toggle */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            const current = activeTab === 'sync' ? visibleColumns.sync : visibleColumns.sku;
                            const newState = { ...current };
                            // Toggle all columns
                            const allVisible = Object.values(newState).every(v => v);
                            Object.keys(newState).forEach(key => {
                              newState[key] = !allVisible;
                            });
                            setVisibleColumns(prev => ({
                              ...prev,
                              [activeTab]: newState
                            }));
                          }}
                          className="inline-flex items-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                          title="Toggle column visibility"
                        >
                          {Object.values(activeTab === 'sync' ? visibleColumns.sync : visibleColumns.sku).every(v => v) ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                          Columns
                        </button>
                      </div>

                      <button
                        onClick={handleExportToExcel}
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white border border-green-600 font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <FileDown className="-ml-1 mr-2 h-5 w-5" />
                        Export Excel
                      </button>
                    </div>
                  )}
                  
                  {activeTab === 'cancelled' && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleExportToExcel}
                        disabled={filteredCancelledData.length === 0}
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white border border-green-600 font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <FileDown className="-ml-1 mr-2 h-5 w-5" />
                        Export Excel
                      </button>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">Items per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                    <span className="text-sm text-slate-500">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, activeTab === 'sync' ? sortedAndFilteredData.length : activeTab === 'sku' ? filteredSkuData.length : filteredCancelledData.length)} of {activeTab === 'sync' ? sortedAndFilteredData.length : activeTab === 'sku' ? filteredSkuData.length : filteredCancelledData.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- Render Active Tab Content --- */}
            {activeTab === 'sync' ? (
              <>
                {syncedData.length > 0 ? (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* City Summary Card */}
                    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col h-80">
                      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2.5">
                           <div className="p-1.5 bg-indigo-100 rounded-lg">
                             <MapPin size={18} className="text-indigo-600" />
                           </div>
                           Orders by City
                        </h3>
                        <span className="text-xs font-semibold text-indigo-600 bg-white px-2.5 py-1 rounded-full border border-indigo-200">
                          Top Locations
                        </span>
                      </div>
                      <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
                        {citySummary.map((item, index) => (
                          <div key={item.city} className="flex justify-between items-center text-sm py-3 px-4 hover:bg-indigo-50/50 rounded-xl transition-all duration-200 mb-2 border border-transparent hover:border-indigo-100 hover:shadow-sm group">
                            <span className="text-slate-700 font-medium flex items-center gap-3 group-hover:text-indigo-700">
                               <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                 index < 3 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                               }`}>
                                 {index + 1}
                               </span>
                               <span>{item.city}</span>
                            </span>
                            <span className="font-bold text-indigo-600 bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 px-3 py-1 rounded-full text-xs shadow-sm">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Wave Summary Card */}
                    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col h-80">
                      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2.5">
                           <div className="p-1.5 bg-purple-100 rounded-lg">
                             <List size={18} className="text-purple-600" />
                           </div>
                           Orders by Wave
                        </h3>
                        <span className="text-xs font-semibold text-purple-600 bg-white px-2.5 py-1 rounded-full border border-purple-200">
                          Distribution
                        </span>
                      </div>
                      <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
                        {waveSummary.map(([wave, count], index) => (
                          <div key={wave} className="flex justify-between items-center text-sm py-3 px-4 hover:bg-purple-50/50 rounded-xl transition-all duration-200 mb-2 border border-transparent hover:border-purple-100 hover:shadow-sm group">
                            <span className="text-slate-700 font-medium flex items-center gap-3 group-hover:text-purple-700">
                              <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                index < 3 ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="font-mono">{wave}</span>
                            </span>
                            <span className="font-bold text-purple-600 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 px-3 py-1 rounded-full text-xs shadow-sm">
                              {count}
                            </span> 
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden mt-6">
                    <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2 rounded-lg shadow-md">
                          <List size={18} className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">Synced Records</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Complete order synchronization data</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 shadow-sm">
                        {sortedAndFilteredData.length} / {syncedData.length}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                          <tr>
                            {visibleColumns.sync.orderNo && (
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                <button onClick={() => requestSort('so_no')} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors group">
                                  Order No. {getSortIcon('so_no')}
                                </button>
                              </th>
                            )}
                            {visibleColumns.sync.city && (
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                <button onClick={() => requestSort('customer_city')} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors group">
                                  City {getSortIcon('customer_city')}
                                </button>
                              </th>
                            )}
                            {visibleColumns.sync.date && (
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                <button onClick={() => requestSort('delivery_start_time')} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors group">
                                  Date {getSortIcon('delivery_start_time')}
                                </button>
                              </th>
                            )}
                            {visibleColumns.sync.timeSlot && (
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Time Slot</th>
                            )}
                            {visibleColumns.sync.waveNo && (
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                <button onClick={() => requestSort('wave_no')} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors group">
                                  Wave No. {getSortIcon('wave_no')}
                                </button>
                              </th>
                            )}
                            {visibleColumns.sync.actions && (
                              <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {paginatedData.map((row, idx) => {
                            const { date, time } = formatTimeSlot(row.delivery_start_time);
                            return (
                              <tr key={row._id} className={`hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-200 group ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                              }`}>
                                {visibleColumns.sync.orderNo && (
                                  <td className="px-6 py-4 text-sm font-semibold">
                                    {row.filename ? (
                                      <a href={`${API_URL}/api/invoices/${row.filename}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2 text-indigo-600 hover:text-indigo-700 group-hover:font-bold transition-all">
                                        {row.so_no}
                                        <FileText size={14} className="opacity-60 group-hover:opacity-100" />
                                      </a>
                                    ) : (
                                      <span className="text-slate-700 font-mono">{row.so_no}</span>
                                    )}
                                  </td>
                                )}
                                {visibleColumns.sync.city && (
                                  <td className="px-6 py-4 text-sm text-slate-700 font-medium group-hover:text-slate-900">{cleanCityName(row.customer_city) || 'N/A'}</td>
                                )}
                                {visibleColumns.sync.date && (
                                  <td className="px-6 py-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                      <Calendar size={14} className="text-slate-400 group-hover:text-indigo-500" />
                                      <span className="font-medium">{date}</span>
                                    </div>
                                  </td>
                                )}
                                {visibleColumns.sync.timeSlot && (
                                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{time}</td>
                                )}
                                {visibleColumns.sync.waveNo && (
                                  <td className="px-6 py-4 text-sm">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-300 shadow-sm">
                                      {row.wave_no ?? 'N/A'}
                                    </span>
                                  </td>
                                )}
                                {visibleColumns.sync.actions && (
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                      {row.filename && (
                                        <a href={`${API_URL}/api/invoices/${row.filename}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shadow-sm hover:shadow-md" title="View Invoice">
                                          <FileText className="h-4 w-4" />
                                        </a>
                                      )}
                                      <button onClick={() => openEditModal(row)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shadow-sm hover:shadow-md" title="Edit">
                                        <Edit className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </>
                ) : (
                  <div className="text-center py-24 bg-gradient-to-br from-white via-slate-50 to-white border-2 border-dashed border-gray-300 rounded-2xl">
                    <div className="bg-gradient-to-br from-indigo-100 to-purple-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Database className="h-12 w-12 text-indigo-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No data available</h3>
                    <p className="mt-2 text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                      Use the control panel above to select a date range and run a synchronization process to view your data.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setIsSyncPanelOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                      >
                        <Filter size={18} />
                        Open Control Panel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : activeTab === 'sku' ? (
              /* --- SKU Sales Analysis Tab Content --- */
              skuSalesData.length > 0 ? (
                <>
                {/* --- NEW: TOP 10 CHART COMPONENT --- */}
                <div className="bg-gradient-to-br from-white via-indigo-50/20 to-white p-8 rounded-2xl border border-gray-200 shadow-xl mb-6">
                   <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                       <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                         <TrendingUp className="text-white" size={24} />
                       </div>
                       <div>
                         <h3 className="font-bold text-xl text-slate-800">Top 10 SKUs by Quantity</h3>
                         <p className="text-xs text-slate-500 mt-0.5">Best performing products</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-xs text-slate-500">Total Quantity</p>
                       <p className="text-lg font-bold text-indigo-600">{maxSkuQty.toLocaleString()}</p>
                     </div>
                   </div>
                   <div className="h-72 flex items-end gap-2 sm:gap-3 border-b-2 border-indigo-100 pb-4 bg-gradient-to-t from-indigo-50/30 to-transparent rounded-lg p-4">
                      {top10SkuData.map((item, i) => {
                         const heightPercentage = Math.max((item.accesQty / maxSkuQty) * 100, 8);
                         const isTop3 = i < 3;
                         return (
                            <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                               {/* Tooltip */}
                               <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-gradient-to-br from-slate-800 to-slate-900 text-white text-xs py-2 px-4 rounded-xl shadow-2xl pointer-events-none transition-all z-20 whitespace-nowrap transform translate-y-2 group-hover:translate-y-0 border border-slate-700">
                                  <div className="font-bold text-white mb-1">{item.sku_name || item.skuId}</div>
                                  <div className="text-slate-300 font-mono">SKU: {item.skuId}</div>
                                  <div className="text-indigo-300 font-bold mt-1">Qty: {item.accesQty.toLocaleString()}</div>
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 border-r border-b border-slate-700"></div>
                               </div>
                               
                               {/* Bar */}
                               <div className="flex-1 flex items-end w-full">
                                 <div
                                    style={{ height: `${heightPercentage}%` }}
                                    className={`w-full rounded-t-xl transition-all duration-500 relative overflow-hidden shadow-lg group-hover:shadow-xl ${
                                      isTop3 
                                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300' 
                                        : 'bg-gradient-to-t from-indigo-400 to-indigo-300 group-hover:from-indigo-500 group-hover:to-indigo-400'
                                    }`}
                                 >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent"></div>
                                 </div>
                               </div>

                               {/* Label */}
                               <div className="mt-4 text-center">
                                 <p className="text-[9px] sm:text-[10px] text-slate-600 truncate font-mono w-full px-1 font-semibold">
                                    {item.skuId}
                                 </p>
                                 {isTop3 && (
                                   <div className="mt-1">
                                     <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[8px] font-bold">
                                       {i + 1}
                                     </span>
                                   </div>
                                 )}
                               </div>
                            </div>
                         )
                      })}
                   </div>
                </div>
                {/* ----------------------------------- */}

                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg shadow-md">
                          <Package size={18} className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">SKU Sales Data</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Complete sales analysis by SKU</p>
                        </div>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200 shadow-sm">
                      {filteredSkuData.length} {filteredSkuData.length === 1 ? 'Result' : 'Results'}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                        <tr>
                          {visibleColumns.sku.skuId && (
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">SKU ID</th>
                          )}
                          {visibleColumns.sku.skuName && (
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">SKU Name</th>
                          )}
                          {visibleColumns.sku.location && (
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Location Code</th>
                          )}
                          {visibleColumns.sku.quantity && (
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Quantity Picked</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedData.map((item, index) => (
                          <tr key={index} className={`hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/30 transition-all duration-200 group ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}>
                            {visibleColumns.sku.skuId && (
                              <td className="px-6 py-4 text-sm font-bold text-slate-800 font-mono group-hover:text-purple-700">{item.skuId}</td>
                            )}
                            {visibleColumns.sku.skuName && (
                              <td className="px-6 py-4 text-sm text-slate-700 group-hover:text-slate-900 font-medium">{item.sku_name || <span className="text-slate-400 italic">N/A</span>}</td>
                            )}
                            {visibleColumns.sku.location && (
                              <td className="px-6 py-4 text-sm text-slate-600">
                                <span className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 shadow-sm group-hover:shadow-md transition-all">
                                  {item.locat_code || 'N/A'}
                                </span>
                              </td>
                            )}
                            {visibleColumns.sku.quantity && (
                              <td className="px-6 py-4 text-sm text-right">
                                <span className="font-bold text-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm group-hover:shadow-md transition-all">
                                  {Number(item.accesQty).toLocaleString()}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              ) : (
                <div className="text-center py-24 bg-gradient-to-br from-white via-purple-50/30 to-white border-2 border-dashed border-gray-300 rounded-2xl">
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <BarChart3 className="h-12 w-12 text-purple-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No SKU Sales data</h3>
                    <p className="mt-2 text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                      Select date range and storage area in the Control Panel, then click "Fetch Sales" to view SKU sales analysis.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setIsSyncPanelOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 shadow-md hover:shadow-lg transition-all"
                      >
                        <BarChart3 size={18} />
                        Fetch Sales Data
                      </button>
                    </div>
                </div>
              )
            ) : (
              /* --- Cancelled Orders Tab Content --- */
              cancelledOrdersData.length > 0 ? (
                <>
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-red-50 to-orange-50">
                      <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-red-500 to-orange-600 p-2 rounded-lg shadow-md">
                            <AlertTriangle size={18} className="text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">Cancelled Orders</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Orders that were cancelled (with wave numbers are picked but cancelled)</p>
                          </div>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 bg-red-100 text-red-700 rounded-full border border-red-200 shadow-sm">
                        {filteredCancelledData.length} {filteredCancelledData.length === 1 ? 'Order' : 'Orders'}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Order No</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Wave No</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Customer City</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Create Date</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Cancel Flag</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Cancel Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {paginatedData.map((item, index) => {
                            const hasWaveNo = item.wave_no && item.wave_no !== null && item.wave_no !== '';
                            return (
                              <tr key={index} className={`hover:bg-gradient-to-r hover:from-red-50/50 hover:to-orange-50/30 transition-all duration-200 group ${
                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                              } ${hasWaveNo ? 'bg-red-100/50 border-l-4 border-red-500' : ''}`}>
                                <td className="px-6 py-4 text-sm font-bold text-slate-800 font-mono group-hover:text-red-700">{item.so_no || 'N/A'}</td>
                                <td className={`px-6 py-4 text-sm font-bold ${hasWaveNo ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}>
                                  {hasWaveNo ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 border border-red-300">
                                      <AlertTriangle size={14} />
                                      {item.wave_no}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">N/A</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700 group-hover:text-slate-900 font-medium">{item.customer_city || <span className="text-slate-400 italic">N/A</span>}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                  {item.create_at ? new Date(item.create_at).toLocaleDateString('he-IL') : 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.so_cancel_flag === 1 ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-600'}`}>
                                    {item.so_cancel_flag === 1 ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.so_cancel_status === 1 ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-600'}`}>
                                    {item.so_cancel_status === 1 ? 'Yes' : 'No'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-24 bg-gradient-to-br from-white via-red-50/30 to-white border-2 border-dashed border-gray-300 rounded-2xl">
                    <div className="bg-gradient-to-br from-red-100 to-orange-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <AlertTriangle className="h-12 w-12 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No Cancelled Orders data</h3>
                    <p className="mt-2 text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                      Select date range in the Control Panel, then click "Fetch Cancelled Orders" to view cancelled orders.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setIsSyncPanelOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
                      >
                        <AlertTriangle size={18} />
                        Fetch Cancelled Orders
                      </button>
                    </div>
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default DataSyncPage;