const API_KEY = "AIzaSyAI7S6lmMnAwDn0jTje_d1w_Qd9gQH_fAo";

async function fetchVideoData() {
  const url = document.getElementById("videoInput").value.trim();
  if (!url) {
    alert("Please enter a valid YouTube video URL!");
    return;
  }

  // Extract video ID from URL
  const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  if (!videoIdMatch) {
    alert("Invalid YouTube Video URL!");
    return;
  }
  const videoId = videoIdMatch[1];

  try {
    // Fetch video details
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`
    );
    const videoData = await videoRes.json();

    if (!videoData.items || videoData.items.length === 0) {
      alert("No video found! Please check the URL.");
      return;
    }

    const video = videoData.items[0];
    const snippet = video.snippet;
    const stats = video.statistics;

    // Display video details
    document.getElementById("report").classList.remove("hidden");
    document.getElementById("thumbnail").src = snippet.thumbnails.high.url;
    document.getElementById("title").innerText = snippet.title;
    document.getElementById("channel").innerText = snippet.channelTitle;
    document.getElementById("views").innerText = stats.viewCount.toLocaleString() + " views";
    document.getElementById("published").innerText = new Date(snippet.publishedAt).toDateString();
    document.getElementById("description").innerText = snippet.description;

    // Generate Summary (simple AI-like text)
    document.getElementById("summaryText").innerText =
      `This video titled "${snippet.title}" from channel "${snippet.channelTitle}" was published on ${new Date(snippet.publishedAt).toDateString()} 
      and has already gained ${stats.viewCount.toLocaleString()} views. 
      Based on the description and engagement, it provides useful insights and entertainment for its audience. 
      Such videos are highly valuable for SEO research, content analysis, and understanding viewer trends.`;

  } catch (error) {
    console.error("Error fetching video data:", error);
    alert("Something went wrong while fetching video details.");
  }
}
