// functions/audit-data.js
// ----------------------------------------------------

// 1. Dependencies import karein
// (Aapko yeh dependency apne package.json mein bhi daalni hogi: "googleapis")
const { google } = require('googleapis');

// 2. Netlify ke liye function handler define karein
// Yeh function client-side (GitHub Pages) se aane waali request ko handle karega
exports.handler = async (event, context) => {
    // ------------------------------------------
    // A. API Key aur Query nikalna
    // ------------------------------------------
    
    // API Key Netlify Environment Variables (Secrets) se automatically aayegi
    const API_KEY = process.env.YOUTUBE_API_KEY; 
    
    // GitHub Pages se aayi hui query (channel name ya ID) nikalna
    const query = event.queryStringParameters.query; 

    // Error check
    if (!API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured.' }) };
    }
    if (!query) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Query parameter is missing.' }) };
    }

    // ------------------------------------------
    // B. Google API Call Logic
    // ------------------------------------------

    try {
        const youtube = google.youtube({
            version: 'v3',
            auth: API_KEY, // Yahan Netlify secret use ho raha hai
        });

        // 1. Pehle Channel ID find karna (agar query channel name hai)
        let channelId = query;
        if (!query.startsWith('UC')) { // Agar 'UC' se shuru nahi hota, toh search karein
            const searchRes = await youtube.search.list({
                q: query,
                type: 'channel',
                part: 'id',
                maxResults: 1,
            });
            if (searchRes.data.items.length === 0) {
                return { statusCode: 404, body: JSON.stringify({ error: 'Channel not found.' }) };
            }
            channelId = searchRes.data.items[0].id.channelId;
        }

        // 2. Channel Details fetch karna
        const channelRes = await youtube.channels.list({
            part: 'snippet,statistics,contentDetails',
            id: channelId,
        });

        // 3. Channel ke Top Videos fetch karna (Jaise aapke Replit code mein tha)
        const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;
        
        const videosRes = await youtube.playlistItems.list({
            playlistId: uploadsPlaylistId,
            part: 'snippet,contentDetails',
            maxResults: 50, // 50 videos tak
        });

        // Data ko clean karke final result tyaar karna (Yeh aapke Replit logic par depend karta hai)
        const finalData = {
            channel: channelRes.data.items[0].snippet,
            statistics: channelRes.data.items[0].statistics,
            videos: videosRes.data.items,
        };

        // ------------------------------------------
        // C. Result Client ko wapas bhejna
        // ------------------------------------------
        
        // CORSMISSUE se bachne ke liye headers add karein
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Sabhi domains se access allow karein
                "Content-Type": "application/json"
            },
            body: JSON.stringify(finalData),
        };

    } catch (error) {
        console.error('YouTube API Error:', error.message);
        // Agar Google API key invalid ho ya quota khatam ho jaye, toh 403 error aayega
        if (error.code === 403) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Google API Quota Limit Reached or Key Restriction.' }),
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred.' }),
        };
    }
};

// ----------------------------------------------------
