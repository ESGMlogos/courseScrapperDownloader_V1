import authenticateAndScrapeM3u8Links from "./lib/scraper"


const url = 'https://someurlsomeurl.com/courses/dashboard';
const login = 'https://someurlsomeurl.com/courses/login';
const username = 'someemial@gmail.com';
const password = 'somepassword';
const condition = (link: string) => link.includes('desired_condition'); // Modify the condition as needed

authenticateAndScrapeM3u8Links(url, login,username, password, condition)
    .then((links) => {
        console.log('Found links:', links);
    })
    .catch((err) => {
        console.error('Error:', err);
    });
