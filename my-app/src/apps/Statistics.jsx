// // components/Statistics.js
// import React, { useState, useEffect } from 'react';
// import { DataGrid } from '@mui/x-data-grid';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
// import { Card, CardContent, Typography, Grid } from '@mui/material';

// const Statistics = () => {
//     const [stats, setStats] = useState([]);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         const fetchStats = async () => {
//             try {
//                 // 1. ביצוע בקשת הרשת באמצעות fetch
//                 const response = await fetch('/api/stats/picking');

//                 // 2. בדיקה אם הבקשה הצליחה (סטטוס 200-299)
//                 // fetch לא זורק שגיאה על סטטוסים כמו 404 או 500, לכן צריך לבדוק ידנית
//                 if (!response.ok) {
//                     throw new Error(`HTTP error! status: ${response.status}`);
//                 }

//                 // 3. פיענוח התשובה מ-JSON
//                 const data = await response.json();

//                 setStats(data);
//             } catch (error) {
//                 console.error("Error fetching picking stats:", error);
//             } finally {
//                 // finally יתבצע תמיד, גם בהצלחה וגם בכישלון
//                 setLoading(false);
//             }
//         };

//         fetchStats();
//     }, []); // ה-useEffect ירוץ פעם אחת בלבד, כשהקומפוננטה עולה

//     // הכנת נתונים לתרשימים (נשאר ללא שינוי)
//     const pickerPerformance = stats.reduce((acc, curr) => {
//         // ודא שקיים מלקט (picker) ושדה כמות (quantity) לפני החישוב
//         if (curr.picker && typeof curr.quantity === 'number') {
//             acc[curr.picker] = (acc[curr.picker] || 0) + curr.quantity;
//         }
//         return acc;
//     }, {});

//     const chartData = Object.keys(pickerPerformance).map(picker => ({
//         name: picker,
//         'כמות': pickerPerformance[picker]
//     }));

//     const columns = [
//         { field: 'date', headerName: 'תאריך', width: 150,
//             // עיצוב התאריך להצגה ידידותית יותר
//             valueFormatter: (params) => new Date(params.value).toLocaleDateString('he-IL'),
//         },
//         { field: 'picker', headerName: 'מלקט', width: 130 },
//         { field: 'orderNumber', headerName: 'מספר הזמנה', width: 150 },
//         { field: 'skuCode', headerName: 'מק"ט', width: 150 },
//         { field: 'quantity', headerName: 'כמות', type: 'number', width: 110 },
//         { field: 'workstation', headerName: 'עמדת עבודה', width: 150 },
//     ];

//     return (
//         <div style={{ padding: '20px' }}>
//             <h1>סטטיסטיקת ליקוט הזמנות</h1>

//             {/* כרטיסיות סיכום */}
//             <Grid container spacing={3} sx={{ mb: 4 }}>
//                 <Grid item xs={12} sm={4}>
//                     <Card>
//                         <CardContent>
//                             <Typography variant="h5" component="div">
//                                 {new Set(stats.map(s => s.orderNumber)).size}
//                             </Typography>
//                             <Typography sx={{ mb: 1.5 }} color="text.secondary">
//                                 סך ההזמנות ששויכו
//                             </Typography>
//                         </CardContent>
//                     </Card>
//                 </Grid>
//                 {/* ניתן להוסיף עוד כרטיסיות KPI */}
//             </Grid>

//             {/* תרשים ביצועי מלקטים */}
//             <h2>ביצועי מלקטים</h2>
//             <BarChart width={600} height={300} data={chartData}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="name" />
//                 <YAxis />
//                 <Tooltip />
//                 <Legend />
//                 <Bar dataKey="כמות" fill="#8884d8" />
//             </BarChart>

//             {/* טבלת נתונים */}
//             <h2>פירוט ליקוטים</h2>
//             <div style={{ height: 400, width: '100%' }}>
//                 <DataGrid
//                     // DataGrid דורש שדה 'id' ייחודי לכל שורה
//                     rows={stats.map((row, index) => ({ id: row._id || index, ...row }))}
//                     columns={columns}
//                     pageSizeOptions={[5, 10, 20]}
//                     initialState={{
//                         pagination: {
//                             paginationModel: { pageSize: 5 },
//                         },
//                     }}
//                     loading={loading}
//                 />
//             </div>
//         </div>
//     );
// };

// export default Statistics;