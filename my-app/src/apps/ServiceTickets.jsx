import React, { useState, useMemo, useEffect } from 'react';

// MUI Imports
import { 
  Container, Box, Typography, Button, TextField, Select, MenuItem, 
  Paper, Stack, Grid, FormControl, InputLabel, IconButton, Tooltip, 
  createTheme, ThemeProvider, CssBaseline, Divider, Chip 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Lucide Icons
import { PlusCircle, Trash2, Bell, Wrench, CalendarClock, ChevronsRight, User, FilterX } from 'lucide-react';

// React Hot Toast
import toast, { Toaster } from 'react-hot-toast';

// --- Data & Helpers ---
const users = ['Alice', 'Bob', 'Charlie', 'Dana'];
const initialTickets = [
    { id: 1, title: 'API server is down', description: 'The main API is returning 503 errors.', status: 'Open', priority: 'High', createdAt: new Date(), createdBy: 'Alice', assignedTo: 'Bob' },
    { id: 2, title: 'Update user profile UI', description: 'New mockups are available.', status: 'In Progress', priority: 'Medium', createdAt: new Date(Date.now() - 86400000 * 2), createdBy: 'Charlie', assignedTo: 'Bob' },
    { id: 3, title: 'Fix typo on pricing page', description: 'The "anual" plan should be "annual".', status: 'Closed', priority: 'Low', createdAt: new Date(Date.now() - 86400000 * 5), createdBy: 'Dana', assignedTo: 'Dana' },
];
const initialMaintenanceTasks = [
    { id: 101, name: 'Clear application cache', interval: 'daily', nextRun: new Date(Date.now() + 30000) },
    { id: 102, name: 'Backup database', interval: 'weekly', nextRun: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) },
];

const calculateNextRun = (interval) => {
    const now = new Date();
    switch(interval) {
        case 'daily': 
            now.setDate(now.getDate() + 1);
            return now;
        case 'weekly': 
            now.setDate(now.getDate() + 7);
            return now;
        case 'monthly': 
            now.setMonth(now.getMonth() + 1);
            return now;
        default: 
            return now;
    }
};

// --- Theme Definition ---
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5' },
    secondary: { main: '#10b981' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' },
    error: { main: '#ef4444' },
    warning: { 
        main: '#f97316',
        lighter: '#ffedd5',
        dark: '#9a3412',
    },
    success: { 
        main: '#22c55e',
        lighter: '#d1fae5',
        dark: '#166534',
    },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700 }, h5: { fontWeight: 600 }, h6: { fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0' }}},
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: '8px', fontWeight: 600, padding: '8px 16px' }}},
    MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: '#1e293b', borderRadius: '6px' }}},
  },
});

// --- UI Sub-components ---
const getPriorityStyle = (priority) => {
    switch (priority) {
        case 'High': return { borderLeft: `4px solid ${theme.palette.error.main}` };
        case 'Medium': return { borderLeft: `4px solid ${theme.palette.warning.main}` };
        case 'Low': return { borderLeft: `4px solid ${theme.palette.primary.light}` };
        default: return {};
    }
};

const StatusBadge = ({ status }) => {
    const styles = {
        Open: { bgcolor: theme.palette.success.lighter, color: theme.palette.success.dark },
        'In Progress': { bgcolor: theme.palette.warning.lighter, color: theme.palette.warning.dark },
        Closed: { bgcolor: '#e2e8f0', color: '#475569' },
    };
    return <Typography component="span" sx={{...styles[status], px: 1.5, py: 0.5, borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600}}>{status}</Typography>;
};


