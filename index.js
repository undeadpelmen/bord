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
    return new SerialPort({path: "/dev/ttyUSB0", baudRate: 115200}).pipe(new ReadlineParser())
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function main(args) {
    while (true) {
        try {
            const parser = connect();

            parser.on('data', (data) => {
                logger.info(data);
            });
        } catch (err) {
            logger.error(err);

            await sleep(1000)
        }
    }
}

main(argv);