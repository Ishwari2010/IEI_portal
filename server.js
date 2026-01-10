// server.js
require("dotenv").config();

const cron = require("node-cron");
const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 3000;

// -------------------- Config --------------------
const SIMULATION_MODE = true;

// ================= MESSAGE TEMPLATE (EDITABLE) =================
let smsTemplate = `
Dear {name},
Your IEI Login Credentials are as follows:

Membership ID: {membership_id}
Password: {password}

Regards,
IEI Administration
`;

let birthdayTemplate = `
Dear {name},

IEI wishes you a very Happy Birthday 🎉🎂
May your year ahead be filled with success and happiness.

Regards,
IEI Administration
`;

// -------------------- Middleware --------------------
app.use(cors());
app.use(express.json());

// ==================== FRONTEND SERVING ====================
app.use(express.static(path.join(__dirname, "IEI_frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "IEI_frontend", "index.html"));
});

// -------------------- File Upload Config --------------------
const upload = multer({ storage: multer.memoryStorage() });

// -------------------- Load Excel at startup --------------------
const excelPath = path.join(__dirname, "iei_processed_members.xlsx");
let members = [];

if (require("fs").existsSync(excelPath)) {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  members = XLSX.utils.sheet_to_json(worksheet, { raw: true });
}

// -------------------- Excel DOB Converter --------------------
function excelSerialToDate(serial) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + serial * 86400000);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

// -------------------- Normalize Members --------------------
function normalizeMembers(data) {
  return data.map((m) => ({
    membership_id: m.membership_id ? String(m.membership_id).trim() : "",
    name: m.name ? String(m.name) : "",
    email: m.email ? String(m.email) : "",
    phoneno_clean: m.phoneno_clean ? String(m.phoneno_clean) : null,
    phoneno: m.phoneno ? String(m.phoneno) : null,
    dob:
      typeof m.DOB === "number"
        ? excelSerialToDate(m.DOB)
        : m.DOB
        ? String(m.DOB).trim()
        : null,
    password: undefined,
  }));
}

members = normalizeMembers(members);

// -------------------- Logs --------------------
const sentLogs = [];

// -------------------- SMS Simulation --------------------
function simulateSms(phone, messageText) {
  console.log("\n=================================================");
  console.log("SMS SIMULATION MODE");
  console.log("TO       :", phone);
  console.log("MESSAGE  :");
  console.log(messageText);
  console.log("STATUS   : SIMULATED (NO API CALL)");
  console.log("TIME     :", new Date().toISOString());
  console.log("=================================================\n");

  return {
    return: true,
    simulated: true,
    request_id: "SIMULATED_" + Date.now()
  };
}

// -------------------- SMS Layer --------------------
async function sendSms(phone, messageText) {
  if (SIMULATION_MODE) {
    return simulateSms(phone, messageText);
  }

  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error("FAST2SMS_API_KEY not configured");

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      route: "q",
      message: messageText,
      numbers: phone
    })
  });

  const data = await response.json();
  if (!data.return) throw new Error("Fast2SMS failed");

  return data;
}

// -------------------- Helpers --------------------
function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const length = Math.floor(Math.random() * 8) + 8;

  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// -------------------- Birthday Check --------------------
function isBirthdayToday(dob) {
  if (!dob) return false;

  const [day, month] = dob.split("/").map(Number);
  const today = new Date();

  return (
    day === today.getDate() &&
    month === today.getMonth() + 1
  );
}

// -------------------- Send Password + Log --------------------
async function sendToMemberAndLog(member) {
  const phone = member.phoneno_clean || member.phoneno;
  if (!phone) {
    return { success: false, error: "No phone number available" };
  }

  if (!member.password) {
    member.password = generatePassword();
  }

  const messageText = smsTemplate
    .replace("{name}", member.name || "Member")
    .replace("{membership_id}", member.membership_id)
    .replace("{password}", member.password);

  try {
    const result = await sendSms(phone, messageText);

    sentLogs.unshift({
      membership_id: member.membership_id,
      name: member.name,
      email: member.email,
      dob: member.dob,
      phone,
      last4: phone.slice(-4),
      status: SIMULATION_MODE ? "simulated" : "sent",
      timestamp: new Date().toISOString(),
      type: "Login Credentials"
    });

    return {
      success: true,
      message: "SMS sent successfully",
      messageId: result.request_id || null,
      phone: phone.slice(-4)
    };
  } catch (error) {
    sentLogs.unshift({
      membership_id: member.membership_id,
      name: member.name,
      email: member.email,
      dob: member.dob,
      phone,
      last4: phone.slice(-4),
      status: "failed",
      timestamp: new Date().toISOString(),
      error: error.message
    });

    return {
      success: false,
      error: error.message,
      phone: phone.slice(-4)
    };
  }
}

// -------------------- BULK SEND --------------------
app.post("/bulk-send", async (req, res) => {
  try {
    const { batchSize = 5, delayMs = 3000, start = 0, limit } = req.body;

    const end = limit ? start + limit : members.length;
    let successCount = 0;
    let failCount = 0;

    for (let i = start; i < end; i += batchSize) {
      for (const member of members.slice(i, i + batchSize)) {
        const result = await sendToMemberAndLog(member);
        if (result.success) successCount++;
        else failCount++;
      }
      await sleep(delayMs);
    }

    res.json({
      success: true,
      message: "Bulk SMS completed",
      stats: {
        total: successCount + failCount,
        successful: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bulk send failed",
      error: error.message
    });
  }
});


// -------------------- Birthday Sender --------------------
async function sendBirthdayWishes() {
  console.log("🎂 Running Birthday Wishes Job...");

  for (const member of members) {
    if (isBirthdayToday(member.dob)) {
      const phone = member.phoneno_clean || member.phoneno;
      if (!phone) continue;

      const messageText = birthdayTemplate.replace("{name}", member.name);
      await sendSms(phone, messageText);

      sentLogs.unshift({
        membership_id: member.membership_id,
        name: member.name,
        email: member.email,
        dob: member.dob,
        phone,
        last4: phone.slice(-4),
        status: SIMULATION_MODE ? "birthday-simulated" : "birthday-sent",
        timestamp: new Date().toISOString(),
        type: "Birthday"
      });
    }
  }
}

// -------------------- UPDATE SMS TEMPLATE --------------------
app.post("/update-template", (req, res) => {
  const { template } = req.body;

  if (!template) {
    return res.status(400).json({
      success: false,
      message: "Template cannot be empty"
    });
  }

  // Required placeholders
  const required = ["{membership_id}", "{password}"];
  const missing = required.filter(p => !template.includes(p));

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Template must include: ${missing.join(", ")}`
    });
  }

  // {name} is optional and supported
  smsTemplate = template;

  res.json({
    success: true,
    message: "Message template updated successfully"
  });
});


// -------------------- Existing APIs (UNCHANGED) --------------------
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

app.get("/sent-logs", (req, res) => {
  res.json(sentLogs.slice(0, 300));
});

// -------------------- Cron (FINAL / PRODUCTION) --------------------
cron.schedule("0 9 * * *", () => {
  sendBirthdayWishes();
});

//  TEMPORARY TEST (REMOVE AFTER TESTING)
sendBirthdayWishes();

// -------------------- Start --------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
