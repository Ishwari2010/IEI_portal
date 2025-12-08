const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // to read JSON body

// ---------- Load Excel at startup ----------
const excelPath = path.join(__dirname, "iei_processed_members.xlsx");

// Read the workbook
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0]; // first sheet
const worksheet = workbook.Sheets[sheetName];

// Convert sheet to JSON array
let members = XLSX.utils.sheet_to_json(worksheet);

members = members.map((m) => {
  return {
    ...m,
    membership_id: String(m.membership_id).trim(),
    phoneno_clean: m.phoneno_clean ? String(m.phoneno_clean) : null,
    phoneno: m.phoneno ? String(m.phoneno) : null,
  };
});

console.log(`Loaded ${members.length} members from Excel`);

// ---------- API endpoint ----------
app.post("/send-password", (req, res) => {
  const { membership_id } = req.body;

  if (!membership_id) {
    return res.status(400).json({ message: "membership_id is required" });
  }

  const member = members.find(
    (m) => m.membership_id === String(membership_id).trim()
  );

  if (!member) {
    return res.status(404).json({ message: "Membership ID not found" });
  }

  const phone =
    member.phoneno_clean && member.phoneno_clean !== "null"
      ? member.phoneno_clean
      : member.phoneno;

  if (!phone) {
    return res
      .status(500)
      .json({ message: "Phone number not available for this member" });
  }

  const phoneStr = String(phone);
  const last4 = phoneStr.slice(-4);

  console.log(
    `[SIMULATED] Would send password SMS for ${membership_id} to ${phoneStr}`
  );

  return res.json({
    message: "SMS triggered",
    last4: last4,
  });
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Node backend running on http://localhost:${PORT}`);
});
