// ==========================================
// CONFIGURATION - Replace with your Supabase credentials
// ==========================================
// IMPORTANT: Move these to environment variables in production!
const SUPABASE_URL = 'https://lxhtbwggihbrqgsswcvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4aHRid2dnaWhicnFnc3N3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzgzNzksImV4cCI6MjA4OTMxNDM3OX0.C_QLTwiAybg3qwVZOGqpBlp1rC38Oakt1nT3HbjPrC0';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management
let currentStep = 1;
const totalSteps = 3;
let form, btnPrev, btnNext, btnSubmit, stepProgress, globalError;
let currentUser = null; // Store authenticated user

// Auth State Management
function initAuth() {
    const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
    const btnSignOut = document.getElementById('btnSignOut');
    const authPrompt = document.getElementById('authPrompt');
    const authUser = document.getElementById('authUser');
    const authError = document.getElementById('authError');
    
    // Check existing session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            setCurrentUser(session.user);
        }
        updateAuthUI();
        updateStepperUI(); // 🔧 Ensure step visibility is set after auth state
    });
    
    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            setCurrentUser(session.user);
            checkExistingSubmission(session.user.id);
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
        }
        updateAuthUI();
        updateStepperUI(); // 🔧 Ensure steps are visible after auth state change
    });
    
    // Sign in handler
    if (btnGoogleSignIn) {
        btnGoogleSignIn.addEventListener('click', async () => {
            try {
                // Check if user already has a session
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    // User already signed in, just reload to trigger auth state
                    window.location.reload();
                    return;
                }
                
                const { error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + window.location.pathname
                    }
                });
                if (error) throw error;
            } catch (err) {
                console.error('Sign in error:', err);
                showAuthError('Failed to sign in with Google. Please try again.');
            }
        });
    }
    
    // Sign out handler
    if (btnSignOut) {
        btnSignOut.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            setCurrentUser(null);
            updateAuthUI();
        });
    }
}

function setCurrentUser(user) {
    currentUser = user;
    console.log('User signed in:', user?.email);
}

function updateAuthUI() {
    const authPrompt = document.getElementById('authPrompt');
    const authUser = document.getElementById('authUser');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const stepper = document.getElementById('stepper');
    const formSteps = document.querySelectorAll('.form-step');
    const formActions = document.querySelector('.form-actions');
    
    if (currentUser) {
        // User is signed in
        if (authPrompt) authPrompt.style.display = 'none';
        if (authUser) {
            authUser.style.display = 'flex';
            if (userAvatar) userAvatar.src = currentUser.user_metadata?.avatar_url || '';
            if (userName) userName.textContent = currentUser.user_metadata?.full_name || currentUser.email;
            if (userEmail) userEmail.textContent = currentUser.email;
        }
        // Show form elements - steps visibility handled by CSS classes, not inline styles
        if (stepper) stepper.style.display = 'flex';
        // 🔧 Ensure step 1 is active when user signs in
        document.querySelectorAll('.form-step').forEach((step, index) => {
            if (index === 0) step.classList.add('active');
            else step.classList.remove('active');
        });
        if (formActions) formActions.style.display = 'flex';
    } else {
        // User not signed in
        if (authPrompt) authPrompt.style.display = 'block';
        if (authUser) authUser.style.display = 'none';
        // Hide form
        if (stepper) stepper.style.display = 'none';
        formSteps.forEach(step => step.classList.remove('active'));
        if (formActions) formActions.style.display = 'none';
    }
}

function showAuthError(msg) {
    const authError = document.getElementById('authError');
    if (authError) {
        authError.textContent = msg;
        authError.style.display = 'block';
        setTimeout(() => { authError.style.display = 'none'; }, 5000);
    }
}

async function checkExistingSubmission(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('id')
            .eq('user_id', userId)
            .limit(1);
            
        if (error) {
            console.warn('Could not check existing submission:', error.message);
            return;
        }
        
        if (data && data.length > 0) {
            // User already submitted
            showAlreadySubmittedMessage();
        }
    } catch (err) {
        console.warn('Error checking existing submission:', err);
    }
}

