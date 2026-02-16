#!/usr/bin/env node

import { SerialPort} from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import fs from 'fs'

// Конфигурация
const SERIAL_PORT = '/dev/ttyUSB0';
const BAUDRATE = 115200;
const LOG_FILE = 'serial_log.txt';
const RECONNECT_DELAY = 2000;   // миллисекунды
const READ_TIMEOUT = 1000;      // миллисекунды (для SerialPort не используется напрямую)

// Форматирование даты/времени для лога (YYYY-MM-DD HH:MM:SS)
function getLogTimestamp() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Форматирование для имени CSV-файла (arduino_YYYY-MM-DD_HH-MM-SS.csv)
function getCsvFilename() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `arduino_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.csv`;
}

// Ожидание подключения Arduino (повторные попытки)
function waitForArduino() {
    console.log(`Ожидание подключения Arduino на порту ${SERIAL_PORT}...`);

    return new Promise((resolve) => {
        const tryConnect = () => {
            const port = new SerialPort({
                path: SERIAL_PORT,
                baudRate: BAUDRATE,
                autoOpen: false
            });

            port.open((err) => {
                if (err) {
                    console.log(`  Arduino не найден, повторная попытка через ${RECONNECT_DELAY / 1000} сек...`);
                    setTimeout(tryConnect, RECONNECT_DELAY);
                } else {
                    console.log(`✓ Arduino подключен на порту ${SERIAL_PORT}`);
                    resolve(port);
                }
            });
        };
        tryConnect();
    });
}

// Основная функция чтения и записи данных
async function readSerialData(port) {
    // Создаём парсер для чтения построчно
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Имя CSV-файла для текущей сессии
    const csvFilename = getCsvFilename();

    // Открываем потоки для записи:
    // - лог-файл (добавление)
    // - CSV-файл (перезапись)
    const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf8' });
    const csvStream = fs.createWriteStream(csvFilename, { flags: 'w', encoding: 'utf8' });

    // Записываем заголовок CSV
    const header = ['time', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6',
        'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'tem'];
    csvStream.write(header.join(',') + '\n');

    console.log(`Начало записи в файлы: ${LOG_FILE} и ${csvFilename}`);
    console.log('Для остановки нажмите Ctrl+C\n');

    // Обработка входящих строк
    parser.on('data', (line) => {
        line = line.trim();
        if (!line) return;

        const timestamp = getLogTimestamp();
        const logEntry = `[${timestamp}] ${line}`;

        // Запись в текстовый лог
        logStream.write(logEntry + '\n');
        console.log(logEntry);  // вывод на экран

        // Парсинг для CSV
        const parts = line.split(',');
        if (parts.length >= 14) {
            // Берём первые 14 значений
            const values = parts.slice(0, 14);
            const row = [timestamp, ...values];
            csvStream.write(row.join(',') + '\n');
        } else {
            console.log(`Пропущена строка (недостаточно полей для CSV): ${line}`);
        }
    });

    // Обработка ошибок порта
    port.on('error', (err) => {
        console.error(`Ошибка порта: ${err.message}`);
        // Закрываем потоки и порт, затем выходим из функции для переподключения
        cleanup(port, logStream, csvStream);
    });

    // Обработка закрытия порта (например, Arduino отключился)
    port.on('close', () => {
        console.log('Порт закрыт');
        cleanup(port, logStream, csvStream);
    });

    // Обработка SIGINT (Ctrl+C)
    const sigintHandler = () => {
        console.log('\nПрервано пользователем');
        cleanup(port, logStream, csvStream);
        process.exit(0);
    };
    process.once('SIGINT', sigintHandler);

    // Ждём, пока порт не закроется (или не возникнет ошибка)
    return new Promise((resolve) => {
        const cleanupAndResolve = () => {
            process.removeListener('SIGINT', sigintHandler);
            resolve();
        };
        // Если порт закрылся или ошибка – выходим
        port.once('close', cleanupAndResolve);
        port.once('error', cleanupAndResolve);
    });
}

// Закрытие порта и потоков
function cleanup(port, logStream, csvStream) {
    try {
        if (port.isOpen) port.close();
    } catch (e) {}
    try {
        logStream.end();
    } catch (e) {}
    try {
        csvStream.end();
    } catch (e) {}
    console.log('Соединение закрыто');
}

// Главный цикл с автоматическим переподключением
async function main() {
    console.log('=== Программа записи данных с Arduino ===');
    console.log(`Текстовый лог-файл: ${LOG_FILE}`);
    console.log('CSV-файлы сессий: arduino_ГГГГ-ММ-ДД_ЧЧ-ММ-СС.csv');
    console.log(`Скорость порта: ${BAUDRATE}`);
    console.log('-'.repeat(40));

    while (true) {
        try {
            const port = await waitForArduino();
            await readSerialData(port);
            console.log(`\nArduino отключен, повторное подключение через ${RECONNECT_DELAY / 1000} сек...`);
            await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
        } catch (err) {
            console.error(`Критическая ошибка: ${err.message}`);
            console.log(`Переподключение через ${RECONNECT_DELAY / 1000} сек...`);
            await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
        }
    }
}

main();