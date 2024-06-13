import * as puppeteer from 'puppeteer';

let visitedURLs = new Set<string>();
export default async function authenticateAndScrapeM3u8Links(url: string, login: string , username: string, password: string, condition: (link: string) => boolean): Promise<string[]> {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();


    page.setDefaultNavigationTimeout(180000);
    
    // Enable request interception to capture network requests
    await page.setRequestInterception(true);

    // Array to store intercepted requests
    // @ts-ignore
    const interceptedRequests: puppeteer.Request[] = [];

    // Listen for network requests and store them
    page.on('request', async (request) => {
        if (request.url().endsWith('.m3u8') && request.url().startsWith("https://")) {
            const outputFileName = generateOutputFileName();
            const link = request.url();
            console.log(`Downloading video from URL: ${link}`);
            console.log(`Output file name: ${outputFileName}`);
            await downloadVideoWithFFmpeg(link, outputFileName);
            console.log(`Video downloaded successfully: ${outputFileName}`)
        }
        interceptedRequests.push(request);
        await request.continue();
    });
    
    
    // Navigate to the login page
    await page.goto(login);

    // Fill and submit the login form
    await page.type('input[name="email"]', username);
    await page.type('input[name="password"]', password);
    await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]'),
    ]);

    // Random wait before navigating to the home page
    await randomWait();

    // Navigate to the home page
    await page.goto(url);

    // Random wait before crawling for links
    await randomWait();

    // Perform web crawling to extract all links
    const links = await crawlForLinks(page, "/courses/course");
    
    const filteredLinks = links.filter(link => condition(link));
 
        
    await scrapeM3u8Links(page, filteredLinks);    
    
    const m3u8Links = interceptedRequests
        .filter(request => request.url().endsWith('.m3u8') && request.url().startsWith("https://fast.wistia.com/"))
        .map(request => request.url());
    // Close the browser
    await browser.close();
    
    return m3u8Links;
}
    

async function crawlForLinks(page: puppeteer.Page, url: string): Promise<string[]> {
    const links: string[] = [];
    
    // Extract links from the current page
    const pageLinksAll = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a');
        return Array.from(anchors).map(anchor => anchor.href);
    });
    
    const pageLinks = pageLinksAll.filter(link => link.startsWith(url))
    console.log("Estas son las paginas que se vas a revizar");
    console.log(pageLinks)
    console.log("Estas son las paginas que se han visitado");
    console.log(visitedURLs)
   
    visitedURLs.add(page.url());
    
    links.push(...pageLinks);

    // Random wait before crawling nested links
    await randomWait();

    // Recursively crawl linked pages
    for (const link of pageLinks) {
        if (link.startsWith(url) && !visitedURLs.has(link)) {
            visitedURLs.add(link);
            await page.goto(link);
            const nestedLinks = await crawlForLinks(page, url);
            links.push(...nestedLinks);
        }
    }
    
    // Remove duplicate links
    return Array.from(new Set(links));
}

async function scrapeM3u8Links(page: puppeteer.Page, links: string[]) {
    for (const link of links) {
        await page.goto(link);
        await page.waitForSelector('.c-video-player iframe');
        await randomWait();
    } 
    
}

async function randomWait() {
    // Generate random wait time between 5 and 10 seconds
    const waitTime = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
}


async function downloadVideoWithFFmpeg(m3u8Link: string, outputFileName: string) {
    // Run ffmpeg command to download the video
    const ffmpegCommand = `ffmpeg -i "${m3u8Link}" -c copy -bsf:a aac_adtstoasc "${outputFileName}"`;
    await executeShellCommand(ffmpegCommand);
}

async function executeShellCommand(command: string) {
    const { exec } = require('child_process');
    return new Promise<void>((resolve, reject) => {
        exec(command, (error: any, stdout: any, stderr: any) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function generateOutputFileName() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-T:]/g, '').slice(0, -5); // Format: YYYYMMDD_HHMMSS
    return `${timestamp}.mp4`;
}
