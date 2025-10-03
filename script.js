const API_KEY = "AIzaSyAI7S6lmMnAwDn0jTje_d1w_Qd9gQH_fAo";

// Dark/Light Mode Toggle
document.getElementById("toggleMode").addEventListener("click", function () {
  document.body.classList.toggle("dark");
  if (document.body.classList.contains("dark")) {
    this.textContent = "☀️ Light Mode";
  } else {
    this.textContent = "🌙 Dark Mode";
  }
});

// Main Function
async function fetchVideoData() {
  const url = document.getElementById("videoInput").value.trim();
  if (!url) {
    alert("Please enter a valid YouTube video URL!");
    return;
  }

  // Extract Video ID
  let videoId = "";
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  if (match) {
    videoId = match[1];
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  }

  if (!videoId) {
    alert("Invalid YouTube Video URL!");
    return;
  }

  try {
    // Fetch Video Info
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`
    );
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      alert("No video found!");
      return;
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const stats = video.statistics;

    // Fill Data
    document.getElementById("report").classList.remove("hidden");
    document.getElementById("thumbnail").src = snippet.thumbnails.high.url;
    document.getElementById("title").innerText = snippet.title;
    document.getElementById("channel").innerText = snippet.channelTitle;
    document.getElementById("views").innerText =
      stats.viewCount.toLocaleString() + " views";
    document.getElementById("published").innerText = new Date(
      snippet.publishedAt
    ).toDateString();
    document.getElementById("description").innerText = snippet.description;

    // Auto Summary
    document.getElementById("summaryText").innerText =
      `The video titled "${snippet.title}" was uploaded by "${snippet.channelTitle}" on ${new Date(
        snippet.publishedAt
      ).toDateString()}. 
      It has received ${stats.viewCount.toLocaleString()} views so far. 
      This video provides insights into its topic and engages viewers effectively. 
      Based on its performance and metadata, this video can be useful for SEO research, 
      competitor analysis, and understanding audience engagement strategies.`;
  } catch (err) {
    console.error("Error fetching video:", err);
    alert("Something went wrong. Please try again.");
  }
}
