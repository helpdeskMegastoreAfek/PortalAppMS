const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require('path');



dotenv.config();
const app = express();

const corsOptions = {
  origin: [
    "https://172.20.0.49:5173",
    "http://172.20.0.49:5173",
    "http://10.0.0.102:5173",
    "https://localhost:5173",
    "http://localhost:5173",
    "http://localhost:4173",
    "https://10.0.0.5:5173",
    "http://10.0.0.5:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
console.log("Registering auth routes");

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const getUsersRoutes = require("./routes/getUsers");
app.use("/api/getUsers", getUsersRoutes);

const inventoryRoutes = require("./routes/inventory");
app.use("/api/inventory", inventoryRoutes);

const mealsRoutes = require("./routes/meals");
app.use("/api/meals", mealsRoutes);

const invoiceRoutes = require('./routes/invoices');
app.use("/api/invoices", invoiceRoutes);

const uploadRoutes = require('./routes/uploadRoutes');
app.use("/api/upload", uploadRoutes);

const citiesRoutes = require('./routes/cities');
app.use("/api/cities", citiesRoutes);

const logsRoutes = require('./routes/logs')
app.use("/api/logs", logsRoutes)

const brokenBoxesRoute = require('./routes/brokenBoxes');
app.use('/api/broken-boxes', brokenBoxesRoute);

const assetRoutes = require('./routes/asset.routes');
app.use('/api/assets', assetRoutes);

const inventoryRoutesNew = require("./routes/inventory.routes");
app.use("/api/inventoryNew", inventoryRoutesNew);

const quantitativeRoutes = require('./routes/quantitative.routes');
app.use('/api/quantitatives', quantitativeRoutes);

const syncRoutes = require('./routes/sync.routes.js');
app.use('/api/sync', syncRoutes); 

const statisticsRouter = require('./routes/statistics.js'); 
app.use('/api/statistics', statisticsRouter);

const testRoutes = require('./routes/test.routes');
app.use('/api/test', testRoutes);

const dashboardRoutes = require('./routes/dashboard.routes');
app.use('/api/dashboard', dashboardRoutes);

const sessionsRoutes = require('./routes/sessions');
app.use('/api/sessions', sessionsRoutes);

// app.use(express.static(path.join(__dirname, 'public/dist')));
// app.get(/.*/, (req, res) => {
//   res.sendFile(path.join(__dirname, 'public/dist', 'index.html'));
// });

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(3000, "0.0.0.0", () => {
      console.log("✅ Server is running on HTTP port 3000");
    });
  })
  .catch((err) => console.error(err));
