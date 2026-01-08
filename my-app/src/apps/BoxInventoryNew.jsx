'use client';
import toast, { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import Header from '../components/Header'; 
import Sidebar from '../components/Sidebar'; 
import {
  Truck,
  Minus,
  RotateCcw,
  CheckCircle,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Ban,
  Package,
  User,
  MapPin,
  Clock,
  AlertOctagon,
  Snowflake, 
  Box 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL; 

const vehicleNumbers = [
  '200-39-201', '879-04-501', '595-54-901', '534-76-202', 
  '97-733-31', '217-03-901', '685-24-602'
];

const driverNames = [
  'מוחמד מרסאת', 'מוחמד סמאר', 'מוחמד יאסין', 'זידאן חנא',
  'מחמוד המבוזה', 'מוחמד סועאד', 'אחמד חמוד'
];

export default function BoxInventoryNew() {
  const user = JSON.parse(localStorage.getItem('user')) || { username: 'test_user' };

  // --- TAB STATE ---
  const [activeTab, setActiveTab] = useState('dispatch'); 

  // --- STATES: DISPATCH (הוצאה) ---
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [manifestItems, setManifestItems] = useState([]); 
  const [removedItems, setRemovedItems] = useState([]);   
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [dispatchBarcodeInput, setDispatchBarcodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedGate, setDetectedGate] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  
  // ציוד נלווה להוצאה
  const [dispatchCoolers, setDispatchCoolers] = useState(0); 

  // --- STATES: RETURN (החזרה) ---
  const [returnBarcodeInput, setReturnBarcodeInput] = useState('');
  const [returnedList, setReturnedList] = useState([]); 
  const [isReturnLoading, setIsReturnLoading] = useState(false);
  
  // ציוד נלווה להחזרה
  const [returnEquipmentDriver, setReturnEquipmentDriver] = useState('');
  const [returnCoolersInput, setReturnCoolersInput] = useState('');
  const [returnIceInput, setReturnIceInput] = useState('');
  const [isEquipmentSubmitting, setIsEquipmentSubmitting] = useState(false);

  // --- DAMAGE MODAL STATES ---
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageBarcodeInput, setDamageBarcodeInput] = useState('');

  // --- REFS ---
  const dispatchInputRef = useRef(null);
  const returnInputRef = useRef(null);
  const damageInputRef = useRef(null);

  // --- FOCUS MANAGEMENT ---
  useEffect(() => {
    if (showDamageModal && damageInputRef.current) {
        setTimeout(() => damageInputRef.current.focus(), 100);
    } else if (activeTab === 'dispatch' && isSyncMode && dispatchInputRef.current) {
      dispatchInputRef.current.focus();
    } else if (activeTab === 'return' && !showDamageModal && returnInputRef.current) {
      returnInputRef.current.focus();
    }
  }, [activeTab, isSyncMode, manifestItems, returnedList, showDamageModal]);


  // ======================================================
  //              LOGIC: DISPATCH (הוצאה)
  // ======================================================

  const handleSyncWave = async () => {
    if (!waveNumber) {
      toast.error('נא להזין מספר גל');
      return;
    }
    
    // איפוס לפני טעינה
    setManifestItems([]);
    setRemovedItems([]);
    setDetectedGate('');
    setExpandedOrder(null);
    setDispatchCoolers(0); 
    
    const toastId = toast.loading(`מושך נתונים לגל ${waveNumber}...`);

    try {
      const res = await fetch(`${API_URL}/api/test/manifest?waveNumber=${waveNumber}`);
      if (!res.ok) throw new Error('שגיאה בתקשורת לשרת');
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setManifestItems(data);
        setIsSyncMode(true);
        
        // לוגיקה לזיהוי שער: מתעלמים מ-OUT ומ-null
        const validItem = data.find(i => i.gateNumber && i.gateNumber !== 'OUT' && i.gateNumber !== 'null');
        const firstGate = validItem ? validItem.gateNumber : (data[0].gateNumber || '?');
        setDetectedGate(firstGate);
        
        toast.success(`נמצאו ${data.length} קופסאות!`, { id: toastId });
      } else {
        toast.error('לא נמצאו קופסאות למספר גל זה היום', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בסנכרון', { id: toastId });
    }
  };

  const handleScanDispatch = (e) => {
    e.preventDefault();
    const scannedBarcode = dispatchBarcodeInput.trim();
    if (!scannedBarcode) return;

    const itemInManifest = manifestItems.find(item => item.barcode === scannedBarcode);

    if (!itemInManifest) {
      toast.error(`ברקוד לא שייך לגל הזה!`, { icon: <AlertTriangle className="text-orange-500"/> });
      if (navigator.vibrate) navigator.vibrate(200); 
      setDispatchBarcodeInput('');
      return;
    }

    if (itemInManifest.gateNumber === 'OUT') {
      toast.error('פריט זה מבוטל מערכתית (OUT)', { icon: <Ban className="text-red-600"/> });
      setDispatchBarcodeInput('');
      return;
    }

    const isAlreadyRemoved = removedItems.find(item => item.barcode === scannedBarcode);
    if (isAlreadyRemoved) {
      toast.error('הקופסה כבר סומנה כלא יוצאת');
      setDispatchBarcodeInput('');
      return;
    }

    setRemovedItems(prev => [itemInManifest, ...prev]);
    toast.success('הקופסה צומצמה', { icon: <Minus className="text-red-500" /> });
    if (navigator.vibrate) navigator.vibrate(50); 
    setDispatchBarcodeInput('');
  };

  const handleRestoreItem = (barcodeToRestore) => {
    setRemovedItems(prev => prev.filter(item => item.barcode !== barcodeToRestore));
    toast.success('הוחזר למשלוח');
  };

  const handleSubmitDispatch = async () => {
    if (!vehicleNumber || !driverName) {
      toast.error('חובה לבחור נהג ורכב');
      return;
    }

    const finalAssetsToSend = manifestItems.filter(mItem => {
        const isRemoved = removedItems.some(r => r.barcode === mItem.barcode);
        const isSystemCanceled = mItem.gateNumber === 'OUT';
        return !isRemoved && !isSystemCanceled;
    });

    if (finalAssetsToSend.length === 0) {
      toast.error('אין קופסאות תקינות לשליחה');
      return;
    }

    const calculatedIce = dispatchCoolers * 4;

    if (!window.confirm(`האם לשמור את הוצאת גל ${waveNumber}?\n\n📦 צידניות: ${dispatchCoolers}\n❄️ קרח: ${calculatedIce}`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/test/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: finalAssetsToSend,
          vehicleNumber,
          driverName,
          username: user.username,
          logistics: {
             coolers: Number(dispatchCoolers),
             ice: Number(calculatedIce)
          }
        })
      });

      if (!res.ok) throw new Error('Failed');
      toast.success(`הנתונים נשמרו בהצלחה!`);
      resetDispatchForm();

    } catch (error) {
      toast.error('שגיאה בשמירה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDispatchForm = () => {
    setManifestItems([]);
    setRemovedItems([]);
    setIsSyncMode(false);
    setWaveNumber('');
    setDetectedGate('');
    setDispatchBarcodeInput('');
    setExpandedOrder(null);
    setDispatchCoolers(0);
  };

  // חישוב קבוצות להצגה
  const getGroupedData = () => {
    const groups = {};
    manifestItems.forEach(item => {
      if (!groups[item.orderNumber]) {
        groups[item.orderNumber] = {
          orderNumber: item.orderNumber,
          city: item.description,
          items: [], 
          total: 0,
          removedCount: 0,
          canceledCount: 0
        };
      }
      groups[item.orderNumber].items.push(item);
      groups[item.orderNumber].total++;
      if (item.gateNumber === 'OUT') groups[item.orderNumber].canceledCount++;
      else if (removedItems.some(r => r.barcode === item.barcode)) groups[item.orderNumber].removedCount++;
    });
    return Object.values(groups);
  };

  const totalItems = manifestItems.length;
  const totalSystemCanceled = manifestItems.filter(i => i.gateNumber === 'OUT').length;
  const totalManualRemoved = removedItems.length;
  const totalToTruck = totalItems - totalSystemCanceled - totalManualRemoved;


  // ======================================================
  //              LOGIC: RETURN (החזרה)
  // ======================================================

  const processReturn = async (barcodeToScan, isDamaged = false) => {
    if (!barcodeToScan) return;
    
    if (returnedList.some(item => item.barcode === barcodeToScan)) {
      toast('הקופסה כבר נסרקה', { icon: '⚠️' });
      return;
    }

    setIsReturnLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/test/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barcode: barcodeToScan, 
          username: user.username,
          isDamaged: isDamaged
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'שגיאה בהחזרה');

      if (navigator.vibrate) {
          isDamaged ? navigator.vibrate([100, 50, 100]) : navigator.vibrate(100);
      }

      const msg = isDamaged 
        ? `דווח נזק לנהג: ${data.returnedFromDriver}` 
        : `הוחזר: ${data.returnedFromDriver}`;
      
      isDamaged ? toast.error(msg) : toast.success(msg);
      
      setReturnedList(prev => [{
        barcode: data.barcode,
        driver: data.returnedFromDriver,
        city: data.city,
        time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute:'2-digit'}),
        isDamaged: data.isDamaged
      }, ...prev]);

      if (isDamaged) {
          setShowDamageModal(false);
          setDamageBarcodeInput('');
      } else {
          setReturnBarcodeInput('');
      }

    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsReturnLoading(false);
    }
  };

  // החזרת ציוד ידנית
  const handleEquipmentReturn = async () => {
      if (!returnEquipmentDriver) {
          toast.error('חובה לבחור נהג להחזרת ציוד');
          return;
      }
      if (!returnCoolersInput && !returnIceInput) {
          toast.error('יש להזין לפחות כמות צידניות או קרח');
          return;
      }

      setIsEquipmentSubmitting(true);
      try {
          const res = await fetch(`${API_URL}/api/test/return-equipment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  driverName: returnEquipmentDriver,
                  coolers: Number(returnCoolersInput) || 0,
                  ice: Number(returnIceInput) || 0,
                  username: user.username
              })
          });

          if (!res.ok) throw new Error('שגיאה בשמירת ציוד');
          
          toast.success(`נקלט ציוד לנהג ${returnEquipmentDriver}`, { 
              icon: <CheckCircle className="text-green-500"/>
          });

          setReturnCoolersInput('');
          setReturnIceInput('');
          setReturnEquipmentDriver('');

      } catch (error) {
          toast.error('שגיאה בשמירת ציוד');
      } finally {
          setIsEquipmentSubmitting(false);
      }
  };


  // ======================================================
  //                    RENDER (JSX)
  // ======================================================

  return (
    <>
      <Header user={user} />
      <Sidebar user={user} />
      
      <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
        <Toaster position="bottom-center" />
        
        <main className="max-w-3xl mx-auto space-y-6 pb-20">
          
          {/* --- TABS SWITCHER --- */}
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex">
             <button 
                onClick={() => setActiveTab('dispatch')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all font-bold ${
                  activeTab === 'dispatch' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
             >
                <Truck className="w-5 h-5"/>
                הוצאה למשלוח
             </button>
             <button 
                onClick={() => setActiveTab('return')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all font-bold ${
                  activeTab === 'return' 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
             >
                <RotateCcw className="w-5 h-5"/>
                החזרת סחורה
             </button>
          </div>

          {/* ======================= VIEW: DISPATCH ======================= */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-700">ניהול הפצה (גלים)</h2>
                {isSyncMode && (
                  <button onClick={resetDispatchForm} className="text-sm bg-white border px-3 py-1 rounded shadow-sm hover:text-red-500 flex gap-1">
                    <RotateCcw className="w-4 h-4"/> איפוס
                  </button>
                )}
              </div>

              {/* נהג ורכב */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">מספר רכב</label>
                  <select value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="w-full p-2 border rounded bg-gray-50">
                    <option value="">בחר...</option>
                    {vehicleNumbers.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">שם נהג</label>
                  <select value={driverName} onChange={e => setDriverName(e.target.value)} className="w-full p-2 border rounded bg-gray-50">
                    <option value="">בחר...</option>
                    {driverNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              
              {/* הזנת ציוד להוצאה */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between gap-4">
                  <div className="flex-1">
                      <label className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                          <Box className="w-3 h-3"/> צידניות גדולות
                      </label>
                      <input 
                          type="number" 
                          value={dispatchCoolers}
                          onChange={(e) => setDispatchCoolers(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 border border-blue-300 rounded text-center font-bold text-lg"
                      />
                  </div>
                  <div className="text-center pt-4">
                      <span className="text-gray-400">=</span>
                  </div>
                  <div className="flex-1 opacity-70">
                      <label className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                          <Snowflake className="w-3 h-3"/> קרח (אוטומטי)
                      </label>
                      <div className="w-full p-2 bg-blue-100 border border-blue-200 rounded text-center font-bold text-lg text-blue-600">
                          {dispatchCoolers * 4}
                      </div>
                  </div>
              </div>

              {/* חיפוש גל */}
              {!isSyncMode && (
                <div className="bg-blue-50 border border-blue-200 p-8 rounded-lg text-center space-y-4 shadow-sm">
                  <Truck className="w-16 h-16 text-blue-500 mx-auto opacity-80" />
                  <h2 className="text-xl font-bold text-blue-900">סנכרון גל ליקוט</h2>
                  <div className="max-w-xs mx-auto">
                    <input 
                      type="text" 
                      placeholder="הזן מספר גל (למשל: 1)"
                      value={waveNumber}
                      onChange={e => setWaveNumber(e.target.value)}
                      className="w-full p-3 border rounded-md text-center font-bold text-lg"
                      autoFocus
                    />
                  </div>
                  <button onClick={handleSyncWave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-bold shadow-md w-full max-w-xs">
                    חפש גל
                  </button>
                </div>
              )}

              {/* דשבורד סנכרון פעיל */}
              {isSyncMode && (
                <div className="space-y-6">
                  
                  {/* באנר גדול לגל ושער */}
                  <div className="flex flex-col sm:flex-row gap-4">
                      {/* קוביה ימנית: מספר גל */}
                      <div className="flex-1 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg flex flex-col items-center justify-center border border-blue-400">
                          <span className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-1">מספר גל (Wave)</span>
                          <div className="flex items-center gap-2">
                              <Package className="w-8 h-8 opacity-50"/>
                              <span className="text-5xl font-mono font-bold">{waveNumber}</span>
                          </div>
                      </div>

                      {/* קוביה שמאלית: מספר שער */}
                      <div className="flex-1 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 text-white shadow-lg flex flex-col items-center justify-center border border-purple-400 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-2 bg-white/20"></div>
                          <span className="text-purple-200 text-sm font-bold uppercase tracking-wider mb-1">שער יציאה (Gate)</span>
                          <div className="flex items-center gap-3">
                              <Truck className="w-8 h-8 opacity-50"/>
                              <span className="text-6xl font-bold tracking-tighter">
                                  {detectedGate && detectedGate !== 'null' ? detectedGate : '?'}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* סטטיסטיקה */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded border-b-4 border-gray-300">
                      <div className="text-[10px] text-gray-500 font-bold">סה"כ</div>
                      <div className="text-xl font-bold">{totalItems}</div>
                    </div>
                    <div className="bg-white p-2 rounded border-b-4 border-gray-500">
                      <div className="text-[10px] text-gray-500 font-bold">OUT/בוטל</div>
                      <div className="text-xl font-bold text-gray-600">{totalSystemCanceled}</div>
                    </div>
                    <div className="bg-white p-2 rounded border-b-4 border-red-400">
                      <div className="text-[10px] text-gray-500 font-bold">צומצמו</div>
                      <div className="text-xl font-bold text-red-500">{totalManualRemoved}</div>
                    </div>
                    <div className="bg-white p-2 rounded border-b-4 border-green-500">
                      <div className="text-[10px] text-gray-500 font-bold">למשאית</div>
                      <div className="text-xl font-bold text-green-600">{totalToTruck}</div>
                    </div>
                  </div>

                  {/* סריקת צמצומים */}
                  <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3 text-red-800 font-bold">
                      <Minus className="w-5 h-5 bg-red-200 p-1 rounded-full"/>
                      <span>סריקת צמצומים</span>
                    </div>
                    <form onSubmit={handleScanDispatch} className="flex gap-2">
                      <input
                        ref={dispatchInputRef}
                        type="text"
                        value={dispatchBarcodeInput}
                        onChange={e => setDispatchBarcodeInput(e.target.value)}
                        placeholder="סרוק קופסה להסרה..."
                        className="flex-1 p-3 rounded border border-red-300 focus:outline-none focus:ring-4 focus:ring-red-200 text-lg"
                        inputMode="numeric"
                      />
                    </form>
                  </div>

                  {/* רשימת צמצומים */}
                  {removedItems.length > 0 && (
                    <div className="bg-white p-4 rounded border border-red-100">
                      <h3 className="text-xs font-bold text-gray-500 mb-2">הוסרו ידנית ({removedItems.length}):</h3>
                      <div className="flex flex-wrap gap-2">
                        {removedItems.map(item => (
                          <div key={item.barcode} className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded text-sm border border-red-100">
                            <span>{item.barcode}</span>
                            <button onClick={() => handleRestoreItem(item.barcode)}><X className="w-3 h-3"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* רשימת הזמנות */}
                  <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                      <span className="font-bold text-gray-700 text-lg">רשימת הזמנות בגל {waveNumber}</span>
                      <span className="text-xs text-gray-500">לחץ לפירוט</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {getGroupedData().map((group) => {
                        const finalCount = group.total - group.removedCount - group.canceledCount;
                        const isFullyRemoved = finalCount === 0;
                        const isExpanded = expandedOrder === group.orderNumber;

                        return (
                          <div key={group.orderNumber} className="group">
                            <div 
                              onClick={() => setExpandedOrder(isExpanded ? null : group.orderNumber)}
                              className={`p-4 w-full flex justify-between items-center cursor-pointer transition-all ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50 bg-white'}`}
                            >
                              <div className="flex flex-col items-start gap-1">
                                <span className="font-mono font-bold text-xl text-blue-600 tracking-wide">{group.orderNumber}</span>
                                <div className="flex items-center gap-1 text-gray-500 text-sm font-medium">
                                  <Truck className="w-4 h-4 text-gray-400"/>
                                  <span>{group.city && group.city !== 'null' ? group.city : 'יעד לא ידוע'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-center min-w-[80px]">
                                  {isFullyRemoved ? (
                                    <span className="bg-red-100 text-red-600 text-sm px-3 py-1 rounded-md font-bold border border-red-200">בוטל</span>
                                  ) : (
                                    <div className="flex flex-col items-center leading-none">
                                      <span className="font-bold text-3xl text-green-600">{finalCount}</span>
                                      <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">מתוך {group.total}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-gray-400 pl-2">
                                  {isExpanded ? <ChevronUp className="w-6 h-6"/> : <ChevronDown className="w-6 h-6"/>}
                                </div>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="bg-gray-50 p-4 border-t border-gray-100 shadow-inner">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                  {group.items.map(item => {
                                    const isRemoved = removedItems.some(r => r.barcode === item.barcode);
                                    const isSystemOut = item.gateNumber === 'OUT';
                                    let itemClass = "bg-white border-gray-200 text-gray-700"; 
                                    if (isSystemOut) itemClass = "bg-gray-800 border-gray-900 text-white opacity-90";
                                    else if (isRemoved) itemClass = "bg-red-50 border-red-200 text-red-500 decoration-slice line-through opacity-80";

                                    return (
                                      <div key={item.barcode} className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm font-mono shadow-sm ${itemClass}`}>
                                        <span>{item.barcode}</span>
                                        {isSystemOut && <span className="text-[10px] font-bold bg-white text-black px-1 rounded">OUT</span>}
                                        {isRemoved && !isSystemOut && <Minus className="w-4 h-4"/>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitDispatch}
                    disabled={isSubmitting}
                    className="w-full bg-gray-900 text-white py-4 rounded-lg font-bold text-lg shadow-lg sticky bottom-4 flex justify-center items-center gap-2 z-10"
                  >
                    {isSubmitting ? 'שומר...' : `אשר הוצאת גל (שער ${detectedGate})`}
                  </button>
                </div>
              )}
            </div>
          )}


          {/* ======================= VIEW: RETURN ======================= */}
          {activeTab === 'return' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               
               <div className="text-center py-2">
                  <h2 className="text-2xl font-bold text-gray-800">החזרת סחורה</h2>
                  <p className="text-gray-500 text-sm">סרוק להחזרה, דווח נזק, או קלוט ציוד</p>
               </div>

               {/* אזור החזרת ציוד ידנית */}
               <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                   <h3 className="text-orange-800 font-bold mb-3 flex items-center gap-2 border-b border-orange-200 pb-2">
                       <Box className="w-5 h-5"/> עדכון ציוד חוזר (ידני)
                   </h3>
                   <div className="space-y-3">
                       <select 
                          value={returnEquipmentDriver} 
                          onChange={e => setReturnEquipmentDriver(e.target.value)} 
                          className="w-full p-2 border rounded bg-white text-sm"
                       >
                           <option value="">בחר נהג להחזרת ציוד...</option>
                           {driverNames.map(n => <option key={n} value={n}>{n}</option>)}
                       </select>

                       <div className="flex gap-3">
                           <div className="flex-1">
                               <input 
                                  type="number" 
                                  placeholder="צידניות" 
                                  value={returnCoolersInput}
                                  onChange={e => setReturnCoolersInput(e.target.value)}
                                  className="w-full p-2 border rounded text-center"
                               />
                               <label className="text-[10px] text-gray-500 block text-center mt-1">צידניות גדולות</label>
                           </div>
                           <div className="flex-1">
                               <input 
                                  type="number" 
                                  placeholder="קרח" 
                                  value={returnIceInput}
                                  onChange={e => setReturnIceInput(e.target.value)}
                                  className="w-full p-2 border rounded text-center"
                               />
                               <label className="text-[10px] text-gray-500 block text-center mt-1">יחידות קרח</label>
                           </div>
                       </div>
                       
                       <button 
                          onClick={handleEquipmentReturn}
                          disabled={isEquipmentSubmitting}
                          className="w-full bg-orange-600 text-white text-sm font-bold py-2 rounded shadow hover:bg-orange-700"
                       >
                           {isEquipmentSubmitting ? 'מעדכן...' : 'עדכן החזרת ציוד'}
                       </button>
                   </div>
               </div>

               {/* כפתור נזק */}
               <button 
                  onClick={() => setShowDamageModal(true)}
                  className="w-full bg-red-50 border-2 border-red-100 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
               >
                  <AlertTriangle className="w-5 h-5" />
                  דיווח על קופסה שבורה/פגומה
               </button>

               {/* סורק רגיל */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <form onSubmit={(e) => { e.preventDefault(); processReturn(returnBarcodeInput.trim(), false); }} className="relative">
                    <input
                      ref={returnInputRef}
                      type="text"
                      value={returnBarcodeInput}
                      onChange={e => setReturnBarcodeInput(e.target.value)}
                      placeholder="סרוק החזרה תקינה..."
                      className="w-full p-4 pr-12 text-lg border-2 border-orange-200 rounded-lg focus:outline-none focus:border-orange-500 transition-all"
                      disabled={isReturnLoading}
                    />
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                  </form>
               </div>

               {/* רשימת החזרות */}
               {returnedList.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                    <Clock className="w-4 h-4"/>
                    נקלטו בסשן זה ({returnedList.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {returnedList.map((item, idx) => (
                      <div 
                        key={item.barcode + idx} 
                        className={`bg-white p-4 rounded-lg border-r-4 shadow-sm flex justify-between items-center ${
                            item.isDamaged ? 'border-r-red-500 bg-red-50' : 'border-r-green-500'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-lg font-bold text-gray-800 tracking-wide">
                            {item.barcode}
                          </span>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1 font-bold">
                              <User className="w-3 h-3" /> {item.driver}
                            </span>
                            {item.isDamaged && (
                                <span className="text-red-600 font-bold text-xs flex items-center gap-1 bg-white px-2 rounded-full border border-red-200">
                                    <AlertOctagon className="w-3 h-3"/> נזק
                                </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-400 font-mono">{item.time}</span>
                          {item.isDamaged ? (
                              <div className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full mt-1 font-bold">פגום</div>
                          ) : (
                              <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full mt-1 font-bold">תקין</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MODAL FOR DAMAGE REPORT === */}
          {showDamageModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="bg-red-600 p-4 text-white flex justify-between items-center">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-yellow-300"/>
                            דיווח על נזק
                        </h3>
                        <button onClick={() => setShowDamageModal(false)} className="text-white/80 hover:text-white">
                            <X className="w-6 h-6"/>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <p className="text-gray-600 text-sm text-center">
                            סרוק את הקופסה הפגומה.<br/>
                            <span className="font-bold">המערכת תרשום את הנזק על שם הנהג האחרון.</span>
                        </p>

                        <form onSubmit={(e) => { e.preventDefault(); processReturn(damageBarcodeInput.trim(), true); }}>
                            <input
                                ref={damageInputRef}
                                type="text"
                                value={damageBarcodeInput}
                                onChange={e => setDamageBarcodeInput(e.target.value)}
                                placeholder="סרוק ברקוד פגום..."
                                className="w-full p-4 text-center text-xl font-mono font-bold border-2 border-red-300 rounded-xl focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100 bg-red-50 text-red-900 placeholder-red-300"
                            />
                        </form>

                        <div className="flex gap-2 mt-4">
                            <button 
                                onClick={() => setShowDamageModal(false)}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}