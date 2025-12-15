// server.js
const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 3000;

// -------------------- Config --------------------
const SIMULATION_MODE = true;

// -------------------- Middleware --------------------
app.use(cors());
app.use(express.json());

// ==================== FRONTEND SERVING ====================
app.use(express.static(path.join(__dirname, "IEI_frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "IEI_frontend", "index.html"));
});
// =========================================================

// -------------------- File Upload Config --------------------
const upload = multer({ storage: multer.memoryStorage() });

// -------------------- Load Excel at startup --------------------
const excelPath = path.join(__dirname, "iei_processed_members.xlsx");
let members = [];

if (require("fs").existsSync(excelPath)) {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  members = XLSX.utils.sheet_to_json(worksheet);
}

function normalizeMembers(data) {
  return data.map((m) => ({
    membership_id: m.membership_id ? String(m.membership_id).trim() : "",
    name: m.name ? String(m.name) : "",
    email: m.email ? String(m.email) : "",
    phoneno_clean: m.phoneno_clean ? String(m.phoneno_clean) : null,
    phoneno: m.phoneno ? String(m.phoneno) : null,
    password: undefined,
  }));
}

members = normalizeMembers(members);

// -------------------- Logs --------------------
const sentLogs = [];

// -------------------- SMS Layer --------------------
async function sendSms(phone, messageText) {
  if (SIMULATION_MODE) {
    console.log(`[SIMULATION] SMS to ${phone}: ${messageText}`);
    return { status: "simulated" };
  }
  throw new Error("Real SMS not configured");
}

// -------------------- Helpers --------------------
function generatePassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendToMemberAndLog(member) {
  const phone = member.phoneno_clean || member.phoneno;
  if (!phone) return;

  if (!member.password) member.password = generatePassword();

  const result = await sendSms(phone, `Your IEI portal password is: ${member.password}`);

  sentLogs.unshift({
    membership_id: member.membership_id,
    name: member.name,
    email: member.email,
    phone,
    last4: phone.slice(-4),
    status: SIMULATION_MODE ? "simulated" : "sent",
    timestamp: new Date().toISOString(),
    providerResult: result,
  });
}

// -------------------- APIs --------------------

// Upload Excel
app.post("/upload-excel", upload.single("file"), (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    members = normalizeMembers(XLSX.utils.sheet_to_json(ws));
    sentLogs.length = 0;
    res.json({ message: "Excel uploaded successfully", totalMembers: members.length });
  } catch {
    res.status(500).json({ message: "Invalid Excel file" });
  }
});

// Single send
app.post("/send-password", async (req, res) => {
  const member = members.find(m => m.membership_id === req.body.membership_id);
  if (!member) return res.status(404).json({ message: "Member not found" });
  await sendToMemberAndLog(member);
  res.json({ status: "ok" });
});

// Bulk send
app.post("/bulk-send", async (req, res) => {
  const { batchSize = 5, delayMs = 3000, start = 0, limit } = req.body;
  const end = limit ? start + limit : members.length;

  for (let i = start; i < end; i += batchSize) {
    for (const m of members.slice(i, i + batchSize)) {
      await sendToMemberAndLog(m);
    }
    await sleep(delayMs);
  }
  res.json({ message: "Bulk send completed" });
});

// Manual numbers
app.post("/send-manual-numbers", async (req, res) => {
  const { numbers, message } = req.body;

  for (const n of numbers) {
    const phone = String(n).replace(/\D/g, "");
    if (phone.length < 10) continue;

    await sendSms(phone, message || "IEI Notification");

    sentLogs.unshift({
      membership_id: "MANUAL",
      name: "Manual Entry",
      email: "",
      phone,
      last4: phone.slice(-4),
      status: SIMULATION_MODE ? "simulated" : "sent",
      timestamp: new Date().toISOString(),
    });
  }
  res.json({ message: "SMS sent to manual numbers" });
});

// Logs
app.get("/sent-logs", (req, res) => {
  res.json(sentLogs.slice(0, 300));
});

// -------------------- Start --------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
