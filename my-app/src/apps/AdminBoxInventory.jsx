'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Package,
  History,
  Edit,
  Search,
  FileSpreadsheet,
  Loader2,
  Save,
  Car,
  Trash2,
  X,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Filter,
  XCircle,
  Wrench,
  User,
  Users,
  Warehouse,
  Calendar,
} from 'lucide-react';

const OVERDUE_THRESHOLD_HOURS = 24;
const API_URL = import.meta.env.VITE_API_URL;

const exportStyledExcelReport = (data, fileName) => {
  if (!data || data.length === 0) {
    toast.error('אין נתונים לייצוא.');
    return;
  }
  toast.success('מייצר דוח אקסל מעוצב...');

  // שלב 1: הגדרת כותרות וסגנונות
  const headers = [
    "תאריך", "שם נהג", "כמות שיצאו", "מספרי קופסאות",
    "צידניות שיצאו", "צידניות שחזרו", "קרח שיצא", "קרח שחזר"
  ];

  const headerStyle = {
    fill: { fgColor: { rgb: "FFFFFF00" } }, // צהוב
    font: { bold: true },
    alignment: { horizontal: "center", vertical: "center" }
  };

  // שלב 2: הכנת הנתונים לגיליון
  const dataForSheet = data.map(row => [
    row['תאריך'], row['שם נהג'], row['כמות שיצאו'], row['מספרי קופסאות'],
    row['צידניות שיצאו'], row['צידניות שחזרו'], row['קרח שיצא'], row['קרח שחזר']
  ]);

  const finalSheetData = [headers, ...dataForSheet];

  // שלב 3: חישוב סיכומים
  const totalBoxesOut = data.reduce((sum, row) => sum + row['כמות שיצאו'], 0);
  const totalCoolersOut = data.reduce((sum, row) => sum + row['צידניות שיצאו'], 0);
  const totalCoolersIn = data.reduce((sum, row) => sum + row['צידניות שחזרו'], 0);
  const totalIceOut = data.reduce((sum, row) => sum + row['קרח שיצא'], 0);
  const totalIceIn = data.reduce((sum, row) => sum + row['קרח שחזר'], 0);

  const coolerBalance = totalCoolersIn - totalCoolersOut;
  const iceBalance = totalIceIn - totalIceOut;

  // --- שינוי: הוספת לוגיקה ל"עודף" או "חוסר" ---
  const coolerBalanceLabel = coolerBalance >= 0 ? 'עודף:' : 'חוסר:';
  const iceBalanceLabel = iceBalance >= 0 ? 'עודף:' : 'חוסר:';
  // הצגת הערך המוחלט (ללא מינוס)
  const displayCoolerBalance = Math.abs(coolerBalance); 
  const displayIceBalance = Math.abs(iceBalance);

  // הוספת שורות ריקות ושורות סיכום
  finalSheetData.push([]); // שורה ריקה
  finalSheetData.push(['','', totalBoxesOut, 'סה"כ: ', totalCoolersOut, totalCoolersIn, totalIceOut, totalIceIn , 'סה"כ: ']);
  finalSheetData.push([]); // שורה ריקה
  // שימוש בתוויות ובערכים הדינמיים שיצרנו
  finalSheetData.push(['','','','', displayCoolerBalance,coolerBalanceLabel, displayIceBalance,iceBalanceLabel]);

  // שלב 4: יצירת הגיליון והחלת עיצובים
  const ws = XLSX.utils.aoa_to_sheet(finalSheetData);

  headers.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
    if (ws[cellAddress]) ws[cellAddress].s = headerStyle;
  });
  
  const summaryRow1Index = data.length + 2;
  const summaryRow2Index = data.length + 4;
  ws[XLSX.utils.encode_cell({r: summaryRow1Index, c: 1})].s = headerStyle; // סה"כ
  ws[XLSX.utils.encode_cell({r: summaryRow2Index, c: 4})].s = headerStyle; // תווית עודף/חוסר צידניות
  ws[XLSX.utils.encode_cell({r: summaryRow2Index, c: 6})].s = headerStyle; // תווית עודף/חוסר קרח

  ws['!cols'] = [
    { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 50 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
  ];
  ws['!props'] = { rtl: true };

  // שלב 5: יצירת קובץ האקסל ושמירה
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });
  saveAs(blob, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const ReportModal = ({ isOpen, onClose, onGenerate }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const handleGenerateClick = () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date.');
      return;
    }
    onGenerate(startDate, endDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet size={20} /> Generate Custom Report
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Select a date range to generate a report for assets "On Mission" and their associated
            cooler movements.
          </p>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 text-sm rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 text-sm rounded-md"
            />
          </div>
        </div>
        <div className="flex justify-end items-center p-4 bg-slate-50 border-t rounded-b-xl gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-md font-semibold shadow-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateClick}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md font-semibold shadow hover:bg-green-700"
          >
            <Calendar size={16} /> Generate
          </button>
        </div>
      </div>
    </div>
  );
};

