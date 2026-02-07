import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:5173",
      "https://swainrecommend.netlify.app",
    ],
    methods: ["GET"],
  })
);

app.use(express.json());

/* =========================
   SIMPLE IN-MEMORY CACHE
========================= */
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

/* =========================
   PREVIEW API
========================= */
app.get("/api/preview", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.json({
      image: null,
      title: null,
      price: null,
      platform: null,
    });
  }

  // ✅ Cache hit
  if (cache.has(url)) {
    const cached = cache.get(url);
    if (Date.now() - cached.time < CACHE_TTL) {
      return res.json(cached.data);
    }
    cache.delete(url);
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      timeout: 8000,
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = response.url;

    /* =========================
       PLATFORM
    ========================= */
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    let platform = "unknown";

    if (hostname.includes("amazon")) platform = "amazon";
    else if (hostname.includes("flipkart")) platform = "flipkart";
    else if (hostname.includes("meesho")) platform = "meesho";

    /* =========================
       TITLE
    ========================= */
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      null;

    /* =========================
       PRICE
    ========================= */
    let price = null;

    if (platform === "amazon") {
      price =
        $("#priceblock_ourprice").text() ||
        $("#priceblock_dealprice").text() ||
        $(".a-price .a-offscreen").first().text();
    }

    if (platform === "flipkart") {
      price = $("div._30jeq3").first().text();
    }

    if (platform === "meesho") {
      price = $('div[data-testid="price"]').first().text();
    }

    /* =========================
       IMAGE (FAST)
    ========================= */
    let image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[property="og:image:secure_url"]').attr("content") ||
      null;

    if (!image && platform === "amazon") {
      image =
        $("#landingImage").attr("data-old-hires") ||
        $("#landingImage").attr("src") ||
        $("img.a-dynamic-image").first().attr("src");
    }

    if (!image && platform === "flipkart") {
      image = $("img._396cs4").attr("src");
    }

    if (!image && platform === "meesho") {
      image = $("img[data-src]").first().attr("data-src");
    }

    if (!image) {
      image = $("img")
        .filter((_, el) => {
          const src = $(el).attr("src");
          return src && src.startsWith("http");
        })
        .first()
        .attr("src");
    }

    // Fix relative URLs
    if (image && !image.startsWith("http")) {
      if (image.startsWith("//")) image = "https:" + image;
      else image = new URL(image, baseUrl).href;
    }

    const result = {
      image: image || null,
      title: title?.trim() || null,
      price: price?.trim() || null,
      platform,
    };

    // Save to cache
    cache.set(url, {
      time: Date.now(),
      data: result,
    });

    return res.json(result);
  } catch (err) {
    console.error("Preview error:", err.message);
    return res.json({
      image: null,
      title: null,
      price: null,
      platform: null,
    });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
