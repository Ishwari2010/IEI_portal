const XLSX = require("xlsx");

// 1️⃣ Read Excel file
const workbook = XLSX.readFile("iei_processed_members.xlsx");
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
let members = XLSX.utils.sheet_to_json(worksheet);

// Normalize fields
members = members.map((m) => {
  return {
    ...m,
    membership_id: String(m.membership_id).trim(),
    phoneno_clean: m.phoneno_clean ? String(m.phoneno_clean) : null,
    phoneno: m.phoneno ? String(m.phoneno) : null,
  };
});

console.log(`Total members found: ${members.length}`);

// 2️⃣ Helper: simulate sending SMS for ONE member
async function sendPasswordForMember(member) {
  const membershipId = member.membership_id;
  const phone =
    member.phoneno_clean && member.phoneno_clean !== "null"
      ? member.phoneno_clean
      : member.phoneno;

  if (!phone) {
    console.log(`[SKIP] No phone for member ${membershipId}, skipping...`);
    return;
  }

  const last4 = String(phone).slice(-4);

  console.log(
    `[SIMULATED] Sending password SMS for ${membershipId} to ${phone} (ending with ${last4})`
  );
}

// 3️⃣ Helper: sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 4️⃣ Batch sending logic
async function sendInBatches() {
  const BATCH_SIZE = 5;
  const DELAY_MS = 3000;

  let batchNumber = 0;

  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    batchNumber++;
    const batch = members.slice(i, i + BATCH_SIZE);

    console.log(
      `\n=== Sending batch ${batchNumber} (members ${i + 1} to ${
        i + batch.length
      }) ===`
    );

    for (const member of batch) {
      await sendPasswordForMember(member);
    }

    if (i + BATCH_SIZE < members.length) {
      console.log(`Waiting ${DELAY_MS / 1000} seconds before next batch...\n`);
      await sleep(DELAY_MS);
    }
  }

  console.log("\n✅ Done sending messages to all members (simulated).");
}

// 5️⃣ Run
sendInBatches().catch(console.error);