function showAlreadySubmittedMessage() {
    const form = document.getElementById('registrationForm');
    const formHeader = document.getElementById('formHeader');
    const authSection = document.getElementById('authSection');
    
    if (form) form.style.display = 'none';
    if (formHeader) formHeader.style.display = 'none';
    if (authSection) authSection.style.display = 'none';
    
    // Create and show message
    const container = document.querySelector('.container');
    const existingMsg = document.getElementById('alreadySubmittedMessage');
    if (!existingMsg) {
        const msgDiv = document.createElement('div');
        msgDiv.id = 'alreadySubmittedMessage';
        msgDiv.className = 'success-message';
        msgDiv.style.display = 'block';
        msgDiv.innerHTML = `
            <div class="success-icon-large">✓</div>
            <h2>Application Already Submitted!</h2>
            <p>You have already submitted an application using this Google account. Each user can only submit one application.</p>
            <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                Signed in as: ${currentUser?.email || 'Unknown'}
            </p>
            <button class="btn-primary" onclick="supabaseClient.auth.signOut().then(() => location.reload())">
                Sign Out
            </button>
        `;
        container.appendChild(msgDiv);
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Query DOM elements after DOM is fully loaded
    form = document.getElementById('registrationForm');
    btnPrev = document.getElementById('btnPrev');
    btnNext = document.getElementById('btnNext');
    btnSubmit = document.getElementById('btnSubmit');
    stepProgress = document.getElementById('stepProgress');
    globalError = document.getElementById('globalError');
    
    // Check if critical elements exist
    if (!form) {
        console.error('❌ Form element not found!');
        return;
    }
    
    console.log('✅ DOM elements found:', { form: !!form, btnPrev: !!btnPrev, btnNext: !!btnNext, btnSubmit: !!btnSubmit });
    
    initAuth(); // Initialize auth before form
    initForm();
    populateYears();
    loadDraft();
    setupRealtimeValidation();
    updateStepperUI();
    updateAuthUI(); // Set initial auth UI state
    
    // 🔧 PROGRAMMATIC EVENT BINDING - Ensures buttons work reliably
    // Remove duplicate DOM queries - use global variables
    if (btnNext && !btnNext.hasAttribute('data-event-bound')) {
        btnNext.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🟢 Next button clicked!');
            nextStep(1);
        });
        btnNext.setAttribute('data-event-bound', 'true');
        console.log('✅ Next button event bound');
    }
    
    if (btnPrev && !btnPrev.hasAttribute('data-event-bound')) {
        btnPrev.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔙 Prev button clicked!');
            nextStep(-1);
        });
        btnPrev.setAttribute('data-event-bound', 'true');
        console.log('✅ Prev button event bound');
    }
});

function initForm() {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateStep(3)) {
            showGlobalError('Please fix errors before submitting.');
            return;
        }

        // Confirmation dialog
        if (!confirm('Are you sure you want to submit this application? Please review all information before proceeding.')) {
            return;
        }

        const submitBtn = document.getElementById('btnSubmit');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Check if user is authenticated
            if (!currentUser) {
                showGlobalError('Please sign in with Google before submitting.');
                return;
            }
            
            // Check if user already submitted
            const { data: existingData, error: checkError } = await supabaseClient
                .from('students')
                .select('id')
                .eq('user_id', currentUser.id)
                .limit(1);
                
            if (checkError) {
                console.warn('Could not check existing submission:', checkError);
            } else if (existingData && existingData.length > 0) {
                showAlreadySubmittedMessage();
                return;
            }
            
            const formData = collectFormData();
            
            // Add user_id to track who submitted
            formData.user_id = currentUser.id;
            formData.auth_email = currentUser.email;
            
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
            const { data, error } = await supabaseClient
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

    // Auto-save form data with debounce
    form.addEventListener('change', saveDraft);
    form.addEventListener('input', saveDraft);
}

