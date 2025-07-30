const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");



dotenv.config();
const app = express();


const corsOptions = {
  origin: 'http://localhost:5173',
  preview: 'http://localhost:4173' 
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


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(3000, "0.0.0.0", () =>
      console.log("Server running on port 3000")
    );
  })
  .catch((err) => console.error(err));
