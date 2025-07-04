const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

app.use(cors());
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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(5000, "0.0.0.0", () =>
      console.log("Server running on port 5000")
    );
  })
  .catch((err) => console.error(err));
