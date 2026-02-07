import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const router = express.Router();

router.get("/preview", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ image: null, title: null, price: null, platform: null });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: 'follow',
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = response.url; // Final URL after redirects
    console.log('Final URL:', baseUrl);

    // Detect platform
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    let platform = 'unknown';
    if (hostname.includes('amazon')) platform = 'amazon';
    else if (hostname.includes('flipkart')) platform = 'flipkart';
    else if (hostname.includes('meesho')) platform = 'meesho';

    // Extract title
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $('title').text() ||
      null;

    // Extract price
    let price = null;
    if (platform === 'amazon') {
      price = $('#priceblock_ourprice').text() ||
              $('#priceblock_dealprice').text() ||
              $('#priceblock_saleprice').text() ||
              $('.a-price .a-offscreen').first().text() ||
              $('span.a-price-whole').first().text();
    } else if (platform === 'flipkart') {
      price = $('div._30jeq3').first().text() ||
              $('div._16Jk6d').first().text();
    } else if (platform === 'meesho') {
      price = $('div.sc-eDvSVe').first().text() ||
              $('div[data-testid="price"]').first().text();
    }

    // Extract image with improved selectors
    let image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[property="og:image:secure_url"]').attr("content") ||
      $('link[rel="image_src"]').attr("href") ||
      null;

    // Platform-specific image extraction
    if (!image) {
      if (platform === 'amazon') {
        // Try multiple Amazon selectors
        image = $('#landingImage').attr('data-old-hires') ||
                $('#landingImage').attr('src') ||
                $('#imgBlkFront').attr('src') ||
                $('img[data-image-index="0"]').attr('src') ||
                $('img.a-dynamic-image').first().attr('src') ||
                $('div.imgTagWrapper img').first().attr('src') ||
                $('img[alt*="product"]').first().attr('src');

        // Try to get higher resolution image
        if (image && image.includes('._AC_')) {
          image = image.replace(/\._AC_[^.]*/, '._AC_SL1500_');
        }
      } else if (platform === 'flipkart') {
        image = $('img._396cs4').attr('src') ||
                $('img[data-src]').first().attr('data-src') ||
                $('img[alt*="product"]').first().attr('src') ||
                $('div._312yBx img').first().attr('src');
      } else if (platform === 'meesho') {
        image = $('img[data-src]').first().attr('data-src') ||
                $('img[alt*="product"]').first().attr('src') ||
                $('div[data-testid="image"] img').first().attr('src');
      }
    }

    // General fallback to first large image
    if (!image) {
      image = $('img').filter((i, el) => {
        const src = $(el).attr('src');
        const width = $(el).attr('width') || $(el).css('width');
        const height = $(el).attr('height') || $(el).css('height');
        return src && (!width || parseInt(width) > 200) && (!height || parseInt(height) > 200);
      }).first().attr('src');
    }

    // Make URL absolute if relative
    if (image && !image.startsWith('http')) {
      if (image.startsWith('//')) {
        image = 'https:' + image;
      } else if (image.startsWith('/')) {
        const base = new URL(baseUrl).origin;
        image = base + image;
      } else {
        // Relative path
        const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
        image = base + image;
      }
    }

    // Clean up title and price
    if (title) {
      title = title.trim().replace(/\s+/g, ' ');
    }
    if (price) {
      price = price.trim().replace(/\s+/g, ' ');
    }

    console.log('Extracted data:', { platform, title, price, image });

    return res.json({ image, title, price, platform });
  } catch (err) {
    console.error("Preview fetch error:", err.message);
    return res.json({ image: null, title: null, price: null, platform: null });
  }
});

export default router;