const EditAssetModal = ({ onClose, onAssetUpdate }) => {
  const [searchBarcode, setSearchBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [asset, setAsset] = useState(null);
  const [originalBarcode, setOriginalBarcode] = useState('');
  const [formData, setFormData] = useState({
    barcode: '',
    status: '',
    driverName: '',
    vehicleNumber: '',
    notes: '',
  });
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchBarcode.trim()) return;
    setIsLoading(true);
    setAsset(null);
    try {
      const res = await fetch(`${API_URL}/api/assets/${searchBarcode.trim()}`);
      if (res.status === 404) {
        toast.error('Asset not found.');
        setIsLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setAsset(data);
      setOriginalBarcode(data.barcode);
      setFormData({
        barcode: data.barcode,
        status: data.status,
        driverName: data.currentLocation?.actualDriverName || '',
        vehicleNumber: data.currentLocation?.vehicleNumber || '',
        notes: '',
      });
    } catch (error) {
      toast.error('Failed to search for asset.', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpdate = async () => {
    if (!asset) return;
    const payload = {
      newBarcode: formData.barcode,
      status: formData.status,
      notes: formData.notes,
      driverName: formData.driverName,
      vehicleNumber: formData.vehicleNumber,
    };
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/assets/admin/${originalBarcode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Update failed');
      }
      toast.success('Asset updated successfully!');
      onAssetUpdate();
      onClose();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  const handleDelete = async () => {
    if (
      !asset ||
      !window.confirm(
        `Are you sure you want to PERMANENTLY DELETE asset ${originalBarcode}? This action cannot be undone.`
      )
    )
      return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/assets/${originalBarcode}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success(`Asset ${originalBarcode} deleted.`);
      onAssetUpdate();
      onClose();
    } catch (error) {
      toast.error(`Error deleting asset: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  const clearSelection = () => {
    setAsset(null);
    setSearchBarcode('');
    setOriginalBarcode('');
    setFilterStartDate('');
    setFilterEndDate('');
  };
  const filteredHistory = useMemo(() => {
    if (!asset?.history) return [];
    if (!filterStartDate && !filterEndDate) {
      return asset.history.slice(0, 5);
    }
    return asset.history.filter((h) => {
      const eventDate = new Date(h.timestamp);
      const start = filterStartDate ? new Date(filterStartDate) : null;
      const end = filterEndDate ? new Date(filterEndDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      return (!start || eventDate >= start) && (!end || eventDate <= end);
    });
  }, [asset?.history, filterStartDate, filterEndDate]);
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-slate-800">Manage Asset</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input
              type="text"
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
              placeholder="Enter asset barcode..."
              className="flex-grow px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-semibold shadow hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading && !asset ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Search size={16} />
              )}{' '}
              Search
            </button>
          </form>
          {isLoading && (
            <div className="text-center p-8">
              <Loader2 className="animate-spin inline-block w-8 h-8 text-blue-600" />
            </div>
          )}
          {!isLoading && !asset && (
            <div className="text-center py-12 text-slate-500">
              <Package size={48} className="mx-auto mb-4 text-slate-400" />
              <p>Search for an asset to view its details and manage it.</p>
            </div>
          )}
          {asset && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-700 border-b pb-2 mb-3">
                  Asset Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p>
                    <strong>Barcode:</strong> <span className="font-mono">{asset.barcode}</span>
                  </p>
                  <p>
                    <strong>Status:</strong> <span className="font-semibold">{asset.status}</span>
                  </p>
                  <p>
                    <strong>Created:</strong> {new Date(asset.createdAt).toLocaleString('en-GB')}
                  </p>
                  <p>
                    <strong>Last Update:</strong>{' '}
                    {new Date(asset.updatedAt).toLocaleString('en-GB')}
                  </p>
                  {asset.currentLocation?.actualDriverName && (
                    <p>
                      <strong>Driver:</strong> {asset.currentLocation.actualDriverName}
                    </p>
                  )}
                  {asset.currentLocation?.vehicleNumber && (
                    <p>
                      <strong>Vehicle:</strong> {asset.currentLocation.vehicleNumber}
                    </p>
                  )}
                </div>
                {asset.correctionLogs && asset.correctionLogs.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} /> Correction & Replacement History
                    </h4>
                    <ul className="text-sm space-y-2 text-slate-700">
                      {asset.correctionLogs.map((log) => {
                        const isThisTheNewBox = log.newBarcode === asset.barcode;
                        return (
                          <li key={log._id} className="pl-2 border-l-2 border-amber-300">
                            <div>
                              {new Date(log.createdAt).toLocaleString('en-GB')} -{' '}
                              <strong>{log.reason}</strong>
                            </div>
                            <div className="text-slate-600 text-xs">
                              {isThisTheNewBox && log.oldBarcode && (
                                <span>
                                  This box replaced barcode:{' '}
                                  <span className="font-mono">{log.oldBarcode}</span>
                                </span>
                              )}
                              {!isThisTheNewBox && (
                                <span>
                                  This box was replaced by:{' '}
                                  <span className="font-mono">{log.newBarcode}</span>
                                </span>
                              )}
                            </div>
                            {log.notes && (
                              <div className="text-xs text-slate-500 italic">
                                Notes: {log.notes}
                              </div>
                            )}
                            <div className="text-xs text-slate-500">
                              <User size={12} className="inline mr-1" /> By: {log.changedBy}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {asset.history && asset.history.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Recent Activity</h4>
                    <div className="p-3 bg-slate-50 border rounded-lg mb-3">
                      <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                        <Filter size={14} /> Filter by Date
                      </label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 text-sm rounded-md"
                        />
                        <span>to</span>
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 text-sm rounded-md"
                        />
                        <button
                          onClick={() => {
                            setFilterStartDate('');
                            setFilterEndDate('');
                          }}
                          className="p-1.5 hover:bg-slate-200 rounded-full"
                        >
                          <XCircle size={16} className="text-slate-500" />
                        </button>
                      </div>
                    </div>
                    <ul className="text-sm space-y-2 text-slate-700">
                      {filteredHistory.map((h, index) => (
                        <li
                          key={`${h.timestamp}-${index}`}
                          className="pl-2 border-l-2 border-slate-200"
                        >
                          <div>
                            {new Date(h.timestamp).toLocaleString('en-GB')} -{' '}
                            <strong>{h.status || h.eventType}</strong>
                          </div>
                          <div className="text-slate-500 text-xs">
                            <User size={12} className="inline mr-1" /> {h.driverName || 'N/A'} |{' '}
                            <Car size={12} className="inline ml-2 mr-1" />{' '}
                            {h.vehicleNumber || 'N/A'}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-slate-500 mt-2 text-center">
                      {!filterStartDate && !filterEndDate
                        ? `Showing latest ${filteredHistory.length} of ${asset.history.length} events.`
                        : `Showing ${filteredHistory.length} events in selected range.`}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-700 border-b pb-2 mb-3">
                  Update Asset
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Barcode</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white"
                    >
                      <option value="In Warehouse">In Warehouse</option>
                      <option value="On Mission">On Mission</option>
                      <option value="Broken">Broken</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  {formData.status === 'On Mission' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Driver Name
                        </label>
                        <input
                          type="text"
                          value={formData.driverName}
                          onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Vehicle Number
                        </label>
                        <input
                          type="text"
                          value={formData.vehicleNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, vehicleNumber: e.target.value })
                          }
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                        />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {asset && (
          <div className="flex justify-between items-center p-4 bg-slate-50 border-t rounded-b-xl">
            <div>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md font-semibold shadow hover:bg-red-700 disabled:bg-red-300"
              >
                <Trash2 size={16} /> Delete Asset
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={clearSelection}
                type="button"
                className="px-4 py-2 bg-white border border-slate-300 rounded-md font-semibold shadow-sm hover:bg-slate-50"
              >
                Clear Selection
              </button>
              <button
                onClick={handleUpdate}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md font-semibold shadow hover:bg-green-700 disabled:bg-green-300"
              >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}{' '}
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
const HistoryView = ({ history }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <History size={20} /> Asset Event Log
    </h2>
    {history.length > 0 ? (
      <ul className="space-y-3">
        {history.map((event) => (
          <li
            key={event._id}
            className="p-3 bg-gray-50 rounded-md border flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-gray-800">
                <Package size={14} className="inline mr-1" /> {event.barcode}
              </p>
              <p className="text-sm text-gray-600">
                <User size={14} className="inline mr-1" /> {event.driverName || 'N/A'} |{' '}
                <Car size={14} className="inline mr-1" /> {event.vehicleNumber || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleString('he-IL')}
              </p>
            </div>
            <div className="text-sm font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-800">
              {event.eventType}
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-center text-slate-500 py-8">No recent activity found.</p>
    )}
  </div>
);
const QuantitativeReportView = ({ movements }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const dailySummaryByDriver = useMemo(() => {
    const filteredMovements = movements.filter((m) => {
      const moveDate = new Date(m.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      return (!start || moveDate >= start) && (!end || moveDate <= end);
    });
    const summary = {};
    filteredMovements.forEach((move) => {
      const date = new Date(move.createdAt).toISOString().split('T')[0];
      const key = `${date}|${move.driverName}`;
      if (!summary[key]) {
        summary[key] = {
          date,
          driverName: move.driverName,
          largeCoolersOut: 0,
          largeCoolersIn: 0,
          smallCoolersOut: 0,
          smallCoolersIn: 0,
        };
      }
      if (move.transactionType === 'outgoing') {
        summary[key].largeCoolersOut += move.largeCoolers;
        summary[key].smallCoolersOut += move.smallCoolers;
      } else {
        summary[key].largeCoolersIn += move.largeCoolers;
        summary[key].smallCoolersIn += move.smallCoolers;
      }
    });
    return Object.values(summary).sort(
      (a, b) => new Date(b.date) - new Date(a.date) || a.driverName.localeCompare(b.driverName)
    );
  }, [movements, startDate, endDate]);
  const handleExport = () => {
    const dataToExport = dailySummaryByDriver.map((item) => ({
      Date: item.date,
      'Driver Name': item.driverName,
      'Large Coolers OUT': item.largeCoolersOut,
      'Large Coolers IN': item.largeCoolersIn,
      'Large Coolers Balance': item.largeCoolersIn - item.largeCoolersOut,
      'Small Coolers OUT': item.smallCoolersOut,
      'Small Coolers IN': item.smallCoolersIn,
      'Small Coolers Balance': item.smallCoolersIn - item.smallCoolersOut,
    }));
    exportStyledExcelReport(dataToExport, 'quantitative_report');
  };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-800">Coolers & Ice Report</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 text-sm rounded-md shadow-sm"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 text-sm rounded-md shadow-sm"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="p-2 text-left font-semibold text-slate-600">Date</th>
              <th className="p-2 text-left font-semibold text-slate-600">Driver Name</th>
              <th className="p-2 text-center font-semibold text-slate-600">
                Large Coolers (In/Out)
              </th>
              <th className="p-2 text-center font-semibold text-slate-600">
                Small Coolers (In/Out)
              </th>
              <th className="p-2 text-center font-semibold text-slate-600">
                Balance (Large/Small)
              </th>
            </tr>
          </thead>
          <tbody>
            {dailySummaryByDriver.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-8 text-slate-500">
                  No movements found.
                </td>
              </tr>
            ) : (
              dailySummaryByDriver.map((item) => {
                const largeBalance = item.largeCoolersIn - item.largeCoolersOut;
                const smallBalance = item.smallCoolersIn - item.smallCoolersOut;
                return (
                  <tr key={`${item.date}-${item.driverName}`} className="border-b border-slate-100">
                    <td className="p-2 font-semibold">{item.date}</td>
                    <td className="p-2">{item.driverName}</td>
                    <td className="p-2 text-center">
                      <span className="text-green-600 font-semibold">+{item.largeCoolersIn}</span> /{' '}
                      <span className="text-red-600 font-semibold">-{item.largeCoolersOut}</span>
                    </td>
                    <td className="p-2 text-center">
                      <span className="text-green-600 font-semibold">+{item.smallCoolersIn}</span> /{' '}
                      <span className="text-red-600 font-semibold">-{item.smallCoolersOut}</span>
                    </td>
                    <td className="p-2 text-center font-bold">
                      <span className={largeBalance < 0 ? 'text-red-600' : 'text-slate-700'}>
                        {largeBalance}
                      </span>{' '}
                      /{' '}
                      <span className={smallBalance < 0 ? 'text-red-600' : 'text-slate-700'}>
                        {smallBalance}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const OverdueAssetsView = ({ assets }) => {
  const calculateDaysOut = (date) =>
    ((new Date() - new Date(date)) / (1000 * 60 * 60 * 24)).toFixed(1);
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-red-500">
      <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
        <AlertTriangle /> Overdue Assets Alert ({assets.length})
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        The following assets have been 'On Mission' for more than {OVERDUE_THRESHOLD_HOURS} hours.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-red-50">
            <tr className="border-b-2 border-red-200">
              <th className="p-2 text-left font-semibold text-red-700">Barcode</th>
              <th className="p-2 text-left font-semibold text-red-700">Driver Name</th>
              <th className="p-2 text-left font-semibold text-red-700">Date Dispatched</th>
              <th className="p-2 text-center font-semibold text-red-700">Days Out</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-8 text-slate-500">
                  No overdue assets. Great job!
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.barcode} className="border-b border-red-100">
                  <td className="p-2 font-mono">{asset.barcode}</td>
                  <td className="p-2">{asset.currentLocation?.actualDriverName || 'N/A'}</td>
                  <td className="p-2">{new Date(asset.updatedAt).toLocaleDateString('en-GB')}</td>
                  <td className="p-2 text-center font-bold text-red-600">
                    {calculateDaysOut(asset.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const GroupedDashboardView = ({ groupedAssets }) => {
  const [openDate, setOpenDate] = useState(groupedAssets[0]?.date || null);
  const toggleDate = (date) => setOpenDate((prevDate) => (prevDate === date ? null : date));
  if (groupedAssets.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-xl shadow-sm border">
        <Package size={40} className="mx-auto text-slate-400 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">All assets are in the warehouse.</h3>
        <p className="text-slate-500">No assets are currently on mission.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {groupedAssets.map(({ date, missions, totalAssets }) => (
        <div
          key={date}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <button
            onClick={() => toggleDate(date)}
            className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100"
          >
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-slate-800">
                {new Date(date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                {totalAssets} Assets
              </span>
            </div>
            {openDate === date ? (
              <ChevronDown className="text-slate-500" />
            ) : (
              <ChevronRight className="text-slate-500" />
            )}
          </button>
          {openDate === date && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {missions.map(({ missionId, driver, time, assets }) => (
                <div key={missionId} className="bg-slate-50 rounded-lg border p-3">
                  <div className="font-semibold text-slate-700 mb-2 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <User size={14} className="inline" />
                      {driver}
                    </span>
                    <span className="bg-white text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border">
                      {time}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {assets.map((asset) => (
                      <span
                        key={asset.barcode}
                        className="bg-white text-slate-800 font-mono text-xs px-2 py-1 rounded border border-slate-200"
                      >
                        {asset.barcode}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
const AssetListView = ({ title, assets }) => {
  const handleExport = () => {
    const dataToExport = assets.map((asset) => ({
      Barcode: asset.barcode,
      'Last Status': asset.status,
      'Last Update': new Date(asset.updatedAt).toLocaleString('en-GB'),
    }));
    exportStyledExcelReport(dataToExport, title.replace(/ /g, '_').toLowerCase());
  };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="p-2 text-left font-semibold text-slate-600">Barcode</th>
              <th className="p-2 text-left font-semibold text-slate-600">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan="2" className="text-center p-8 text-slate-500">
                  No assets with this status.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.barcode} className="border-b border-slate-100">
                  <td className="p-2 font-mono">{asset.barcode}</td>
                  <td className="p-2 text-slate-600">
                    {new Date(asset.updatedAt).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const DriverSnapshotView = ({ driverSnapshots }) => {
  return (
    <div className="space-y-6">
      {driverSnapshots.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl shadow-sm border">
          <Users size={40} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-bold text-slate-700">
            No drivers are currently on a mission.
          </h3>
        </div>
      ) : (
        driverSnapshots.map(({ driver, totalAssets, missions }) => (
          <div
            key={driver}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <User /> {driver}
              </h3>
              <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                {totalAssets} Total Assets
              </span>
            </div>
            <div className="p-4 space-y-3">
              {missions.map(({ missionId, time, vehicle, assets }) => (
                <div key={missionId} className="bg-slate-100 rounded-lg p-3">
                  <div className="font-semibold text-slate-600 text-sm mb-2 flex justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <Car size={14} /> {vehicle || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Package size={14} /> {assets.length} Assets
                      </span>
                    </div>
                    <span className="bg-white text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border">
                      {time}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assets.map((asset) => (
                      <span
                        key={asset.barcode}
                        className="bg-white text-slate-800 font-mono text-xs px-2 py-1 rounded border border-slate-200"
                      >
                        {asset.barcode}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
const FilterControls = ({
  searchDriver,
  setSearchDriver,
  searchVehicle,
  setSearchVehicle,
  searchStartDate,
  setSearchStartDate,
  searchEndDate,
  setSearchEndDate,
}) => {
  const clearFilters = () => {
    setSearchDriver('');
    setSearchVehicle('');
    setSearchStartDate('');
    setSearchEndDate('');
  };
  return (
    <div className="p-4 bg-white border rounded-xl mb-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1">
            Search by Driver
          </label>
          <input
            type="text"
            placeholder="Enter driver name..."
            value={searchDriver}
            onChange={(e) => setSearchDriver(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 text-sm rounded-md"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-1">
            Search by Vehicle
          </label>
          <input
            type="text"
            placeholder="Enter vehicle number..."
            value={searchVehicle}
            onChange={(e) => setSearchVehicle(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 text-sm rounded-md"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1">From Date</label>
            <input
              type="date"
              value={searchStartDate}
              onChange={(e) => setSearchStartDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 text-sm rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1">To Date</label>
            <input
              type="date"
              value={searchEndDate}
              onChange={(e) => setSearchEndDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 text-sm rounded-md"
            />
          </div>
        </div>
        <div>
          <button
            onClick={clearFilters}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-200"
          >
            <XCircle size={16} /> Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
};
const BrokenAssetsView = ({ assets }) => {
  const handleExport = () => {
    const dataToExport = assets.map((asset) => {
      const brokenEvent = asset.history?.find(
        (h) => h.eventType.includes('Broken') || h.status === 'Broken'
      );
      let context = 'N/A';

      if (asset.wasReplaced) {
        context = 'Replaced in System';
      } else if (asset.contextEvent) {
        if (asset.contextEvent.eventType === 'Dispatched') {
          context = `On Mission with: ${asset.contextEvent.driverName || 'N/A'}`;
        } else if (
          asset.contextEvent.eventType.includes('Returned') ||
          asset.contextEvent.eventType.includes('Received') ||
          asset.contextEvent.eventType.includes('Created')
        ) {
          context = 'Reported from Warehouse';
        }
      }

      return {
        Barcode: asset.barcode,
        'Date Reported': new Date(asset.updatedAt).toLocaleString('en-GB'),
        Context: context,
        Notes: brokenEvent?.notes || '',
      };
    });
    exportStyledExcelReport(dataToExport, 'broken_assets_report');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Wrench /> Broken Assets Report ({assets.length})
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b-2 border-slate-200">
              <th className="p-2 text-left font-semibold text-slate-600">Barcode</th>
              <th className="p-2 text-left font-semibold text-slate-600">Date Reported</th>
              <th className="p-2 text-left font-semibold text-slate-600">Context</th>
              <th className="p-2 text-left font-semibold text-slate-600">Notes</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-8 text-slate-500">
                  No broken assets found.
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const brokenEvent = asset.history?.find(
                  (h) => h.eventType.includes('Broken') || h.status === 'Broken'
                );

                let contextRender;
                if (asset.wasReplaced) {
                  contextRender = (
                    <span className="font-semibold text-gray-700 flex items-center gap-2">
                      <History size={14} /> Replaced in System
                    </span>
                  );
                } else if (asset.contextEvent) {
                  if (asset.contextEvent.eventType === 'Dispatched') {
                    contextRender = (
                      <div>
                        <p>
                          <User size={12} className="inline mr-1" />{' '}
                          {asset.contextEvent.driverName || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500">
                          <Car size={12} className="inline mr-1" />{' '}
                          {asset.contextEvent.vehicleNumber || 'N/A'}
                        </p>
                      </div>
                    );
                  } else {
                    contextRender = (
                      <span className="text-gray-700 flex items-center gap-2">
                        <Warehouse size={14} /> Reported from Warehouse
                      </span>
                    );
                  }
                } else {
                  contextRender = <span className="text-slate-400">N/A</span>;
                }

                return (
                  <tr key={asset.barcode} className="border-b border-slate-100">
                    <td className="p-2 font-mono">{asset.barcode}</td>
                    <td className="p-2">{new Date(asset.updatedAt).toLocaleString('en-GB')}</td>
                    <td className="p-2">{contextRender}</td>
                    <td className="p-2 text-xs text-slate-600 italic">{brokenEvent?.notes}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ====================================================================================
// MAIN COMPONENT
// ====================================================================================
export default function AdminBoxInventoryNew() {
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user')) : null;
  const [assetData, setAssetData] = useState([]);
  const [history, setHistory] = useState([]);
  const [quantitativeMovements, setQuantitativeMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [searchDriver, setSearchDriver] = useState('');
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assetsRes, historyRes, quantRes] = await Promise.all([
        fetch(`${API_URL}/api/assets`),
        fetch(`${API_URL}/api/assets/history?limit=15`),
        fetch(`${API_URL}/api/quantitatives`),
      ]);
      if (assetsRes.ok) {
        const assets = await assetsRes.json();
        setAssetData(assets);
      } else {
        throw new Error('Failed to load asset data');
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }
      if (quantRes.ok) {
        const quantData = await quantRes.json();
        setQuantitativeMovements(quantData);
      }
    } catch (err) {
      toast.error('Failed to load some data', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

// --- CORRECTED LOGIC: Function to handle the custom report generation ---
  const handleGenerateCustomReport = (startDate, endDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const driverDaySummary = new Map();

    quantitativeMovements.forEach((move) => {
      if (move.createdAt) {
        const moveDate = new Date(move.createdAt);
        if (!isNaN(moveDate) && moveDate >= start && moveDate <= end) {
          const dateStr = moveDate.toISOString().split('T')[0];
          const driver = move.driverName || 'Unknown Driver';
          const key = `${driver}|${dateStr}`;
          
          if (!driverDaySummary.has(key)) {
            driverDaySummary.set(key, {
              date: dateStr,
              driverName: driver,
              barcodes: [],
              largeCoolersOut: 0,
              largeCoolersIn: 0,
              smallCoolersOut: 0,
              smallCoolersIn: 0,
            });
          }
          
          const summary = driverDaySummary.get(key);
          if (move.transactionType === 'outgoing') {
            summary.largeCoolersOut += move.largeCoolers;
            summary.smallCoolersOut += move.smallCoolers;
          } else {
            summary.largeCoolersIn += move.largeCoolers;
            summary.smallCoolersIn += move.smallCoolers;
          }
        }
      }
    });

    assetData.forEach((asset) => {
      const dispatchTimestamp = asset.currentLocation?.dispatchedAt || asset.updatedAt;

      if (asset.status === 'On Mission' && dispatchTimestamp) {
          const dispatchTime = new Date(dispatchTimestamp);
          
          if (!isNaN(dispatchTime) && dispatchTime >= start && dispatchTime <= end) {
              const dateStr = dispatchTime.toISOString().split('T')[0];
              const driver = asset.currentLocation.actualDriverName || 'Unknown Driver';
              const key = `${driver}|${dateStr}`;

              if (!driverDaySummary.has(key)) {
                   driverDaySummary.set(key, {
                      date: dateStr,
                      driverName: driver,
                      barcodes: [],
                      largeCoolersOut: 0,
                      largeCoolersIn: 0,
                      smallCoolersOut: 0,
                      smallCoolersIn: 0,
                  });
              }
              
              const summary = driverDaySummary.get(key);
              summary.barcodes.push(asset.barcode);
          }
      }
    });
    
    // --- תוספת: הוספת 4 יחידות קרח לכל צידנית שיוצאת ---
    driverDaySummary.forEach((summary) => {
        // נוסיף את הקרח המחושב לכמות הקרח שכבר נרשמה ידנית
        summary.smallCoolersOut += (summary.largeCoolersOut * 4);
    });

    // --- מיפוי הנתונים לעברית עם מבנה מדויק ---
    const reportData = Array.from(driverDaySummary.values()).map(summary => ({
        'תאריך': summary.date,
        'שם נהג': summary.driverName,
        'כמות שיצאו': summary.barcodes.length,
        'מספרי קופסאות': summary.barcodes.join(', '),
        'צידניות שיצאו': summary.largeCoolersOut,
        'צידניות שחזרו': summary.largeCoolersIn,
        'קרח שיצא': summary.smallCoolersOut,
        'קרח שחזר': summary.smallCoolersIn,
    })).sort((a,b) => new Date(b['תאריך']) - new Date(a['תאריך']) || a['שם נהג'].localeCompare(b['שם נהג']));


    if (reportData.length === 0) {
        toast.error('לא נמצאו נתונים עבור טווח התאריכים שנבחר.');
        return;
    }

    // קריאה לפונקציית הייצוא המעוצבת
    exportStyledExcelReport(reportData, 'custom_report');
  };

  const { brokenAssets, lostAssets, overdueAssets, groupedOnMissionAssets, driverSnapshots } =
    useMemo(() => {
      if (!assetData)
        return {
          brokenAssets: [],
          lostAssets: [],
          overdueAssets: [],
          groupedOnMissionAssets: [],
          driverSnapshots: [],
        };
      const broken = [],
        lost = [],
        onMission = [];
      const now = new Date();
      assetData.forEach((asset) => {
        if (asset.status === 'Broken') broken.push(asset);
        if (asset.status === 'Lost') lost.push(asset);
        if (asset.status === 'On Mission') onMission.push(asset);
      });
      const filteredOnMission = onMission.filter((asset) => {
        const driverName = asset.currentLocation?.actualDriverName || '';
        const vehicleNumber = asset.currentLocation?.vehicleNumber || '';
        const dispatchTime = new Date(asset.currentLocation?.dispatchedAt || asset.updatedAt);
        const driverMatch = searchDriver
          ? driverName.toLowerCase().includes(searchDriver.toLowerCase())
          : true;
        const vehicleMatch = searchVehicle
          ? vehicleNumber.toLowerCase().includes(searchVehicle.toLowerCase())
          : true;
        const start = searchStartDate ? new Date(searchStartDate) : null;
        const end = searchEndDate ? new Date(searchEndDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        const dateMatch = (!start || dispatchTime >= start) && (!end || dispatchTime <= end);
        return driverMatch && vehicleMatch && dateMatch;
      });
      const overdue = filteredOnMission.filter((asset) => {
        const dispatchTime = asset.currentLocation?.dispatchedAt || asset.updatedAt;
        const hoursOut = (now - new Date(dispatchTime)) / (1000 * 60 * 60);
        return hoursOut > OVERDUE_THRESHOLD_HOURS;
      });
      const missions = filteredOnMission.reduce((acc, asset) => {
        const dispatchTime = new Date(asset.currentLocation?.dispatchedAt || asset.updatedAt);
        const date = dispatchTime.toISOString().slice(0, 10);
        const driver = asset.currentLocation?.actualDriverName || 'Unknown Driver';
        const missionId = asset.currentLocation?.missionId || `${driver}-${date}`;
        if (!acc[missionId]) {
          acc[missionId] = {
            missionId,
            driver,
            date,
            time: dispatchTime.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            vehicle: asset.currentLocation?.vehicleNumber,
            assets: [],
          };
        }
        acc[missionId].assets.push(asset);
        return acc;
      }, {});
      const dailyGroups = Object.values(missions).reduce((acc, mission) => {
        const date = mission.date;
        if (!acc[date]) {
          acc[date] = { date: date, missions: [], totalAssets: 0 };
        }
        acc[date].missions.push(mission);
        acc[date].totalAssets += mission.assets.length;
        acc[date].missions.sort((a, b) => b.time.localeCompare(a.time));
        return acc;
      }, {});
      const groupedArray = Object.values(dailyGroups).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      const driverGroups = Object.values(missions).reduce((acc, mission) => {
        const driver = mission.driver;
        if (!acc[driver]) {
          acc[driver] = { driver: driver, missions: [], totalAssets: 0 };
        }
        acc[driver].missions.push(mission);
        acc[driver].totalAssets += mission.assets.length;
        acc[driver].missions.sort((a, b) => b.time.localeCompare(a.time));
        return acc;
      }, {});
      const driverSnapshotsArray = Object.values(driverGroups).sort(
        (a, b) => b.totalAssets - a.totalAssets
      );
      return {
        brokenAssets: broken.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        lostAssets: lost,
        overdueAssets: overdue,
        groupedOnMissionAssets: groupedArray,
        driverSnapshots: driverSnapshotsArray,
      };
    }, [assetData, searchDriver, searchVehicle, searchStartDate, searchEndDate]);

  return (
    <div className="min-h-screen bg-slate-100">
      <Toaster position="top-center" />
      <Header user={user} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  Asset Inventory Dashboard
                </h1>
                <p className="text-slate-500">Live status of all tracked assets.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold shadow hover:bg-green-700"
                >
                  <FileSpreadsheet size={16} /> Generate Report
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700"
                >
                  <Edit size={16} /> Manage Asset
                </button>
              </div>
            </div>

            <div className="flex items-center border-b border-slate-200 mb-6 bg-white rounded-t-lg px-2 overflow-x-auto">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${viewMode === 'dashboard' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setViewMode('driverSnapshot')}
                className={`px-4 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${viewMode === 'driverSnapshot' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <div className="flex items-center gap-2">
                  <Users size={14} /> Drivers Status
                </div>
              </button>
              <button
                onClick={() => setViewMode('overdue')}
                className={`px-4 py-3 font-semibold text-sm relative transition-colors whitespace-nowrap ${viewMode === 'overdue' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} /> Overdue Assets
                  {overdueAssets.length > 0 && (
                    <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                      {overdueAssets.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setViewMode('quantitative')}
                className={`px-4 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${viewMode === 'quantitative' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Coolers & Ice
              </button>
              <button
                onClick={() => setViewMode('brokenAssets')}
                className={`px-4 py-3 font-semibold text-sm relative transition-colors whitespace-nowrap ${viewMode === 'brokenAssets' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Broken ({brokenAssets.length})
              </button>
              <button
                onClick={() => setViewMode('lostAssets')}
                className={`px-4 py-3 font-semibold text-sm relative transition-colors whitespace-nowrap ${viewMode === 'lostAssets' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Lost ({lostAssets.length})
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-4 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${viewMode === 'history' ? 'border-b-2 border-green-600 text-green-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Recent Activity
              </button>
            </div>

            {(viewMode === 'dashboard' || viewMode === 'driverSnapshot') && (
              <FilterControls
                searchDriver={searchDriver}
                setSearchDriver={setSearchDriver}
                searchVehicle={searchVehicle}
                setSearchVehicle={setSearchVehicle}
                searchStartDate={searchStartDate}
                setSearchStartDate={setSearchStartDate}
                searchEndDate={searchEndDate}
                setSearchEndDate={setSearchEndDate}
              />
            )}

            {isLoading ? (
              <div className="text-center p-12">
                <Loader2 className="animate-spin inline-block w-8 h-8 text-blue-600" />
              </div>
            ) : (
              <>
                {viewMode === 'dashboard' && (
                  <GroupedDashboardView groupedAssets={groupedOnMissionAssets} />
                )}
                {viewMode === 'driverSnapshot' && (
                  <DriverSnapshotView driverSnapshots={driverSnapshots} />
                )}
                {viewMode === 'overdue' && <OverdueAssetsView assets={overdueAssets} />}
                {viewMode === 'quantitative' && (
                  <QuantitativeReportView movements={quantitativeMovements} />
                )}
                {viewMode === 'brokenAssets' && <BrokenAssetsView assets={brokenAssets} />}
                {viewMode === 'lostAssets' && (
                  <AssetListView title="Lost Assets Report" assets={lostAssets} />
                )}
                {viewMode === 'history' && <HistoryView history={history} />}
              </>
            )}
          </div>
        </main>
      </div>
      {isEditModalOpen && (
        <EditAssetModal onClose={() => setIsEditModalOpen(false)} onAssetUpdate={fetchAllData} />
      )}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onGenerate={handleGenerateCustomReport}
      />
    </div>
  );
}