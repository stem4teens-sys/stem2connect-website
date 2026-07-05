const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("active");
    navToggle.classList.toggle("active", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("nav-open", isOpen);
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    });
  });
}

const revealElements = document.querySelectorAll(
  ".section-heading, .value-card, .activity-card, .webinar-card, .team-card, .mission-card, .upcoming-card, .join-card, .social-card"
);

function extractYouTubeVideoId(embedSrc) {
  if (!embedSrc) return null;

  try {
    const url = new URL(embedSrc);
    const parts = url.pathname.split("/embed/");
    if (parts.length < 2) return null;
    const id = parts[1].split("/")[0];
    return id || null;
  } catch {
    return null;
  }
}

function buildEmbedSrc(videoId) {
  const params = new URLSearchParams({ rel: "0" });

  // YouTube can require a valid origin for embeds on hosted pages.
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    params.set("origin", window.location.origin);
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function createLocalFallback(videoId, title) {
  const link = document.createElement("a");
  link.className = "video-fallback";
  link.href = `https://www.youtube.com/watch?v=${videoId}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `${title || "Webinar"} (open on YouTube)`);

  const image = document.createElement("img");
  image.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  image.alt = `${title || "Webinar"} thumbnail`;
  image.loading = "lazy";

  const label = document.createElement("span");
  label.className = "video-fallback-label";
  label.textContent = "Open on YouTube";

  link.append(image, label);
  return link;
}

const youtubeIframes = document.querySelectorAll(".video-wrap iframe[src*='youtube.com/embed']");

youtubeIframes.forEach((iframe) => {
  const videoId = extractYouTubeVideoId(iframe.getAttribute("src"));
  if (!videoId) return;

  if (window.location.protocol === "file:") {
    const wrapper = iframe.closest(".video-wrap");
    if (wrapper) {
      wrapper.replaceChildren(createLocalFallback(videoId, iframe.getAttribute("title")));
    }
    return;
  }

  iframe.src = buildEmbedSrc(videoId);
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
});

revealElements.forEach((element) => {
  element.classList.add("reveal");
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12
  }
);

revealElements.forEach((element) => revealObserver.observe(element));

// Smooth 'Back to top' behavior: override anchor and scroll to very top.
const backToTopLink = document.querySelector('a[href="#top"]');
if (backToTopLink) {
  backToTopLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}