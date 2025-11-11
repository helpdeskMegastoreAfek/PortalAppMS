'use client';
import toast, { Toaster } from 'react-hot-toast';
import { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  User,
  Edit,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Replace,
  RefreshCw,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const vehicleNumbers = [
  'None',
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
  '24-663-59',
  'הוסף מספר רכב חדש...',
];

const driverNames = [
  'מוחמד מרסאת',
  'מוחמד סמאר',
  'מוחמד יאסין',
  'זידאן חנא',
  'מחמוד המבוזה',
  'מוחמד סועאד',
  'אחמד חמוד',
  'עראר סלים',
  'ויאם אבו אל היג׳א',
  'הוסף שם נהג חדש...',
];

const quantitativeItems = [
  {
    id: 'largeCoolers',
    name: 'צידניות גדולות',
    icon: <Thermometer className="w-5 h-5 text-green-500" />,
  },
  { id: 'smallCoolers', name: 'קרח', icon: <Thermometer className="w-5 h-5 text-purple-500" /> },
];

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

export default function BoxInventoryNew() {
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user')) : null;

  // States
  const [notes, setNotes] = useStickyState('', 'notesState_asset_v2');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [quantities, setQuantities] = useStickyState(
    { largeCoolers: 0, smallCoolers: 0 },
    'quantitiesState_asset_v2'
  );
  const [vehicleNumber, setVehicleNumber] = useStickyState('', 'vehicleNumberState_asset_v2');
  const [scannedItems, setScannedItems] = useStickyState([], 'scannedItemsState_asset_v3');
  const [brokenScannedItems, setBrokenScannedItems] = useStickyState(
    [],
    'brokenItemsState_asset_v3'
  );
  const [transactionType, setTransactionType] = useStickyState(
    'incoming',
    'transactionTypeState_asset_v2'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barcodeToAdd, setBarcodeToAdd] = useState('');
  const [brokenBarcodeToAdd, setBrokenBarcodeToAdd] = useState('');
  const [driverName, setDriverName] = useStickyState('', 'driverName_asset_v1');

  const [customVehicleNumber, setCustomVehicleNumber] = useState('');
  const [customDriverName, setCustomDriverName] = useState('');
  const [modeSelected, setModeSelected] = useState(false);

  // Modal and Correction States
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [itemToCorrect, setItemToCorrect] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('move_to_broken');
  const [replacementBarcode, setReplacementBarcode] = useState('');
  const [correctionsLog, setCorrectionsLog] = useStickyState([], 'correctionsLog_v1');

  const goodInputRef = useRef(null);
  const replacementInputRef = useRef(null);

  useEffect(() => {
    if (modeSelected) {
      goodInputRef.current?.focus();
    }
  }, [modeSelected]);
  useEffect(() => {
    if (isCorrectionModalOpen && correctionReason === 'replace') {
      setTimeout(() => replacementInputRef.current?.focus(), 100);
    }
  }, [isCorrectionModalOpen, correctionReason]);

  const openCorrectionModal = (barcode, currentStatus) => {
    setItemToCorrect({ barcode, currentStatus });
    setCorrectionReason(currentStatus === 'ok' ? 'move_to_broken' : 'move_to_ok');
    setIsCorrectionModalOpen(true);
  };

  const handleCorrectionSave = () => {
    if (!itemToCorrect) return;

    const { barcode: oldBarcode, currentStatus } = itemToCorrect;

    switch (correctionReason) {
      case 'replace': {
        const newBarcode = replacementBarcode.trim();
        if (!newBarcode) {
          toast.error('יש לסרוק ברקוד להחלפה.');
          return;
        }
        const isAlreadyScanned =
          scannedItems.some((item) => item.barcode === newBarcode) ||
          brokenScannedItems.some((item) => item.barcode === newBarcode);
        if (isAlreadyScanned) {
          toast.error('הברקוד החדש כבר קיים ברשימה.');
          return;
        }
        if (newBarcode === oldBarcode) {
          toast.error('הברקוד החדש זהה לישן.');
          return;
        }

        const newItem = { barcode: newBarcode, scannedAt: new Date().toISOString() };
        const oldItemObject = (currentStatus === 'ok' ? scannedItems : brokenScannedItems).find(
          (item) => item.barcode === oldBarcode
        ) || { barcode: oldBarcode, scannedAt: new Date().toISOString() };

        if (currentStatus === 'ok') {
          setScannedItems((prev) => prev.filter((item) => item.barcode !== oldBarcode));
        } else {
          setBrokenScannedItems((prev) => prev.filter((item) => item.barcode !== oldBarcode));
        }

        setBrokenScannedItems((prev) => {
          const listWithoutOld = prev.filter((item) => item.barcode !== oldBarcode);
          return [oldItemObject, ...listWithoutOld];
        });
        if (currentStatus === 'ok') {
          setScannedItems((prev) => [newItem, ...prev]);
        } else {
          setBrokenScannedItems((prev) => [
            newItem,
            ...prev.filter((item) => item.barcode !== oldBarcode),
          ]);
        }

        setCorrectionsLog((prev) => [
          ...prev,
          { oldBarcode, newBarcode, reason: 'replacement', timestamp: new Date() },
        ]);
        toast.success(`קופסה ${oldBarcode} הועברה לשבורות והוחלפה ב-${newBarcode}.`);
        break;
      }
      case 'move_to_broken': {
        const itemToMove = scannedItems.find((item) => item.barcode === oldBarcode);
        if (itemToMove) {
          setScannedItems((prev) => prev.filter((item) => item.barcode !== oldBarcode));
          setBrokenScannedItems((prev) => [itemToMove, ...prev]);
        }
        setCorrectionsLog((prev) => [
          ...prev,
          { oldBarcode, newBarcode: null, reason: 'marked_as_broken', timestamp: new Date() },
        ]);
        toast.success(`קופסה ${oldBarcode} הועברה לשבורות.`);
        break;
      }
      case 'move_to_ok': {
        const itemToMove = brokenScannedItems.find((item) => item.barcode === oldBarcode);
        if (itemToMove) {
          setBrokenScannedItems((prev) => prev.filter((item) => item.barcode !== oldBarcode));
          setScannedItems((prev) => [itemToMove, ...prev]);
        }
        setCorrectionsLog((prev) => [
          ...prev,
          { oldBarcode, newBarcode: null, reason: 'marked_as_ok', timestamp: new Date() },
        ]);
        toast.success(`קופסה ${oldBarcode} הועברה לתקינות.`);
        break;
      }
      default: {
        toast.error('פעולה לא ידועה.');
        return;
      }
    }
    setIsCorrectionModalOpen(false);
    setItemToCorrect(null);
    setReplacementBarcode('');
  };

  const handleAddGoodBarcode = () => {
    const trimmedBarcode = barcodeToAdd.trim();
    if (!trimmedBarcode) return;
    const isAlreadyScanned =
      scannedItems.some((item) => item.barcode === trimmedBarcode) ||
      brokenScannedItems.some((item) => item.barcode === trimmedBarcode);
    if (isAlreadyScanned) {
      toast.error('הברקוד הזה כבר נסרק.');
    } else {
      toast.success('קופסה תקינה נוספה!');
      const newItem = { barcode: trimmedBarcode, scannedAt: new Date().toISOString() };
      setScannedItems((prev) => [newItem, ...prev]);
      if (navigator.vibrate) navigator.vibrate(100);
    }
    setBarcodeToAdd('');
  };

  const handleAddBrokenBarcode = () => {
    const trimmedBarcode = brokenBarcodeToAdd.trim();
    if (!trimmedBarcode) return;
    const isAlreadyScanned =
      scannedItems.some((item) => item.barcode === trimmedBarcode) ||
      brokenScannedItems.some((item) => item.barcode === trimmedBarcode);
    if (isAlreadyScanned) {
      toast.error('הברקוד הזה כבר נסרק.');
    } else {
      toast.success('קופסה שבורה נוספה!');
      const newItem = { barcode: trimmedBarcode, scannedAt: new Date().toISOString() };
      setBrokenScannedItems((prev) => [newItem, ...prev]);
      if (navigator.vibrate) navigator.vibrate(100);
    }
    setBrokenBarcodeToAdd('');
  };

  const adjustQuantity = (id, delta) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (Number(prev[id]) || 0) + delta) }));

  const removeScannedItem = (barcodeToRemove) => {
    setScannedItems((prev) => prev.filter((item) => item.barcode !== barcodeToRemove));
    toast.success('הוסר מרשימת התקינות');
  };
  const removeBrokenScannedItem = (barcodeToRemove) => {
    setBrokenScannedItems((prev) => prev.filter((item) => item.barcode !== barcodeToRemove));
    toast.success('הוסר מרשימת השבורות');
  };

  const doReset = (resetMode = true) => {
    setQuantities({ largeCoolers: 0, smallCoolers: 0 });
    setVehicleNumber('');
    setScannedItems([]);
    setBrokenScannedItems([]);
    setNotes('');
    setDriverName('');
    setBarcodeToAdd('');
    setBrokenBarcodeToAdd('');
    setCorrectionsLog([]);
    setCustomVehicleNumber('');
    setCustomDriverName('');
    if (resetMode) {
      setModeSelected(false);
    } else {
      goodInputRef.current?.focus();
    }
  };

  const handleReset = () => {
    if (!isConfirmingReset) {
      setIsConfirmingReset(true);
      toast('לחץ שוב לאישור האיפוס.');
      setTimeout(() => setIsConfirmingReset(false), 3000);
      return;
    }
    doReset(false); // Reset form but stay in the current mode
    toast('הטופס נוקה!');
    setIsConfirmingReset(false);
  };

  const handleSubmit = async () => {
    if (!user || !user.username) {
      toast.error('שגיאה: עליך להיות מחובר כדי לשמור נתונים.');
      return;
    }
    const finalVehicleNumber =
      vehicleNumber === 'הוסף מספר רכב חדש...' ? customVehicleNumber.trim() : vehicleNumber.trim();
    const finalDriverName =
      driverName === 'הוסף שם נהג חדש...' ? customDriverName.trim() : driverName.trim();
    if (!finalVehicleNumber || finalVehicleNumber === 'None') {
      toast.error('יש לבחור או להזין מספר רכב.');
      return;
    }
    if (!finalDriverName) {
      toast.error('יש לבחור או להזין שם נהג.');
      return;
    }
    const hasScannableItems = scannedItems.length > 0 || brokenScannedItems.length > 0;
    const hasQuantitativeItems = Object.values(quantities).some((q) => Number(q) > 0);
    if (!hasScannableItems && !hasQuantitativeItems) {
      toast.error('לא נסרק או הוזן ציוד לשמירה.');
      return;
    }

    setIsSubmitting(true);
    const allPromises = [];

    if (scannedItems.length > 0) {
      allPromises.push(
        fetch(`${API_URL}/api/assets/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: scannedItems,
            transactionType,
            username: user.username,
            vehicleNumber: finalVehicleNumber,
            actualDriverName: finalDriverName,
            notes,
          }),
        }).then((res) => {
          if (!res.ok) throw new Error('שמירת קופסאות תקינות נכשלה');
          return res.json();
        })
      );
    }
    if (brokenScannedItems.length > 0) {
      brokenScannedItems.forEach((item) =>
        allPromises.push(
          fetch(`${API_URL}/api/assets/${item.barcode}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'Broken',
              notes: `דווח כשבור ע"י ${user.username} מרכב ${finalVehicleNumber}`,
              scannedAt: item.scannedAt,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error(`שגיאה בעדכון ברקוד שבור: ${item.barcode}`);
            return res.json();
          })
        )
      );
    }
    const replacedItems = correctionsLog.filter((log) => log.reason === 'replacement');
    if (replacedItems.length > 0) {
      replacedItems.forEach((log) =>
        allPromises.push(
          fetch(`${API_URL}/api/assets/${log.oldBarcode}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'Broken',
              notes: `הוחלפה בקופסה ${log.newBarcode} ע"י ${user.username} מרכב ${finalVehicleNumber}`,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error(`שגיאה בסימון קופסה מוחלפת כשבורה: ${log.oldBarcode}`);
            return res.json();
          })
        )
      );
    }
    if (hasQuantitativeItems) {
      allPromises.push(
        fetch(`${API_URL}/api/quantitatives/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionType,
            driverName: finalDriverName,
            scannedBy: user.username,
            vehicleNumber: finalVehicleNumber,
            largeCoolers: Number(quantities.largeCoolers) || 0,
            smallCoolers: Number(quantities.smallCoolers) || 0,
            notes,
          }),
        }).then((res) => {
          if (!res.ok) throw new Error('שמירת צידניות/קרח נכשלה');
          return res.json();
        })
      );
    }
    if (correctionsLog.length > 0) {
      allPromises.push(
        fetch(`${API_URL}/api/inventoryNew/log-corrections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corrections: correctionsLog,
            username: user.username,
            vehicleNumber: finalVehicleNumber,
            driverName: finalDriverName,
          }),
        }).then((res) => {
          if (!res.ok) throw new Error('שמירת תיעוד ההחלפות נכשלה');
          return res.json();
        })
      );
    }

    try {
      await toast.promise(Promise.all(allPromises), {
        loading: 'שומר נתונים...',
        success: 'העדכון נשמר בהצלחה!',
        error: (err) => `אחת הפעולות נכשלה: ${err.message}`,
      });
      doReset(true); // Reset form and go back to mode selection
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSaveDisabled =
    isSubmitting ||
    (vehicleNumber !== 'הוסף מספר רכב חדש...' &&
      (!vehicleNumber.trim() || vehicleNumber === 'None')) ||
    (vehicleNumber === 'הוסף מספר רכב חדש...' && !customVehicleNumber.trim()) ||
    (driverName !== 'הוסף שם נהג חדש...' && !driverName.trim()) ||
    (driverName === 'הוסף שם נהג חדש...' && !customDriverName.trim());

  const handleModeSelect = (type) => {
    setTransactionType(type);
    setModeSelected(true);
  };

  return (
    <>
      <Header user={user} />
      <Sidebar user={user} />
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-md mx-auto">
            <Toaster position="bottom-center" />

            {!modeSelected ? (
              <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-40 p-4">
                <div className="w-full max-w-sm text-center">
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    שלום, {user?.fullName || user?.username}
                  </h1>
                  <p className="text-gray-600 mb-8">בחר את סוג הפעולה כדי להתחיל.</p>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => handleModeSelect('incoming')}
                      className="w-full flex items-center justify-center gap-3 py-4 px-6 text-lg font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-sm transition-transform transform hover:scale-105"
                    >
                      <ArrowDown /> הכנסת ציוד למחסן
                    </button>
                    <button
                      onClick={() => handleModeSelect('outgoing')}
                      className="w-full flex items-center justify-center gap-3 py-4 px-6 text-lg font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm transition-transform transform hover:scale-105"
                    >
                      <ArrowUp /> הוצאת ציוד מהמחסן
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div
                    className={`flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border-l-4 ${transactionType === 'incoming' ? 'border-green-500' : 'border-red-500'}`}
                  >
                    <div>
                      <p className="text-sm text-gray-500">מצב פעולה:</p>
                      <p
                        className={`font-bold ${transactionType === 'incoming' ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {transactionType === 'incoming' ? 'הכנסה למחסן' : 'הוצאה מהמחסן'}
                      </p>
                    </div>
                    <button
                      onClick={() => setModeSelected(false)}
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <RefreshCw className="w-4 h-4" /> שנה מצב
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="vehicleNumber"
                        className="flex items-center text-sm font-medium text-gray-700 mb-1 gap-2"
                      >
                        <Car className="w-4 h-4 text-gray-400" /> מספר רכב
                      </label>
                      <select
                        id="vehicleNumber"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      >
                        <option value="" disabled>
                          בחר מהרשימה...
                        </option>
                        {vehicleNumbers.map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                      {vehicleNumber === 'הוסף מספר רכב חדש...' && (
                        <input
                          type="text"
                          value={customVehicleNumber}
                          onChange={(e) => setCustomVehicleNumber(e.target.value)}
                          placeholder="הקלד מספר רכב חדש"
                          className="w-full px-3 py-2 mt-2 border border-gray-300 rounded-md shadow-sm"
                          autoFocus
                        />
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="driverName"
                        className="flex items-center text-sm font-medium text-gray-700 mb-1 gap-2"
                      >
                        <User className="w-4 h-4 text-gray-400" /> שם הנהג
                      </label>
                      <select
                        id="driverName"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      >
                        <option value="" disabled>
                          בחר נהג...
                        </option>
                        {driverNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      {driverName === 'הוסף שם נהג חדש...' && (
                        <input
                          type="text"
                          value={customDriverName}
                          onChange={(e) => setCustomDriverName(e.target.value)}
                          placeholder="הקלד שם נהג חדש"
                          className="w-full px-3 py-2 mt-2 border border-gray-300 rounded-md shadow-sm"
                          autoFocus
                        />
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                    <div>
                      <label
                        htmlFor="barcode-adder-good"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500" /> סרוק פריט תקין
                      </label>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddGoodBarcode();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Barcode className="text-gray-400" />
                        <input
                          id="barcode-adder-good"
                          ref={goodInputRef}
                          type="text"
                          value={barcodeToAdd}
                          onChange={(e) => setBarcodeToAdd(e.target.value)}
                          placeholder="סרוק או הקלד ברקוד..."
                          className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                          autoCorrect="off"
                          autoCapitalize="none"
                        />
                      </form>
                    </div>
                    <div>
                      <label
                        htmlFor="barcode-adder-broken"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                      >
                        <AlertTriangle className="w-5 h-5 text-red-500" /> סרוק פריט שבור
                      </label>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddBrokenBarcode();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Barcode className="text-gray-400" />
                        <input
                          id="barcode-adder-broken"
                          type="text"
                          value={brokenBarcodeToAdd}
                          onChange={(e) => setBrokenBarcodeToAdd(e.target.value)}
                          placeholder="סרוק או הקלד ברקוד..."
                          className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                          autoCorrect="off"
                          autoCapitalize="none"
                        />
                      </form>
                    </div>
                  </div>
                  {(scannedItems.length > 0 || brokenScannedItems.length > 0) && (
                    <div className="space-y-4">
                      {scannedItems.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 my-2 uppercase">
                            תקינים ({scannedItems.length})
                          </h4>
                          <ul className="border rounded-md max-h-36 overflow-y-auto bg-white">
                            {scannedItems.map((item) => (
                              <li
                                key={item.barcode}
                                className="p-2 flex justify-between items-center text-sm border-b last:border-b-0"
                              >
                                <span className="font-mono text-gray-800">{item.barcode}</span>
                                <div>
                                  <button
                                    onClick={() => openCorrectionModal(item.barcode, 'ok')}
                                    className="p-1 text-gray-400 hover:text-blue-500 rounded-full"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => removeScannedItem(item.barcode)}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded-full"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {brokenScannedItems.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 my-2 uppercase">
                            שבורים ({brokenScannedItems.length})
                          </h4>
                          <ul className="border border-red-200 rounded-md max-h-36 overflow-y-auto bg-white">
                            {brokenScannedItems.map((item) => (
                              <li
                                key={item.barcode}
                                className="p-2 flex justify-between items-center text-sm border-b last:border-b-0"
                              >
                                <span className="font-mono text-gray-800">{item.barcode}</span>
                                <div>
                                  <button
                                    onClick={() => openCorrectionModal(item.barcode, 'broken')}
                                    className="p-1 text-gray-400 hover:text-blue-500 rounded-full"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => removeBrokenScannedItem(item.barcode)}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded-full"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
                    {quantitativeItems.map((item) => (
                      <div key={item.id}>
                        <div className="flex items-center gap-3 mb-2">
                          {item.icon} <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => adjustQuantity(item.id, 1)}
                            className="px-4 h-12 border border-r-0 rounded-r-md bg-gray-50 hover:bg-gray-100"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="0"
                            value={quantities[item.id]}
                            onChange={(e) =>
                              setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-full h-12 border-t border-b text-center text-xl font-bold focus:outline-none"
                          />
                          <button
                            onClick={() => adjustQuantity(item.id, -1)}
                            disabled={quantities[item.id] <= 0}
                            className="px-4 h-12 border border-l-0 rounded-l-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={handleReset}
                      disabled={isSubmitting}
                      className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 ${isConfirmingReset ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      <RotateCcw className="w-4 h-4" />{' '}
                      {isConfirmingReset ? 'לחץ שוב לאישור' : 'איפוס טופס'}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSaveDisabled}
                      className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all sm:col-span-2 ${isSaveDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'}`}
                    >
                      <Save className="w-4 h-4" /> {isSubmitting ? 'שומר...' : 'שמור'}
                    </button>
                  </div>
                </div>
              </>
            )}
            {isCorrectionModalOpen && itemToCorrect && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                dir="rtl"
              >
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm m-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">תיקון / החלפת קופסה</h3>
                    <button
                      onClick={() => {
                        setIsCorrectionModalOpen(false);
                        setReplacementBarcode('');
                      }}
                    >
                      <XCircle className="text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                  <p className="mb-4">
                    קופסה מספר:{' '}
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {itemToCorrect.barcode}
                    </span>
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">בחר פעולה:</label>
                      <select
                        value={correctionReason}
                        onChange={(e) => setCorrectionReason(e.target.value)}
                        className="w-full p-2 border rounded-md mt-1"
                      >
                        {itemToCorrect.currentStatus === 'ok' && (
                          <option value="move_to_broken">העבר לרשימת השבורים</option>
                        )}
                        {itemToCorrect.currentStatus === 'broken' && (
                          <option value="move_to_ok">העבר לרשימת התקינים</option>
                        )}
                        <option value="replace">החלף בקופסה אחרת</option>
                      </select>
                    </div>
                    {correctionReason === 'replace' && (
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Replace className="w-4 h-4 text-blue-500" /> סרוק קופסה חדשה
                        </label>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCorrectionSave();
                          }}
                        >
                          <input
                            ref={replacementInputRef}
                            type="text"
                            value={replacementBarcode}
                            onChange={(e) => setReplacementBarcode(e.target.value)}
                            placeholder="סרוק ברקוד להחלפה..."
                            className="w-full p-2 border rounded-md mt-1 font-mono"
                            autoCorrect="off"
                            autoCapitalize="none"
                          />
                        </form>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setIsCorrectionModalOpen(false);
                        setReplacementBarcode('');
                      }}
                      className="px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleCorrectionSave}
                      className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      בצע
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
