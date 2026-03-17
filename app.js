// ==========================================
// CONFIGURATION - Replace with your Supabase credentials
// ==========================================
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_PUBLIC_KEY';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// FORM HANDLING
// ==========================================
const form = document.getElementById('studentForm');
const submitBtn = document.getElementById('submitBtn');
const spinner = document.getElementById('spinner');
const btnText = document.getElementById('btnText');
const successMsg = document.getElementById('successMsg');
const alreadySubmitted = document.getElementById('alreadySubmitted');

// Check if user already submitted (using localStorage + email check)
const submittedEmail = localStorage.getItem('submittedEmail');

if (submittedEmail) {
    showAlreadySubmitted();
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = {
        email: document.getElementById('email').value.trim().toLowerCase(),
        full_name: document.getElementById('fullName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        course: document.getElementById('course').value,
        address: document.getElementById('address').value.trim(),
        submitted_at: new Date().toISOString()
    };

    // Validation
    if (!validateEmail(formData.email)) {
        showError('emailError');
        return;
    }

    // Show loading state
    setLoading(true);

    try {
        // Check if email already exists
        const { data: existing, error: checkError } = await supabase
            .from('students')
            .select('email')
            .eq('email', formData.email)
            .single();

        if (existing) {
            alert('This email has already been registered!');
            setLoading(false);
            return;
        }

        // Insert data
        const { data, error } = await supabase
            .from('students')
            .insert([formData])
            .select();

        if (error) throw error;

        // Success!
        localStorage.setItem('submittedEmail', formData.email);
        showSuccess();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting form: ' + error.message);
        setLoading(false);
    }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(errorId) {
    document.getElementById(errorId).style.display = 'block';
    setTimeout(() => {
        document.getElementById(errorId).style.display = 'none';
    }, 3000);
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    spinner.style.display = isLoading ? 'inline-block' : 'none';
    btnText.textContent = isLoading ? 'Submitting...' : 'Submit Registration';
}

function showSuccess() {
    form.style.display = 'none';
    successMsg.style.display = 'block';
}

function showAlreadySubmitted() {
    form.style.display = 'none';
    alreadySubmitted.style.display = 'block';
}
