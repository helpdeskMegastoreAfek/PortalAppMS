'use client';
import toast, { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import {
  Package,
  Thermometer,
  Plus,
  Minus,
  Save,
  Barcode,
  ArrowUp,
  ArrowDown,
  X,
  Car,
  PlusCircle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

// Initial list of vehicle numbers
const vehicleNumbers = [
  '200-39-201',
  '879-04-501',
  '595-54-901',
  '534-76-202',
  '97-733-31',
  '217-03-901',
  '685-24-602',
  '764-56-601',
  '33-846-33',
  '33-578-66',
  '41-825-62',
  '80-878-37',
  '38-208-62',
  '64-755-58',
];

const inventoryItems = [
  { id: 'boxes', name: 'Boxes', icon: <Package className="w-5 h-5 text-blue-500" /> },
  {
    id: 'largeCoolers',
    name: 'Large Coolers',
    icon: <Thermometer className="w-5 h-5 text-green-500" />,
  },
  {
    id: 'smallCoolers',
    name: 'Small Coolers',
    icon: <Thermometer className="w-5 h-5 text-purple-500" />,
  },
];

// Custom Hook to persist state in localStorage across page reloads
function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    if (typeof window !== 'undefined') {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue];
}

export default function BoxInventory() {
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user')) : null;

  // Persistent states
  const [inventory, setInventory] = useStickyState(
    { boxes: 0, largeCoolers: 0, smallCoolers: 0 },
    'inventoryState_EN_v2'
  );
  const [vehicleNumber, setVehicleNumber] = useStickyState('', 'vehicleNumberState_EN_v2');
  const [scannedItems, setScannedItems] = useStickyState([], 'scannedItemsState_EN_v2');
  const [transactionType, setTransactionType] = useStickyState(
    'incoming',
    'transactionTypeState_EN_v2'
  );

  // Component UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isAddingNewVehicle, setIsAddingNewVehicle] = useState(false);

  // Handler for the vehicle dropdown
  const handleVehicleChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'addNew') {
      setIsAddingNewVehicle(true);
      setVehicleNumber(''); // Reset the number for new input
    } else {
      setIsAddingNewVehicle(false);
      setVehicleNumber(selectedValue);
    }
  };

  const updateInventory = (id, value) => {
    // If the input is empty, store an empty string in the state
    if (value === '') {
      setInventory((prev) => ({ ...prev, [id]: '' }));
    } else {
      // Otherwise, parse the number
      const num = parseInt(value, 10);
      // Update state only if it's a valid, non-negative number
      if (!isNaN(num)) {
        setInventory((prev) => ({ ...prev, [id]: Math.max(0, num) }));
      }
    }
  };

  // CHANGED: This function now correctly handles cases where the state might be an empty string.
  const adjustInventory = (id, delta) =>
    setInventory((prev) => ({
      ...prev,
      // Convert the current value to a number ('' becomes 0) before calculating
      [id]: Math.max(0, (Number(prev[id]) || 0) + delta),
    }));

  const handleBarcodeScan = (e) => {
    if (e) e.preventDefault();
    const trimmedBarcode = scannedBarcode.trim();
    if (!trimmedBarcode) return;
    if (scannedItems.includes(trimmedBarcode)) {
      toast.error('This barcode has already been scanned.');
    } else {
      toast.success('Box added!');
      setScannedItems((prev) => [...prev, trimmedBarcode]);
      adjustInventory('boxes', 1);
    }
    setScannedBarcode('');
  };

  const removeScannedItem = (barcodeToRemove) => {
    if (scannedItems.includes(barcodeToRemove)) {
      setScannedItems((prev) => prev.filter((b) => b !== barcodeToRemove));
      adjustInventory('boxes', -1);
      toast.success('Box removed!');
    }
  };

  const handleSubmit = async () => {
    if (!vehicleNumber.trim()) {
      toast.error('Please select or enter a vehicle number.');
      return;
    }

    setIsSubmitting(true);

    await toast.promise(
      fetch(`${API_URL}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory,
          username: user?.username,
          vehicleNumber: vehicleNumber,
          transactionType: transactionType,
          scannedBarcodes: scannedItems,
        }),
      }).then((res) => {
        if (!res.ok) throw new Error('Failed to submit data');
        return res.json();
      }),
      {
        loading: 'Saving data...',
        success: 'Update saved successfully!',
        error: 'Error saving data.',
      }
    );

    // Reset all states (which also clears localStorage via the hook)
    setInventory({ boxes: 0, largeCoolers: 0, smallCoolers: 0 });
    setVehicleNumber('');
    setScannedItems([]);
    setTransactionType('incoming');
    setIsAddingNewVehicle(false);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Box Inventory</h1>
              <p className="text-gray-600 mb-6">First, select the transaction type below.</p>

              {/* --- Transaction Type Buttons MOVED HERE --- */}
              <div className="max-w-sm mx-auto">
                <div className="flex rounded-md shadow-sm">
                  <button
                    onClick={() => setTransactionType('incoming')}
                    className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold border rounded-l-md transition-colors ${transactionType === 'incoming' ? 'bg-blue-600 text-white  border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    <ArrowDown className="w-5 h-5 mr-2" /> Incoming
                  </button>
                  <button
                    onClick={() => setTransactionType('outgoing')}
                    className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold border rounded-r-md transition-colors -ml-px ${transactionType === 'outgoing' ? 'bg-red-600 text-white  border-red-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    <ArrowUp className="w-5 h-5 mr-2 " /> Outgoing
                  </button>
                </div>
              </div>
            </div>
            <Toaster position="top-center" />

            <div className="space-y-6">
              {/* Card 1: Vehicle Selection (Transaction Type removed) */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div>
                  <label
                    htmlFor="vehicleNumber"
                    className="flex items-center text-sm font-medium text-gray-700 mb-1"
                  >
                    <Car className="w-4 h-4 mr-2 text-gray-400" />
                    Vehicle Number
                  </label>
                  <select
                    id="vehicleNumber"
                    value={isAddingNewVehicle ? 'addNew' : vehicleNumber}
                    onChange={handleVehicleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="" disabled>
                      Select from list...
                    </option>
                    {vehicleNumbers.map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                    <option value="addNew" className="font-bold text-blue-600">
                      Add new vehicle...
                    </option>
                  </select>

                  {isAddingNewVehicle && (
                    <div className="relative mt-3">
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="Enter new vehicle number"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <PlusCircle className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Barcode Scanner (No changes) */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <label
                  htmlFor="barcode-scanner"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Scan Barcode (for Boxes)
                </label>
                <form onSubmit={handleBarcodeScan} className="flex items-center gap-2">
                  <Barcode className="text-gray-400" />
                  <input
                    id="barcode-scanner"
                    type="text"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    placeholder="Enter or scan barcode..."
                    className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 text-sm font-semibold"
                  >
                    Add
                  </button>
                </form>
                {scannedItems.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                      Scanned Boxes ({scannedItems.length})
                    </h4>
                    <ul className="border rounded-md max-h-36 overflow-y-auto">
                      {scannedItems.map((barcode, index) => (
                        <li
                          key={barcode}
                          className={`p-2 flex justify-between items-center text-sm ${index > 0 ? 'border-t' : ''}`}
                        >
                          <span className="font-mono text-gray-800">{barcode}</span>
                          <button
                            onClick={() => removeScannedItem(barcode)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Card 3: Inventory Items (No changes) */}
              <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
                {inventoryItems.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center gap-3 mb-2">
                      {item.icon} <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => adjustInventory(item.id, -1)}
                        disabled={inventory[item.id] === 0}
                        className="px-3 h-12 border border-r-0 rounded-l-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={inventory[item.id]}
                        onChange={(e) => updateInventory(item.id, e.target.value)}
                        className="w-full h-12 border-t border-b text-center text-xl font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 "
                      />
                      <button
                        onClick={() => adjustInventory(item.id, 1)}
                        className="px-3 h-12 border border-l-0 rounded-r-md bg-gray-50 hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Button (No changes) */}
              <div className="pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !vehicleNumber.trim()}
                  className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all ${
                    isSubmitting || !vehicleNumber.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
