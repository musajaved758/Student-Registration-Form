# Student Registration Form

A professional, 3-step registration wizard built with HTML, CSS (Vanilla), and JavaScript. It features local draft saving, real-time validation, dynamic fields, and server-side integration via Supabase.

## Features Let 🚀

- **3-Step Wizard Layout**: Personal Info, Academic, and optional Nursing Qualifications.
- **Real-time Validations**: 
  - Age constraints (16-35)
  - CNIC automatic formatting and verification `xxxxx-xxxxxxx-x`
  - Contact number formatting (`+92` or `03xx`)
  - Validates Obtained marks <= Total marks.
- **Auto-Save Drafts**: Automatically saves progress using `localStorage`. If you refresh, you won't lose your work.
- **Supabase Integration**: Data seamlessly pushes to a Supabase table. Server-side validations check for existing unique Emails or CNICs.
- **UI/UX**: Smooth animations, glass-morphism effects, responsive design, dark mode preference support.

---

## 🛠️ Setup Instructions

### 1. Database Setup (Supabase)

1. Create a project on [Supabase.com](https://supabase.com/).
2. Navigate to the **SQL Editor** and run the following script to create the `students` table:

```sql
CREATE TABLE public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Step 1
    student_name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    student_cnic TEXT NOT NULL UNIQUE,
    father_cnic TEXT NOT NULL,
    domicile TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    contact_number TEXT NOT NULL,
    address TEXT NOT NULL,
    
    -- Step 2
    matric_roll_no TEXT NOT NULL,
    matric_passing_year INTEGER NOT NULL,
    matric_board TEXT NOT NULL,
    matric_total_marks INTEGER NOT NULL,
    matric_obtained_marks INTEGER NOT NULL,
    pnc_number TEXT NOT NULL,
    
    -- Step 3 (Optional General Nursing)
    general_nursing_roll_no TEXT,
    general_nursing_passing_year INTEGER,
    general_nursing_registration_no TEXT,
    general_nursing_total_marks INTEGER,
    general_nursing_obtain_marks INTEGER,
    general_nursing_board TEXT,
    
    -- Step 3 (Optional Midwifery)
    midwifery_roll_no TEXT,
    midwifery_passing_year INTEGER,
    midwifery_registration TEXT,
    midwifery_total_marks INTEGER,
    midwifery_obtained_marks INTEGER
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create Policy to insert anonymous rows
CREATE POLICY "Enable insert for anonymous users" 
ON public.students 
FOR INSERT 
WITH CHECK (true);

-- (Optional) Policy to block reading via API to keep user data private from public
CREATE POLICY "Enable read for public" ON public.students FOR SELECT USING (true);
```

### 2. Connect App to Supabase

1. From your Supabase Dashboard, go to **Project Settings -> API**.
2. Copy your **Project URL** and **anon public key**.
3. Open `app.js` in your project folder.
4. Replace the placeholder constants at the top of the file:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. Running the App Local

Simply open the `index.html` file in any modern browser. 
Since we use the Supabase CDN, no build steps or `npm` installations are required.

> **Note**: For Supabase API calls to function without CORS warnings, it is recommended to run this folder using a live server (e.g., `Live Server` VSCode extension) instead of just double-clicking `index.html`.

## Development Stack
- **HTML5**
- **Vanilla CSS**
- **Vanilla JavaScript** (No Frameworks)
- **Supabase JS Client SDK ^v2**
