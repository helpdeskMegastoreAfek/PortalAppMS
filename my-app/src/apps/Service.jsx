// import React, { useState, useEffect } from 'react';

// // MUI Components for UI and Styling
// import {
//   Container,
//   Paper,
//   Grid,
//   TextField,
//   Button,
//   Typography,
//   List,
//   ListItem,
//   ListItemText,
//   IconButton,
//   Divider,
//   Box
// } from '@mui/material';
// import DeleteIcon from '@mui/icons-material/Delete';

// // MUI Date & Time Pickers
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

// // Toast Notifications
// import { Toaster, toast } from 'react-hot-toast';

// // CSV Export
// import { CSVLink } from 'react-csv';

// // --- Main Service Page Component ---
// function ServicePage() {
//   // State for service calls
//   const [serviceCalls, setServiceCalls] = useState([]);
//   const [callName, setCallName] = useState('');
//   const [callDescription, setCallDescription] = useState('');
//   const [startTime, setStartTime] = useState(new Date());

//   // State for checklist
//   const [checklistItems, setChecklistItems] = useState([]);
//   const [newItemText, setNewItemText] = useState('');
//   const [alertTime, setAlertTime] = useState('');

//   // Effect for handling checklist notifications
//   useEffect(() => {
//     let timer;
//     if (alertTime) {
//       const alertTimestamp = new Date(alertTime).getTime();
//       const now = new Date().getTime();
//       const delay = alertTimestamp - now;

//       if (delay > 0) {
//         timer = setTimeout(() => {
//           toast.success('🔔 תזכורת: יש לבצע את הבדיקות!', {
//             duration: 6000,
//             icon: '🔔',
//           });
//         }, delay);
//       }
//     }
//     // Cleanup function to clear the timer if the component unmounts or alertTime changes
//     return () => clearTimeout(timer);
//   }, [alertTime]);

//   // --- Handlers for Service Calls ---
//   const handleAddCall = () => {
//     if (!callName.trim() || !callDescription.trim()) {
//       toast.error('יש למלא שם ותיאור תקלה.');
//       return;
//     }
//     const newCall = {
//       id: Date.now(),
//       name: callName,
//       description: callDescription,
//       startTime: startTime.toISOString(),
//       endTime: null,
//       status: 'פתוח',
//     };
//     setServiceCalls([newCall, ...serviceCalls]);
//     toast.success('תקלה חדשה נוצרה בהצלחה!');
//     // Reset form
//     setCallName('');
//     setCallDescription('');
//     setStartTime(new Date());
//   };

//   const handleCloseCall = (id) => {
//     setServiceCalls(
//       serviceCalls.map((call) =>
//         call.id === id ? { ...call, status: 'סגור', endTime: new Date().toISOString() } : call
//       )
//     );
//     toast.success('התקלה נסגרה.');
//   };

//   // --- Handlers for Checklist ---
//   const handleAddChecklistItem = () => {
//     if (!newItemText.trim()) return;
//     setChecklistItems([...checklistItems, { id: Date.now(), text: newItemText }]);
//     setNewItemText('');
//   };

//   const handleRemoveChecklistItem = (id) => {
//     setChecklistItems(checklistItems.filter((item) => item.id !== id));
//   };

//   // --- CSV Report Data ---
//   const csvHeaders = [
//     { label: "מזהה", key: "id" },
//     { label: "שם", key: "name" },
//     { label: "תיאור התקלה", key: "description" },
//     { label: "סטטוס", key: "status" },
//     { label: "תאריך ושעת התחלה", key: "startTime" },
//     { label: "תאריך ושעת סיום", key: "endTime" },
//   ];

//   return (
//     <LocalizationProvider dateAdapter={AdapterDateFns}>
//       <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
//         <Toaster position="top-center" reverseOrder={false} />

//         <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: '16px' }}>
//           <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
//             דף ניהול שירות
//           </Typography>

