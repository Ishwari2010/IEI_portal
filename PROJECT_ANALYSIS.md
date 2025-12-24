# IEI Portal - Complete Project Analysis

## 📋 Project Overview

**IEI SMS Management System** is a web-based platform for managing and sending SMS notifications to IEI (Institution of Engineers India) members. The system allows administrators to upload member data via Excel files and send password credentials or custom messages via SMS.

---

## 🏗️ Architecture

### **Technology Stack**

#### Backend
- **Node.js** with **Express.js** (v5.2.1) - Main server
- **Fast2SMS API** - SMS gateway service
- **XLSX** (SheetJS) - Excel file processing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

#### Frontend
- **Vanilla HTML/CSS/JavaScript** - Single-page application
- Responsive design with modern UI

#### Python Scripts (Supporting Tools)
- **pandas** - Data processing
- **requests** - HTTP API calls (for alternative SMS providers)

---

## 📁 Project Structure

```
IEI_portal/
├── server.js                    # Main Express server (Node.js)
├── bulk_send.js                 # Standalone bulk SMS script (Node.js)
├── bulk_send.py                 # Standalone bulk SMS script (Python)
├── send_student_sms.py          # TextBee SMS integration (Python)
├── process_members_excel.py     # Excel data processing utility
├── generate_members_excel.py    # Dummy data generator
├── package.json                 # Node.js dependencies
├── iei_dummy_members.xlsx       # Sample member data
├── iei_processed_members.xlsx   # Processed member data (used by server)
└── IEI_frontend/
    └── index.html               # Web interface
```

---

## 🔑 Key Features

### 1. **User Password Request**
   - Members can request their portal password via SMS
   - Uses membership ID (prefix + 7-digit number)
   - Automatically generates secure passwords (8-15 characters)

### 2. **Excel Upload & Management**
   - Upload Excel files with member data
   - Supports columns: `membership_id`, `name`, `email`, `phoneno`, `phoneno_clean`
   - Data normalization and validation

### 3. **Bulk SMS Sending**
   - Batch processing with configurable batch size
   - Rate limiting with delays between batches
   - Start index and limit controls for partial sends
   - Progress tracking and logging

### 4. **Manual SMS**
   - Send SMS to custom phone numbers
   - Custom message support
   - Phone number validation and cleaning

### 5. **Activity Logging**
   - Real-time sent message logs
   - Tracks: membership ID, name, email, phone (last 4 digits), timestamp, status
   - Last 300 entries displayed

---

## 🔧 Configuration

### Environment Variables Required

Create a `.env` file in the `IEI_portal` directory:

```env
FAST2SMS_API_KEY=your_fast2sms_api_key_here
```

**How to get Fast2SMS API Key:**
1. Register at https://www.fast2sms.com
2. Get your API key from the dashboard
3. Add it to `.env` file

### Server Configuration

- **Port**: 3000 (default, can be changed in `server.js`)
- **Simulation Mode**: Set `SIMULATION_MODE = false` in `server.js` to enable real SMS sending

---

## 🚀 How to Run the Project

### Prerequisites

1. **Node.js** (v14 or higher)
2. **Python 3** (for Python scripts, optional)
3. **npm** (comes with Node.js)

### Step-by-Step Setup

#### 1. Install Node.js Dependencies

```bash
cd IEI_portal
npm install
```

This installs:
- express
- cors
- dotenv
- multer
- xlsx

#### 2. Create Environment File

Create `.env` file in `IEI_portal` directory:

```bash
# Windows PowerShell
New-Item -Path .env -ItemType File

# Or manually create .env file with:
FAST2SMS_API_KEY=your_api_key_here
```

#### 3. Prepare Member Data (Optional)

If you don't have `iei_processed_members.xlsx`:

**Option A: Generate dummy data**
```bash
python generate_members_excel.py
python process_members_excel.py
```

**Option B: Use your own Excel file**
- Ensure columns: `membership_id`, `name`, `email`, `phoneno`
- Upload via web interface after starting server

#### 4. Start the Server

```bash
node server.js
```

You should see:
```
Server running at http://localhost:3000
```

#### 5. Access the Web Interface

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📱 API Endpoints

### `POST /upload-excel`
Upload Excel file with member data.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (Excel file)

**Response:**
```json
{
  "message": "Excel uploaded successfully",
  "totalMembers": 150
}
```

### `POST /send-password`
Send password SMS to a single member.

**Request:**
```json
{
  "membership_id": "F-1423500"
}
```

**Response:**
```json
{
  "status": "ok"
}
```

### `POST /bulk-send`
Send SMS to multiple members in batches.

