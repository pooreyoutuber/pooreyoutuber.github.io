<script>
    // ------------------------------------------------------------------------------------
    // --- WEBSITE BOOSTER CONFIGURATION ---
    // ------------------------------------------------------------------------------------
    // IMPORTANT: Apne Render URL ko yahan verify karein.
    const BASE_API_URL = 'https://pooreyoutuber-github-io.onrender.com';
    const BOOSTER_ENDPOINT = `${BASE_API_URL}/boost-mp`;
    const STORAGE_KEY = 'booster_details_v6'; 
    
    const form = document.getElementById('boosterForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');
    const totalPercentSpan = document.getElementById('totalPercent');
    
    const pageInputs = [1, 2, 3, 4, 5].map(i => ({
        url: document.getElementById(`url${i}`),
        percent: document.getElementById(`percent${i}`)
    }));

    // ------------------------------------------------------------------------------------
    // --- INSTA CAPTION TOOL CONFIGURATION (Used in the other HTML file) ---
    // Hum yahan define kar rahe hain taaki agar aap is file mein tabs add karein to kaam kare.
    // NOTE: Agar aap sirf is file ko use kar rahe hain (booster), to yeh parts sirf setup ke liye hain.
    const GENERATE_ENDPOINT = `${BASE_API_URL}/api/caption-generate`;
    const EDIT_ENDPOINT = `${BASE_API_URL}/api/caption-edit`;


    // --- Local Storage Functions (Booster) ---
    function loadSavedDetails() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                document.getElementById('gaid').value = data.gaid || '';
                document.getElementById('apikey').value = data.apikey || '';
                document.getElementById('views').value = data.views || '100';
                
                data.pages.forEach((page, index) => {
                    if (index < 5) {
                        pageInputs[index].url.value = page.url || '';
                        pageInputs[index].percent.value = page.percent || '0';
                    }
                });

            } catch (e) { /* Error ignored */ }
            updateDisplayTotal();
        }
    }

    function saveDetails(gaid, apikey, views, pages) {
        const data = { gaid, apikey, views, pages };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // --- UI Functions (Booster) ---
    function updateDisplayTotal() {
        let total = 0;
        document.querySelectorAll('.page-percent').forEach(input => {
            total += parseInt(input.value) || 0; 
        });
        totalPercentSpan.textContent = total;
        totalPercentSpan.style.color = total === 100 ? '#5cb85c' : '#d9534f';
        return total;
    }
    document.querySelectorAll('.page-percent').forEach(input => {
        input.addEventListener('input', updateDisplayTotal);
    });

    function showMessage(type, message, reenable) {
        messageDiv.className = type;
        messageDiv.innerHTML = message;
        if (reenable) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Generate Traffic and Close Browser';
        }
    }

    // ------------------------------------------------------------------------------------
    // --- 1. WEBSITE BOOSTER SUBMISSION LOGIC (Corrected) ---
    // ------------------------------------------------------------------------------------
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const gaId = document.getElementById('gaid').value.trim();
        const apiKey = document.getElementById('apikey').value.trim();
        let viewsCount = parseInt(document.getElementById('views').value);
        
        if (!gaId || !apiKey || viewsCount < 1) {
            showMessage('error', '❌ Error: GA Keys, API Secret, and Total Views are required.', true);
            return;
        }

        const totalPercent = updateDisplayTotal();
        if (totalPercent !== 100) {
            showMessage('error', `❌ Error: Total distribution must be 100%, but it is ${totalPercent}%.`, true);
            return;
        }
        
        let pages = [];
        let isValid = true; 
        
        pageInputs.forEach(input => {
            const url = input.url.value.trim();
            const percent = parseInt(input.percent.value) || 0;
            if (url && percent > 0) {
                if (!url.startsWith('http')) {
                    showMessage('error', '❌ Error: All page URLs must start with http:// or https://', true);
                    isValid = false;
                    return;
                }
                pages.push({ url: url, percent: percent });
            }
        });

        if (!isValid) return; 

        if (pages.length === 0) {
                showMessage('error', '❌ Error: At least one Page URL (Page 1) with a percentage > 0 must be filled.', true);
                return;
        }

        saveDetails(gaId, apiKey, viewsCount, pages); 
        const payload = { ga_id: gaId, api_key: apiKey, views: viewsCount, pages: pages };
        
        submitData(payload, 2); 
    });

    // --- Core Data Submission with Retry Logic ---
    async function submitData(data, retriesLeft) {
        submitBtn.disabled = true;
        
        if (retriesLeft < 2) {
            submitBtn.textContent = `⚠️ Pinging server... Retrying in 5 seconds...`;
            showMessage('info', `⚠️ Server is waking up. Retrying in 5 seconds...`, false);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            submitBtn.textContent = '✅ Request initiated. Checking server status...';
            showMessage('info', '✅ Request initiated. Checking server status...', false);
        }
        
        try {
            const response = await fetch(BOOSTER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const responseData = await response.json();

            // *** FIX: Handling 'accepted' status as SUCCESS ***
            if (responseData.status === 'accepted') {
                showMessage('success', `✨ Success! Request for ${data.views} views accepted. **Results expected within 24-48 hours.** You can close this browser now.`, true);
            } 
            // Handles explicit errors from backend (e.g., validation errors)
            else if (responseData.status === 'error') {
                showMessage('error', `❌ API Error: ${responseData.message || 'Unknown error. Check server logs.'}.`, true);
            }
            // Handles other unexpected errors, including HTTP errors that didn't throw an exception
            else {
                 showMessage('error', `❌ Server Error: HTTP Status ${response.status}. Message: ${responseData.message || JSON.stringify(responseData)}`, true);
            }

        } catch (error) {
            // Catches Network errors (e.g., CORS, Fetch failed)
            if (retriesLeft > 0) {
                return submitData(data, retriesLeft - 1);
            } else {
                showMessage('error', `❌ Final Connection Error (3 attempts). Ensure your API service is LIVE and the URL is correct.`, true);
            }
        } 
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadSavedDetails();
        updateDisplayTotal();
    });
</script>