// UI Navigation Logic
function nextStep(direction) {
    console.log(`🚀 nextStep called: direction=${direction}, currentStep=${currentStep}`);
    globalError.style.display = 'none';

    if (direction === 1) {
        console.group('🔍 Validating Step', currentStep);
        const isStepValid = validateStep(currentStep);
        console.groupEnd();
        
        if (!isStepValid) {
            showGlobalError('Please fix all highlighted errors before proceeding.');
            return false;
        }
        console.log('✅ Step validation PASSED');
    }

    // 🔧 ROBUST DOM MANIPULATION
    const currentStepEl = document.getElementById(`step${currentStep}`);
    console.log('Current step element:', currentStepEl);
    
    if (currentStepEl) {
        currentStepEl.classList.remove('active');
        console.log(`✅ Hid step${currentStep}`);
    } else {
        console.error(`❌ step${currentStep} element not found!`);
    }
    
    currentStep += direction;
    console.log('New currentStep:', currentStep);
    
    // Show new step with safety checks
    const nextStepEl = document.getElementById(`step${currentStep}`);
    console.log('Next step element:', nextStepEl);
    
    if (nextStepEl) {
        nextStepEl.classList.add('active');
        console.log(`✅ Activated step${currentStep}`);
        
        // Force reflow for CSS transitions
        nextStepEl.offsetHeight;
        console.log('📐 DOM reflow triggered');
    } else {
        console.error(`❌ step${currentStep} element not found! Available steps:`, 
            Array.from(document.querySelectorAll('[id^=step]')).map(el => el.id));
        return false;
    }

    updateStepperUI();
    
    // 🔧 Enhanced scrolling
    setTimeout(() => {
        const activeStep = document.querySelector('.form-step.active');
        if (activeStep) {
            activeStep.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
            console.log('📜 Scrolled to active step');
        }
    }, 100);
    
    console.log('🎉 nextStep completed successfully');
    return true;
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

    // 🔧 Show only current form step, hide others
    document.querySelectorAll('.form-step').forEach((stepEl, index) => {
        const stepNum = index + 1;
        if (stepNum === currentStep) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
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
    // Clear any error messages in hidden sections
    if (!isVisible) {
        section.querySelectorAll('.error-message').forEach(msg => {
            msg.classList.remove('show');
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
        for (let year = currentYear; year >= 1970; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        }
    });
}

// Formatting and Realtime Validation
function setupRealtimeValidation() {
    // CNIC normalization (13 digits, no dashes)
    const cnicInputs = ['student_cnic', 'father_cnic'];
    cnicInputs.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return; // Prevent crash if element doesn't exist
        
        input.addEventListener('input', (e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 13);
            e.target.value = value;
            
            if (value.length === 13) validateField(input);
        });
    });

    // Contact Number normalization (+923XXXXXXXXX or 03XXXXXXXXX)
    const contact = document.getElementById('contact_number');
    if (!contact) return; // Prevent crash if element doesn't exist
    contact.addEventListener('input', (e) => {
        let value = e.target.value.trim();
        if (value.startsWith('+')) {
            value = `+${value.slice(1).replace(/\D/g, '')}`;
            if (value.startsWith('+92') && value.length > 13) {
                value = value.slice(0, 13);
            }
        } else {
            value = value.replace(/\D/g, '');
            if (!value.startsWith('0') && value.length > 0) {
                value = `0${value}`;
            }
            if (value.length > 11) {
                value = value.slice(0, 11);
            }
        }

        e.target.value = value;

        const localReady = value.startsWith('03') && value.length === 11;
        const intlReady = value.startsWith('+92') && value.length === 13;
        if (localReady || intlReady) validateField(contact);
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
    console.log(`🔍 validateStep(${step}) - Starting validation`);
    let isValid = true;
    let errorFields = [];
    
    const stepContainer = document.getElementById(`step${step}`);
    if (!stepContainer) {
        console.error(`❌ Step container not found: step${step}`);
        return false;
    }
    
    // 🎯 More targeted selector - only REQUIRED + visible fields
    const elementsToValidate = stepContainer.querySelectorAll('input[required], select[required], textarea[required]');
    console.log(`📋 Found ${elementsToValidate.length} REQUIRED elements in step${step}`);

    elementsToValidate.forEach(el => {
        // Skip if conditionally hidden
        const conditionalParent = el.closest('.conditional-section');
        if (conditionalParent && !conditionalParent.classList.contains('active')) {
            console.log(`⏭️ Skipping ${el.id} (conditional hidden)`);
            return; 
        }

        // Skip truly hidden fields
        const $parent = el.parentElement;
        if ($parent.style.display === 'none' || window.getComputedStyle($parent).display === 'none') {
            console.log(`⏭️ Skipping ${el.id} (parent hidden)`);
            return;
        }

        const fieldValid = validateField(el);
        if (!fieldValid) {
            isValid = false;
            errorFields.push(el.id);
            console.log(`❌ FAILED: ${el.id}`);
        } else {
            console.log(`✅ PASSED: ${el.id}`);
        }
    });

    if (!isValid) {
        console.log('🚨 Validation FAILED. First error:', errorFields[0]);
        // 🔧 Auto-focus & scroll to FIRST error
        const firstErrorEl = document.getElementById(errorFields[0]);
        if (firstErrorEl) {
            firstErrorEl.focus();
            firstErrorEl.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    } else {
        console.log('🎉 All REQUIRED fields PASSED');
    }
    
    console.log(`%cStep ${step} RESULT: ${isValid ? '✅ PASS' : '❌ FAIL'}`, 
        isValid ? 'color: green; font-weight: bold; font-size: 14px;' : 'color: red; font-weight: bold; font-size: 14px;');
    
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
                if (!/^\d{13}$/.test(value)) {
                    isValid = false;
                    errorMsg = 'Format must be 13 digits';
                }
                break;
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    errorMsg = 'Invalid email format';
                }
                break;
    case 'contact_number':
        if (!/^(03\d{9}|\+923\d{9})$/.test(value)) {
            isValid = false;
            errorMsg = 'Format: 03XXXXXXXXX or +923XXXXXXXXX';
        }
        break;
            case 'date_of_birth':
                const dob = new Date(value);
                const dobYear = dob.getFullYear();
                if (dobYear < 1950) {
                    isValid = false;
                    errorMsg = 'Date of birth cannot be before 1950';
                } else if (dobYear > 2015) {
                    isValid = false;
                    errorMsg = 'Date of birth cannot be after 2015';
                }
                break;
            case 'matric_board_other':
                const boardSelect = document.getElementById('matric_board');
                if (boardSelect && boardSelect.value === 'Other' && value.length < 2) {
                     isValid = false;
                     errorMsg = 'Please specify the board name';
                }
                break;
        }
        
        // Marks Specific Validation
        if(input.id.includes('obtain_marks') || input.id.includes('obtained_marks') ||
           input.id.includes('total_marks')) {
             const numValue = parseInt(value);
             
             // Check if marks are positive
             if(input.id.includes('total_marks')) {
                 if (numValue <= 0) {
                     isValid = false;
                     errorMsg = 'Total marks must be greater than 0';
                 } else if (numValue > 1200) {
                     isValid = false;
                     errorMsg = 'Total marks seems too high (max 1200)';
                 }
             }
             
             // Check if obtained marks are valid
             if(input.id.includes('obtain_marks') || input.id.includes('obtained_marks')) {
                 if (numValue < 0) {
                     isValid = false;
                     errorMsg = 'Obtained marks cannot be negative';
                 }
                 
                 // Compare with total marks
                 const baseId = input.id.replace('obtain_marks', '').replace('obtained_marks', '');
                 let totalId = baseId + 'total_marks';
                 if(baseId === 'matric_') totalId = 'matric_total_marks';
                 
                 const totalEl = document.getElementById(totalId);
                 if(totalEl && totalEl.value) {
                     const totalVal = parseInt(totalEl.value);
                     if(numValue > totalVal) {
                         isValid = false;
                         errorMsg = `Cannot exceed total marks (${totalVal})`;
                     }
                 }
             }
        }
    }

    if (isValid) {
        setSuccess(input.id);
    } else {
        console.warn(`INVALID ${input.id}: ${errorMsg}`);
        setError(input.id, errorMsg);
    }

    return isValid;
}

