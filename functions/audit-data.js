// functions/audit-data.js
// Netlify Serverless function to proxy YouTube Data API calls

// 1. Dependencies import karein
// (Zaroori: Yeh "googleapis" dependency package.json mein honi chahiye)
const { google } = require('googleapis');

// 2. Netlify ke liye function handler define karein
exports.handler = async (event, context) => {
    
    // API Key Netlify Environment Variables (Secrets) se aayegi
    const API_KEY = process.env.YOUTUBE_API_KEY; 
    
    // GitHub Pages se aayi hui query (channel name ya ID) nikalna
    const query = event.queryStringParameters.query; 

    // CORS Headers define karein (Zaroori! Yeh "Failed to fetch" error ko theek karta hai)
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*", // Sabhi domains se access allow karein
        "Content-Type": "application/json"
    };

    // Error check: API Key
    if (!API_KEY) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'API key is not configured on Netlify environment variables.' }) };
    }
    // Error check: Query
    if (!query) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Query parameter (channel name/ID) is missing.' }) };
    }

    try {
        const youtube = google.youtube({
            version: 'v3',
            auth: API_KEY, // Yahan Netlify secret use ho raha hai
        });

        // ------------------------------------------
        // A. Channel ID Find Karna (Agar input naam hai)
        // ------------------------------------------
        let channelId = query;
        if (!query.startsWith('UC') || query.length !== 24) { // Agar 'UC' se shuru nahi hota, toh search karein
            const searchRes = await youtube.search.list({
                q: query,
                type: 'channel',
                part: 'id',
                maxResults: 1,
            });
            if (searchRes.data.items.length === 0) {
                return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Channel not found. Try entering the Channel ID (starts with UC).' }) };
            }
            channelId = searchRes.data.items[0].id.channelId;
        }

        // ------------------------------------------
        // B. Channel Details Fetch Karna
        // ------------------------------------------
        const channelRes = await youtube.channels.list({
            part: 'snippet,statistics,contentDetails',
            id: channelId,
        });
        
        if (!channelRes.data.items || channelRes.data.items.length === 0) {
            return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Channel details could not be retrieved.' }) };
        }

        // ------------------------------------------
        // C. Videos Fetch Karna (Playlist)
        // ------------------------------------------
        const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;
        
        const videosRes = await youtube.playlistItems.list({
            playlistId: uploadsPlaylistId,
            part: 'snippet,contentDetails',
            maxResults: 50, // Pehle 50 videos fetch karein
        });
        
        // Videos ki statistics fetch karein (Views, Likes, Comments)
        // YouTube API playlistItems list call mein statistics nahi deta, isliye video list call zaroori hai.
        const videoIds = videosRes.data.items.map(item => item.contentDetails.videoId).join(',');
        
        let videosWithStats = [];
        if (videoIds) {
            const videoStatsRes = await youtube.videos.list({
                part: 'snippet,statistics',
                id: videoIds,
            });
            videosWithStats = videoStatsRes.data.items;
        }

        // Data ko clean karke final result tyaar karna
        const finalData = {
            channel: channelRes.data.items[0],
            videos: videosWithStats, // Videos with full stats
        };

        // ------------------------------------------
        // D. Success Response Wapas Bhejna
        // ------------------------------------------
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(finalData),
        };

    } catch (error) {
        console.error('YouTube API Error:', error.message);
        
        // API Quota/Invalid Key error handling
        if (error.code === 403) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Google API Quota Limit Reached or Invalid Key. Check Netlify Environment Variables.' }),
            };
        }
        
        // General error handling
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'An internal server error occurred during data fetching.' }),
        };
    }
};
