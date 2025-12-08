import pandas as pd
import time
# import requests  # uncomment later when you actually call an API


# 1️⃣ This function will send the message for ONE member
def send_password_for_member(membership_id: str, phone: str):
    """
    Here we will contact the IEI system / API to trigger the SMS.
    For now, we are just simulating by printing.
    """

    # 🔹 TODO: In the future, call the real IEI API here.
    # Example (just an idea, not real):
    # response = requests.post(
    #     "https://iei-portal/send-password",
    #     json={"membership_id": membership_id, "phone": phone}
    # )
    # print(response.status_code, response.json())

    print(f"[SIMULATED] Sending password SMS for {membership_id} to {phone}")


# 2️⃣ Read the processed Excel file
file_path = "iei_processed_members.xlsx"  # must be in the same folder
df = pd.read_excel(file_path)

# Just to be safe, convert phone to string
df["phoneno_clean"] = df["phoneno_clean"].astype(str)

print(f"Total members found: {len(df)}")


# 3️⃣ Decide how many people per batch
BATCH_SIZE = 5        # send to 5 people at a time
DELAY_SECONDS = 3     # wait 3 seconds between batches (you can change this)


# 4️⃣ Loop over the DataFrame in steps of BATCH_SIZE
batch_number = 0

for start_index in range(0, len(df), BATCH_SIZE):
    batch_number += 1
    end_index = start_index + BATCH_SIZE
    batch_df = df.iloc[start_index:end_index]

    print(f"\n=== Sending batch {batch_number} (rows {start_index} to {end_index - 1}) ===")

    # 5️⃣ For each member in this batch, send the SMS
    for _, row in batch_df.iterrows():
        membership_id = row["membership_id"]
        phone = row["phoneno_clean"]

        send_password_for_member(membership_id, phone)

    # 6️⃣ After finishing one batch, wait a few seconds before the next one
    # (But don't wait after the last batch)
    if end_index < len(df):
        print(f"Waiting {DELAY_SECONDS} seconds before next batch...\n")
        time.sleep(DELAY_SECONDS)

print("\n✅ Done sending messages to all members (simulated).")
