#!/usr/bin/env python3
import serial
import time
import sys
import csv
from datetime import datetime

# Конфигурация
SERIAL_PORT = '/dev/ttyUSB0'
BAUDRATE = 115200
LOG_FILE = 'serial_log.txt'
RECONNECT_DELAY = 2
READ_TIMEOUT = 1

def wait_for_arduino():
    print(f"Ожидание подключения Arduino на порту {SERIAL_PORT}...")

    while True:
        try:
            ser = serial.Serial(
                port=SERIAL_PORT,
                baudrate=BAUDRATE,
                timeout=READ_TIMEOUT
            )
            print(f"✓ Arduino подключен на порту {SERIAL_PORT}")
            return ser
        except (serial.SerialException, FileNotFoundError):
            print(f"  Arduino не найден, повторная попытка через {RECONNECT_DELAY} сек...")
            time.sleep(RECONNECT_DELAY)

def read_serial_data(ser):
    """Чтение данных с последовательного порта и запись в CSV и текстовый лог"""
    try:
        # Открываем общий текстовый лог-файл (добавление)
        with open(LOG_FILE, 'a', encoding='utf-8') as log_file:
            # Создаём имя для CSV-файла текущей сессии
            session_filename = f"arduino_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.csv"
            # Открываем CSV-файл для записи
            with open(session_filename, 'w', newline='', encoding='utf-8') as csv_file:
                writer = csv.writer(csv_file)
                # Записываем заголовок
                writer.writerow(['time', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6',
                                 'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'tem'])
                print(f"Начало записи в файлы: {LOG_FILE} и {session_filename}")
                print("Для остановки нажмите Ctrl+C\n")

                while True:
                    try:
                        if ser.in_waiting > 0:
                            line = ser.readline().decode('utf-8', errors='ignore').rstrip()
                            if line:
                                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                log_entry = f"[{timestamp}] {line}"

                                # Запись в текстовый лог
                                log_file.write(log_entry + '\n')
                                log_file.flush()
                                print(log_entry)  # вывод на экран

                                # Парсинг для CSV
                                parts = line.split(',')
                                if len(parts) >= 14:
                                    # Берём первые 14 значений (остальные игнорируем)
                                    values = parts[:14]
                                    # Если вдруг меньше 14, дополняем пустыми строками
                                    while len(values) < 14:
                                        values.append('')
                                    row = [timestamp] + values
                                    writer.writerow(row)
                                else:
                                    print(f"Пропущена строка (недостаточно полей для CSV): {line}")
                        else:
                            time.sleep(0.01)  # пауза для снижения нагрузки на CPU

                    except UnicodeDecodeError:
                        print("Ошибка декодирования, пропускаем строку...")

    except KeyboardInterrupt:
        print("\nПрервано пользователем")
        return True
    except Exception as e:
        print(f"\nОшибка при чтении/записи: {e}")
        return False
    finally:
        try:
            ser.close()
            print("Соединение закрыто")
        except:
            pass

def main():
    print("=== Программа записи данных с Arduino ===")
    print(f"Текстовый лог-файл: {LOG_FILE}")
    print(f"CSV-файлы сессий: arduino_ГГГГ-ММ-ДД_ЧЧ-ММ-СС.csv")
    print(f"Скорость порта: {BAUDRATE}")
    print("-" * 40)

    while True:
        try:
            ser = wait_for_arduino()
            should_exit = read_serial_data(ser)
            if should_exit:
                break
            print(f"\nArduino отключен, повторное подключение через {RECONNECT_DELAY} сек...")
            time.sleep(RECONNECT_DELAY)
        except KeyboardInterrupt:
            print("\nПрограмма завершена")
            break
        except Exception as e:
            print(f"Критическая ошибка: {e}")
            print(f"Переподключение через {RECONNECT_DELAY} сек...")
            time.sleep(RECONNECT_DELAY)

if __name__ == "__main__":
    main()