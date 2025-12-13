import pandas as pd
import requests
import time  # To avoid sending too fast

# Read your CSV file
df = pd.read_csv('students.csv')

# Your TextBee credentials (replace these!)
API_KEY = "a71a0149-a893-440a-9f29-c5d0731db4ce"      # From TextBee dashboard
DEVICE_ID = "693d086c780ce16d68edd281"  # From connected phone in dashboard

# TextBee SMS endpoint
url = f"https://api.textbee.dev/api/v1/gateway/devices/{DEVICE_ID}/send-sms"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# Loop through each row and send personalized SMS
for index, row in df.iterrows():
    mobile = str(row['phoneno'])  # Use phoneno column
    if not mobile.startswith('+91'):  # Add India code if missing
        mobile = '+91' + mobile
    
    # Generate username from membership_id and password from last 4 digits
    username = row['membership_id']
    password = row['phoneno_last4']
    
    message = f"""Welcome {row['name']}!

Your College Portal Login:

Username: {username}
Temporary Password: {password}

Login: https://portal.college.in
(Change password after first login)

- IT Team"""

    payload = {
        "recipients": [mobile],  # Single recipient per call (or add multiple)
        "message": message
    }

    response = requests.post(url, json=payload, headers=headers)
    
    # Check if request was successful and SMS was queued
    if response.status_code in [200, 201] or (response.json().get('data', {}).get('success') == True):
        print(f"✅ SMS Sent to {row['name']} ({mobile}): Success")
    else:
        print(f"❌ Failed for {row['name']} ({mobile}): {response.text}")
    
    time.sleep(2)  # 2-second delay to avoid carrier spam flags

print("All SMS processing complete!")