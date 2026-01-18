'use client';
import toast, { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [scanCooldown, setScanCooldown] = useState(false);
  const scanCooldownRef = useRef(false);
  
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
  const processedBarcodesRef = useRef(new Set()); // למניעת עיבוד כפול
  const lastProcessedReturnRef = useRef(''); // למניעת לולאות
  const lastProcessedDamageRef = useRef(''); // למניעת לולאות
  const returnInputChangeTimeRef = useRef(0); // לעקיבה אחרי זמן שינוי של return input
  const returnInputValueRef = useRef(''); // לעקיבה אחרי ערך קודם של return input
  const damageInputChangeTimeRef = useRef(0); // לעקיבה אחרי זמן שינוי של damage input
  const damageInputValueRef = useRef(''); // לעקיבה אחרי ערך קודם של damage input

  // איפוס refs כשעוברים בין טאבים או סוגרים מודל
  useEffect(() => {
    if (activeTab !== 'return') {
      lastProcessedReturnRef.current = '';
      lastProcessedDamageRef.current = '';
    }
    if (!showDamageModal) {
      lastProcessedDamageRef.current = '';
    }
  }, [activeTab, showDamageModal]);

  // --- FOCUS MANAGEMENT ---
  useEffect(() => {
    if (showDamageModal && damageInputRef.current) {
        setTimeout(() => damageInputRef.current.focus(), 150);
    } else if (activeTab === 'dispatch' && isSyncMode && dispatchInputRef.current) {
      setTimeout(() => dispatchInputRef.current?.focus(), 100);
    } else if (activeTab === 'return' && !showDamageModal && returnInputRef.current && !isReturnLoading) {
      setTimeout(() => returnInputRef.current?.focus(), 100);
    }
  }, [activeTab, isSyncMode, showDamageModal, isReturnLoading]);

  // שמירה על focus גם אחרי שגיאות או פעולות
  useEffect(() => {
    if (activeTab === 'return' && !showDamageModal && returnInputRef.current && !isReturnLoading && !scanCooldown) {
      const timer = setTimeout(() => {
        if (document.activeElement !== returnInputRef.current) {
          returnInputRef.current?.focus();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [returnedList, activeTab, showDamageModal, isReturnLoading, scanCooldown]);


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

    } catch {
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

  // חישוב קבוצות להצגה - עם useMemo לביצועים
  const getGroupedData = useMemo(() => {
    const groups = {};
    const removedBarcodesSet = new Set(removedItems.map(r => r.barcode));
    
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
      if (item.gateNumber === 'OUT') {
        groups[item.orderNumber].canceledCount++;
      } else if (removedBarcodesSet.has(item.barcode)) {
        groups[item.orderNumber].removedCount++;
      }
    });
    return Object.values(groups);
  }, [manifestItems, removedItems]);

  // חישוב סטטיסטיקות עם useMemo לביצועים
  const totals = useMemo(() => {
    const totalItems = manifestItems.length;
    const totalSystemCanceled = manifestItems.filter(i => i.gateNumber === 'OUT').length;
    const totalManualRemoved = removedItems.length;
    const totalToTruck = totalItems - totalSystemCanceled - totalManualRemoved;
    return { totalItems, totalSystemCanceled, totalManualRemoved, totalToTruck };
  }, [manifestItems, removedItems]);
  
  const { totalItems, totalSystemCanceled, totalManualRemoved, totalToTruck } = totals;


  // ======================================================
  //              LOGIC: RETURN (החזרה)
  // ======================================================

  // יצירת Map לביצועים מהירים יותר
  const returnedBarcodesMap = useMemo(() => {
    const map = new Map();
    returnedList.forEach(item => map.set(item.barcode, true));
    return map;
  }, [returnedList]);

  const processReturn = useCallback(async (barcodeToScan, isDamaged = false) => {
    if (!barcodeToScan || !barcodeToScan.trim()) return;
    
    const trimmedBarcode = barcodeToScan.trim();
    
    // מניעת סריקות כפולות - בדיקה מהירה עם Map
    if (returnedBarcodesMap.has(trimmedBarcode)) {
      toast('הקופסה כבר נסרקה', { icon: '⚠️' });
      if (navigator.vibrate) navigator.vibrate(200);
      setReturnBarcodeInput('');
      return;
    }

    // מניעת סריקות כפולות - cooldown
    if (scanCooldownRef.current || trimmedBarcode === lastScannedBarcode) {
      return;
    }

    scanCooldownRef.current = true;
    setScanCooldown(true);
    setLastScannedBarcode(trimmedBarcode);

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
          lastProcessedDamageRef.current = ''; // איפוס אחרי הצלחה
      } else {
          setReturnBarcodeInput('');
          lastProcessedReturnRef.current = ''; // איפוס אחרי הצלחה
      }

      // אוטו-פוקוס מהיר אחרי סריקה מוצלחת
      setTimeout(() => {
        if (returnInputRef.current && !isDamaged) {
          returnInputRef.current.focus();
        } else if (damageInputRef.current && isDamaged) {
          damageInputRef.current.focus();
        }
      }, 100);

    } catch (error) {
      console.error(error);
      toast.error(error.message || 'שגיאה בהחזרה');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      
      // איפוס refs אחרי שגיאה כדי לאפשר ניסיון חוזר
      if (isDamaged) {
        lastProcessedDamageRef.current = '';
        processedBarcodesRef.current.delete(trimmedBarcode);
      } else {
        lastProcessedReturnRef.current = '';
        processedBarcodesRef.current.delete(trimmedBarcode);
      }
      
      // שמירה על focus גם אחרי שגיאה
      setTimeout(() => {
        if (returnInputRef.current && !isDamaged) {
          returnInputRef.current.focus();
        } else if (damageInputRef.current && isDamaged) {
          damageInputRef.current.focus();
        }
      }, 100);
    } finally {
      setIsReturnLoading(false);
      // הסרת cooldown אחרי 300ms
      setTimeout(() => {
        scanCooldownRef.current = false;
        setScanCooldown(false);
        setLastScannedBarcode('');
      }, 300);
    }
  }, [returnedBarcodesMap, lastScannedBarcode, user.username]);

  // Auto-submit כשסורק 2D מזין ברקוד (עם Enter או אוטומטית)
  useEffect(() => {
    if (!returnBarcodeInput || returnBarcodeInput.length < 6 || isReturnLoading || scanCooldown) {
      returnInputValueRef.current = returnBarcodeInput;
      return;
    }

    const trimmed = returnBarcodeInput.trim();
    const now = Date.now();
    const timeSinceLastChange = now - returnInputChangeTimeRef.current;
    
    // בדיקה אם זה כתיבה ידנית (שינוי איטי תו אחר תו) או סריקה (שינוי מהיר בבת אחת)
    // סריקה = שינוי מהיר (פחות מ-100ms) או שינוי גדול (יותר מ-3 תווים בבת אחת)
    const isManualTyping = timeSinceLastChange < 100 && 
                          returnBarcodeInput.length > returnInputValueRef.current.length &&
                          returnBarcodeInput.length - returnInputValueRef.current.length <= 3 &&
                          returnBarcodeInput.startsWith(returnInputValueRef.current);
    
    // עדכון refs
    returnInputChangeTimeRef.current = now;
    returnInputValueRef.current = returnBarcodeInput;
    
    // מניעת עיבוד כפול - בדיקה אם כבר עובד
    if (trimmed === lastProcessedReturnRef.current || processedBarcodesRef.current.has(trimmed)) {
      return;
    }
    
    // אם זה כתיבה ידנית - לא לטפל אוטומטית, רק עם Enter
    if (isManualTyping) {
      return;
    }
    
    if (trimmed.length >= 6) {
      // Auto-submit אחרי 800ms (מניעת submit מידי, מחכה לסורק לסיים)
      // זמן ארוך יותר כדי להבחין בין סריקה לכתיבה ידנית
      const timeoutId = setTimeout(() => {
        // בדיקה שהערך לא השתנה (לא נמחק) ולא עובד כבר
        if (returnBarcodeInput === trimmed && 
            !isReturnLoading && 
            !scanCooldown &&
            trimmed !== lastProcessedReturnRef.current &&
            !processedBarcodesRef.current.has(trimmed)) {
          lastProcessedReturnRef.current = trimmed;
          processedBarcodesRef.current.add(trimmed);
          processReturn(trimmed, false);
        }
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [returnBarcodeInput, isReturnLoading, scanCooldown, processReturn]);

  // Auto-submit למודל נזק
  useEffect(() => {
    if (!damageBarcodeInput || damageBarcodeInput.length < 6 || isReturnLoading || scanCooldown || !showDamageModal) {
      damageInputValueRef.current = damageBarcodeInput;
      return;
    }

    const trimmed = damageBarcodeInput.trim();
    const now = Date.now();
    const timeSinceLastChange = now - damageInputChangeTimeRef.current;
    
    // בדיקה אם זה כתיבה ידנית (שינוי איטי תו אחר תו) או סריקה (שינוי מהיר בבת אחת)
    const isManualTyping = timeSinceLastChange < 100 && 
                          damageBarcodeInput.length > damageInputValueRef.current.length &&
                          damageBarcodeInput.length - damageInputValueRef.current.length <= 3 &&
                          damageBarcodeInput.startsWith(damageInputValueRef.current);
    
    // עדכון refs
    damageInputChangeTimeRef.current = now;
    damageInputValueRef.current = damageBarcodeInput;
    
    // מניעת עיבוד כפול - בדיקה אם כבר עובד
    if (trimmed === lastProcessedDamageRef.current || processedBarcodesRef.current.has(trimmed)) {
      return;
    }
    
    // אם זה כתיבה ידנית - לא לטפל אוטומטית, רק עם Enter
    if (isManualTyping) {
      return;
    }
    
    if (trimmed.length >= 6) {
      const timeoutId = setTimeout(() => {
        if (damageBarcodeInput === trimmed && 
            !isReturnLoading && 
            !scanCooldown &&
            trimmed !== lastProcessedDamageRef.current &&
            !processedBarcodesRef.current.has(trimmed)) {
          lastProcessedDamageRef.current = trimmed;
          processedBarcodesRef.current.add(trimmed);
          processReturn(trimmed, true);
        }
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [damageBarcodeInput, isReturnLoading, scanCooldown, showDamageModal, processReturn]);

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

      } catch {
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
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4" dir="rtl">
        <Toaster position="bottom-center" />
        
        <main className="max-w-3xl mx-auto space-y-6 pb-20">
          
          {/* --- TABS SWITCHER --- */}
          <div className="bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl shadow-lg border border-gray-200/50 flex gap-1">
             <button 
                onClick={() => setActiveTab('dispatch')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all duration-300 font-bold text-sm ${
                  activeTab === 'dispatch' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105' 
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-blue-600'
                }`}
             >
                <Truck className={`w-5 h-5 transition-transform ${activeTab === 'dispatch' ? 'scale-110' : ''}`}/>
                הוצאה למשלוח
             </button>
             <button 
                onClick={() => setActiveTab('return')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all duration-300 font-bold text-sm ${
                  activeTab === 'return' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105' 
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-orange-600'
                }`}
             >
                <RotateCcw className={`w-5 h-5 transition-transform ${activeTab === 'return' ? 'scale-110' : ''}`}/>
                החזרת סחורה
             </button>
          </div>

          {/* ======================= VIEW: DISPATCH ======================= */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">ניהול הפצה (גלים)</h2>
                {isSyncMode && (
                  <button 
                    onClick={resetDispatchForm} 
                    className="text-sm bg-white/90 backdrop-blur-sm border border-red-200 px-4 py-2 rounded-xl shadow-md hover:bg-red-50 hover:border-red-300 hover:shadow-lg transition-all duration-200 text-red-600 flex gap-2 items-center font-semibold"
                  >
                    <RotateCcw className="w-4 h-4"/> איפוס
                  </button>
                )}
              </div>

              {/* נהג ורכב */}
              <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-gray-200/50 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-2">
                    <Truck className="w-3 h-3 text-blue-500"/> מספר רכב
                  </label>
                  <select 
                    value={vehicleNumber} 
                    onChange={e => setVehicleNumber(e.target.value)} 
                    className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 font-medium text-gray-700 hover:border-gray-300"
                  >
                    <option value="">בחר רכב...</option>
                    {vehicleNumbers.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-2">
                    <User className="w-3 h-3 text-blue-500"/> שם נהג
                  </label>
                  <select 
                    value={driverName} 
                    onChange={e => setDriverName(e.target.value)} 
                    className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 font-medium text-gray-700 hover:border-gray-300"
                  >
                    <option value="">בחר נהג...</option>
                    {driverNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              
              {/* הזנת ציוד להוצאה */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-5 rounded-2xl border-2 border-blue-200/50 shadow-lg flex items-center justify-between gap-4 backdrop-blur-sm">
                  <div className="flex-1">
                      <label className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
                          <Box className="w-4 h-4 text-blue-600"/> צידניות גדולות
                      </label>
                      <input 
                          type="number" 
                          value={dispatchCoolers}
                          onChange={(e) => setDispatchCoolers(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-3 border-2 border-blue-300 rounded-xl text-center font-bold text-xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 text-blue-700"
                      />
                  </div>
                  <div className="text-center pt-6">
                      <span className="text-2xl text-blue-400 font-bold">=</span>
                  </div>
                  <div className="flex-1">
                      <label className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
                          <Snowflake className="w-4 h-4 text-blue-600"/> קרח (אוטומטי)
                      </label>
                      <div className="w-full p-3 bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 rounded-xl text-center font-bold text-xl text-blue-700 shadow-inner">
                          {dispatchCoolers * 4}
                      </div>
                  </div>
              </div>

              {/* חיפוש גל */}
              {!isSyncMode && (
                <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-2 border-blue-200/50 p-10 rounded-3xl text-center space-y-6 shadow-xl backdrop-blur-sm">
                  <div className="relative">
                    <Truck className="w-20 h-20 text-blue-500 mx-auto opacity-90 animate-pulse" />
                    <div className="absolute inset-0 w-20 h-20 mx-auto bg-blue-400/20 rounded-full blur-xl"></div>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">סנכרון גל ליקוט</h2>
                  <div className="max-w-xs mx-auto space-y-4">
                    <input 
                      type="text" 
                      placeholder="הזן מספר גל (למשל: 1)"
                      value={waveNumber}
                      onChange={e => setWaveNumber(e.target.value)}
                      className="w-full p-4 border-2 border-blue-200 rounded-2xl text-center font-bold text-xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 shadow-md"
                      autoFocus
                    />
                  </div>
                  <button 
                    onClick={handleSyncWave} 
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full max-w-xs"
                  >
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
                      <div className="flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-8 text-white shadow-2xl flex flex-col items-center justify-center border-2 border-blue-400/50 relative overflow-hidden group hover:scale-105 transition-transform duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-300 to-blue-500"></div>
                          <span className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">מספר גל (Wave)</span>
                          <div className="flex items-center gap-3 relative z-10">
                              <Package className="w-10 h-10 opacity-70 group-hover:opacity-100 transition-opacity"/>
                              <span className="text-6xl font-mono font-bold drop-shadow-lg">{waveNumber}</span>
                          </div>
                      </div>

                      {/* קוביה שמאלית: מספר שער */}
                      <div className="flex-1 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-2xl p-8 text-white shadow-2xl flex flex-col items-center justify-center border-2 border-purple-400/50 relative overflow-hidden group hover:scale-105 transition-transform duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-300 to-purple-500"></div>
                          <span className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">שער יציאה (Gate)</span>
                          <div className="flex items-center gap-4 relative z-10">
                              <Truck className="w-10 h-10 opacity-70 group-hover:opacity-100 transition-opacity"/>
                              <span className="text-7xl font-bold tracking-tighter drop-shadow-lg">
                                  {detectedGate && detectedGate !== 'null' ? detectedGate : '?'}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* סטטיסטיקה */}
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
                      <div className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">סה"כ</div>
                      <div className="text-3xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{totalItems}</div>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
                      <div className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">OUT/בוטל</div>
                      <div className="text-3xl font-bold text-gray-600 group-hover:text-gray-800 transition-colors">{totalSystemCanceled}</div>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border-2 border-red-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
                      <div className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">צומצמו</div>
                      <div className="text-3xl font-bold text-red-500 group-hover:text-red-600 transition-colors">{totalManualRemoved}</div>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border-2 border-green-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
                      <div className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">למשאית</div>
                      <div className="text-3xl font-bold text-green-600 group-hover:text-green-700 transition-colors">{totalToTruck}</div>
                    </div>
                  </div>

                  {/* סריקת צמצומים */}
                  <div className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200/50 p-5 rounded-2xl shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4 text-red-800 font-bold">
                      <div className="bg-red-200 p-2 rounded-xl">
                        <Minus className="w-5 h-5"/>
                      </div>
                      <span className="text-lg">סריקת צמצומים</span>
                    </div>
                    <form onSubmit={handleScanDispatch} className="flex gap-2">
                      <input
                        ref={dispatchInputRef}
                        type="text"
                        value={dispatchBarcodeInput}
                        onChange={e => setDispatchBarcodeInput(e.target.value)}
                        placeholder="סרוק קופסה להסרה..."
                        className="flex-1 p-4 rounded-xl border-2 border-red-300 bg-white focus:outline-none focus:ring-4 focus:ring-red-200 focus:border-red-500 text-lg font-medium shadow-md transition-all duration-200"
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
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-5 py-4 border-b-2 border-gray-200 flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-xl">רשימת הזמנות בגל {waveNumber}</span>
                      <span className="text-xs text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 font-medium">לחץ לפירוט</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {getGroupedData.map((group) => {
                        const finalCount = group.total - group.removedCount - group.canceledCount;
                        const isFullyRemoved = finalCount === 0;
                        const isExpanded = expandedOrder === group.orderNumber;

                        return (
                          <div key={group.orderNumber} className="group">
                            <div 
                              onClick={() => setExpandedOrder(isExpanded ? null : group.orderNumber)}
                              className={`p-5 w-full flex justify-between items-center cursor-pointer transition-all duration-300 ${isExpanded ? 'bg-gradient-to-r from-blue-50 to-blue-100/50' : 'hover:bg-gray-50 bg-white'}`}
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
                    className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 hover:from-gray-800 hover:via-gray-700 hover:to-gray-800 text-white py-5 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl sticky bottom-4 flex justify-center items-center gap-2 z-10 transition-all duration-300 transform hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        שומר...
                      </>
                    ) : (
                      `אשר הוצאת גל (שער ${detectedGate})`
                    )}
                  </button>
                </div>
              )}
            </div>
          )}


          {/* ======================= VIEW: RETURN ======================= */}
          {activeTab === 'return' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               
               <div className="text-center py-4">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent mb-2">החזרת סחורה</h2>
                  <p className="text-gray-600 text-sm font-medium">סרוק להחזרה, דווח נזק, או קלוט ציוד</p>
               </div>

               {/* אזור החזרת ציוד ידנית */}
               <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-2 border-orange-200/50 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
                   <h3 className="text-orange-800 font-bold mb-4 flex items-center gap-2 border-b-2 border-orange-200 pb-3 text-lg">
                       <div className="bg-orange-200 p-1.5 rounded-lg">
                         <Box className="w-5 h-5"/>
                       </div>
                       עדכון ציוד חוזר (ידני)
                   </h3>
                   <div className="space-y-3">
                       <select 
                          value={returnEquipmentDriver} 
                          onChange={e => setReturnEquipmentDriver(e.target.value)} 
                          className="w-full p-3 border-2 border-orange-200 rounded-xl bg-white text-sm font-medium hover:border-orange-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-200 shadow-md"
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
                                  className="w-full p-3 border-2 border-orange-200 rounded-xl text-center font-bold text-lg bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-200 shadow-md"
                               />
                               <label className="text-xs text-gray-600 block text-center mt-2 font-medium">צידניות גדולות</label>
                           </div>
                           <div className="flex-1">
                               <input 
                                  type="number" 
                                  placeholder="קרח" 
                                  value={returnIceInput}
                                  onChange={e => setReturnIceInput(e.target.value)}
                                  className="w-full p-3 border-2 border-orange-200 rounded-xl text-center font-bold text-lg bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-200 shadow-md"
                               />
                               <label className="text-xs text-gray-600 block text-center mt-2 font-medium">יחידות קרח</label>
                           </div>
                       </div>
                       
                       <button 
                          onClick={handleEquipmentReturn}
                          disabled={isEquipmentSubmitting}
                          className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-sm font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                       >
                           {isEquipmentSubmitting ? (
                             <>
                               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2"></div>
                               מעדכן...
                             </>
                           ) : (
                             'עדכן החזרת ציוד'
                           )}
                       </button>
                   </div>
               </div>

               {/* כפתור נזק */}
               <button 
                  onClick={() => setShowDamageModal(true)}
                  className="w-full bg-gradient-to-r from-red-50 to-red-100/50 border-2 border-red-200 text-red-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:from-red-100 hover:to-red-200 hover:border-red-300 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-100"
               >
                  <div className="bg-red-200 p-1.5 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  דיווח על קופסה שבורה/פגומה
               </button>

               {/* סורק רגיל */}
               <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border-2 border-orange-200/50">
                  <form 
                    onSubmit={(e) => { 
                      e.preventDefault(); 
                      if (!scanCooldown && returnBarcodeInput.trim()) {
                        processReturn(returnBarcodeInput.trim(), false); 
                      }
                    }} 
                    className="relative"
                  >
                    <input
                      ref={returnInputRef}
                      type="text"
                      value={returnBarcodeInput}
                      onChange={(e) => setReturnBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        // Enter key - submit מיידי
                        if (e.key === 'Enter' && returnBarcodeInput.trim() && !isReturnLoading && !scanCooldown) {
                          e.preventDefault();
                          processReturn(returnBarcodeInput.trim(), false);
                        }
                      }}
                      placeholder="סרוק החזרה תקינה..."
                      className="w-full p-5 pr-14 text-xl border-2 border-orange-300 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-200 font-medium shadow-md bg-white"
                      disabled={isReturnLoading || scanCooldown}
                      autoComplete="off"
                      inputMode="numeric"
                    />
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 bg-orange-100 p-2 rounded-xl">
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                    {scanCooldown && (
                      <div className="absolute right-20 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse shadow-lg shadow-orange-500/50"></div>
                      </div>
                    )}
                  </form>
               </div>

               {/* רשימת החזרות */}
               {returnedList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                      <Clock className="w-4 h-4"/>
                      נקלטו בסשן זה ({returnedList.length})
                    </h3>
                    <div className="text-xs text-gray-500">
                      {returnedList.filter(item => !item.isDamaged).length} תקינות | {returnedList.filter(item => item.isDamaged).length} פגומות
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {returnedList.map((item, idx) => (
                      <div 
                        key={item.barcode + idx} 
                        className={`bg-white/90 backdrop-blur-sm p-5 rounded-2xl border-r-4 shadow-lg hover:shadow-xl flex justify-between items-center transition-all duration-300 transform hover:scale-[1.02] ${
                            item.isDamaged 
                              ? 'border-r-red-500 bg-gradient-to-r from-red-50/50 to-white' 
                              : 'border-r-green-500 bg-gradient-to-r from-green-50/50 to-white'
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <span className="font-mono text-xl font-bold text-gray-800 tracking-wide">
                            {item.barcode}
                          </span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-2 font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                              <User className="w-4 h-4" /> {item.driver}
                            </span>
                            {item.isDamaged && (
                                <span className="text-red-700 font-bold text-xs flex items-center gap-1.5 bg-red-100 px-3 py-1 rounded-full border border-red-200">
                                    <AlertOctagon className="w-4 h-4"/> נזק
                                </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg">{item.time}</span>
                          {item.isDamaged ? (
                              <div className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 text-xs px-3 py-1.5 rounded-full font-bold border border-red-300">פגום</div>
                          ) : (
                              <div className="bg-gradient-to-r from-green-100 to-green-200 text-green-700 text-xs px-3 py-1.5 rounded-full font-bold border border-green-300">תקין</div>
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
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-red-200/50">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white flex justify-between items-center">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                            <div className="bg-yellow-300/20 p-2 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-yellow-300"/>
                            </div>
                            דיווח על נזק
                        </h3>
                        <button 
                          onClick={() => setShowDamageModal(false)} 
                          className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                        >
                            <X className="w-6 h-6"/>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-5">
                        <p className="text-gray-700 text-sm text-center leading-relaxed">
                            סרוק את הקופסה הפגומה.<br/>
                            <span className="font-bold text-red-700">המערכת תרשום את הנזק על שם הנהג האחרון.</span>
                        </p>

                        <form onSubmit={(e) => { 
                          e.preventDefault(); 
                          if (!scanCooldown && damageBarcodeInput.trim()) {
                            processReturn(damageBarcodeInput.trim(), true); 
                          }
                        }}>
                            <input
                                ref={damageInputRef}
                                type="text"
                                value={damageBarcodeInput}
                                onChange={(e) => setDamageBarcodeInput(e.target.value)}
                                onKeyDown={(e) => {
                                  // Enter key - submit מיידי
                                  if (e.key === 'Enter' && damageBarcodeInput.trim() && !isReturnLoading && !scanCooldown) {
                                    e.preventDefault();
                                    processReturn(damageBarcodeInput.trim(), true);
                                  }
                                }}
                                placeholder="סרוק ברקוד פגום..."
                                className="w-full p-5 text-center text-2xl font-mono font-bold border-2 border-red-400 rounded-2xl focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-200 bg-gradient-to-br from-red-50 to-red-100/50 text-red-900 placeholder-red-400 shadow-lg transition-all duration-200"
                                disabled={isReturnLoading || scanCooldown}
                                autoComplete="off"
                                inputMode="numeric"
                            />
                        </form>

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowDamageModal(false)}
                                className="flex-1 py-3.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
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