//           <Grid container spacing={5} sx={{ mt: 2 }}>
//             {/* Left Column: Create a new call */}
//             <Grid item xs={12} md={6}>
//               <Typography variant="h6" component="h2" gutterBottom>
//                 יצירת תקלה חדשה
//               </Typography>
//               <Box component="form" noValidate autoComplete="off">
//                 <TextField
//                   label="שם"
//                   value={callName}
//                   onChange={(e) => setCallName(e.target.value)}
//                   fullWidth
//                   margin="normal"
//                 />
//                 <TextField
//                   label="תיאור התקלה"
//                   value={callDescription}
//                   onChange={(e) => setCallDescription(e.target.value)}
//                   fullWidth
//                   multiline
//                   rows={3}
//                   margin="normal"
//                 />
//                 <DateTimePicker
//                   label="תאריך ושעת התחלה"
//                   value={startTime}
//                   onChange={(newValue) => setStartTime(newValue)}
//                   renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
//                 />
//                 <Button
//                   variant="contained"
//                   onClick={handleAddCall}
//                   fullWidth
//                   sx={{ mt: 2, py: 1.5 }}
//                 >
//                   צור תקלה
//                 </Button>
//               </Box>
//             </Grid>

//             {/* Right Column: Checklist */}
//             <Grid item xs={12} md={6}>
//               <Typography variant="h6" component="h2" gutterBottom>
//                 רשימת בדיקות
//               </Typography>
//               <Box display="flex" mb={2}>
//                 <TextField
//                   label="הוסף משימה לבדיקה"
//                   value={newItemText}
//                   onChange={(e) => setNewItemText(e.target.value)}
//                   variant="outlined"
//                   size="small"
//                   fullWidth
//                 />
//                 <Button onClick={handleAddChecklistItem} variant="contained" sx={{ ml: 1 }}>
//                   הוסף
//                 </Button>
//               </Box>
//               <List sx={{ maxHeight: 200, overflow: 'auto', mb:2 }}>
//                 {checklistItems.map((item) => (
//                   <ListItem key={item.id} secondaryAction={
//                     <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveChecklistItem(item.id)}>
//                       <DeleteIcon />
//                     </IconButton>
//                   }>
//                     <ListItemText primary={item.text} />
//                   </ListItem>
//                 ))}
//               </List>
//               <Typography variant="body1" gutterBottom>
//                 הגדר התראה לבדיקות
//               </Typography>
//               <TextField
//                 type="datetime-local"
//                 value={alertTime}
//                 onChange={(e) => setAlertTime(e.target.value)}
//                 InputLabelProps={{ shrink: true }}
//                 fullWidth
//               />
//             </Grid>
//           </Grid>

//           <Divider sx={{ my: 4 }} />

//           {/* Service Calls List */}
//           <Box>
//             <Typography variant="h5" component="h2" gutterBottom>
//               רשימת תקלות
//             </Typography>
//             <List>
//               {serviceCalls.map((call) => (
//                 <ListItem key={call.id} divider sx={{ py: 2 }}>
//                   <ListItemText
//                     primary={`${call.name} - סטטוס: ${call.status}`}
//                     secondary={
//                       <>
//                         <Typography component="span" variant="body2" color="text.primary">
//                           {call.description}
//                         </Typography>
//                         <br />
//                         נפתח ב: {new Date(call.startTime).toLocaleString('he-IL')}
//                         {call.endTime && ` | נסגר ב: ${new Date(call.endTime).toLocaleString('he-IL')}`}
//                       </>
//                     }
//                   />
//                   {call.status === 'פתוח' && (
//                     <Button variant="outlined" color="secondary" onClick={() => handleCloseCall(call.id)}>
//                       סגור תקלה
//                     </Button>
//                   )}
//                 </ListItem>
//               ))}
//             </List>
//           </Box>

//           <Divider sx={{ my: 4 }} />

//           {/* Report Export Section */}
//           <Box textAlign="center">
//             <Typography variant="h5" component="h2" gutterBottom>
//               הפקת דוח
//             </Typography>
//             <CSVLink
//               data={serviceCalls}
//               headers={csvHeaders}
//               filename={"service_calls_report.csv"}
//               style={{ textDecoration: 'none' }}
//               >
//               <Button variant="contained" color="success">
//                 ייצא דוח תקלות ל-CSV
//               </Button>
//             </CSVLink>
//           </Box>
//         </Paper>
//       </Container>
//     </LocalizationProvider>
//   );
// }

// export default ServicePage;
