import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { FileDown, CloudDownload, Search, Trash2 } from 'lucide-react';
import { TextField, InputAdornment, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL;

function SearchInput({ value, onChange }) {
  return (
    <TextField
      variant="outlined"
      size="small"
      placeholder="Search..."
      value={value}
      onChange={onChange}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
}

function DateRangePicker({ startDate, endDate, setStartDate, setEndDate }) {
  return (
    <div className="flex gap-x-4 mb-4">
      <TextField
        label="Start Date"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        size="small"
      />
      <div></div>
      <TextField
        label="End Date"
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        size="small"
      />
    </div>
  );
}

const transformMongoInvoice = (mongoDoc) => ({
  id: mongoDoc._id,
  filename: mongoDoc.source_path.split(/[\\/]/).pop(),
  invoice_date: mongoDoc.invoice_date
    ? new Date(mongoDoc.invoice_date).toISOString().substring(0, 10)
    : null,
  total_amount: mongoDoc.total_amount ?? null,
  order_reference: mongoDoc.order_reference || '',
  city: mongoDoc.city || '',
  item_row_count: mongoDoc.item_row_count || 0,
  source_path: mongoDoc.source_path || '',
  processed_at: mongoDoc.processed_at
    ? new Date(mongoDoc.processed_at).toISOString().substring(0, 10)
    : null,
  confirmed: mongoDoc.confirmed || false, // שדה חדש
});

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm ${className}`}>{children}</div>
);
const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);
const Input = (props) => (
  <input
    {...props}
    className={`flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 ${props.className}`}
  />
);
const Button = ({ children, variant = 'primary', size = 'default', className = '', ...props }) => {
  const base =
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition focus:outline-none disabled:opacity-50';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border border-slate-200 text-slate-800 hover:bg-slate-100',
    ghost: 'text-slate-800 hover:bg-slate-100',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
  };
  const sizes = { default: 'h-9 px-4', sm: 'h-8 px-3 text-xs', lg: 'h-10 px-8' };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const DashboardPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userPermissions, setUserPermissions] = useState({
    viewFinancials: false,
    editInvoices: false,
    undoInvoice: false,
    deleteInvoices: false,
  });

  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [confirmed] = useState(new Set());

  const isStillMissing = (inv) => hasMissing(inv) && inv.confirmed === false;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const { t, i18n } = useTranslation();
  const headerStyle = {
    textAlign: i18n.language === 'he' ? 'right' : 'left',
  };

  useEffect(() => {
    setUserPermissions({
      viewFinancials: user.permissions?.viewFinancials ?? false,
      editInvoices: user.permissions?.editInvoices ?? false,
      undoInvoice: user.permissions?.undoInvoice ?? false,
      deleteInvoices: user.permissions?.deleteInvoices ?? false,
    });

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/invoices`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setInvoices(data.map(transformMongoInvoice));
      } catch (e) {
        console.error(e);
        setError('Error loading invoices.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, itemsPerPage]);

  const hasMissing = (inv) =>
    !inv.filename ||
    !inv.invoice_date ||
    inv.total_amount == null ||
    inv.total_amount == 0 ||
    !inv.order_reference ||
    !inv.city ||
    inv.item_row_count <= 0 ||
    inv.city == 'UNKNOWN';

  const filtered = useMemo(
    () =>
      invoices.filter((inv) => {
        const lf = searchTerm.toLowerCase();
        const matchSearch = !searchTerm || Object.values(inv).join(' ').toLowerCase().includes(lf);
        const matchStart = !startDate || inv.invoice_date >= startDate;
        const matchEnd = !endDate || inv.invoice_date <= endDate;
        return matchSearch && matchStart && matchEnd;
      }),
    [invoices, searchTerm, startDate, endDate]
  );

  const summary = useMemo(() => {
    let inc = 0,
      cred = 0,
      cntInv = 0,
      cntCred = 0;
    filtered.forEach((inv) => {
      if (inv.total_amount >= 0) {
        inc += inv.total_amount;
        cntInv++;
      } else {
        cred += Math.abs(inv.total_amount);
        cntCred++;
      }
    });

    const net = inc - cred;
    const fmt = (n) =>
      n.toLocaleString('he-IL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    return {
      inc: fmt(inc),
      cred: fmt(cred),
      net: fmt(net),
      cntInv,
      cntCred,
      rawNet: net,
    };
  }, [filtered]);

  const sortedInvoices = useMemo(
    () => [...filtered].sort((a, b) => (isStillMissing(b) ? 1 : 0) - (isStillMissing(a) ? 1 : 0)),
    [filtered, confirmed]
  );

  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedInvoices, currentPage, itemsPerPage]);

  const anyMissing = useMemo(() => sortedInvoices.some(isStillMissing), [sortedInvoices]);

  const download = (fn) => fn && window.open(`${API_URL}/api/invoices/download/${fn}`, '_blank');
  const exportExcel = () => {
  if (!filtered.length) return alert('No data to export.');

  const rows = filtered.map((inv) => ({
    Filename: inv.filename,
    Date: inv.invoice_date,
    Amount: inv.total_amount,
    Reference: inv.order_reference,
    City: inv.city,
    RowCount: inv.item_row_count,
  }));

  const totalRowCount = filtered.reduce((sum, inv) => sum + inv.item_row_count, 0);

  const VAT_RATE = 1.18;
  const totalBeforeVat = summary.rawNet / VAT_RATE;
  const tenPercentOfPreVat = totalBeforeVat * 0.10;

  rows.push({});
  rows.push({
    Filename: 'Total Before VAT (18%)',
    Amount: totalBeforeVat,
  });
  rows.push({
    Filename: '10% of Pre-VAT Amount',
    Amount: tenPercentOfPreVat,
  });
  rows.push({
    Filename: 'Net Total (incl. VAT)',
    Amount: summary.rawNet,
  });
  rows.push({});
  rows.push({
    Filename: 'Total Row Count',
    RowCount: totalRowCount,
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  const amountColumnIndex = 'C';
  for (let i = 2; i <= rows.length + 1; i++) {
    const cellAddress = `${amountColumnIndex}${i}`;
    const cell = ws[cellAddress];

    if (cell && typeof cell.v === 'number') {
      cell.z = '0.00';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, 'Invoice_Report.xlsx');
};

  const startEdit = (inv) => {
    setEditingInvoice(inv.id);
    setEditValues({
      invoice_date: inv.invoice_date,
      total_amount: inv.total_amount,
      order_reference: inv.order_reference,
      city: inv.city,
      item_row_count: inv.item_row_count,
    });
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm(t('confirmDeleteMessage'))) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed to delete invoice');
      }

      // Remove the invoice from the local state
      setInvoices((prevInvoices) => prevInvoices.filter((inv) => inv.id !== invoiceId));
      alert(t('invoiceDeletedSuccess'));
    } catch (e) {
      console.error('Error deleting invoice:', e);
      alert(`Error: ${e.message}`);
    }
  };

  const tableHeaderKeys = ['file', 'date', 'amount', 'reference', 'city', 'rowCount', 'actions'];

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl text-slate-500">
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-screen text-red-700 p-4">{error}</div>
    );

  return (
    <>
      <Header user={user} />
      <Sidebar user={user} />
      <div className="bg-slate-50 min-h-screen p-4 md:ml-15">
        <header className="mb-8 text-start">
          <h1 style={headerStyle} className="text-3xl font-bold text-start">
            {t('invoicesDashboard')}
          </h1>
        </header>
        {userPermissions.viewFinancials && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
            <Card>
              <CardContent className="text-center">
                <p className="text-green-600">{t('totalIncome')}</p>
                <p className="text-3xl">₪{summary.inc}</p>
                <p className="text-xs">
                  {summary.cntInv} {t('invoices')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="text-center">
                <p className="text-red-600">{t('totalCredits')}</p>
                <p className="text-3xl">₪{summary.cred}</p>
                <p className="text-xs">
                  {summary.cntCred} {t('creditNotes')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 text-white text-center">
              <CardContent>
                <p className="text-blue-400">{t('netTotal')}</p>
                <p className="text-3xl text-black">₪{summary.net}</p>
                <p className="text-xs text-black">
                  {sortedInvoices.length} {t('allInvoices')}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        <Card>
          <div
            style={headerStyle}
            className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-4"
          >
            <div className="flex-grow w-full md:max-w-sm">
              <TextField
                size="small"
                variant="outlined"
                fullWidth
                placeholder={t('searchInvoices')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <TextField
                  label={t('startDate')}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <TextField
                  label={t('endDate')}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button className="text-xs" variant="secondary" onClick={exportExcel}>
                  <FileDown />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  {t('clear')}
                </Button>
              </div>
            </div>
          </div>
          {anyMissing && (
            <div style={headerStyle} className="p-4 bg-red-100 text-red-800 text-sm">
              ⚠ {t('alertInvoice')}
            </div>
          )}

          {/*Mobile*/}
          <div className="md:hidden">
            <div className="divide-y divide-slate-200 p-4 space-y-4">
              {paginatedInvoices.map((inv) => {
                const missing = isStillMissing(inv);
                const isEditing = editingInvoice === inv.id;
                return (
                  <div
                    key={inv.id}
                    className={`pt-4 first:pt-0 ${missing ? 'bg-red-50 p-3 rounded-lg' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <a
                        href={`${API_URL}/api/invoices/${inv.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-indigo-600 truncate pr-2"
                      >
                        {inv.filename ? inv.filename.replace(/\.pdf$/i, '') : 'No Filename'}
                      </a>
                      <span className="font-bold text-lg whitespace-nowrap">
                        {inv.total_amount != null ? `₪${inv.total_amount.toFixed(2)}` : '—'}
                      </span>
                    </div>
                    <div style={headerStyle} className="text-sm text-slate-600 space-y-1 mb-3">
                      <p>
                        <strong>{t('date')}:</strong> {inv.invoice_date || '—'}
                      </p>
                      <p>
                        <strong>{t('reference')}:</strong> {inv.order_reference || '—'}
                      </p>
                      <p>
                        <strong>{t('city')}:</strong> {inv.city || '—'}
                      </p>
                    </div>
                    <div className="flex items-center justify-end flex-wrap gap-2 mt-3">
                      <Button variant="secondary" size="sm" onClick={() => download(inv.filename)}>
                        <CloudDownload />
                      </Button>
                      {userPermissions.editInvoices && !isEditing && (
                        <Button variant="secondary" size="sm" onClick={() => startEdit(inv)}>
                          {t('edit')}
                        </Button>
                      )}
                      {userPermissions.editInvoices && missing && !isEditing && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_URL}/api/invoices/${inv.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ confirmed: true }),
                              });
                              if (!res.ok) throw new Error(res.statusText);
                              const updated = await res.json();
                              setInvoices((prev) =>
                                prev.map((i) =>
                                  i.id === inv.id ? transformMongoInvoice(updated) : i
                                )
                              );
                            } catch (e) {
                              console.error(e);
                              alert('Error confirming invoice');
                            }
                          }}
                        >
                          {t('confirm')}
                        </Button>
                      )}
                      {userPermissions.undoInvoice && inv.confirmed && !isEditing && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_URL}/api/invoices/${inv.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ confirmed: false }),
                              });
                              if (!res.ok) throw new Error(res.statusText);
                              const updated = await res.json();
                              setInvoices((prev) =>
                                prev.map((i) =>
                                  i.id === inv.id ? transformMongoInvoice(updated) : i
                                )
                              );
                            } catch (e) {
                              console.error(e);
                              alert('Error undoing confirmation');
                            }
                          }}
                        >
                          {t('undo')}
                        </Button>
                      )}
                      {userPermissions.deleteInvoices && !isEditing && (
                        <Button variant="danger" size="sm" onClick={() => handleDelete(inv.id)}>
                          <Trash2 size={16} className="mr-1" /> {t('delete')}
                        </Button>
                      )}
                      {isEditing && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await fetch(`${API_URL}/api/invoices/${inv.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(editValues),
                                });
                                if (!res.ok) throw new Error(res.statusText);
                                const updated = await res.json();
                                setInvoices((prev) =>
                                  prev.map((i) =>
                                    i.id === inv.id ? transformMongoInvoice(updated) : i
                                  )
                                );
                              } catch (e) {
                                console.error(e);
                                alert('Error saving invoice');
                              } finally {
                                setEditingInvoice(null);
                              }
                            }}
                          >
                            {t('save')}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingInvoice(null)}
                          >
                            {t('cancel')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
              <thead className="bg-slate-100 text-center">
                <tr>
                  {tableHeaderKeys.map((headerKey) => (
                    <th key={headerKey} className="px-6 py-3 font-medium uppercase text-slate-600">
                      {t(headerKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-center">
                {paginatedInvoices.map((inv) => {
                  const missing = isStillMissing(inv);
                  const isEditing = editingInvoice === inv.id;
                  return (
                    <tr key={inv.id} className={missing ? 'bg-red-100' : 'bg-white'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inv.filename ? (
                          <a
                            href={`${API_URL}/api/invoices/${inv.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {inv.filename.replace(/\.pdf$/i, '')}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editValues.invoice_date}
                            onChange={(e) =>
                              setEditValues((v) => ({ ...v, invoice_date: e.target.value }))
                            }
                          />
                        ) : (
                          inv.invoice_date || '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.total_amount}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                total_amount: parseFloat(e.target.value),
                              }))
                            }
                          />
                        ) : inv.total_amount != null ? (
                          inv.total_amount.toFixed(2)
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editValues.order_reference}
                            onChange={(e) =>
                              setEditValues((v) => ({ ...v, order_reference: e.target.value }))
                            }
                          />
                        ) : (
                          inv.order_reference || '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editValues.city}
                            onChange={(e) => setEditValues((v) => ({ ...v, city: e.target.value }))}
                          />
                        ) : (
                          inv.city || '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.item_row_count}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                item_row_count: parseInt(e.target.value, 10),
                              }))
                            }
                          />
                        ) : inv.item_row_count > 0 ? (
                          inv.item_row_count
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => download(inv.filename)}
                          >
                            <CloudDownload />
                          </Button>
                          {userPermissions.editInvoices && !isEditing && (
                            <Button variant="secondary" size="sm" onClick={() => startEdit(inv)}>
                              {t('edit')}
                            </Button>
                          )}

                          {userPermissions.editInvoices && missing && !isEditing && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${API_URL}/api/invoices/${inv.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ confirmed: true }),
                                  });
                                  if (!res.ok) throw new Error(res.statusText);
                                  const updated = await res.json();
                                  setInvoices((prev) =>
                                    prev.map((i) =>
                                      i.id === inv.id ? transformMongoInvoice(updated) : i
                                    )
                                  );
                                } catch (e) {
                                  console.error(e);
                                  alert('Error confirming invoice');
                                }
                              }}
                            >
                              {t('confirm')}
                            </Button>
                          )}
                          {userPermissions.deleteInvoices && !isEditing && (
                            <Button variant="danger" size="sm" onClick={() => handleDelete(inv.id)}>
                              <Trash2 size={16} />
                            </Button>
                          )}

                          {userPermissions.undoInvoice && inv.confirmed && !isEditing && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${API_URL}/api/invoices/${inv.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ confirmed: false }),
                                  });
                                  if (!res.ok) throw new Error(res.statusText);
                                  const updated = await res.json();
                                  setInvoices((prev) =>
                                    prev.map((i) =>
                                      i.id === inv.id ? transformMongoInvoice(updated) : i
                                    )
                                  );
                                } catch (e) {
                                  console.error(e);
                                  alert('Error undoing confirmation');
                                }
                              }}
                            >
                              {t('undo')}
                            </Button>
                          )}
                          {isEditing && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${API_URL}/api/invoices/${inv.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(editValues),
                                    });
                                    if (!res.ok) throw new Error(res.statusText);
                                    const updated = await res.json();
                                    setInvoices((prev) =>
                                      prev.map((i) =>
                                        i.id === inv.id ? transformMongoInvoice(updated) : i
                                      )
                                    );
                                  } catch (e) {
                                    console.error(e);
                                    alert('Error saving invoice');
                                  } finally {
                                    setEditingInvoice(null);
                                  }
                                }}
                              >
                                {t('save')}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingInvoice(null)}
                              >
                                {t('cancel')}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center flex-wrap justify-center gap-4 text-sm text-slate-600">
                <span>
                  {t('page')} {currentPage} {t('of')} {totalPages}
                </span>
                <TextField
                  select
                  label={t('perPage')}
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 100 }}
                >
                  {[15, 25, 50, 100, 500, 1000].map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <span>
                  ({t('total')} {sortedInvoices.length} {t('invoices')})
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default DashboardPage;
