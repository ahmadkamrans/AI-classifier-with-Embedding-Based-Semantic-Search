const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Route mounting
app.use("/submit", require("./routes/submit"));
app.use("/semantic-search", require("./routes/semanticSearch"));
app.use("/reports", require("./routes/reports"));

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
