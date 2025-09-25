// functions/audit-data.js
// Netlify Serverless function to proxy YouTube Data API calls

const { google } = require('googleapis');

// Final CORS Headers (Yeh zaroori hai!)
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*", // Sabhi domains se access allow karein
    "Content-Type": "application/json"
};

exports.handler = async (event, context) => {
    
    // API Key Netlify Environment Variables se aayegi
    const API_KEY = process.env.YOUTUBE_API_KEY; 
    const query = event.queryStringParameters.query; 

    if (!API_KEY) {
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'API key is not configured on Netlify environment variables.' }) };
    }
    if (!query) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Query parameter (channel name/ID) is missing.' }) };
    }

    try {
        const youtube = google.youtube({
            version: 'v3',
            auth: API_KEY, // Netlify secret use ho raha hai
        });

        // ------------------------------------------
        // A. Channel ID Find Karna (Agar input naam hai)
        // ------------------------------------------
        let channelId = query;
        if (!query.startsWith('UC') || query.length !== 24) { 
            const searchRes = await youtube.search.list({
                q: query,
                type: 'channel',
                part: 'id',
                maxResults: 1,
            });
            if (searchRes.data.items.length === 0) {
                return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Channel not found. Try entering the Channel ID (starts with UC).' }) };
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
            return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Channel details could not be retrieved.' }) };
        }

        // ------------------------------------------
        // C. Videos Fetch Karna (Playlist & Stats)
        // ------------------------------------------
        const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;
        
        const videosRes = await youtube.playlistItems.list({
            playlistId: uploadsPlaylistId,
            part: 'contentDetails',
            maxResults: 50, 
        });
        
        const videoIds = videosRes.data.items.map(item => item.contentDetails.videoId).join(',');
        
        let videosWithStats = [];
        if (videoIds) {
            const videoStatsRes = await youtube.videos.list({
                part: 'snippet,statistics',
                id: videoIds,
            });
            videosWithStats = videoStatsRes.data.items;
        }

        const finalData = {
            channel: channelRes.data.items[0],
            videos: videosWithStats,
        };

        // ------------------------------------------
        // D. Success Response (CORS ok)
        // ------------------------------------------
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(finalData),
        };

    } catch (error) {
        console.error('YouTube API Error:', error.message);
        
        // ------------------------------------------
        // E. Error Response (CORS ok)
        // ------------------------------------------
        return {
            statusCode: 500,
            headers: CORS_HEADERS, // Error mein bhi CORS headers zaroori hain
            body: JSON.stringify({ error: 'An internal server error occurred. Check API quota or Netlify logs.' }),
        };
    }
};
