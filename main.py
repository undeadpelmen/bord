#!/usr/bin/env python3
import serial
import time
import sys
from datetime import datetime

# Конфигурация
SERIAL_PORT = '/dev/ttyUSB0'  # стандартный порт для Arduino
# Если не работает, попробуйте:
# - /dev/ttyUSB0 (для Arduino с адаптером USB)
# - /dev/ttyS0 (для UART пинов GPIO)
BAUDRATE = 115200  # должна совпадать с baudrate на Arduino
LOG_FILE = 'serial_log.txt'
RECONNECT_DELAY = 2  # секунды между попытками подключения
READ_TIMEOUT = 1  # таймаут чтения порта

def wait_for_arduino():
    """Ожидание подключения Arduino"""
    print(f"Ожидание подключения Arduino на порту {SERIAL_PORT}...")
    
    while True:
        try:
            # Попытка открыть порт
            ser = serial.Serial(
                port=SERIAL_PORT,
                baudrate=BAUDRATE,
                timeout=READ_TIMEOUT
            )
            print(f"✓ Arduino подключен на порту {SERIAL_PORT}")
            return ser
        except (serial.SerialException, FileNotFoundError) as e:
            # Порт не доступен
            print(f"  Arduino не найден, повторная попытка через {RECONNECT_DELAY} сек...")
            time.sleep(RECONNECT_DELAY)

def read_serial_data(ser):
    """Чтение данных с последовательного порта"""
    try:
        # Открываем файл для записи (добавляем данные)
        with open(LOG_FILE, 'a', encoding='utf-8') as log_file:
            print(f"Начало записи в файл: {LOG_FILE}")
            print("Для остановки нажмите Ctrl+C\n")
            
            while True:
                try:
                    # Чтение строки с порта
                    if ser.in_waiting > 0:
                        line = ser.readline().decode('utf-8', errors='ignore').rstrip()
                        if line:  # если строка не пустая
                            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            log_entry = f"[{timestamp}] {line}"
                            
                            # Запись в файл
                            log_file.write(log_entry + '\n')
                            log_file.flush()  # немедленная запись на диск
                            
                            # Вывод на экран для мониторинга
                            print(log_entry)
                    else:
                        # Небольшая пауза, чтобы не нагружать CPU
                        time.sleep(0.01)
                        
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
    print(f"Лог файл: {LOG_FILE}")
    print(f"Скорость порта: {BAUDRATE}")
    print("-" * 40)
    
    while True:
        try:
            # Ждем подключения Arduino
            ser = wait_for_arduino()
            
            # Читаем данные пока Arduino подключен
            should_exit = read_serial_data(ser)
            
            if should_exit:
                break
                
            # Если read_serial_data вернула False, значит произошла ошибка
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
