const fs = require('fs');
const path = require('path');

const SECURITY_LOG_FILE_PATH = path.resolve(process.cwd(), 'security.log');

/**
 * Logs a security-related event.
 * @param {string} level - The log level (e.g., 'INFO', 'WARN').
 * @param {string} message - The main log message.
 * @param {object} [details={}] - Additional details to log, like user, ip, etc.
 */
const logSecurityEvent = (level, message, details = {}) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${level.toUpperCase()} - ${message} - ${JSON.stringify(details)}\n`;

    fs.appendFile(SECURITY_LOG_FILE_PATH, logMessage, (err) => {
        if (err) {
            console.error('Failed to write to security log:', err);
        }
    });
};

module.exports = { logSecurityEvent }; 