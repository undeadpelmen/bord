import {SerialPort, ReadlineParser} from 'serialport'
import {argv } from 'node:process'
import pino from 'pino'
import fs from 'fs'
import path from 'path'

const logger = pino(pino.transport({
    targets: [
        {
            target: "pino/file",
            level: "error",
            options: {
                destination: "./log/error.log",
                mkdir: true
            },
        },
        {
            target: "pino/file",
            level: "info",
            options: {
                destination: "./log/info.log",
                mkdir: true
            },
        },
        {
            target: "pino-pretty",
            level: "trace",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
            }
        },
    ],
}));

function createDataFile() {
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, 19);
    const filename = `./data/serial_${timestamp}.log`;
    
    // Ensure data directory exists
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data', { recursive: true });
    }
    
    // Create file with header
    const header = `# Serial Data Log\n# Started: ${now.toISOString()}\n# Port: /dev/ttyUSB0\n# Baud Rate: 115200\n\n`;
    fs.writeFileSync(filename, header);
    
    logger.info(`Created data file: ${filename}`);
    return filename;
}

function writeDataToFile(filename, data) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${data}\n`;
    fs.appendFileSync(filename, entry);
}

function connect() {
    const port = new SerialPort({
        path: "/dev/ttyUSB0",
        baudRate: 115200,
        autoOpen: false
    });
    
    const parser = port.pipe(new ReadlineParser());
    
    return { port, parser };
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function main(args) {
    logger.info("Starting serial port reader for /dev/ttyUSB0");
    
    while (true) {
        try {
            const { port, parser } = connect();
            
            // Open the serial port
            await new Promise((resolve, reject) => {
                port.open((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            
            logger.info("Connected to /dev/ttyUSB0");

            const dataFile = createDataFile();
            
            // Handle incoming data
            parser.on('data', (data) => {
                const trimmedData = data.trim();
                logger.info(`${trimmedData}`);
                writeDataToFile(dataFile, trimmedData);
            });
            
            // Handle port errors
            port.on('error', (err) => {
                logger.error(`Serial port error: ${err.message}`);
                writeDataToFile(dataFile, `ERROR: ${err.message}`);
            });
            
            // Handle port closing
            port.on('close', () => {
                logger.warn("Serial port closed");
                writeDataToFile(dataFile, "CONNECTION CLOSED");
            });
            
            // Keep the connection alive
            await new Promise((resolve) => {
                port.on('close', resolve);
            });
            
        } catch (err) {
            logger.error(`Connection failed: ${err.message}`);
            logger.info("Retrying in 1 second...");
            await sleep(1000);
        }
    }
}

main(argv);