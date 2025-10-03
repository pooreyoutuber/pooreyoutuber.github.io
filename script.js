// =========================================================
// JAVASCRIPT LOGIC
// =========================================================

// IMPORTANT: Replace this with your actual Google/YouTube Data API Key
const API_KEY = "AIzaSyAI7S6lmMnAwDn0jTje_d1w_Qd9gQH_fAo"; 

document.getElementById("btnFetch").addEventListener("click", () => {
  const url = document.getElementById("videoUrl").value.trim();
  const videoId = extractVideoId(url);
  if (!videoId) {
    showOutput("<p style='color: red;'>Invalid YouTube video URL. Please check the format.</p>");
    return;
  }
  fetchVideoInfo(videoId);
});

// Function to extract the 11-character video ID from various YouTube URL formats
function extractVideoId(url) {
  // Matches watch?v=, .be/, /embed/, /v/, and youtu.be/
  const match = url.match(/(?:v=|\.be\/|\/embed\/|\/v\/|youtu.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Function to fetch video info (snippet and statistics)
function fetchVideoInfo(videoId) {
  showOutput('<p style="color: #e62117; font-weight: bold;">Fetching data... Please wait. This consumes API Quota.</p>');
  
  gapi.load("client", () => {
    gapi.client.init({ apiKey: API_KEY }).then(() => {
      return gapi.client.youtube.videos.list({
        part: "snippet,statistics",
        id: videoId
      });
    }).then(response => {
      const video = response.result.items[0];
      if (!video) {
        showOutput("<p style='color: red;'>Video not found or API key/quota issue. Please check the URL and your API settings.</p>");
        return;
      }
      displayVideoInfo(video);
      fetchComments(videoId);
    }).catch(err => {
      console.error("API Error:", err);
      showOutput("<p style='color: red;'>Failed to fetch video data. Check your API Key, network connection, or console for detailed errors.</p>");
    });
  });
}

// Function to display fetched video details in the output div
function displayVideoInfo(video) {
  const snippet = video.snippet;
  const stats = video.statistics;

  let html = "<h3>Video Details:</h3>";
  html += `<div class="section"><strong>Title:</strong> ${snippet.title}</div>`;
  html += `<div class="section"><strong>Description:</strong><br> ${snippet.description.replace(/\n/g, "<br>")}</div>`;
  html += `<div class="section"><strong>Channel:</strong> ${snippet.channelTitle}</div>`;
  html += `<div class="section"><strong>Published On:</strong> ${new Date(snippet.publishedAt).toLocaleString()}</div>`;
  html += `<div class="section"><strong>Tags:</strong> ${snippet.tags ? snippet.tags.join(", ") : "None"}</div>`;
  html += `<div class="section"><strong>Views:</strong> ${stats.viewCount || "Unavailable"}</div>`;
  html += `<div class="section"><strong>Likes:</strong> ${stats.likeCount || "Hidden"}</div>`;
  html += `<div class="section"><strong>Comments Count:</strong> ${stats.commentCount || "Unavailable"}</div>`;

  document.getElementById("output").innerHTML = html;
}

// Function to fetch and display the top 5 comments
function fetchComments(videoId) {
  gapi.client.youtube.commentThreads.list({
    part: "snippet",
    videoId: videoId,
    maxResults: 5,
    textFormat: "plainText"
  }).then(response => {
    const items = response.result.items;
    
    let commentHtml = "";
    
    if (!items || items.length === 0) {
      commentHtml += "<div class='section'><strong>Top 5 Comments:</strong> No comments found or comments are disabled.</div>";
    } else {
      commentHtml += "<div class='section'><strong>Top 5 Comments:</strong></div>";
      items.forEach(item => {
        const c = item.snippet.topLevelComment.snippet;
        commentHtml += `
          <div class="comment">
            <strong>${c.authorDisplayName}</strong>:<br>
            ${c.textDisplay}<br>
            <small>👍 ${c.likeCount} | 🕒 ${new Date(c.publishedAt).toLocaleString()}</small>
          </div>`;
      });
    }

    document.getElementById("output").innerHTML += commentHtml;
  }).catch(err => {
    console.warn("Comments fetch error:", err);
    document.getElementById("output").innerHTML += "<div class='section'><strong style='color: orange;'>Note:</strong> Failed to fetch comments. (Comments may be disabled for this video, or another API issue occurred)</div>";
  });
}

// Helper function to update the output div content
function showOutput(html) {
  document.getElementById("output").innerHTML = html;
}
