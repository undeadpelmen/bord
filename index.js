import {SerialPort, ReadlineParser} from 'serialport'
import {argv } from 'node:process'
import pino from 'pino'

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
            
            // Handle incoming data
            parser.on('data', (data) => {
                logger.info(`Received: ${data.trim()}`);
            });
            
            // Handle port errors
            port.on('error', (err) => {
                logger.error(`Serial port error: ${err.message}`);
            });
            
            // Handle port closing
            port.on('close', () => {
                logger.warn("Serial port closed");
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