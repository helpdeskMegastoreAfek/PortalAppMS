'use client';

import { useEffect, useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Package, Thermometer, TrendingUp, TrendingDown, Users, Download, Car, ChevronDown, ChevronUp, Edit, Search, Trash2, FileSpreadsheet, Calendar, PlusCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminBoxInventory() {
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user')) : null;
  const [inventoryData, setInventoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for filters, search, and dates
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // State for the edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // State for Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/inventory`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        const formatted = data.map((item) => ({
          id: item._id, user: item.username || 'Unknown', vehicleNumber: item.vehicleNumber || 'Unassigned',
          transactionType: item.transactionType || 'unknown', notes: item.notes || '',
          scannedCount: item.scannedBarcodes ? item.scannedBarcodes.length : 0,
          scannedBarcodes: item.scannedBarcodes || [], boxes: item.boxes, largeCoolers: item.largeCoolers,
          smallCoolers: item.smallCoolers, lastUpdated: new Date(item.updatedAt),
          totalItems: item.boxes + item.largeCoolers + item.smallCoolers,
        }));
        const sortedData = formatted.sort((a, b) => b.lastUpdated - a.lastUpdated);
        setInventoryData(sortedData);
      } catch (err) {
        toast.error('Failed to load inventory data',err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // Handlers for Edit Modal, Update, Delete, and Barcode Updates
  const handleOpenEditModal = (item) => { setEditingItem(item); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingItem(null); };

  const handleUpdateInventory = async (updates) => {
    if (!editingItem) return;
    await toast.promise(
        fetch(`${API_URL}/api/inventory/${editingItem.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
        }).then(async (res) => {
            if (!res.ok) throw new Error('Failed to update');
            const updatedDataFromServer = await res.json();
            const fullyUpdatedItem = {
              ...editingItem, ...updatedDataFromServer,
              totalItems: updatedDataFromServer.boxes + updatedDataFromServer.largeCoolers + updatedDataFromServer.smallCoolers,
              lastUpdated: new Date(updatedDataFromServer.updatedAt),
            };
            return fullyUpdatedItem;
        }),
        {
            loading: 'Updating transaction...',
            success: (updatedItem) => {
                setInventoryData(prevData => prevData.map(item => (item.id === editingItem.id ? updatedItem : item)));
                handleCloseModal();
                return 'Update successful!';
            },
            error: (err) => `Update failed: ${err.message}`,
        }
    );
  };
  
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) return;
    await toast.promise(
        fetch(`${API_URL}/api/inventory/${itemId}`, { method: 'DELETE' }).then(res => {
            if (!res.ok) throw new Error('Failed to delete');
            return res.json();
        }),
        {
            loading: 'Deleting...',
            success: () => {
                setInventoryData(prevData => prevData.filter(item => item.id !== itemId));
                return 'Transaction deleted successfully!';
            },
            error: 'Deletion failed!',
        }
    );
  };
  
  const handleUpdateBarcodes = async (itemId, newBarcodes) => {
    await toast.promise(
        fetch(`${API_URL}/api/inventory/${itemId}/barcodes`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ barcodes: newBarcodes }),
        }).then(async (res) => {
            if (!res.ok) throw new Error('Failed to update barcodes');
            return await res.json();
        }),
        {
            loading: 'Saving barcodes...',
            success: (updatedDataFromServer) => {
                const originalItem = inventoryData.find(i => i.id === itemId);
                const fullyUpdatedItem = {
                  ...originalItem, ...updatedDataFromServer,
                  totalItems: updatedDataFromServer.boxes + updatedDataFromServer.largeCoolers + updatedDataFromServer.smallCoolers,
                  scannedCount: updatedDataFromServer.scannedBarcodes.length,
                  lastUpdated: new Date(updatedDataFromServer.updatedAt),
                };
                setInventoryData(prevData => prevData.map(item => (item.id === itemId ? fullyUpdatedItem : item)));
                return 'Barcodes updated successfully!';
            },
            error: (err) => `Update failed: ${err.message}`,
        }
    );
  };
  
  // Calculation and Filtering logic
  const vehicleTotals = useMemo(() => {
    return inventoryData.reduce((acc, item) => {
      const vehicle = item.vehicleNumber;
      if (!acc[vehicle]) { acc[vehicle] = { boxes: 0, largeCoolers: 0, smallCoolers: 0, totalItems: 0 }; }
      const multiplier = item.transactionType === 'incoming' ? 1 : -1;
      acc[vehicle].boxes += item.boxes * multiplier;
      acc[vehicle].largeCoolers += item.largeCoolers * multiplier;
      acc[vehicle].smallCoolers += item.smallCoolers * multiplier;
      acc[vehicle].totalItems += item.totalItems * multiplier;
      return acc;
    }, {});
  }, [inventoryData]);

  const filteredData = useMemo(() => {
    setCurrentPage(1);
    return inventoryData.filter(item => {
      const userMatch = filterUser === 'all' || item.user === filterUser;
      const vehicleMatch = selectedVehicle === 'all' || item.vehicleNumber === selectedVehicle;
      const searchMatch = !searchQuery.trim() ? true :
        item.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const itemDate = new Date(item.lastUpdated); itemDate.setHours(0,0,0,0);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if(start) start.setHours(0,0,0,0);
      if(end) end.setHours(0,0,0,0);
      const dateMatch = (!start || itemDate >= start) && (!end || itemDate <= end);
        
      return userMatch && vehicleMatch && searchMatch && dateMatch;
    });
  }, [inventoryData, filterUser, selectedVehicle, searchQuery, startDate, endDate]);

  const globalTotal = useMemo(() => {
      const dataForTotals = filteredData;
      return dataForTotals.reduce((acc, item) => {
          const multiplier = item.transactionType === 'incoming' ? 1 : -1;
          acc.boxes += item.boxes * multiplier; acc.largeCoolers += item.largeCoolers * multiplier;
          acc.smallCoolers += item.smallCoolers * multiplier; acc.totalItems += item.totalItems * multiplier;
          return acc;
      }, { boxes: 0, largeCoolers: 0, smallCoolers: 0, totalItems: 0 });
  }, [filteredData]);

  const displayTotals = selectedVehicle === 'all' ? globalTotal : (vehicleTotals[selectedVehicle] || { boxes: 0, largeCoolers: 0, smallCoolers: 0, totalItems: 0 });

  // Pagination Logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // Export to Excel Function
  const exportToExcel = () => {
    toast.success('Generating Excel report...');
    const dataToExport = filteredData.map(item => ({
        'User': item.user, 'Transaction Type': item.transactionType, 'Vehicle Number': item.vehicleNumber,
        'Boxes': item.boxes, 'Large Coolers': item.largeCoolers, 'Small Coolers': item.smallCoolers,
        'Scanned Count': item.scannedCount, 'Date': item.lastUpdated.toLocaleDateString('en-CA'), 'Notes': item.notes,
        'Scanned Barcodes': item.scannedBarcodes.join(', '),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    const fileName = `inventory_report_${new Date().toISOString().slice(0,10)}.xlsx`;
    saveAs(blob, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Header user={user} />
      <Toaster position="top-center" />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Inventory Dashboard</h1>
                <p className="text-slate-500 mt-1">{selectedVehicle === 'all' ? 'Overall stock summary' : `Stock summary for vehicle: ${selectedVehicle}`}</p>
              </div>
              <button onClick={exportToExcel} className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50 transition-colors">
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export to Excel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SummaryCard label="Boxes in Stock" value={displayTotals.boxes} color="blue" icon={<Package />} />
              <SummaryCard label="Large Coolers" value={displayTotals.largeCoolers} color="green" icon={<Thermometer />} />
              <SummaryCard label="Small Coolers" value={displayTotals.smallCoolers} color="purple" icon={<Thermometer />} />
              <SummaryCard label="Total Items" value={displayTotals.totalItems} color="gray" icon={<Users />} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <h2 className="text-xl font-bold text-slate-800">Transaction Log</h2>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <div className="relative w-full sm:w-auto"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="w-4 h-4 text-slate-400" /></div><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full pl-9 pr-2 py-1.5 border border-slate-300 text-sm text-slate-600 rounded-md shadow-sm"/></div>
                  <div className="relative w-full sm:w-auto"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="w-4 h-4 text-slate-400" /></div><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full pl-9 pr-2 py-1.5 border border-slate-300 text-sm text-slate-600 rounded-md shadow-sm"/></div>
                  <div className="relative w-full sm:w-48"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-slate-400" /></div><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} className="px-3 py-1.5 border border-slate-300 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="all">All Vehicles</option>{Object.keys(vehicleTotals).sort().map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}</select>
                  <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="px-3 py-1.5 border border-slate-300 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="all">All Users</option>{[...new Set(inventoryData.map((item) => item.user))].sort().map((username) => <option key={username} value={username}>{username}</option>)}</select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <TableHeader title="User" /> 
                      <TableHeader title="Type" /> 
                      <TableHeader title="Vehicle" />
                      <TableHeader title="Boxes" /> 
                      <TableHeader title="Coolers (L/S)" /> 
                      <TableHeader title="Scanned" />
                      <TableHeader title="Date" /> 
                      <th className="w-28 text-center">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (<tr><td colSpan="8" className="text-center py-10 text-slate-500">Loading data...</td></tr>) : paginatedData.length > 0 ? (paginatedData.map((item) => <InventoryRow key={item.id} item={item} onEdit={() => handleOpenEditModal(item)} onDelete={() => handleDeleteItem(item.id)} onUpdateBarcodes={handleUpdateBarcodes} />)) : (<tr><td colSpan="8" className="text-center py-10 text-slate-500">No transactions found for the selected filters.</td></tr>)}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />)}
            </div>
          </div>
        </main>
      </div>
      {isModalOpen && <EditInventoryModal item={editingItem} onClose={handleCloseModal} onSave={handleUpdateInventory} />}
    </div>
  );
}

// --- Reusable Components ---

const SummaryCard = ({ label, value, color, icon }) => {
    const styles = { blue: { border: 'border-blue-500', iconBg: 'bg-blue-100', iconText: 'text-blue-600' }, green: { border: 'border-green-500', iconBg: 'bg-green-100', iconText: 'text-green-600' }, purple: { border: 'border-purple-500', iconBg: 'bg-purple-100', iconText: 'text-purple-600' }, gray: { border: 'border-slate-500', iconBg: 'bg-slate-100', iconText: 'text-slate-600' } };
    const style = styles[color] || styles.gray;
    return (<div className={`bg-white p-5 rounded-xl shadow-sm border ${style.border} border-l-4 transition-all hover:shadow-md hover:scale-[1.02]`}><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="text-3xl font-bold text-slate-800">{value}</p></div><div className={`p-3 rounded-full ${style.iconBg}`}>{icon && <icon.type className={`w-6 h-6 ${style.iconText}`} />}</div></div></div>);
};

const TableHeader = ({ title }) => (<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</th>);

const InventoryRow = ({ item, onEdit, onDelete, onUpdateBarcodes }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <>
      <tr className="border-b border-slate-200 last:border-b-0 even:bg-slate-50/50 hover:bg-slate-50">
        <td className="px-4 py-4 font-medium text-slate-800">{item.user}</td>
        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.transactionType === 'incoming' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.transactionType}</span></td>
        <td className="px-4 py-4 text-slate-500">{item.vehicleNumber}</td>
        <td className="px-4 py-4 text-slate-800 font-medium">{item.boxes}</td>
        <td className="px-4 py-4 text-slate-500">{item.largeCoolers} / {item.smallCoolers}</td>
        <td className="px-4 py-4 text-slate-500">{item.scannedCount}</td>
        <td className="px-4 py-4 text-slate-500">{item.lastUpdated.toLocaleDateString('en-CA')}</td>
        <td className="px-4 py-4 text-center"><div className="flex items-center justify-center gap-1"><button title="Edit Transaction" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full"><Edit size={16} /></button><button title="Delete Transaction" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button><button title="Show Details" onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-slate-500 hover:text-slate-800 rounded-full transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}}><ChevronDown size={16} /></button></div></td>
      </tr>
      {isExpanded && (<tr className="bg-slate-50/50"><td colSpan="8" className="p-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><BarcodeEditor barcodes={item.scannedBarcodes} scannedCount={item.scannedCount} onSave={(newBarcodes) => onUpdateBarcodes(item.id, newBarcodes)} /><div className="p-3 bg-slate-100 rounded-lg"><h4 className="text-sm font-semibold text-slate-700 mb-2">Notes:</h4><p className="text-xs text-slate-600 whitespace-pre-wrap">{item.notes || 'No notes for this transaction.'}</p></div></div></td></tr>)}
    </>
  );
};

const BarcodeEditor = ({ barcodes, scannedCount, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableBarcodes, setEditableBarcodes] = useState([...barcodes]);
    const handleBarcodeChange = (index, value) => { const newBarcodes = [...editableBarcodes]; newBarcodes[index] = value; setEditableBarcodes(newBarcodes); };
    const handleDeleteBarcode = (index) => { setEditableBarcodes(prev => prev.filter((_, i) => i !== index)); };
    const handleAddBarcode = () => { setEditableBarcodes(prev => [...prev, '']); };
    const handleSaveChanges = () => { const finalBarcodes = [...new Set(editableBarcodes.filter(b => b.trim() !== ''))]; onSave(finalBarcodes); setIsEditing(false); };
    const handleCancel = () => { setEditableBarcodes([...barcodes]); setIsEditing(false); };
    if (!isEditing) {
        return (<div className="p-3 bg-slate-100 rounded-lg"><div className="flex justify-between items-center mb-2"><h4 className="text-sm font-semibold text-slate-700">Scanned Barcodes ({scannedCount}):</h4><button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-blue-600 hover:underline">Edit Barcodes</button></div>{barcodes.length > 0 ? (<div className="flex flex-wrap gap-2">{barcodes.map(b => <span key={b} className="bg-slate-200 text-slate-700 text-xs font-mono px-2 py-1 rounded">{b}</span>)}</div>) : <p className="text-xs text-slate-500">No barcodes were scanned.</p>}</div>);
    }
    return (<div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><h4 className="text-sm font-semibold text-slate-700 mb-3">Editing Barcodes ({editableBarcodes.length}):</h4><div className="space-y-2 max-h-48 overflow-y-auto pr-2">{editableBarcodes.map((barcode, index) => (<div key={index} className="flex items-center gap-2"><input type="text" value={barcode} onChange={(e) => handleBarcodeChange(index, e.target.value)} className="flex-grow w-full px-2 py-1 border border-slate-300 rounded-md text-xs font-mono" /><button onClick={() => handleDeleteBarcode(index)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={14}/></button></div>))}</div><button onClick={handleAddBarcode} className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"><PlusCircle size={14} /> Add Barcode</button><div className="mt-4 flex justify-end gap-2 border-t border-blue-200 pt-3"><button onClick={handleCancel} className="px-3 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md">Cancel</button><button onClick={handleSaveChanges} className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md">Save Changes</button></div></div>);
};

const EditInventoryModal = ({ item, onClose, onSave }) => {
    const [formData, setFormData] = useState({ boxes: item.boxes, largeCoolers: item.largeCoolers, smallCoolers: item.smallCoolers, vehicleNumber: item.vehicleNumber, notes: item.notes || '' });
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); const numericData = { ...formData, boxes: Number(formData.boxes) || 0, largeCoolers: Number(formData.largeCoolers) || 0, smallCoolers: Number(formData.smallCoolers) || 0 }; onSave(numericData); };
    return (<div className="fixed inset-0 backdrop-blur-xs bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}><div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}><div className="p-6 border-b"><h3 className="text-xl font-bold text-slate-800">Edit Transaction</h3><p className="text-sm text-slate-500">Editing entry from {item.user} on {item.lastUpdated.toLocaleDateString()}</p></div><form onSubmit={handleSubmit}><div className="p-6 space-y-4"><div><label className="block text-sm font-medium text-slate-600 mb-1">Vehicle Number</label><input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /></div><div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-600 mb-1">Boxes</label><input type="number" name="boxes" value={formData.boxes} onChange={handleChange} className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" /></div><div><label className="block text-sm font-medium text-slate-600 mb-1">Large Coolers</label><input type="number" name="largeCoolers" value={formData.largeCoolers} onChange={handleChange} className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" /></div><div><label className="block text-sm font-medium text-slate-600 mb-1">Small Coolers</label><input type="number" name="smallCoolers" value={formData.smallCoolers} onChange={handleChange} className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" /></div></div><div><label className="block text-sm font-medium text-slate-600 mb-1">Notes</label><textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} placeholder="Add optional notes..." className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm"></textarea></div></div><div className="p-6 bg-slate-50 rounded-b-xl flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-md hover:bg-slate-50 font-semibold">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">Save Changes</button></div></form></div></div>);
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    return (
        <div className="mt-4 flex items-center justify-between">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 text-sm font-semibold border bg-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
            <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-semibold border bg-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
        </div>
    );
};