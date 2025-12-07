import pandas as pd
import random

# -------------------------------
# Helper functions
# -------------------------------

def generate_membership_id(index):
    prefixes = ["F-", "M-", "AM", "ST", "T-"]
    prefix = prefixes[index % len(prefixes)]
    base_number = 1423500 + index
    number_str = f"{base_number:07d}"
  # ensures 7 digits
    return prefix + number_str

def generate_phone():
    # Random Indian 10-digit number starting with 6/7/8/9
    start = random.choice(['6', '7', '8', '9'])
    rest = ''.join([str(random.randint(0, 9)) for _ in range(9)])
    return start + rest


# -------------------------------
# Create dummy data lists
# -------------------------------

names = [
    "Ishwari Shinde", "Atharva Palve", "Vaibhavi Rai", "Divine Marshal",
    "Nathan Johncy", "Prashant Pandita", "Abhishek Kumar", "Riya Sharma",
    "Aditya Patil", "Sneha Kulkarni", "Meera Joshi", "Karan Singh",
    "Pooja Desai", "Rohit Verma", "Ananya Gupta", "Siddharth Naik",
    "Tanya Shah", "Harshil Mehta", "Krisha Jain", "Mitali Kulkarni"
]

emails = [name.lower().replace(" ", ".") + "@example.com" for name in names]

departments = [
    "IT", "CS", "ELEC", "EXTC", "MECH",
    "EXTC", "IT", "CS", "ELEC", "MECH",
    "IT", "CS", "EXTC", "ELEC", "MECH",
    "MECH", "IT", "CS", "ELEC", "EXTC"
]

years = [
    "FE", "SE", "TE", "BE", "SE",
    "TE", "FE", "BE", "TE", "SE",
    "FE", "SE", "BE", "TE", "FE",
    "BE", "SE", "TE", "BE", "FE"
]

# Generate membership IDs and phone numbers
membership_ids = [generate_membership_id(i) for i in range(20)]
phones = [generate_phone() for _ in range(20)]

# -------------------------------
# Create DataFrame
# -------------------------------

df = pd.DataFrame({
    "membership_id": membership_ids,
    "name": names,
    "email": emails,
    "phoneno": phones,
    "department": departments,
    "year": years
})

# -------------------------------
# Save to Excel
# -------------------------------

output_file = "iei_dummy_members.xlsx"
df.to_excel(output_file, index=False)

print(f"Excel file generated successfully: {output_file}")