**Request:**
```json
{
  "batchSize": 5,
  "delayMs": 3000,
  "start": 0,
  "limit": 100
}
```

**Response:**
```json
{
  "message": "Bulk send completed"
}
```

### `POST /send-manual-numbers`
Send SMS to custom phone numbers.

**Request:**
```json
{
  "numbers": ["9876543210", "9876543211"],
  "message": "Custom message text"
}
```

**Response:**
```json
{
  "message": "SMS sent to manual numbers"
}
```

### `GET /sent-logs`
Get list of sent messages (last 300).

**Response:**
```json
[
  {
    "membership_id": "F-1423500",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "last4": "3210",
    "status": "sent",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "providerResult": {...}
  }
]
```

---

## 🐍 Python Scripts Usage

### 1. `generate_members_excel.py`
Generates dummy member data for testing.

```bash
python generate_members_excel.py
```
Creates: `iei_dummy_members.xlsx`

### 2. `process_members_excel.py`
Cleans phone numbers and processes Excel data.

```bash
python process_members_excel.py
```
- Reads: `iei_dummy_members.xlsx`
- Creates: `iei_processed_members.xlsx`
- Adds: `phoneno_clean`, `phoneno_last4` columns

### 3. `bulk_send.py`
Standalone bulk SMS script (simulation mode).

```bash
python bulk_send.py
```
**Note:** This is a simulation script. Modify to integrate with actual SMS API.

### 4. `send_student_sms.py`
TextBee SMS integration (alternative SMS provider).

**Setup:**
1. Get TextBee API credentials
2. Update `API_KEY` and `DEVICE_ID` in the script
3. Run:
```bash
python send_student_sms.py
```

### 5. `bulk_send.js`
Standalone Node.js bulk SMS script (simulation).

```bash
node bulk_send.js
```

---

## 🔐 Password Generation

The system generates secure passwords with:
- **Length**: 8-15 characters (random)
- **Requirements**:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*)
- **Format**: Randomly shuffled

---

## 📊 Data Flow

1. **Excel Upload** → Server reads and normalizes data
2. **Member Lookup** → Find member by `membership_id`
3. **Password Generation** → Create secure password (if not exists)
4. **SMS Sending** → Call Fast2SMS API
5. **Logging** → Store result in `sentLogs` array
6. **Frontend Display** → Show logs in web interface

---

## ⚠️ Important Notes

### Security
- **API Keys**: Never commit `.env` file to version control
- **Phone Numbers**: Only last 4 digits displayed in logs
- **Simulation Mode**: Test with `SIMULATION_MODE = true` before production

### Rate Limiting
- Fast2SMS has rate limits
- Default batch size: 5 messages
- Default delay: 3 seconds between batches
- Adjust based on your API plan

### Data Requirements
- Excel file must have `membership_id` column
- Phone numbers should be in `phoneno` or `phoneno_clean` column
- Phone numbers are automatically cleaned (digits only)

---

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is available
- Verify Node.js is installed: `node --version`
- Check dependencies: `npm install`

### SMS not sending
- Verify `FAST2SMS_API_KEY` in `.env`
- Check `SIMULATION_MODE` is `false`
- Verify phone numbers are valid (10+ digits)
- Check Fast2SMS account balance/limits

### Excel upload fails
- Ensure file is `.xlsx` or `.xls` format
- Check required columns exist
- Verify file is not corrupted

### Frontend not loading
- Check server is running
- Verify `IEI_frontend/index.html` exists
- Check browser console for errors

---

## 🔄 Alternative SMS Providers

The project includes integration examples for:
- **Fast2SMS** (primary, in `server.js`)
- **TextBee** (alternative, in `send_student_sms.py`)

To switch providers, modify the `sendSms()` function in `server.js`.

---

## 📈 Future Enhancements

Potential improvements:
- Database integration (replace in-memory storage)
- User authentication for admin panel
- Email notifications
- SMS templates
- Scheduled sending
- Analytics dashboard
- Export logs to Excel/CSV
- Multi-language support

---

## 📝 License

ISC License (as per package.json)

---

## 👥 Author

Repository: https://github.com/Ishwari2010/IEI_portal

---

## 🎯 Quick Start Summary

```bash
# 1. Install dependencies
cd IEI_portal
npm install

# 2. Create .env file
echo "FAST2SMS_API_KEY=your_key_here" > .env

# 3. (Optional) Generate test data
python generate_members_excel.py
python process_members_excel.py

# 4. Start server
node server.js

# 5. Open browser
# http://localhost:3000
```

---

**Last Updated**: Based on current codebase analysis
**Version**: 1.0.0

