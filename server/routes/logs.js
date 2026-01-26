const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { logSecurityEvent } = require('../utils/securityLogger');
const SecurityLog = require('../models/SecurityLog');

const LOG_FILE_PATH = process.env.LOG_FILE_PATH;

// Endpoint to get all logs
router.get('/', async (req, res) => {
    try {
        if (!fs.existsSync(LOG_FILE_PATH)) {
            return res.json({ logContent: 'Log file not found.' });
        }

        const logContent = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
        
        res.json({ logContent });

    } catch (error) {
        console.error('Error reading log file:', error);
        res.status(500).json({ message: 'Failed to read log file', error: error.message });
    }
});

// Endpoint to get security logs from MongoDB
router.get('/security', async (req, res) => {
    try {
        const { limit = 100, skip = 0, level, username } = req.query;

        // Build query
        const query = {};
        if (level) query.level = level.toUpperCase();
        if (username) query.username = username;

        // Get logs from MongoDB, sorted by newest first
        const logs = await SecurityLog.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean(); // Use lean() for better performance

        // Format logs for display (similar to file format)
        const formattedLogs = logs.map(log => {
            const timestamp = new Date(log.createdAt).toISOString();
            return `${timestamp} - ${log.level} - ${log.message} - ${JSON.stringify({
                username: log.username,
                role: log.role,
                attemptedPath: log.attemptedPath,
                userAgent: log.userAgent,
                ip: log.ip
            })}`;
        }).join('\n');

        // Also return count for pagination
        const totalCount = await SecurityLog.countDocuments(query);

        res.json({ 
            logContent: formattedLogs || 'No security logs found.',
            totalCount,
            logs: logs // Also return raw logs for potential future use
        });

    } catch (error) {
        console.error('Error reading security logs from MongoDB:', error);
        res.status(500).json({ message: 'Failed to read security logs', error: error.message });
    }
});

// Endpoint to log unauthorized access attempts
router.post('/unauthorized-access', async (req, res) => {
    try {
        const { username, role, attemptedPath, userAgent, ip } = req.body;

        console.log('📥 Received unauthorized access log request:', {
            username,
            role,
            attemptedPath,
            userAgent,
            ip
        });

        // Log to MongoDB
        await logSecurityEvent('WARN', 'Unauthorized access attempt', {
            username: username || 'unknown',
            role: role || 'unknown',
            attemptedPath,
            userAgent: userAgent || 'unknown',
            ip: ip || req.ip || req.connection.remoteAddress || 'unknown'
        });

        // Also log to console for immediate visibility
        console.warn(`⚠️ Unauthorized access attempt: User "${username}" (${role}) tried to access ${attemptedPath}`);

        res.status(200).json({ message: 'Unauthorized access logged successfully' });
    } catch (error) {
        console.error('❌ Error logging unauthorized access:', error);
        res.status(500).json({ message: 'Failed to log unauthorized access', error: error.message });
    }
});

// Endpoint to get security alerts (suspicious activity)
router.get('/security/alerts', async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

        // Get failed login attempts in last N hours
        const failedLogins = await SecurityLog.find({
            level: 'WARN',
            message: { $in: [
                'Failed login attempt - user not found',
                'Failed login attempt - invalid password',
                'Failed login attempt - account disabled'
            ]},
            createdAt: { $gte: hoursAgo }
        }).sort({ createdAt: -1 });

        // Group by IP and username to detect brute force
        const bruteForceAttempts = {};
        failedLogins.forEach(log => {
            const key = `${log.ip}_${log.username}`;
            if (!bruteForceAttempts[key]) {
                bruteForceAttempts[key] = {
                    ip: log.ip,
                    username: log.username,
                    count: 0,
                    lastAttempt: log.createdAt
                };
            }
            bruteForceAttempts[key].count++;
        });

        // Find IPs with 5+ failed attempts (potential brute force)
        const suspiciousIPs = Object.values(bruteForceAttempts).filter(attempt => attempt.count >= 5);

        // Get new IP logins
        const newIPLogins = await SecurityLog.find({
            level: 'WARN',
            message: 'Successful login from new IP',
            createdAt: { $gte: hoursAgo }
        }).sort({ createdAt: -1 });

        // Get unauthorized access attempts
        const unauthorizedAccess = await SecurityLog.find({
            message: 'Unauthorized access attempt',
            createdAt: { $gte: hoursAgo }
        }).countDocuments();

        res.json({
            suspiciousIPs,
            newIPLogins: newIPLogins.length,
            unauthorizedAccess,
            totalFailedLogins: failedLogins.length,
            alerts: [
                ...(suspiciousIPs.length > 0 ? [{
                    type: 'brute_force',
                    severity: 'high',
                    message: `${suspiciousIPs.length} IP(s) with multiple failed login attempts detected`,
                    count: suspiciousIPs.length
                }] : []),
                ...(newIPLogins.length > 0 ? [{
                    type: 'new_ip',
                    severity: 'medium',
                    message: `${newIPLogins.length} login(s) from new IP addresses`,
                    count: newIPLogins.length
                }] : []),
                ...(unauthorizedAccess > 0 ? [{
                    type: 'unauthorized_access',
                    severity: 'medium',
                    message: `${unauthorizedAccess} unauthorized access attempt(s)`,
                    count: unauthorizedAccess
                }] : [])
            ]
        });

    } catch (error) {
        console.error('Error fetching security alerts:', error);
        res.status(500).json({ message: 'Failed to fetch security alerts', error: error.message });
    }
});

module.exports = router;