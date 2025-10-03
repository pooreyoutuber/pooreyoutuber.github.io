const apiKey = "AIzaSyAI7S6lmMnAwDn0jTje_d1w_Qd9gQH_fAo"; // Your API key

function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getVideoInfo() {
  const url = document.getElementById("videoUrl").value;
  const videoId = extractVideoId(url);

  if (!videoId) {
    alert("Please enter a valid YouTube video URL.");
    return;
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      alert("No video found. Please check the URL.");
      return;
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const stats = video.statistics;

    document.getElementById("title").innerText = snippet.title;
    document.getElementById("description").innerText = snippet.description;
    document.getElementById("channelTitle").innerText = snippet.channelTitle;
    document.getElementById("publishedAt").innerText = new Date(snippet.publishedAt).toLocaleDateString();
    document.getElementById("views").innerText = stats.viewCount;
    document.getElementById("likes").innerText = stats.likeCount || "Hidden";
    document.getElementById("thumbnail").src = snippet.thumbnails.high.url;

    document.getElementById("result").classList.remove("hidden");
  } catch (error) {
    console.error("Error fetching video data:", error);
    alert("Something went wrong. Please try again.");
  }
}
