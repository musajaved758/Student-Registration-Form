// Supabase configuration
const SUPABASE_URL = 'https://lxhtbwggihbrqgsswcvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4aHRid2dnaWhicnFnc3N3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzgzNzksImV4cCI6MjA4OTMxNDM3OX0.C_QLTwiAybg3qwVZOGqpBlp1rC38Oakt1nT3HbjPrC0';

let selectedStudent = null;
let allStudents = [];

// Initialize - auto-fetch data when popup opens
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fetchData').addEventListener('click', fetchStudents);
  document.getElementById('fillForm').addEventListener('click', fillFormWithData);
  document.getElementById('clearData').addEventListener('click', clearStoredData);
  document.getElementById('searchInput').addEventListener('input', filterStudents);
  
  // Auto-fetch data on load
  fetchStudents();
});

// Fetch students from Supabase with better error handling
async function fetchStudents() {
  showStatus('Fetching data...', 'success');
  
  try {
    console.log('Fetching from:', `${SUPABASE_URL}/rest/v1/students?select=*`);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      if (response.status === 401) {
        throw new Error('Unauthorized: Check Supabase API key and RLS policies');
      } else if (response.status === 403) {
        throw new Error('Forbidden: Enable RLS policy for anonymous read access');
      } else if (response.status === 404) {
        throw new Error('Table not found: Check if "students" table exists');
      } else {
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch data'}`);
      }
    }

    allStudents = await response.json();
    console.log('Fetched students:', allStudents.length);
    
    if (allStudents.length === 0) {
      showStatus('No students found in database', 'error');
    } else {
      displayStudents(allStudents);
      showStatus(`Found ${allStudents.length} students`, 'success');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    
    // Show more helpful error message
    let errorMsg = error.message;
    if (error.message.includes('Failed to fetch')) {
      errorMsg = 'Network error. Check: 1) Internet connection 2) Supabase URL 3) Enable CORS in Supabase';
    }
    
    showStatus('Error: ' + errorMsg, 'error');
  }
}

// Display students in list with all visible data
function displayStudents(students) {
  const listDiv = document.getElementById('studentList');
  listDiv.innerHTML = '';
  
  if (students.length === 0) {
    listDiv.innerHTML = '<p style="text-align: center; color: #666;">No students found</p>';
    listDiv.style.display = 'block';
    return;
  }

  students.forEach(student => {
    const item = document.createElement('div');
    item.className = 'data-item';
    item.innerHTML = `
      <div class="student-header">
        <span class="student-name">${student.student_name}</span>
        <span class="student-cnic">${student.student_cnic || 'N/A'}</span>
      </div>
      <div class="student-details">
        <span>Father: ${student.father_name || 'N/A'}</span>
        <span>Contact: ${student.contact_number || 'N/A'}</span>
        <span>Email: ${student.email || 'N/A'}</span>
      </div>
      <div class="student-academic">
        <span>Matric: ${student.matric_board || 'N/A'} (${student.matric_passing_year || 'N/A'})</span>
        <span>Matric RollNo: (${student.matric_roll_no || 'N/A'}) Matric Reg: (${student.matric_registration_no || 'N/A'})</span>
        <span>PNC: ${student.pnc_number || 'N/A'} </span>
        <span>GN Obtain Marks: ${student.general_nursing_obtain_marks || 'N/A'} </span>
        <span>GN Obtain Marks: ${student.general_nursing_obtain_marks || 'N/A'} </span>
      </div>
    `;
    item.addEventListener('click', () => selectStudent(student, item));
    listDiv.appendChild(item);
  });

  listDiv.style.display = 'block';
}

// Filter students based on search across all fields
function filterStudents(e) {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allStudents.filter(s => 
    s.student_name?.toLowerCase().includes(searchTerm) ||
    s.email?.toLowerCase().includes(searchTerm) ||
    s.student_cnic?.toLowerCase().includes(searchTerm) ||
    s.father_name?.toLowerCase().includes(searchTerm) ||
    s.contact_number?.toLowerCase().includes(searchTerm) ||
    s.pnc_number?.toLowerCase().includes(searchTerm)
  );
  displayStudents(filtered);
}

