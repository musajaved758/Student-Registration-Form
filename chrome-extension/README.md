# Chrome Extension - Form Auto-Filler

Auto-fill Chrome extension for Independent College of Nursing registration forms using Supabase data.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

## Usage

1. Click the extension icon in Chrome toolbar
2. Click "Fetch Student Data" to load all students from Supabase
3. Search for a student by name or email
4. Click on a student to select them
5. Navigate to the university registration form
6. Click "Fill Form" to auto-populate all fields

## Features

- Fetches student data from Supabase database
- Search functionality to find students quickly
- Auto-fills all form fields including:
  - Personal Information (name, CNIC, contact, etc.)
  - Academic Details (matric information)
  - Nursing Qualifications (general nursing & midwifery)
- Triggers form validation events
- Clean, user-friendly interface

## Files

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.js` - Main logic for fetching and filling data
- `content.js` - Content script for page interaction
- `README.md` - This file

## Configuration

Update the Supabase credentials in `popup.js`:
```javascript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## Notes

- Requires proper Supabase RLS policies for reading student data
- Works on any form with matching field IDs
- Automatically handles checkboxes for optional sections