// UI Validation Helpers
function setError(elementId, message) {
    const el = document.getElementById(elementId);
    if(!el) {
        console.warn(`setError: Element not found: ${elementId}`);
        return;
    }
    const wrapper = el.closest('.input-wrapper');
    if(!wrapper) {
        console.warn(`setError: input-wrapper not found for ${elementId}`);
        return;
    }
    
    wrapper.classList.remove('success');
    wrapper.classList.add('error');
    
    // Find error span - it's a sibling of input-wrapper within form-group
    const formGroup = wrapper.closest('.form-group');
    if(!formGroup) {
        console.warn(`setError: form-group not found for ${elementId}`);
        return;
    }
    
    let errorSpan = formGroup.querySelector('.error-message');
    if (errorSpan) {
        if(message) errorSpan.textContent = message;
        errorSpan.classList.add('show');
        console.log(`✓ Error displayed for ${elementId}: ${message}`);
    } else {
        console.warn(`setError: error-message span not found for ${elementId}`);
    }
}

function setSuccess(elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    const wrapper = el.closest('.input-wrapper');
    if(!wrapper) return;
    
    wrapper.classList.remove('error');
    wrapper.classList.add('success');
    
    const formGroup = wrapper.closest('.form-group');
    if(!formGroup) return;
    
    let errorSpan = formGroup.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.classList.remove('show');
    }
}

