import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { FileDown, CloudDownload, Search } from 'lucide-react';
import { TextField, InputAdornment } from '@mui/material';

const API_URL = 'http://localhost:3000';

// const transformMongoInvoice = (mongoDoc) => {
//   const fmtDate = (d) => (d ? new Date(d).toISOString().substring(0, 10) : null);

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
  });

  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [confirmed] = useState(new Set());

  const isStillMissing = (inv) => hasMissing(inv) && inv.confirmed === false;

  useEffect(() => {
    setUserPermissions({
      viewFinancials: user.permissions?.viewFinancials ?? false,
      editInvoices: user.permissions?.editInvoices ?? false,
      undoInvoice: user.permissions?.undoInvoice ?? false,
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

  const hasMissing = (inv) =>
    !inv.filename ||
    !inv.invoice_date ||
    inv.total_amount == null ||
    inv.total_amount == 0 ||
    !inv.order_reference ||
    !inv.city ||
    inv.item_row_count <= 0;

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
    rows.push({ Filename: 'Net Total', Amount: summary.rawNet });
    const ws = XLSX.utils.json_to_sheet(rows);
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
      <div dir="ltr" className="bg-slate-50 min-h-screen p-20">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Invoices Dashboard</h1>
        </header>

        {userPermissions.viewFinancials && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
            <Card>
              <CardContent className="text-center">
                <p className="text-green-600">Total Income</p>
                <p className="text-3xl">₪{summary.inc}</p>
                <p className="text-xs">{summary.cntInv} invoices</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <p className="text-red-600">Total Credits</p>
                <p className="text-3xl">₪{summary.cred}</p>
                <p className="text-xs">{summary.cntCred} credit notes</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 text-white text-center">
              <CardContent>
                <p className="text-blue-400">Net Total</p>
                <p className="text-3xl text-black">₪{summary.net}</p>
                <p className="text-xs text-black">
                  {summary.cntInv + summary.cntCred} All invoices
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
            {/* <div className="flex gap-2 ">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div> */}
            <div className="flex-1 max-w-sm">
              <TextField
                size="small"
                variant="outlined"
                fullWidth
                placeholder="Search invoices..."
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

            <div className="flex gap-2">
              <Button className="text-xs" variant="secondary" onClick={exportExcel}>
                <FileDown />
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="flex gap-x-4 ">
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {anyMissing && (
            <div className="p-4 bg-red-100 text-red-800">
              ⚠ There are invoices with missing fields – highlighted in red.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
              <thead className="bg-slate-100 text-center">
                <tr>
                  {['File', 'Date', 'Amount', 'Reference', 'City', 'Row Count', 'Actions'].map(
                    (h) => (
                      <th key={h} className="px-6 py-3 font-medium uppercase text-slate-600">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-center">
                {sortedInvoices.map((inv) => {
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
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => download(inv.filename)}
                          >
                            <CloudDownload />
                          </Button>
                          {userPermissions.editInvoices && !isEditing && (
                            <Button variant="secondary" size="sm" onClick={() => startEdit(inv)}>
                              Edit
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
                              Confirm
                            </Button>
                          )}
                          {/*Undo */}
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
                              Undo
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
                                Save
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingInvoice(null)}
                              >
                                Cancel
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
        </Card>
      </div>
    </>
  );
};

export default DashboardPage;
