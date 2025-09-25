// functions/audit-data.js file mein, shuru mein
// ...
const API_KEY = process.env.YOUTUBE_API_KEY; 
let query = event.queryStringParameters.query; // Query ko pehle hi define karein
// ...

if (!query) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Query parameter (channel name/ID) is missing.' }) };
}

// --- ZAROORI CODE ADD KAREN YAHAN ---
// 1. @ symbol hatao (agar front-end ne nahi hataya toh)
query = query.replace('@', ''); 

// 2. URL-encoded spaces (+) ko space mein badlo (agar front-end se aayein toh)
query = query.replace(/\+/g, ' '); 

// ------------------------------------

try {
    const youtube = google.youtube({
        version: 'v3',
        auth: API_KEY, 
    });

    // ------------------------------------------
    // A. Channel ID Find Karna
    // ------------------------------------------
    let channelId = query;
    // Agar query UC se shuru nahi hota, toh search API use karein
    if (!query.startsWith('UC') || query.length !== 24) { 
        const searchRes = await youtube.search.list({
            q: query, // Ab yeh 'query' cleaned hai
            type: 'channel',
            part: 'id',
            maxResults: 1,
        });
        // ... (baki ka code jaisa hai waisa hi rahega)
    