function clearValidationUI(input) {
    const wrapper = input.closest('.input-wrapper');
    if(!wrapper) return;
    wrapper.classList.remove('success', 'error');
    const formGroup = wrapper.closest('.form-group');
    if(!formGroup) return;
    let errorSpan = formGroup.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.classList.remove('show');
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

function showDraftSaved() {
    // Optional: Show a subtle notification that draft is saved
    // You can add this to a notification area if desired
    console.log('Draft saved successfully');
}

// Supabase Utilities
async function checkUnique(field, value) {
    // If Supabase not configured properly, skip check to avoid breaking UI 
    if(SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') return true;

    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select(field)
            .eq(field, value)
            .limit(1);
            
        if (error) {
            console.warn('Supabase query error (table may not exist or RLS blocking):', error.message);
            // Return true to allow form submission when check fails
            return true;
        }
        return data.length === 0;
    } catch (err) {
        console.warn('Unique check failed (allowing submission):', err.message || err);
        // Return true so form can still be submitted even if Supabase fails
        return true;
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

        // Skip 'Other' board input field - handled by matric_board
        if (input.id === 'matric_board_other') {
            return;
        }
        
        // Handle 'Other' Board selection
        if (input.id === 'matric_board') {
            if (input.value === 'Other') {
                const otherBoardInput = document.getElementById('matric_board_other');
                if (!otherBoardInput || !otherBoardInput.value.trim()) {
                    // Skip if other board is empty - let validation catch it
                    return;
                }
                data.matric_board = otherBoardInput.value.trim();
            } else {
                data.matric_board = input.value;
            }
            return;
        }
        
        if (input.value) {
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

let draftSaveTimeout;
function saveDraft() {
    // Debounce draft saving to avoid excessive localStorage writes
    clearTimeout(draftSaveTimeout);
    draftSaveTimeout = setTimeout(() => {
        const data = collectFormData();
        
        // Save checkboxes state manually
        const hasGeneralNursing = document.getElementById('has_general_nursing');
        const hasMidwifery = document.getElementById('has_midwifery');
        
        if (hasGeneralNursing) data.has_general_nursing = hasGeneralNursing.checked;
        if (hasMidwifery) data.has_midwifery = hasMidwifery.checked;
        
        localStorage.setItem('registrationDraft', JSON.stringify(data));
        showDraftSaved();
    }, 500); // Save 500ms after user stops typing
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
                 if(input.id === 'matric_board' && input.options) {
                     const optionExists = Array.from(input.options).some(opt => opt.value === data.matric_board);
                     if (!optionExists && data.matric_board) {
                         input.value = 'Other';
                         const otherDiv = document.getElementById('matric_board_other_div');
                         const otherInput = document.getElementById('matric_board_other');
                         if (otherDiv) otherDiv.style.display = 'block';
                         if (otherInput) otherInput.value = data.matric_board;
                     }
                 }
             }
        });

        // Restore checkboxes and sections
        if (data.has_general_nursing) {
            const gn = document.getElementById('has_general_nursing');
            const gnSection = document.getElementById('general_nursing_section');
            if (gn) {
                gn.checked = true;
                if (gnSection) gnSection.classList.add('active');
            }
        }
        
        if (data.has_midwifery) {
            const mw = document.getElementById('has_midwifery');
            const mwSection = document.getElementById('midwifery_section');
            if (mw) {
                mw.checked = true;
                if (mwSection) mwSection.classList.add('active');
            }
        }

    } catch (e) {
        console.error('Error loading draft', e);
        localStorage.removeItem('registrationDraft');
    }
}