// Select a student with visual highlighting
function selectStudent(student, element) {
  selectedStudent = student;
  chrome.storage.local.set({ selectedStudent: student });
  
  // Remove selected class from all items
  document.querySelectorAll('.data-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // Add selected class to clicked item
  if (element) {
    element.classList.add('selected');
  }
  
  document.getElementById('fillForm').style.display = 'block';
  showStatus(`Selected: ${student.student_name}`, 'success');
}

// Fill form with selected data
async function fillFormWithData() {
  if (!selectedStudent) {
    showStatus('Please select a student first', 'error');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillForm,
      args: [selectedStudent]
    });

    showStatus('Form filled successfully!', 'success');
  } catch (error) {
    showStatus('Error filling form: ' + error.message, 'error');
  }
}

// This function runs in the page context
function fillForm(data) {
  console.log('Filling form with data:', data);
  console.log('DOMICILE DEBUG - data.domicile =', data.domicile);
  console.log('DOMICILE DEBUG - All keys:', Object.keys(data));
  
  // First, let's detect all form fields (for debugging)
  console.log('=== Detecting form fields ===');
  const allInputs = document.querySelectorAll('input, select, textarea');
  allInputs.forEach((input, i) => {
    if (input.id && input.id.includes('MainContent')) {
      console.log(`${i}: ID=${input.id}, Name=${input.name}, Type=${input.type}, Label=${getLabelText(input)}`);
    }
  });
  
  function getLabelText(input) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    return label ? label.textContent.trim().substring(0, 30) : 'N/A';
  }
  
  // ============================================
  // FIELD MAPPINGS - PERSONAL INFORMATION
  // ============================================
  const fieldMappings = {
    // 1. Student Name (already working)
    'student_name': ['student_name', 'name', 'studentName', 'txtName', 'Name'],
    
    // 2. Father/Husband Name (already working)
    'father_name': ['father_name', 'fatherName', 'txtFatherName', 'FatherName', 'MainContent_TextBox1'],
    
    // 3. Date of Birth (already working)
    'date_of_birth': ['date_of_birth', 'dob', 'birthDate', 'txtDOB', 'DOB', 'MainContent_TextBox10'],
    
    // 4. Student CNIC (already working)
    'student_cnic': ['student_cnic', 'cnic', 'txtCNIC', 'CNIC', 'studentCnic', 'MainContent_ddlIDType'],
    
    // 5. Father CNIC (already working)
    'father_cnic': ['father_cnic', 'fatherCnic', 'txtFatherCNIC', 'MainContent_TextBox4'],
    
    // 6. Email - Use exact ID and name only
    'email': ['MainContent_email', 'ctl00$MainContent$email'],
    
    // 7. Contact Number (already working)
    'contact_number': ['contact_number', 'contact', 'phone', 'txtPhone', 'txtContact'],
    
    // 8. Permanent Address - Use exact ID and name only
    'address': ['MainContent_TextBox17', 'ctl00$MainContent$TextBox17'],
    
    // 9. Category of Seat (dropdown - will select "Open Merit")
    'categoryofseat': ['categoryofseat', 'categoryOfSeat', 'ctl00$MainContent$DropDownList20', 'MainContent_DropDownList20'],
    
    // 10. Domicile/City (dropdown)
    'domicile': ['domicile', 'city', 'txtCity', 'ddlCity', 'MainContent_ddlDomicile', 'ctl00$MainContent$ddlDomicile'],
    
    // 11. Date of Entry to College
    'date_of_entry': ['ctl00$MainContent$TextBox20', 'MainContent_TextBox20', ],
    
    // 12. Class Roll Number (auto-generated but fillable)
    'classrollno': ['classrollno', 'ctl00$MainContent$TextBox3', 'MainContent_TextBox3'],
    
    // ============================================
    // ACADEMIC INFORMATION
    // ============================================
    
    // 13. SSC/Degree Title (dropdown)
    'ssc_degree_title': ['ssc_degree_title', 'ctl00$MainContent$DropDownList7', 'MainContent_DropDownList7'],
    
    // 14. Matric Roll Number
    'matricrollno': ['matricrollno', 'ctl00$MainContent$TextBox22', 'MainContent_TextBox22'],
    
    // 15. Matric/Equivalent Registration No
    'matricRegistrationno': ['matricRegistrationno', 'ctl00$MainContent$TextBox24', 'MainContent_TextBox24'],
    
    // 16. Matric Passing Year (dropdown)
    'matric_passing_year': ['matric_passing_year', 'matricYear', 'ctl00$MainContent$DropDownList2', 'MainContent_DropDownList2'],
    
    // 17. Matric Board
    'matric_board': ['matric_board', 'board', 'txtBoard', 'ctl00$MainContent$TextBox26', 'MainContent_TextBox26'],
    
    // 18. Matric Total Marks
    'matric_total_marks': ['matric_total_marks', 'totalMarks', 'txtTotalMarks', 'ctl00$MainContent$TextBox37', 'MainContent_TextBox37'],
    
    // 19. Matric Obtained Marks
    'matric_obtained_marks': ['matric_obtained_marks', 'obtainedMarks', 'txtObtainedMarks', 'ctl00$MainContent$TextBox25', 'MainContent_TextBox25'],
    
    // 20. PNC Number
    'pnc_number': ['pnc_number', 'pnc', 'txtPNC']
  };

  let filledCount = 0;

  // Try to fill each field using multiple strategies
  Object.keys(fieldMappings).forEach(dataKey => {
    const possibleIds = fieldMappings[dataKey];
    const value = data[dataKey];
    
    if (!value) return;

    // Try each possible ID/name
    for (const id of possibleIds) {
      // Try by ID
      let element = document.getElementById(id);
      
      // Try by name attribute
      if (!element) {
        element = document.querySelector(`[name="${id}"]`);
      }
      
      // Try by placeholder
      if (!element) {
        element = document.querySelector(`[placeholder*="${id}" i]`);
      }

      if (element) {
        // For radio buttons, click them instead of setting value
        if (element.type === 'radio') {
          element.click();
          element.checked = true;
          console.log(`Selected radio ${dataKey}: ${id}`);
        } else {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          console.log(`Filled ${dataKey} in ${id}`);
        }
        filledCount++;
        break;
      }
    }
  });

  // Handle Gender - Select Female (RadioButtonList1_1)
  const femaleRadio = document.getElementById('MainContent_RadioButtonList1_1');
  if (femaleRadio) {
    femaleRadio.click();
    femaleRadio.checked = true;
    console.log('Selected Gender: Female');
    filledCount++;
  }

  // Handle Student Type - Select Local (RadioButtonList4_0)
  const localRadio = document.getElementById('MainContent_RadioButtonList4_0');
  if (localRadio) {
    localRadio.click();
    localRadio.checked = true;
    console.log('Selected Student Type: Local');
    filledCount++;
  }

  // Handle Session - Select Morning (rblsession_0)
  const morningSession = document.getElementById('MainContent_rblsession_0');
  if (morningSession) {
    morningSession.click();
    morningSession.checked = true;
    console.log('Selected Session: Morning');
    filledCount++;
  }

  // Handle Education Type - Select Annual (rbleduction_0)
  const annualEdu = document.getElementById('MainContent_rbleduction_0');
  if (annualEdu) {
    annualEdu.click();
    annualEdu.checked = true;
    console.log('Selected Education Type: Annual');
    filledCount++;
  }

  // Handle Mode of Study - Select Regular (rblmodeofstudy_0)
  const modeRegular = document.getElementById('MainContent_rblmodeofstudy_0');
  if (modeRegular) {
    modeRegular.click();
    modeRegular.checked = true;
    console.log('Selected Mode of Study: Regular');
    filledCount++;
  }

  // Handle Migration - Select No (RadioButtonList2_1)
  const migrationNo = document.getElementById('MainContent_RadioButtonList2_1');
  if (migrationNo) {
    migrationNo.click();
    migrationNo.checked = true;
    console.log('Selected Migration: No');
    filledCount++;
  }

  // Handle Category of Seat - Select "Open Merit" (DropDownList20)
  const categorySeat = document.getElementById('MainContent_DropDownList20');
  if (categorySeat) {
    categorySeat.value = 'Open Merit';
    categorySeat.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('Selected Category of Seat: Open Merit');
    filledCount++;
  }

  // Handle Domicile/City Dropdown - Select from Supabase data
  // Try different possible property names: domicile, city, domicile_city, district
  const domicileValue = data.domicile || data.city || data.domicile_city || data.district || data.domicile_city;
  const domicileDropdown = document.getElementById('MainContent_DropDownList3') || document.getElementById('MainContent_ddlDomicile');
  
  console.log(`[DOMICILE] Available data keys:`, Object.keys(data));
  console.log(`[DOMICILE] Trying values: domicile=${data.domicile}, city=${data.city}, district=${data.district}`);
  
  if (domicileDropdown && domicileValue) {
    const supabaseCity = domicileValue.toLowerCase().trim();
    let found = false;
    let selectedIndex = -1;
    
    console.log(`[DOMICILE] Looking for: "${supabaseCity}"`);
    console.log(`[DOMICILE] Dropdown found:`, domicileDropdown.id);
    console.log(`[DOMICILE] Option count: ${domicileDropdown.options.length}`);
    
    for (let i = 0; i < domicileDropdown.options.length; i++) {
      const option = domicileDropdown.options[i];
      const optionValue = option.value.toLowerCase().trim();
      const optionText = option.text.toLowerCase().trim();
      
      console.log(`[DOMICILE] Option ${i}: value="${optionValue}" text="${optionText}"`);
      
      // Match by value or text (case insensitive, partial match allowed)
      if (optionValue === supabaseCity || 
          optionText === supabaseCity ||
          optionText.includes(supabaseCity) ||
          supabaseCity.includes(optionText)) {
        selectedIndex = i;
        found = true;
        console.log(`[DOMICILE] MATCH FOUND at index ${i}: ${option.text}`);
        break;
      }
    }
    
    if (found && selectedIndex >= 0) {
      // Click dropdown first to activate
      domicileDropdown.click();
      domicileDropdown.focus();
      
      // Set by index
      domicileDropdown.selectedIndex = selectedIndex;
      
      // Also try setting value directly
      domicileDropdown.value = domicileDropdown.options[selectedIndex].value;
      
      // Trigger multiple events
      ['focus', 'input', 'change', 'blur'].forEach(evt => {
        domicileDropdown.dispatchEvent(new Event(evt, { bubbles: true }));
      });
      
      console.log(`[DOMICILE] Successfully set to index ${selectedIndex}`);
    } else {
      console.log(`[DOMICILE] ERROR: No match found for "${domicileValue}"`);
    }
    
    filledCount++;
  } else {
    console.log(`[DOMICILE] ERROR: Dropdown not found or no data. hasDropdown=${!!domicileDropdown}, hasData=${!!data.domicile}`);
  }

  // Handle SSC Degree Title - Select first option/Matric (DropDownList7)
  const sscDegree = document.getElementById('MainContent_DropDownList7');
  if (sscDegree && sscDegree.options.length > 1) {
    sscDegree.selectedIndex = 1; // Select first real option (skip "Select" placeholder)
    sscDegree.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('Selected SSC Degree Title');
    filledCount++;
  }

  // Handle Class Roll Number - Auto fill with 1 if empty or from Supabase
  const classRollField = document.getElementById('MainContent_TextBox3');
  if (classRollField) {
    const rollValue = data.classrollno || '1';
    classRollField.value = rollValue;
    classRollField.dispatchEvent(new Event('input', { bubbles: true }));
    classRollField.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`Filled Class Roll Number: ${rollValue}`);
    filledCount++;
  }

  // Handle Matric Roll Number (TextBox22)
  const matricRollField = document.getElementById('MainContent_TextBox22');
  console.log(`[MATRIC] Field found: ${!!matricRollField}, data.matricrollno: ${data.matricrollno}`);
  if (matricRollField && data.matric_roll_no) {
    matricRollField.value = data.matric_roll_no;
    matricRollField.dispatchEvent(new Event('input', { bubbles: true }));
    matricRollField.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[MATRIC] Filled Matric Roll Number: ${data.matric_roll_no}`);
    filledCount++;
  } else {
    console.log(`[MATRIC] SKIPPED: field=${!!matricRollField}, value=${data.matric_roll_no}`);
  }

  // Handle Matric Registration Number (TextBox22)
  const matricRegistrationNo = document.getElementById('MainContent_TextBox24');
  console.log(`[MATRIC] Field found: ${!!matricRegistrationNo}, data.matricregistrationno: ${data.matricregistrationno}`);
  if (matricRegistrationNo && data.matric_registration_no) {
    matricRegistrationNo.value = data.matric_registration_no;
    matricRegistrationNo.dispatchEvent(new Event('input', { bubbles: true }));
    matricRegistrationNo.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[MATRIC] Filled Matric Roll Number: ${data.matric_roll_no}`);
    filledCount++;
  } else {
    console.log(`[MATRIC] SKIPPED: field=${!!matricRollField}, value=${data.matric_roll_no}`);
  }












