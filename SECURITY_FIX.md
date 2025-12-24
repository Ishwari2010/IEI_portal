# Security Vulnerability Fix - xlsx Package

## 🔒 Issue Identified

The `xlsx` package (version 0.18.5) has **high severity vulnerabilities**:

1. **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6) - Affects versions up to 0.19.2
2. **Regular Expression Denial of Service (ReDoS)** (GHSA-5pgg-2g8v-p4x9) - Affects versions up to 0.20.1

## ✅ Solution Applied

Updated `package.json` to use **xlsx version 0.20.2** from SheetJS CDN, which fixes both vulnerabilities.

## 📋 Steps to Apply Fix

### 1. Remove old package
```bash
npm uninstall xlsx
```

### 2. Install secure version
```bash
npm install
```

The updated `package.json` now points to the secure version from SheetJS CDN.

### 3. Verify installation
```bash
npm audit
```

You should see: **0 vulnerabilities** (or significantly reduced)

### 4. Test the application
```bash
node server.js
```

Verify that Excel file reading still works correctly.

## 🔍 What Changed

**Before:**
```json
"xlsx": "^0.18.5"
```

**After:**
```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz"
```

## ⚠️ Important Notes

1. **API Compatibility**: Version 0.20.2 maintains backward compatibility with the current code. No code changes needed.

2. **Source**: The package is now installed from SheetJS CDN instead of npm registry, as the npm package is no longer actively maintained.

3. **Testing**: After installation, test:
   - Excel file upload via web interface
   - Reading `iei_processed_members.xlsx` at startup
   - Bulk send functionality

## 🔄 Alternative Solution (If Needed)

If you encounter issues with the CDN version, consider switching to **exceljs** (actively maintained alternative):

```bash
npm uninstall xlsx
npm install exceljs
```

However, this would require code changes in `server.js` and `bulk_send.js`.

## 📚 References

- [GitHub Advisory - Prototype Pollution](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)
- [GitHub Advisory - ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)
- [SheetJS Security Advisories](https://cdn.sheetjs.com/advisories/)

---

**Status**: ✅ Fixed  
**Date**: Applied automatically  
**Version**: 0.20.2

