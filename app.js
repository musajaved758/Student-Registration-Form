// ==========================================
// CONFIGURATION - Replace with your Supabase credentials
// ==========================================
const SUPABASE_URL = 'https://lxhtbwggihbrqgsswcvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4aHRid2dnaWhicnFnc3N3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzgzNzksImV4cCI6MjA4OTMxNDM3OX0.C_QLTwiAybg3qwVZOGqpBlp1rC38Oakt1nT3HbjPrC0';
;

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management
let currentStep = 1;
const totalSteps = 3;
const form = document.getElementById('registrationForm');

// DOM Elements
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnSubmit = document.getElementById('btnSubmit');
const stepProgress = document.getElementById('stepProgress');
const globalError = document.getElementById('globalError');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initForm();
    populateYears();
    loadDraft();
    setupRealtimeValidation();
    updateStepperUI();
});

function initForm() {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateStep(3)) {
            showGlobalError('Please fix errors before submitting.');
            return;
        }

        const submitBtn = document.getElementById('btnSubmit');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const formData = collectFormData();
            
            // Final server-side validation checks
            const isEmailUnique = await checkUnique('email', formData.email);
            if (!isEmailUnique) {
                setError('email', 'This email is already registered.');
                throw new Error('Email already registered');
            }

            const isCnicUnique = await checkUnique('student_cnic', formData.student_cnic);
            if (!isCnicUnique) {
                setError('student_cnic', 'This CNIC is already registered.');
                throw new Error('CNIC already registered');
            }

            // Insert data
            const { data, error } = await supabase
                .from('students')
                .insert([formData])
                .select();

            if (error) throw error;

            // Success
            showSuccess();
            localStorage.removeItem('registrationDraft'); // Clear draft
            
        } catch (error) {
            console.error('Submission error:', error);
            showGlobalError(error.message || 'Error submitting application. Please try again.');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    // Auto-save form data periodically or on change
    form.addEventListener('change', saveDraft);
}

// UI Navigation Logic
function nextStep(direction) {
    globalError.style.display = 'none';

    if (direction === 1) {
        if (!validateStep(currentStep)) return;
    }

    // Hide current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    
    currentStep += direction;

    // Show new step
    document.getElementById(`step${currentStep}`).classList.add('active');

    updateStepperUI();
}

function updateStepperUI() {
    // Update progress bar
    const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;
    stepProgress.style.width = `${progressWidth}%`;

    // Update Step Circles
    document.querySelectorAll('.step').forEach(stepEl => {
        const stepNum = parseInt(stepEl.dataset.step);
        stepEl.classList.remove('active', 'completed');
        
        if (stepNum < currentStep) {
            stepEl.classList.add('completed');
        } else if (stepNum === currentStep) {
            stepEl.classList.add('active');
        }
    });

    // Update Buttons
    if (currentStep === 1) {
        btnPrev.classList.add('btn-hidden');
    } else {
        btnPrev.classList.remove('btn-hidden');
    }

    if (currentStep === totalSteps) {
        btnNext.classList.add('btn-hidden');
        btnSubmit.classList.remove('btn-hidden');
    } else {
        btnNext.classList.remove('btn-hidden');
        btnSubmit.classList.add('btn-hidden');
    }
}

// Utility functions
function toggleSection(sectionId, isVisible) {
    const section = document.getElementById(sectionId);
    if (isVisible) {
        section.classList.add('active');
    } else {
        section.classList.remove('active');
        // Clear inputs in this section if hidden
        section.querySelectorAll('input, select').forEach(input => {
            if (input.type === 'checkbox') input.checked = false;
            else input.value = '';
            clearValidationUI(input);
        });
    }
    saveDraft();
}

function handleBoardChange(selectElement, otherDivId) {
    const otherDiv = document.getElementById(otherDivId);
    if (selectElement.value === 'Other') {
        otherDiv.style.display = 'block';
    } else {
        otherDiv.style.display = 'none';
        document.getElementById(otherDivId.replace('_div', '')).value = ''; // clear input
    }
}

function populateYears() {
    const currentYear = new Date().getFullYear();
    const selects = [
        'matric_passing_year',
        'general_nursing_passing_year',
        'midwifery_passing_year'
    ];

    selects.forEach(id => {
        const select = document.getElementById(id);
        if(!select) return;
        for (let year = currentYear; year >= 2000; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        }
    });
}