function TicketSystem() {
  const [tickets, setTickets] = useState(initialTickets);
  const [maintenanceTasks, setMaintenanceTasks] = useState(initialMaintenanceTasks);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'Medium', createdBy: users[0] });
  const [newMaintenanceTask, setNewMaintenanceTask] = useState({ name: '', interval: 'daily' });
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState({ start: null, end: null });
  
  // Full Maintenance Task Checker
  useEffect(() => {
    const intervalId = setInterval(() => {
      setMaintenanceTasks(prevTasks =>
        prevTasks.map(task => {
          if (new Date(task.nextRun) <= new Date()) {
            toast.custom(
              () => (
                <Box
                  sx={{
                    ...theme.components.MuiPaper.styleOverrides.root,
                    bgcolor: 'text.primary',
                    color: 'background.paper',
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Bell size={20} />
                  Running: <strong>{task.name}</strong>
                </Box>
              ),
              { id: task.id.toString(), duration: 6000 }
            );
            return { ...task, nextRun: calculateNextRun(task.interval) };
          }
          return task;
        })
      );
    }, 15000); // Check every 15 seconds

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []); // Empty dependency array means this effect runs only once

  const handleFormChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!newTicket.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    const ticketObject = {
      id: Date.now(),
      ...newTicket,
      assignedTo: null,
      status: 'Open',
      createdAt: new Date(),
    };
    setTickets(prev => [ticketObject, ...prev]);
    toast.success('Ticket created!');
    setNewTicket({ title: '', description: '', priority: 'Medium', createdBy: users[0] });
    setIsFormVisible(false);
  };

  const handleDeleteTicket = (ticketId) => {
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    toast.success('Ticket deleted.');
  };

  const handleStatusChange = (ticketId, newStatus) => {
    setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t)));
  };

  const handleAssignTicket = (ticketId, assignee) => {
    const newAssignee = assignee === 'Unassigned' ? null : assignee;
    setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, assignedTo: newAssignee } : t)));
    toast.success(`Ticket assigned to ${newAssignee || 'Unassigned'}.`);
  };

  const handleCreateMaintenanceTask = (e) => {
    e.preventDefault();
    if (!newMaintenanceTask.name.trim()) {
      toast.error("Task name cannot be empty.");
      return;
    }
    const task = {
      id: Date.now(),
      ...newMaintenanceTask,
      nextRun: calculateNextRun(newMaintenanceTask.interval),
    };
    setMaintenanceTasks(prev => [...prev, task]);
    setNewMaintenanceTask({ name: '', interval: 'daily' });
    toast.success('Maintenance task scheduled!');
  };

  const handleClearFilters = () => {
    setStatusFilter('All');
    setDateFilter({ start: null, end: null });
    toast('Filters cleared.');
  };

  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];
    if (statusFilter !== 'All') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => new Date(t.createdAt) >= startDate);
    }
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.createdAt) <= endDate);
    }
    return filtered;
  }, [tickets, statusFilter, dateFilter]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="bottom-right" />
      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" color="text.primary">Support Dashboard</Typography>
          <Button variant="contained" startIcon={<PlusCircle size={18} />} onClick={() => setIsFormVisible(!isFormVisible)}>New Ticket</Button>
        </Stack>
        
        {isFormVisible && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" mb={2}>Create a New Ticket</Typography>
            <form onSubmit={handleCreateTicket}>
              <Grid container spacing={2}>
                <Grid xs={12}><TextField fullWidth label="Title" name="title" value={newTicket.title} onChange={handleFormChange(setNewTicket)} required /></Grid>
                <Grid xs={12}><TextField fullWidth multiline rows={3} label="Description" name="description" value={newTicket.description} onChange={handleFormChange(setNewTicket)} /></Grid>
                <Grid xs={12} sm={6} md={4}><FormControl fullWidth><InputLabel>Priority</InputLabel><Select label="Priority" name="priority" value={newTicket.priority} onChange={handleFormChange(setNewTicket)}><MenuItem value="Low">Low</MenuItem><MenuItem value="Medium">Medium</MenuItem><MenuItem value="High">High</MenuItem></Select></FormControl></Grid>
                <Grid xs={12} sm={6} md={4}><FormControl fullWidth><InputLabel>Created By</InputLabel><Select label="Created By" name="createdBy" value={newTicket.createdBy} onChange={handleFormChange(setNewTicket)}>{users.map(user => <MenuItem key={user} value={user}>{user}</MenuItem>)}</Select></FormControl></Grid>
                <Grid xs={12} md={4} container justifyContent="flex-end" alignItems="center"><Stack direction="row" spacing={2}><Button variant="text" onClick={() => setIsFormVisible(false)}>Cancel</Button><Button type="submit" variant="contained">Create</Button></Stack></Grid>
              </Grid>
            </form>
          </Paper>
        )}
        
        <Grid container spacing={4}>
            <Grid xs={12} lg={8}>
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} sm={4} md={3}><FormControl size="small" fullWidth><InputLabel>Status</InputLabel><Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><MenuItem value="All">All Statuses</MenuItem><MenuItem value="Open">Open</MenuItem><MenuItem value="In Progress">In Progress</MenuItem><MenuItem value="Closed">Closed</MenuItem></Select></FormControl></Grid>
                    <Grid xs={12} sm={4} md={3}><DatePicker label="From Date" value={dateFilter.start} onChange={(newValue) => setDateFilter(p => ({...p, start: newValue}))} slotProps={{ textField: { size: 'small', fullWidth: true } }} /></Grid>
                    <Grid xs={12} sm={4} md={3}><DatePicker label="To Date" value={dateFilter.end} onChange={(newValue) => setDateFilter(p => ({...p, end: newValue}))} slotProps={{ textField: { size: 'small', fullWidth: true } }} /></Grid>
                    <Grid xs={12} md={3} container justifyContent={{xs: 'flex-start', md: 'flex-end'}}><Button variant="outlined" startIcon={<FilterX size={16}/>} onClick={handleClearFilters}>Clear Filters</Button></Grid>
                  </Grid>
                </Paper>

                <Stack spacing={2.5}>
                    {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                        <Paper key={ticket.id} sx={{...getPriorityStyle(ticket.priority), overflow: 'hidden'}}>
                            <Box sx={{p: 2.5}}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography variant="h6" component="h3" color="text.primary">{ticket.title}</Typography><Typography variant="body2" color="text.secondary" mt={0.5}>{ticket.description}</Typography></Box><StatusBadge status={ticket.status} /></Stack>
                                <Divider sx={{my:2}} />
                                <Grid container spacing={2} alignItems="center">
                                    <Grid xs={12} md={6}><Stack direction={{xs: 'column', sm: 'row'}} spacing={{xs: 1, sm: 2}} alignItems="flex-start"><Chip icon={<User size={16}/>} label={`By: ${ticket.createdBy}`} size="small" variant="outlined" /><Chip icon={<CalendarClock size={16}/>} label={ticket.createdAt.toLocaleDateString()} size="small" variant="outlined" /></Stack></Grid>
                                    <Grid xs={12} md={6}><Stack direction="row" spacing={1} alignItems="center" justifyContent={{xs: 'flex-start', md: 'flex-end'}}><FormControl size="small" sx={{minWidth: 140}}><InputLabel>Assigned To</InputLabel><Select label="Assigned To" value={ticket.assignedTo || 'Unassigned'} onChange={(e) => handleAssignTicket(ticket.id, e.target.value)}><MenuItem value="Unassigned"><em>Unassigned</em></MenuItem>{users.map(user => <MenuItem key={user} value={user}>{user}</MenuItem>)}</Select></FormControl><Select size="small" variant="outlined" value={ticket.status} onChange={(e) => handleStatusChange(ticket.id, e.target.value)} sx={{fontSize: '0.8rem', '.MuiOutlinedInput-notchedOutline': {border: 'none'}}}><MenuItem value="Open">Open</MenuItem><MenuItem value="In Progress">In Progress</MenuItem><MenuItem value="Closed">Closed</MenuItem></Select><Tooltip title="Delete Ticket"><IconButton size="small" onClick={() => handleDeleteTicket(ticket.id)} sx={{color: 'grey.500', '&:hover': {color: 'error.main'}}}><Trash2 size={16} /></IconButton></Tooltip></Stack></Grid>
                                </Grid>
                            </Box>
                        </Paper>
                    )) : (<Paper sx={{p:4, textAlign: 'center', color: 'text.secondary'}}>No tickets found matching your criteria.</Paper>)}
                </Stack>
            </Grid>
            <Grid xs={12} lg={4}>
                <Paper sx={{ p: 3, position: 'sticky', top: '2rem' }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={2}><Box sx={{color: 'primary.main'}}><Wrench size={24} /></Box><Typography variant="h6" color="text.primary">Maintenance</Typography></Stack>
                    <form onSubmit={handleCreateMaintenanceTask}>
                        <Stack spacing={2}>
                            <TextField fullWidth label="New Task Name" name="name" value={newMaintenanceTask.name} onChange={handleFormChange(setNewMaintenanceTask)} required size="small"/>
                            <FormControl fullWidth size="small"><InputLabel>Interval</InputLabel><Select label="Interval" name="interval" value={newMaintenanceTask.interval} onChange={handleFormChange(setNewMaintenanceTask)}><MenuItem value="daily">Daily</MenuItem><MenuItem value="weekly">Weekly</MenuItem><MenuItem value="monthly">Monthly</MenuItem></Select></FormControl>
                            <Button type="submit" variant="outlined" startIcon={<ChevronsRight size={16}/>}>Schedule Task</Button>
                        </Stack>
                    </form>
                    <Divider sx={{my: 3}}><Typography variant="caption">Scheduled</Typography></Divider>
                    <Stack spacing={2}>
                        {maintenanceTasks.map(task => (
                            <Stack key={task.id} direction="row" alignItems="center" spacing={2} sx={{bgcolor: 'background.default', p: 1.5, borderRadius: 2}}>
                                <CalendarClock size={20} color={theme.palette.text.secondary} />
                                <Box><Typography variant="body2" fontWeight="500" color="text.primary">{task.name}</Typography><Typography variant="caption" color="text.secondary">Next run: {new Date(task.nextRun).toLocaleDateString()}</Typography></Box>
                            </Stack>
                        ))}
                    </Stack>
                </Paper>
            </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}

export default TicketSystem;