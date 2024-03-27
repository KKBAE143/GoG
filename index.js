const moment = require('moment');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

// Initialize git
const git = simpleGit();

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'commits.json'), 'utf8'));

// Create a temporary file for commits
const TEMP_FILE = 'temp.txt';

/**
 * Generate a random time between two times
 * @param {string} start - Start time in HH:mm format
 * @param {string} end - End time in HH:mm format
 * @returns {string} Random time in HH:mm format
 */
function randomTime(start, end) {
    const startMoment = moment(start, 'HH:mm');
    const endMoment = moment(end, 'HH:mm');
    const diff = endMoment.diff(startMoment, 'minutes');
    const randomMinutes = Math.floor(Math.random() * diff);
    return startMoment.add(randomMinutes, 'minutes').format('HH:mm');
}

/**
 * Create a commit for a specific date and time
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:mm format
 * @param {string} message - Commit message
 */
async function createCommit(date, time, message) {
    const timestamp = `${date}T${time}:00`;
    
    // Update temp file to ensure different SHA for each commit
    fs.writeFileSync(TEMP_FILE, `Last updated: ${timestamp}\n`);
    
    try {
        await git.add(TEMP_FILE);
        await git.commit(message, {
            '--date': timestamp
        });
        console.log(`Created commit for ${timestamp}`);
    } catch (error) {
        console.error(`Failed to create commit for ${timestamp}:`, error);
    }
}

/**
 * Process regular patterns from config
 */
async function processPatterns() {
    for (const pattern of config.patterns) {
        let currentDate = moment(pattern.startDate);
        const endDate = moment(pattern.endDate);

        while (currentDate.isSameOrBefore(endDate)) {
            const date = currentDate.format('YYYY-MM-DD');
            const numCommits = Math.floor(Math.random() * 
                (pattern.maxCommitsPerDay - pattern.minCommitsPerDay + 1)) + 
                pattern.minCommitsPerDay;

            for (let i = 0; i < numCommits; i++) {
                const time = config.settings.randomizeTime
                    ? randomTime(config.settings.timeRange.start, config.settings.timeRange.end)
                    : '12:00';
                
                await createCommit(date, time, pattern.message);
            }

            currentDate.add(1, 'day');
        }
    }
}

/**
 * Process custom pattern if enabled
 */
async function processCustomPattern() {
    if (!config.customPattern.enabled) return;

    const pattern = config.customPattern.pattern;
    const startDate = moment().startOf('week');

    for (let week = 0; week < pattern[0].length; week++) {
        for (let day = 0; day < pattern.length; day++) {
            if (pattern[day][week] === 1) {
                const date = startDate.clone()
                    .add(week, 'weeks')
                    .add(day, 'days')
                    .format('YYYY-MM-DD');
                
                const time = config.settings.randomizeTime
                    ? randomTime(config.settings.timeRange.start, config.settings.timeRange.end)
                    : '12:00';
                
                await createCommit(date, time, "Custom pattern commit");
            }
        }
    }
}

/**
 * Main function to run the script
 */
async function main() {
    try {
        // Ensure git repository exists
        if (!fs.existsSync('.git')) {
            await git.init();
        }

        // Process regular patterns
        await processPatterns();

        // Process custom pattern if enabled
        await processCustomPattern();

        // Clean up
        fs.unlinkSync(TEMP_FILE);
        
        console.log('Successfully completed all commit operations!');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// Run the script
main(); 