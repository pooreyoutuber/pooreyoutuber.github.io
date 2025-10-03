const API_KEY = "YOUR_API_KEY_HERE"; // replace with your YouTube Data API v3 key
const fetchBtn = document.getElementById("fetchBtn");
const status = document.getElementById("status");

fetchBtn.addEventListener("click", getVideoInfo);

function extractVideoId(url) {
  let id = "";
  try {
    if (url.includes("youtu.be/")) {
      id = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("v=")) {
      id = url.split("v=")[1].split("&")[0];
    } else {
      id = url; // assume direct ID
    }
  } catch {
    id = "";
  }
  return id;
}

async function getVideoInfo() {
  const url = document.getElementById("videoUrl").value.trim();
  const videoId = extractVideoId(url);
  if (!videoId) {
    status.textContent = "❌ Invalid YouTube URL or ID.";
    return;
  }

  status.textContent = "⏳ Fetching data...";
  const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${API_KEY}`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      status.textContent = "⚠️ Video not found or unavailable.";
      return;
    }

    const video = data.items[0];
    document.getElementById("title").textContent = video.snippet.title;
    document.getElementById("channelTitle").textContent = video.snippet.channelTitle;
    document.getElementById("publishedAt").textContent = new Date(video.snippet.publishedAt).toDateString();
    document.getElementById("views").textContent = video.statistics.viewCount;
    document.getElementById("likes").textContent = video.statistics.likeCount || "Hidden";
    document.getElementById("comments").textContent = video.statistics.commentCount || "Disabled";
    document.getElementById("description").textContent = video.snippet.description;
    document.getElementById("thumbnail").src = video.snippet.thumbnails.high.url;

    document.getElementById("result").classList.remove("hidden");
    status.textContent = "✅ Data loaded successfully!";
  } catch (err) {
    status.textContent = "❌ Error fetching video info.";
    console.error(err);
  }
}
