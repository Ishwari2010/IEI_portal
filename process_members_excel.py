import pandas as pd

# 1️⃣ Read the Excel file you just generated
input_file = "iei_dummy_members.xlsx"

df = pd.read_excel(input_file)

# 2️⃣ Print first few rows to check
print("Excel loaded successfully. Preview:\n")
print(df.head())

import re  # for cleaning digits

# 3️⃣ Function to clean phone numbers (keep only digits)
def clean_phone(phone):
    phone_str = str(phone)
    digits_only = re.sub(r"\D", "", phone_str)  # remove everything except digits
    return digits_only

# 4️⃣ Create a new cleaned phone column
df["phoneno_clean"] = df["phoneno"].apply(clean_phone)

print("\nCleaned phone numbers added. Preview:\n")
print(df[["phoneno", "phoneno_clean"]].head())

# 5️⃣ Function to extract last 4 digits
def get_last4(phone):
    phone_str = str(phone)
    if len(phone_str) >= 4:
        return phone_str[-4:]
    else:
        return phone_str  # if it's shorter

# 6️⃣ Add a new column for last 4 digits
df["phoneno_last4"] = df["phoneno_clean"].apply(get_last4)

print("\nLast 4 digits extracted. Preview:\n")
print(df[["phoneno_clean", "phoneno_last4"]].head())

# 7️⃣ Save the processed data to a new Excel file
output_file = "iei_processed_members.xlsx"
df.to_excel(output_file, index=False)

print(f"\nProcessed file saved as: {output_file}")
