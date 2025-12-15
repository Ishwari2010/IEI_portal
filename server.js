// server.js
const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
const PORT = 3000;

// -------------------- Config --------------------
const SIMULATION_MODE = true; // set to false when you plug a real SMS provider
const AUTO_RUN_BULK = false; // set to true to auto-start bulk job on server start (for demo)

// -------------------- Middleware --------------------
app.use(cors());
app.use(express.json());

// ==================== FRONTEND SERVING (FIX) ====================
app.use(express.static(path.join(__dirname, "IEI_frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "IEI_frontend", "index.html"));
});
// ================================================================


// ---------- Load Excel at startup ----------
const excelPath = path.join(__dirname, "iei_processed_members.xlsx");

// Read the workbook
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert sheet to JSON array
let members = XLSX.utils.sheet_to_json(worksheet);

// ---------- Password generator ----------
function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

// ---------- Normalize members ----------
members = members.map((m) => {
  const normalized = {
    ...m,
    membership_id: m.membership_id ? String(m.membership_id).trim() : "",
    name: m.name ? String(m.name) : "",
    email: m.email ? String(m.email) : "",
    phoneno_clean: m.phoneno_clean ? String(m.phoneno_clean) : null,
    phoneno: m.phoneno ? String(m.phoneno) : null,
  };

  if (!normalized.password) {
    normalized.password = undefined;
  }

  return normalized;
});

console.log(`Loaded ${members.length} members from Excel`);

members.slice(0, 20).forEach((m, idx) =>
  console.log(
    `[DATA] ${idx}: ${m.membership_id} -> ${m.phoneno_clean || m.phoneno || "NO_PHONE"}`
  )
);

// ---------- In-memory sent logs ----------
const sentLogs = [];

// ---------- SMS layer ----------
async function sendSms(phone, messageText) {
  if (SIMULATION_MODE) {
    console.log(`[SIMULATION] SMS to ${phone}: "${messageText}"`);
    return { status: "simulated" };
  }

  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) throw new Error("SMS_API_KEY not configured");

  throw new Error("Real SMS mode not implemented");
}

// ---------- Helpers ----------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToMemberAndLog(member) {
  const phone =
    member.phoneno_clean && member.phoneno_clean !== "null"
      ? member.phoneno_clean
      : member.phoneno;

  if (!phone) return;

  if (!member.password) {
    member.password = generatePassword(10);
  }

  const smsText = `Your IEI portal password is: ${member.password}`;
  const result = await sendSms(String(phone), smsText);

  sentLogs.unshift({
  membership_id: member.membership_id,
  name: member.name || "",
  email: member.email || "",
  phone: String(phone),
  last4: String(phone).slice(-4),
  status: SIMULATION_MODE ? "simulated" : "sent",
  timestamp: new Date().toISOString(),
  providerResult: result,
});


  if (sentLogs.length > 5000) sentLogs.length = 5000;
}

// ---------- Bulk runner ----------
async function runBulkOptions({ batchSize = 5, delayMs = 3000, start = 0, limit } = {}) {
  const end =
    limit !== undefined ? Math.min(start + limit, members.length) : members.length;

  for (let i = start; i < end; i += batchSize) {
    const batch = members.slice(i, i + batchSize);
    for (const m of batch) {
      await sendToMemberAndLog(m);
    }
    if (i + batchSize < end) await sleep(delayMs);
  }
}

// ---------- API routes ----------
app.post("/send-password", async (req, res) => {
  try {
    const { membership_id } = req.body;
    if (!membership_id) {
      return res.status(400).json({ message: "membership_id required" });
    }

    const member = members.find(
      (m) => m.membership_id === String(membership_id).trim()
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    await sendToMemberAndLog(member);
    res.json({ status: SIMULATION_MODE ? "simulated" : "sent" });
  } catch (err) {
    res.status(500).json({ message: "Failed" });
  }
});

app.post("/bulk-send", async (req, res) => {
  await runBulkOptions(req.body || {});
  res.json({ message: "Bulk send completed" });
});

app.get("/sent-logs", (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  res.json(sentLogs.slice(0, limit));
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Node backend running on http://localhost:${PORT}`);
});
