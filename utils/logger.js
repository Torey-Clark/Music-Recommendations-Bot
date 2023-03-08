require('dotenv').config();

const path = require('node:path');
const pino = require('pino');

const logDirectory = path.resolve('storage/logs');

const targets = [
    {
        level: 'debug',
        options: {
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        },
        target: 'pino-pretty',
    }, {
        level: 'debug',
        options: {
            colorize: false,
            destination: `${logDirectory}/debug.log`,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        },
        target: 'pino-pretty',
    }, {
        level: 'info',
        options: {
            colorize: false,
            destination: `${logDirectory}/info.log`,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        },
        target: 'pino-pretty',
    }, {
        level: 'warn',
        options: {
            colorize: false,
            destination: `${logDirectory}/warn.log`,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        },
        target: 'pino-pretty',
    }, {
        level: 'error',
        options: {
            colorize: false,
            destination: `${logDirectory}/error.log`,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        },
        target: 'pino-pretty',
    }, {
        level: 'fatal',
        options: {
            colorize: false,
            destination: `${logDirectory}/fatal.log`,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        },
        target: 'pino-pretty',
    },
];
const logger = pino({
    level: process.env.ENVIRONMENT === 'development' ?
        'debug' :
        'error',
    transport: {
        targets: targets,
    },
});

module.exports = logger;