//=======================================General Nursing Details=======================================







  // Handle General Nursing Title Dropdown - Select first real option (DropDownList6)
  const generalNursingTitle = document.getElementById('MainContent_DropDownList6');
  if (generalNursingTitle && generalNursingTitle.options.length > 1) {
    generalNursingTitle.selectedIndex = 1; // Index 1 = first real option (skip "--Select--")
    generalNursingTitle.dispatchEvent(new Event('change', { bubbles: true }));
    filledCount++;
  } else {
    console.log(`[GENERAL NURSING] SKIPPED: dropdown not found or no options`);
  }
  // Handle General Nursing Year Dropdown - Select year from Supabase data if available
    const generalNursingyear = document.getElementById('MainContent_DropDownList4');
    if (generalNursingyear && generalNursingyear.options.length > 1) {
      let selected = false;
      if (data.general_nursing_passing_year) {
        const yearStr = String(data.general_nursing_passing_year);
        for (let i = 0; i < generalNursingyear.options.length; i++) {
          if (generalNursingyear.options[i].value === yearStr || generalNursingyear.options[i].text === yearStr) {
            generalNursingyear.selectedIndex = i;
            selected = true;
            break;
          }
        }
      }
      if (!selected) {
        generalNursingyear.selectedIndex = 1; // fallback to first real option
      }
      generalNursingyear.dispatchEvent(new Event('change', { bubbles: true }));
      filledCount++;
    } else {
      console.log(`[GENERAL NURSING] SKIPPED: dropdown not found or no options`);
    }


  // Handle General Nursing Roll Number (TextBox24)
  const generalNursingRollNo = document.getElementById('MainContent_TextBox27');
  console.log(`[GENERAL NURSING] Field found: ${!!generalNursingRollNo}, data.general_nursing_roll_no: ${data.general_nursing_roll_no}`);
  if (generalNursingRollNo && data.general_nursing_roll_no) {
    generalNursingRollNo.value = data.general_nursing_roll_no;
    generalNursingRollNo.dispatchEvent(new Event('input', { bubbles: true }));
    generalNursingRollNo.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[GENERAL NURSING] Filled General Nursing Roll Number: ${data.general_nursing_roll_no}`);
    filledCount++;
  } else {
    console.log(`[GENERAL NURSING] SKIPPED: field=${!!generalNursingRollNo}, value=${data.general_nursing_roll_no}`);
  }

  // Handle General Nursing Registration Number (TextBox24)
  const generalNursingRegNo = document.getElementById('MainContent_TextBox29');
  console.log(`[GENERAL NURSING] Field found: ${!!generalNursingRegNo}, data.general_nursing_registration_no: ${data.general_nursing_registration_no}`);
  if (generalNursingRegNo && data.general_nursing_registration_no) {
    generalNursingRegNo.value = data.general_nursing_registration_no;
    generalNursingRegNo.dispatchEvent(new Event('input', { bubbles: true }));
    generalNursingRegNo.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[GENERAL NURSING] Filled General Nursing Registration Number: ${data.general_nursing_registration_no}`);
    filledCount++;
  } else {
    console.log(`[GENERAL NURSING] SKIPPED: field=${!!generalNursingRegNo}, value=${data.general_nursing_registration_no}`);
  }


  // Handle General Nursing Total Marks (TextBox38)
  const generalNursingTotalMarks = document.getElementById('MainContent_TextBox38');
  console.log(`[GENERAL NURSING] Field found: ${!!generalNursingTotalMarks}, data.general_nursing_total_marks: ${data.general_nursing_total_marks}`);
  if (generalNursingTotalMarks && data.general_nursing_total_marks) {
    generalNursingTotalMarks.value = data.general_nursing_total_marks;
    generalNursingTotalMarks.dispatchEvent(new Event('input', { bubbles: true }));
    generalNursingTotalMarks.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[GENERAL NURSING] Filled General Nursing Total Marks: ${data.general_nursing_total_marks}`);
    filledCount++;
  } else {
    console.log(`[GENERAL NURSING] SKIPPED: field=${!!generalNursingTotalMarks}, value=${data.general_nursing_total_marks}`);
  }


  // Handle General Nursing Obtain Marks (TextBox30)
  const generalNursingObtainMarks = document.getElementById('MainContent_TextBox30');
  console.log(`[GENERAL NURSING] Field found: ${!!generalNursingObtainMarks}, data.general_nursing_obtain_marks: ${data.general_nursing_obtain_marks}`);
  if (generalNursingObtainMarks && data.general_nursing_obtain_marks) {
    generalNursingObtainMarks.value = data.general_nursing_obtain_marks;
    generalNursingObtainMarks.dispatchEvent(new Event('input', { bubbles: true }));
    generalNursingObtainMarks.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[GENERAL NURSING] Filled General Nursing Obtain Marks: ${data.general_nursing_obtain_marks}`);
    filledCount++;
  } else {
    console.log(`[GENERAL NURSING] SKIPPED: field=${!!generalNursingObtainMarks}, value=${data.general_nursing_obtain_marks}`);
  }

  // Handle General Nursing Board (TextBox31)
  const generalNursingBoard = document.getElementById('MainContent_TextBox31');
  console.log(`[GENERAL NURSING] Field found: ${!!generalNursingBoard}, data.general_nursing_board: ${data.general_nursing_board}`);
  if (generalNursingBoard && data.general_nursing_board) {
    generalNursingBoard.value = data.general_nursing_board;
    generalNursingBoard.dispatchEvent(new Event('input', { bubbles: true }));
    generalNursingBoard.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[GENERAL NURSING] Filled General Nursing Board: ${data.general_nursing_board}`);
    filledCount++;
  } else {
    console.log(`[GENERAL NURSING] SKIPPED: field=${!!generalNursingBoard}, value=${data.general_nursing_board}`);
  }















//=======================================Midwifery Details=======================================







  // Handle Midwifery Title Dropdown - Select first real option (DropDownList6)
  const midwiferyTitle = document.getElementById('MainContent_DropDownList13');
  if (midwiferyTitle && midwiferyTitle.options.length > 1) {
    midwiferyTitle.selectedIndex = 6; // Index 6 = first real option (skip "--Select--")
    midwiferyTitle.dispatchEvent(new Event('change', { bubbles: true }));
    filledCount++;
  } else {
    console.log(`[MIDWIFERY] SKIPPED: dropdown not found or no options`);
  }
  // Handle Midwifery Year Dropdown - Select year from Supabase data if available
    const midwiferyyear = document.getElementById('MainContent_DropDownList14');
    if (midwiferyyear && midwiferyyear.options.length > 1) {
      let selected = false;
      if (data.midwifery_passing_year) {
        const yearStr = String(data.midwifery_passing_year);
        for (let i = 0; i < midwiferyyear.options.length; i++) {
          if (midwiferyyear.options[i].value === yearStr || midwiferyyear.options[i].text === yearStr) {
            midwiferyyear.selectedIndex = i;
            selected = true;
            break;
          }
        }
      }
      if (!selected) {
        midwiferyyear.selectedIndex = 1; // fallback to first real option
      }
      midwiferyyear.dispatchEvent(new Event('change', { bubbles: true }));
      filledCount++;
    } else {
      console.log(`[MIDWIFERY] SKIPPED: dropdown not found or no options`);
    }


  // Handle Midwifery Roll Number (TextBox24)
  const midwiferyRollNo = document.getElementById('MainContent_TextBox18');
  console.log(`[MIDWIFERY] Field found: ${!!midwiferyRollNo}, data.midwifery_roll_no: ${data.midwifery_roll_no}`);
  if (midwiferyRollNo && data.midwifery_roll_no) {
    midwiferyRollNo.value = data.midwifery_roll_no;
    midwiferyRollNo.dispatchEvent(new Event('input', { bubbles: true }));
    midwiferyRollNo.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[MIDWIFERY] Filled Midwifery Roll Number: ${data.midwifery_roll_no}`);
    filledCount++;
  } else {
    console.log(`[MIDWIFERY] SKIPPED: field=${!!midwiferyRollNo}, value=${data.midwifery_roll_no}`);
  }

  // Handle Midwifery Registration Number (TextBox29)
  const midwiferyRegNo = document.getElementById('MainContent_TextBox19');
  console.log(`[MIDWIFERY] Field found: ${!!midwiferyRegNo}, data.midwifery_registration_no: ${data.midwifery_registration}`);
  if (midwiferyRegNo && data.midwifery_registration) {
    midwiferyRegNo.value = data.midwifery_registration;
    midwiferyRegNo.dispatchEvent(new Event('input', { bubbles: true }));
    midwiferyRegNo.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[MIDWIFERY] Filled Midwifery Registration Number: ${data.midwifery_registration}`);
    filledCount++;
  } else {
    console.log(`[MIDWIFERY] SKIPPED: field=${!!midwiferyRegNo}, value=${data.midwifery_registration}`);
  }


  // Handle Midwifery Total Marks (TextBox38)
  const midwiferyTotalMarks = document.getElementById('MainContent_TextBox23');
  console.log(`[MIDWIFERY] Field found: ${!!midwiferyTotalMarks}, data.midwifery_total_marks: ${data.midwifery_total_marks}`);
  if (midwiferyTotalMarks && data.midwifery_total_marks) {
    midwiferyTotalMarks.value = data.midwifery_total_marks;
    midwiferyTotalMarks.dispatchEvent(new Event('input', { bubbles: true }));
    midwiferyTotalMarks.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[MIDWIFERY] Filled Midwifery Total Marks: ${data.midwifery_total_marks}`);
    filledCount++;
  } else {
    console.log(`[MIDWIFERY] SKIPPED: field=${!!midwiferyTotalMarks}, value=${data.midwifery_total_marks}`);
  }


  // Handle Midwifery Obtain Marks (TextBox30)
  const midwiferyObtainMarks = document.getElementById('MainContent_TextBox28');
  console.log(`[MIDWIFERY] Field found: ${!!midwiferyObtainMarks}, data.midwifery_obtained_marks: ${data.midwifery_obtained_marks}`);
  if (midwiferyObtainMarks && data.midwifery_obtained_marks) {
    midwiferyObtainMarks.value = data.midwifery_obtained_marks;
    midwiferyObtainMarks.dispatchEvent(new Event('input', { bubbles: true }));
    midwiferyObtainMarks.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[MIDWIFERY] Filled Midwifery Obtain Marks: ${data.midwifery_obtained_marks}`);
    filledCount++;
  } else {
    console.log(`[MIDWIFERY] SKIPPED: field=${!!midwiferyObtainMarks}, value=${data.midwifery_obtained_marks}`);
  }

  // Handle Midwifery Board (TextBox31)
  const midwiferyBoard = document.getElementById('MainContent_TextBox33');
  console.log(`[MIDWIFERY] Field found: ${!!midwiferyBoard}, data.midwifery_board: ${data.general_nursing_board}`);
  if (midwiferyBoard && data.general_nursing_board) {
    midwiferyBoard.value = data.general_nursing_board;
    midwiferyBoard.dispatchEvent(new Event('input', { bubbles: true }));
    midwiferyBoard.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[MIDWIFERY] Filled Midwifery Board: ${data.general_nursing_board}`);
    filledCount++;
  } else {
    console.log(`[MIDWIFERY] SKIPPED: field=${!!midwiferyBoard}, value=${data.general_nursing_board}`);
  }














  //==========================================Other Fields Like Radio button==========

  // Handle Date Fields - HTML5 type=date requires YYYY-MM-DD format
  const dateFieldsList = [
    { id: 'MainContent_TextBox20', name: 'Date of Entry to College', dataKey: null },
    { id: 'MainContent_TextBox21', name: 'Date of Class Commencement', dataKey: null }
  ];
  dateFieldsList.forEach(field => {
    const dateField = document.getElementById(field.id);
    if (dateField) {
      // Use hardcoded date if not in Supabase data
      let dateValue = '2026-04-01'; // YYYY-MM-DD
      dateField.value = dateValue;
      dateField.dispatchEvent(new Event('input', { bubbles: true }));
      dateField.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`Filled ${field.name} (${field.id}): ${dateValue}`);
      filledCount++;
    }
  });

  // Also try to find and fill by label text
  const labels = document.querySelectorAll('label');
  labels.forEach(label => {
    const labelText = label.textContent.toLowerCase();
    const input = label.querySelector('input, select, textarea') || 
                  document.getElementById(label.getAttribute('for'));
    
    if (input) {
      if (labelText.includes('name') && data.student_name && !input.value) {
        input.value = data.student_name;
        filledCount++;
      }
      if (labelText.includes('father') && data.father_name && !input.value) {
        input.value = data.father_name;
        filledCount++;
      }
      if (labelText.includes('cnic') && data.student_cnic && !input.value) {
        input.value = data.student_cnic;
        filledCount++;
      }
      if (labelText.includes('email') && data.email && !input.value) {
        input.value = data.email;
        filledCount++;
      }
    }
  });

  console.log(`Filled ${filledCount} fields`);
  
  if (filledCount === 0) {
    alert('Could not find matching form fields. The form may use different field names.');
  } else {
    alert(`Successfully filled ${filledCount} fields!`);
    console.log(`Successfully filled ${filledCount} fields!`);
  }
}

// Clear stored data
function clearStoredData() {
  selectedStudent = null;
  allStudents = [];
  chrome.storage.local.clear();
  document.getElementById('studentList').style.display = 'none';
  document.getElementById('fillForm').style.display = 'none';
  document.getElementById('searchInput').value = '';
  showStatus('Data cleared', 'success');
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}