// Formatting and Realtime Validation
function setupRealtimeValidation() {
    // CNIC Formatting (00000-0000000-0)
    const cnicInputs = ['student_cnic', 'father_cnic'];
    cnicInputs.forEach(id => {
        const input = document.getElementById(id);
        
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            if (value.length > 13) value = value.slice(0, 13);
            
            // Format
            if (value.length > 5 && value.length <= 12) {
                value = `${value.slice(0, 5)}-${value.slice(5)}`;
            } else if (value.length > 12) {
                value = `${value.slice(0, 5)}-${value.slice(5, 12)}-${value.slice(12)}`;
            }
            e.target.value = value;
            
            if(value.length === 15) validateField(input);
        });
    });

    // Contact Number (+92 or 03XX)
    const contact = document.getElementById('contact_number');
    contact.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^\d+]/g, ''); // Keep digits and +
        if (!value.startsWith('+92') && value.length > 0 && !value.startsWith('0')) {
            value = '0' + value; // Auto prefix 0 if starting with number
        }

        // Format 03XX-XXXXXXX
        if (value.startsWith('03')) {
            value = value.replace(/[^\d]/g, ''); // strip non-digits for formatting
            if(value.length > 11) value = value.slice(0, 11);
            if (value.length > 4) {
               value = `${value.slice(0,4)}-${value.slice(4)}`;
            }
        } else if (value.startsWith('+92')) {
            if(value.length > 13) value = value.slice(0, 13);
        }

        e.target.value = value;
        if(value.length >= 11) validateField(contact);
    });

    // Marks Validation
    const marksPairs = [
        { total: 'matric_total_marks', obtained: 'matric_obtained_marks' },
        { total: 'general_nursing_total_marks', obtained: 'general_nursing_obtain_marks' },
        { total: 'midwifery_total_marks', obtained: 'midwifery_obtained_marks' }
    ];

    marksPairs.forEach(pair => {
        const totalInput = document.getElementById(pair.total);
        const obtainedInput = document.getElementById(pair.obtained);

        if(totalInput && obtainedInput) {
             const validateMarks = () => {
                 if (totalInput.value && obtainedInput.value) {
                     const total = parseInt(totalInput.value);
                     const obtained = parseInt(obtainedInput.value);
                     
                     if (obtained > total) {
                         setError(pair.obtained, 'Obtained marks cannot exceed Total marks');
                     } else {
                         setSuccess(pair.obtained);
                     }
                 }
             };

             totalInput.addEventListener('input', validateMarks);
             obtainedInput.addEventListener('input', validateMarks);
        }
    });

    // Blur validations
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('blur', () => validateField(input));
    });
}

// Core Validation Engine
function validateStep(step) {
    let isValid = true;
    const stepContainer = document.getElementById(`step${step}`);
    
    // Select all inputs, selects, and textareas in this step that are visible (not hidden conditionally)
    const elementsToValidate = stepContainer.querySelectorAll('input, select, textarea');

    elementsToValidate.forEach(el => {
        // Skip validation if parent conditional section is hidden
        const conditionalParent = el.closest('.conditional-section');
        if (conditionalParent && !conditionalParent.classList.contains('active')) {
            return; 
        }

        // Skip hidden fields like 'other board' unless its parent is visible
        if (el.parentElement.style.display === 'none') {
            return;
        }

        if(!validateField(el)) {
            isValid = false;
        }
    });

    return isValid;
}

function validateField(input) {
    if (input.type === 'checkbox') return true; // Handled separately
    
    let isValid = true;
    let errorMsg = '';
    const value = input.value.trim();

    // Required check
    if (input.hasAttribute('required') && !value) {
        isValid = false;
        errorMsg = 'This field is required';
    } 
    // Specific Field Validations
    else if (value) {
        switch(input.id) {
            case 'student_cnic':
            case 'father_cnic':
                if (!/^\d{5}-\d{7}-\d{1}$/.test(value)) {
                    isValid = false;
                    errorMsg = 'Format must be 00000-0000000-0';
                }
                break;
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    errorMsg = 'Invalid email format';
                }
                break;
            case 'contact_number':
                if (!/^(03\d{2}-\d{7}|\+92\d{10})$/.test(value)) {
                    isValid = false;
                    errorMsg = 'Format: 03XX-XXXXXXX or +92XXXXXXXXXX';
                }
                break;
            case 'date_of_birth':
                const dob = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - dob.getFullYear();
                const m = today.getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                if (age < 16 || age > 35) {
                    isValid = false;
                    errorMsg = 'Age must be between 16 and 35 years';
                }
                break;
            case 'matric_board_other':
                const boardSelect = document.getElementById('matric_board');
                if (boardSelect.value === 'Other' && value.length < 2) {
                     isValid = false;
                     errorMsg = 'Please specify the board';
                }
                break;
        }
        
        // Marks Specific Validation on blur
        if(input.id.includes('obtain_marks') || input.id.includes('obtained_marks')) {
             const baseId = input.id.replace('obtain_marks', '').replace('obtained_marks', '');
             let totalId = baseId + 'total_marks';
             if(baseId === 'matric_') totalId = 'matric_total_marks';
             
             const totalEl = document.getElementById(totalId);
             if(totalEl && totalEl.value) {
                 if(parseInt(value) > parseInt(totalEl.value)) {
                     isValid = false;
                     errorMsg = 'Cannot exceed total marks: ' + totalEl.value;
                 }
             }
        }
    }

    if (isValid) {
        setSuccess(input.id);
    } else {
        setError(input.id, errorMsg);
    }

    return isValid;
}

