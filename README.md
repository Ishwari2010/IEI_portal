# IEI SMS Management System

A web-based platform for sending SMS notifications and password credentials to IEI (Institution of Engineers India) members.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- npm (comes with Node.js)
- Python 3 (optional, for data processing scripts)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   FAST2SMS_API_KEY=your_api_key_here
   ```
   Get your API key from [Fast2SMS](https://www.fast2sms.com)

3. **Start the server:**
   ```bash
   node server.js
   ```

4. **Open browser:**
   Navigate to `http://localhost:3000`

## 📋 Features

- ✅ Single password SMS sending
- ✅ Bulk SMS with batch processing
- ✅ Excel file upload for member management
- ✅ Manual SMS to custom numbers
- ✅ Real-time activity logs
- ✅ Secure password generation

## 📁 Project Structure

- `server.js` - Main Express server
- `IEI_frontend/index.html` - Web interface
- `*.py` - Python data processing scripts
- `*.js` - Standalone Node.js scripts

## 🔧 Configuration

Edit `server.js` to change:
- Port number (default: 3000)
- Simulation mode (set to `false` for real SMS)

## 📖 Full Documentation

See [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) for complete documentation.

## ⚠️ Important

- Never commit `.env` file
- Test with simulation mode first
- Check Fast2SMS rate limits

## 📞 Support

For issues, visit: https://github.com/Ishwari2010/IEI_portal/issues

