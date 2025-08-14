const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const https = require('https');
const fs = require('fs');



dotenv.config();
const app = express();


const corsOptions = {
  origin: [
    'https://172.20.0.49:5173',
    'https://localhost:5173',    
    'http://localhost:4173'   
  ],
  optionsSuccessStatus: 200 
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

const httpsOptions = {
  key: fs.readFileSync('../my-app/localhost+1-key.pem'), 
  cert: fs.readFileSync('../my-app/localhost+1.pem')
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    https.createServer(httpsOptions, app).listen(3000, "0.0.0.0", () => {
      console.log("✅ Server is running securely on HTTPS port 3000");
    });
    
  })
  .catch((err) => console.error(err));
