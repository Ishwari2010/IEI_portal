const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
const PORT = 3000;

// -------------------- Config --------------------
const SIMULATION_MODE = true; // set to false later when you plug a real SMS provider

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

// Normalize fields and ensure password field exists in memory (not persisted to Excel)
function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

members = members.map((m) => {
  const normalized = {
    ...m,
    membership_id: m.membership_id ? String(m.membership_id).trim() : "",
    name: m.name ? String(m.name) : "",
    email: m.email ? String(m.email) : "",
    phoneno_clean: m.phoneno_clean ? String(m.phoneno_clean) : null,
    phoneno: m.phoneno ? String(m.phoneno) : null,
  };

  // If there is no password in the spreadsheet, create one in memory (optional)
  if (!normalized.password) {
    normalized.password = undefined; // will be generated on first send
  }

  return normalized;
});

console.log(`Loaded ${members.length} members from Excel`);

// ---------- In-memory sent logs ----------
const sentLogs = []; // newest first

// ---------- Notification / SMS service layer ----------
async function sendSms(phone, messageText) {
  if (SIMULATION_MODE) {
    // Simulation: no real SMS sent. Just log to console and return a simulated result.
    console.log(`[SIMULATION] SMS to ${phone}: "${messageText}"`);
    return { status: "simulated", info: "No real SMS sent in demo" };
  }

  // REAL mode (placeholder). Replace with real provider integration.
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    throw new Error("SMS_API_KEY not configured");
  }
  // Example with fetch/axios to your provider would go here.
  throw new Error("Real SMS mode is not implemented yet.");
}

// ---------- Helper: sleep ----------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Helper: send to one member (re-uses sendSms and sentLogs) ----------
async function sendToMemberAndLog(member) {
  const phone =
    member.phoneno_clean && member.phoneno_clean !== "null"
      ? member.phoneno_clean
      : member.phoneno;
  if (!phone) {
    console.log(`[SKIP] No phone for ${member.membership_id}`);
    return { status: "skipped", reason: "no-phone", membership_id: member.membership_id };
  }

  if (!member.password) {
    member.password = generatePassword(10);
  }
  const password = member.password;
  const smsText = `Your IEI portal password is: ${password}`;
  try {
    const smsResult = await sendSms(String(phone), smsText);
    const now = new Date().toISOString();
    sentLogs.unshift({
      membership_id: member.membership_id,
      name: member.name || "",
      email: member.email || "",
      phone: String(phone),
      last4: String(phone).slice(-4),
      status: SIMULATION_MODE ? "simulated" : "sent",
      timestamp: now,
      providerResult: smsResult,
    });
    if (sentLogs.length > 5000) sentLogs.length = 5000;
    console.log(`[BULK] Sent to ${member.membership_id} (${String(phone).slice(-4)})`);
    return { status: "ok", membership_id: member.membership_id };
  } catch (err) {
    console.error(`[BULK] Error sending to ${member.membership_id}:`, err);
    const now = new Date().toISOString();
    sentLogs.unshift({
      membership_id: member.membership_id,
      name: member.name || "",
      email: member.email || "",
      phone: String(phone),
      last4: String(phone).slice(-4),
      status: "failed",
      timestamp: now,
      providerResult: { error: String(err) },
    });
    return { status: "failed", membership_id: member.membership_id, error: String(err) };
  }
}

// ---------- API endpoint: send-password (single) ----------
app.post("/send-password", async (req, res) => {
  try {
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

    // Generate and store password in memory if not already present
    if (!member.password) {
      member.password = generatePassword(10);
    }
    const password = member.password;

    const smsText = `Your IEI portal password is: ${password}`;

    // send via notification layer (simulation or real)
    const smsResult = await sendSms(phoneStr, smsText);

    // Record the send attempt in sentLogs (newest first)
    const now = new Date().toISOString();
    sentLogs.unshift({
      membership_id: member.membership_id,
      name: member.name || "",
      email: member.email || "",
      phone: phoneStr,
      last4: last4,
      status: SIMULATION_MODE ? "simulated" : "sent",
      timestamp: now,
      providerResult: smsResult,
    });

    if (sentLogs.length > 5000) sentLogs.length = 5000;

    return res.json({
      status: SIMULATION_MODE ? "simulated" : "sent",
      message: SIMULATION_MODE
        ? "SMS sending simulated (no real SMS sent in demo)."
        : "Password SMS sent successfully.",
      last4: last4,
    });
  } catch (err) {
    console.error("Error in /send-password:", err);
    return res
      .status(500)
      .json({ message: "Failed to process request. Please try again." });
  }
});

// ---------- Bulk send endpoint ----------
/**
 * Request body (all optional):
 * {
 *   "batchSize": 5,
 *   "delayMs": 3000,
 *   "start": 0,
 *   "limit": 100
 * }
 */
app.post("/bulk-send", async (req, res) => {
  try {
    const batchSize = parseInt(req.body.batchSize) || 5;
    const delayMs = parseInt(req.body.delayMs) || 3000;
    const start = parseInt(req.body.start) || 0;
    let limit = req.body.limit !== undefined ? parseInt(req.body.limit) : members.length;

    // sanitize
    const totalMembers = members.length;
    const from = Math.max(0, Math.min(start, totalMembers - 1));
    limit = Math.max(0, Math.min(limit, totalMembers - from));

    if (limit === 0) {
      return res.status(400).json({ message: "No members to process (limit is 0 or out of range)" });
    }

    const endIndexExclusive = from + limit;
    console.log(`[BULK] Starting bulk send: members ${from} .. ${endIndexExclusive - 1}, batchSize=${batchSize}, delayMs=${delayMs}`);

    // We'll process sequentially in batches. This will keep the HTTP request open until finished.
    for (let i = from; i < endIndexExclusive; i += batchSize) {
      const batch = members.slice(i, Math.min(i + batchSize, endIndexExclusive));
      console.log(`[BULK] Processing batch for indices ${i}..${i + batch.length - 1}`);

      // send to each member in this batch sequentially (you can also do Promise.all for parallel within batch)
      for (const m of batch) {
        await sendToMemberAndLog(m);
      }

      // wait between batches unless we are at the end
      if (i + batchSize < endIndexExclusive) {
        console.log(`[BULK] Waiting ${delayMs} ms before next batch...`);
        await sleep(delayMs);
      }
    }

    console.log("[BULK] Bulk send completed.");
    return res.json({ message: "Bulk send completed", processedFrom: from, processedTo: endIndexExclusive - 1 });
  } catch (err) {
    console.error("[BULK] Error in bulk-send:", err);
    return res.status(500).json({ message: "Bulk send failed", error: String(err) });
  }
});

// ---------- API endpoint: get sent logs ----------
app.get("/sent-logs", (req, res) => {
  // Optional limit query param
  const limit = parseInt(req.query.limit) || 200;
  res.json(sentLogs.slice(0, limit));
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Node backend running on http://localhost:${PORT}`);
});