// UI Validation Helpers
function setError(elementId, message) {
    const el = document.getElementById(elementId);
    if(!el) return;
    const wrapper = el.closest('.input-wrapper') || el.parentElement;
    
    wrapper.classList.remove('success');
    wrapper.classList.add('error');
    
    // Find or create error span
    let errorSpan = el.parentElement.querySelector('.error-message');
    if(!errorSpan) errorSpan = el.parentElement.nextElementSibling;
    
    if (errorSpan && errorSpan.classList.contains('error-message')) {
        if(message) errorSpan.textContent = message;
        errorSpan.style.display = 'block';
    }
}

function setSuccess(elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    const wrapper = el.closest('.input-wrapper') || el.parentElement;
    
    wrapper.classList.remove('error');
    wrapper.classList.add('success');
    
    let errorSpan = el.parentElement.querySelector('.error-message');
    if(!errorSpan) errorSpan = el.parentElement.nextElementSibling;
    
    if (errorSpan && errorSpan.classList.contains('error-message')) {
        errorSpan.style.display = 'none';
    }
}

function clearValidationUI(input) {
    const wrapper = input.closest('.input-wrapper') || input.parentElement;
    wrapper.classList.remove('success', 'error');
    let errorSpan = input.parentElement.querySelector('.error-message') || input.parentElement.nextElementSibling;
    if (errorSpan && errorSpan.classList.contains('error-message')) {
        errorSpan.style.display = 'none';
    }
}

function showGlobalError(msg) {
    globalError.textContent = msg;
    globalError.style.display = 'block';
    setTimeout(() => { globalError.style.display = 'none'; }, 5000);
}

function showSuccess() {
    form.style.display = 'none';
    document.getElementById('formHeader').style.display = 'none';
    const successMsg = document.getElementById('successMessage');
    successMsg.style.display = 'block';
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Supabase Utilities
async function checkUnique(field, value) {
    // If Supabase not configured properly, skip check to avoid breaking UI 
    // for demonstration purposes. In production, remove this check.
    if(SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') return true;

    try {
        const { data, error } = await supabase
            .from('students')
            .select(field)
            .eq(field, value)
            .limit(1);
            
        if (error) throw error;
        return data.length === 0;
    } catch (err) {
        console.error('Unique check failed:', err);
        return false; 
    }
}

// Data Processing
function collectFormData() {
    const data = {};
    const inputs = form.querySelectorAll('input:not([type="checkbox"]), select, textarea');
    
    inputs.forEach(input => {
        // Skip conditionals if parent hidden
        const conditionalParent = input.closest('.conditional-section');
        if (conditionalParent && !conditionalParent.classList.contains('active')) {
            return;
        }

        // Handle 'Other' Board
        if (input.id === 'matric_board') {
            if (input.value === 'Other') {
                data.matric_board = document.getElementById('matric_board_other').value.trim();
            } else {
                data.matric_board = input.value;
            }
        } 
        else if (input.id === 'matric_board_other') {
            // Handled above
        }
        else if (input.value) {
            // Type conversion
            if (input.type === 'number' || input.id.includes('year')) {
                data[input.name] = parseInt(input.value);
            } else {
                data[input.name] = input.value.trim();
            }
        }
    });

    return data;
}

// Draft Functionality
function saveDraft() {
    const data = collectFormData();
    
    // Save checkboxes state manually
    data.has_general_nursing = document.getElementById('has_general_nursing').checked;
    data.has_midwifery = document.getElementById('has_midwifery').checked;
    
    localStorage.setItem('registrationDraft', JSON.stringify(data));
}

function loadDraft() {
    const draft = localStorage.getItem('registrationDraft');
    if (!draft) return;

    try {
        const data = JSON.parse(draft);
        
        // Restore values
        form.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(input => {
             if(data[input.name] !== undefined) {
                 input.value = data[input.name];
                 
                 // Trigger visibility for Other board
                 if(input.id === 'matric_board' && !Array.from(input.options).some(opt => opt.value === data.matric_board)) {
                     input.value = 'Other';
                     document.getElementById('matric_board_other_div').style.display = 'block';
                     document.getElementById('matric_board_other').value = data.matric_board;
                 }
             }
        });

        // Restore checkboxes and sections
        if (data.has_general_nursing) {
            document.getElementById('has_general_nursing').checked = true;
            document.getElementById('general_nursing_section').classList.add('active');
        }
        
        if (data.has_midwifery) {
            document.getElementById('has_midwifery').checked = true;
            document.getElementById('midwifery_section').classList.add('active');
        }

    } catch (e) {
        console.error('Error loading draft', e);
        localStorage.removeItem('registrationDraft');
    }
}
