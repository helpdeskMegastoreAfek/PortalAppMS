const SecurityLog = require('../models/SecurityLog');

/**
 * Logs a security-related event to MongoDB.
 * @param {string} level - The log level (e.g., 'INFO', 'WARN', 'ERROR').
 * @param {string} message - The main log message.
 * @param {object} [details={}] - Additional details to log, like user, ip, etc.
 */
const logSecurityEvent = async (level, message, details = {}) => {
    try {
        const securityLog = new SecurityLog({
            level: level.toUpperCase(),
            message,
            username: details.username || 'unknown',
            role: details.role || 'unknown',
            attemptedPath: details.attemptedPath,
            userAgent: details.userAgent,
            ip: details.ip,
            details: details
        });

        await securityLog.save();
        console.log('Security log saved to MongoDB successfully');
    } catch (error) {
        console.error('Failed to save security log to MongoDB:', error);
        // Fallback: גם לרשום לקונסול במקרה של שגיאה
        console.error(`Security Event [${level}]: ${message}`, details);
    }
};

module.exports = { logSecurityEvent }; 