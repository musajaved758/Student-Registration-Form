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
        <span>PNC: ${student.pnc_number || 'N/A'}</span>
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
  
  // Map of possible field names to try
  const fieldMappings = {
    'student_name': ['student_name', 'name', 'studentName', 'txtName', 'Name'],
    'father_name': ['father_name', 'fatherName', 'txtFatherName', 'FatherName', 'MainContent_TextBox1'],
    'date_of_birth': ['date_of_birth', 'dob', 'birthDate', 'txtDOB', 'DOB', 'MainContent_TextBox10'],
    'student_cnic': ['student_cnic', 'cnic', 'txtCNIC', 'CNIC', 'studentCnic', 'MainContent_ddlIDType'],
    'father_cnic': ['father_cnic', 'fatherCnic', 'txtFatherCNIC', 'MainContent_TextBox4'],
    'domicile': ['domicile', 'city', 'txtCity', 'ddlCity'],
    'email': ['email', 'txtEmail', 'Email', 'MainContent_email'],
    'contact_number': ['contact_number', 'contact', 'phone', 'txtPhone', 'txtContact'],
    'address': ['address', 'txtAddress', 'Address', 'MainContent_TextBox17'],
    'matric_roll_no': ['matric_roll_no', 'matricRollNo', 'txtMatricRoll'],
    'matric_passing_year': ['matric_passing_year', 'matricYear', 'txtMatricYear'],
    'matric_board': ['matric_board', 'board', 'txtBoard'],
    'matric_total_marks': ['matric_total_marks', 'totalMarks', 'txtTotalMarks'],
    'matric_obtained_marks': ['matric_obtained_marks', 'obtainedMarks', 'txtObtainedMarks'],
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
