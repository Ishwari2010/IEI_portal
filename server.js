// server.js
require("dotenv").config();


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
Dear Member,
Your IEI Login Credentials are as follows:

Membership ID: {membership_id}
Password: {password}

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
  members = XLSX.utils.sheet_to_json(worksheet, { raw: true });

}

function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const day = String(date_info.getUTCDate()).padStart(2, "0");
  const month = String(date_info.getUTCMonth() + 1).padStart(2, "0");
  const year = date_info.getUTCFullYear();

  return `${day}-${month}-${year}`;
}

function excelSerialToDate(serial) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + serial * 86400000);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}


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

function simulateSms(phone, messageText) {
  console.log("\n=================================================");
  console.log("SMS SIMULATION MODE");
  console.log("TO       :", phone);
  console.log("MESSAGE  :");
  console.log(messageText);
  console.log("STATUS   : SIMULATED (NO API CALL)");
  console.log("TIME     :", new Date().toISOString());
  console.log("=================================================\n");

  // Fake success response (Fast2SMS-like)
  return {
    return: true,
    simulated: true,
    request_id: "SIMULATED_" + Date.now()
  };
}


// -------------------- SMS Layer --------------------
async function sendSms(phone, messageText) {

  // 1️⃣ SIMULATION PATH
  if (SIMULATION_MODE) {
    return simulateSms(phone, messageText);
  }

  // 2️⃣ REAL SMS PATH
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    throw new Error("FAST2SMS_API_KEY not configured");
  }

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

  if (!data.return) {
    throw new Error("Fast2SMS failed: " + JSON.stringify(data));
  }

  return data;
}



// -------------------- Helpers --------------------
function generatePassword() {
  const minLength = 8;
  const maxLength = 15;

  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";

  const allChars = upper + lower + numbers + special;

  // Random length between 8 and 15
  const length =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

  let password = [
    upper[Math.floor(Math.random() * upper.length)],      // 1 uppercase
    lower[Math.floor(Math.random() * lower.length)],      // 1 lowercase
    numbers[Math.floor(Math.random() * numbers.length)],  // 1 number
    special[Math.floor(Math.random() * special.length)],  // 1 special
  ];

  // Fill remaining length
  while (password.length < length) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle password characters
  password = password.sort(() => Math.random() - 0.5);

  return password.join("");
}


function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendToMemberAndLog(member) {
  const phone = member.phoneno_clean || member.phoneno;
  if (!phone) {
    return { success: false, error: "No phone number available" };
  }

  if (!member.password) member.password = generatePassword();

  // Build final message using template
  const messageText = smsTemplate
    .replace("{membership_id}", member.membership_id)
    .replace("{password}", member.password);

  try {
    const result = await sendSms(phone, messageText);
    
   const logEntry = {
  membership_id: member.membership_id,
  name: member.name,
  email: member.email,
  dob: member.dob || "N/A",
  phone,
  last4: phone.slice(-4),
  status: SIMULATION_MODE ? "simulated" : "sent",
  timestamp: new Date().toISOString(),
};


    sentLogs.unshift(logEntry);

    return {
      success: result.return === true,
      message: result.return ? "SMS sent successfully" : "SMS sending may have failed",
      messageId: result.request_id || null,
      phone: phone.slice(-4)
    };
  } catch (error) {
    const logEntry = {
      membership_id: member.membership_id,
      name: member.name,
      email: member.email,
      phone,
      last4: phone.slice(-4),
      status: "failed",
      timestamp: new Date().toISOString(),
      error: error.message,
    };
    sentLogs.unshift(logEntry);

    return {
      success: false,
      error: error.message,
      phone: phone.slice(-4)
    };
  }
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
  try {
    const member = members.find(m => m.membership_id === req.body.membership_id);
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        message: "Member not found",
        error: "No member found with the provided membership ID"
      });
    }

    const result = await sendToMemberAndLog(member);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        messageId: result.messageId,
        phone: result.phone,
        memberName: member.name
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to send SMS",
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while sending SMS",
      error: error.message
    });
  }
});

// Bulk send
app.post("/bulk-send", async (req, res) => {
  try {
    const { batchSize = 5, delayMs = 3000, start = 0, limit } = req.body;
    const end = limit ? start + limit : members.length;
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = start; i < end; i += batchSize) {
      for (const m of members.slice(i, i + batchSize)) {
        const result = await sendToMemberAndLog(m);
        if (result && result.success) {
          successCount++;
        } else {
          failCount++;
          if (result && result.error) {
            errors.push(`${m.membership_id}: ${result.error}`);
          }
        }
      }
      await sleep(delayMs);
    }

    res.json({
      success: true,
      message: "Bulk send completed",
      stats: {
        total: successCount + failCount,
        successful: successCount,
        failed: failCount
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Limit to first 10 errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bulk send failed",
      error: error.message
    });
  }
});

// Manual numbers
app.post("/send-manual-numbers", async (req, res) => {
  try {
    const { numbers, message } = req.body;
    
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No phone numbers provided",
        error: "Please provide at least one phone number"
      });
    }

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const n of numbers) {
      const phone = String(n).replace(/\D/g, "");
      if (phone.length < 10) {
        failCount++;
        results.push({ phone: phone || n, success: false, error: "Invalid phone number" });
        continue;
      }

      try {
        const result = await sendSms(phone, message || "IEI Notification");
        const isSuccess = result && result.return === true;

        sentLogs.unshift({
          membership_id: "MANUAL",
          name: "Manual Entry",
          email: "",
          phone,
          last4: phone.slice(-4),
          status: SIMULATION_MODE ? "simulated" : (isSuccess ? "sent" : "failed"),
          timestamp: new Date().toISOString(),
          providerResult: result,
        });

        if (isSuccess) {
          successCount++;
          results.push({ phone: phone.slice(-4), success: true, messageId: result.request_id });
        } else {
          failCount++;
          results.push({ phone: phone.slice(-4), success: false, error: "SMS provider returned error" });
        }
      } catch (error) {
        failCount++;
        results.push({ phone: phone.slice(-4), success: false, error: error.message });
        
        sentLogs.unshift({
          membership_id: "MANUAL",
          name: "Manual Entry",
          email: "",
          phone,
          last4: phone.slice(-4),
          status: "failed",
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `SMS sent to ${successCount} number(s), ${failCount} failed`,
      stats: {
        total: numbers.length,
        successful: successCount,
        failed: failCount
      },
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send manual SMS",
      error: error.message
    });
  }
});

// ================= UPDATE SMS TEMPLATE =================
app.post("/update-template", (req, res) => {
  const { template } = req.body;

  if (!template || !template.includes("{membership_id}") || !template.includes("{password}")) {
    return res.status(400).json({
      success: false,
      message: "Template must include {membership_id} and {password}"
    });
  }

  smsTemplate = template;
  res.json({ success: true, message: "Template updated successfully" });
});

// Logs
app.get("/sent-logs", (req, res) => {
  res.json(sentLogs.slice(0, 300));
});

// -------------------- Start --------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
