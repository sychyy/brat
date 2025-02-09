const express = require("express");
const os = require("os");
const axios = require("axios");
const { run } = require("shannz-playwright");

const app = express();
const PORT = process.env.PORT || 7860;
let totalHits = 0;
let hitsPerMinute = 0;

app.get("/", (req, res) => {
    res.json({
        endpoint: ["/generate", "/ssweb"],
        stats: {
            hitsPerMinute,
            totalHits,
        },
        runtime: {
            os: os.type(),
            platform: os.platform(),
            architecture: os.arch(),
            cpuCount: os.cpus().length,
            uptime: new Date(process.uptime() * 1000).toTimeString().split(" ")[0],
            memoryUsage: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)} MB used of ${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        },
    });
});

app.get("/generate", async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
    }
    let stats;
    try {
        const result = await brat(query);
        const response = await axios.get(result.url, { responseType: "arraybuffer" });
        res.set("Content-Type", "image/webp");
        res.send(response.data);
        stats = 200;
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate brat" });
        stats = 500;
    }
    if (stats === 200) {
        hitsPerMinute++;
        totalHits++;
    }
});

app.get("/ssweb", async (req, res) => {
    const { link, width = 1920, height = 1080 } = req.query;
    if (!link) {
        return res.status(400).json({ error: "Parameter link is required" });
    }
    if (isNaN(width) || isNaN(height)) {
        return res.status(400).json({ error: "Width and height must be numbers" });
    }
    let stats;
    try {
        const result = await ssweb(link, parseInt(width), parseInt(height));
        const response = await axios.get(result.url, { responseType: "arraybuffer" });
        res.set("Content-Type", "image/webp");
        res.send(response.data);
        stats = 200;
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate screenshot" });
        stats = 500;
    }
    if (stats === 200) {
        hitsPerMinute++;
        totalHits++;
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

setInterval(async() => {
hitsPerMinute = 0
await ssweb("https://brat.lick.eu.org")
await ssweb("https://8z6lj9.csb.app")
console.log("Uptime")
}, 60000)

async function brat(query) {
    const code = `
        const { chromium } = require('playwright');
        async function ssweb(q) {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto("https://www.bratgenerator.com");
            const consentButtonSelector = "#onetrust-accept-btn-handler";
            if (await page.$(consentButtonSelector)) {
                await page.click(consentButtonSelector);
                await page.waitForTimeout(500);
            }
            await page.click("#toggleButtonWhite");
            await page.fill("#textInput", q);
            await page.locator("#textOverlay").screenshot({ path: 'brat.png' });
            await browser.close();
        }
        ssweb("${query}").then(a => console.log(a));
    `;
    const result = await run("javascript", code);
    const files = result.result.files;
    const fileData = files[0];
    return {
        url: "https://try.playwright.tech" + fileData.publicURL,
        fileName: fileData.fileName,
        extension: fileData.extension,
    };
}

async function ssweb(query, width = 1920, height = 1080) {
    const fileName = `screenshot_${Date.now()}.png`;
    const code = `
        const { chromium } = require('playwright');
        (async () => {
            const browser = await chromium.launch();
            const page = await browser.newPage({ viewport: { width: ${width}, height: ${height} } });
            await page.goto("${query}", { waitUntil: 'networkidle' });
            await page.waitForTimeout(5000);
            await page.screenshot({ path: "${fileName}", fullPage: true });
            await browser.close();
        })();
    `;
    const result = await run("javascript", code);
    const files = result.result.files;
    const fileData = files[0];
    return {
        url: "https://try.playwright.tech" + fileData.publicURL,
        fileName: fileData.fileName,
        extension: fileData.extension,
    };
}
