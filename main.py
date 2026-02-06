from gpiozero import MCP3008
import csv
import time
from datetime import datetime

# Initialize all 8 channels (CH0 to CH7)
channels = [MCP3008(channel=i) for i in range(8)]

# File setup
filename = "readings.csv"
header = ["Timestamp", "CH0", "CH1", "CH2", "CH3", "CH4", "CH5", "CH6", "CH7"]

# Create file and write header if it doesn't exist
with open(filename, mode='a', newline='') as file:
    writer = csv.writer(file)
    if file.tell() == 0:  # Check if file is empty
        writer.writerow(header)

print(f"Logging data to {filename}. Press Ctrl+C to stop.")

try:
    while True:
        # Get current time and read all 8 channels
        # .value returns 0.0 to 1.0; multiplying by 1023 gets the 10-bit integer
        now = datetime.now().isoformat()
        current_readings = [int(ch.value * 1023) for ch in channels]

        # Prepare row for CSV
        row = [now] + current_readings

        # Append to CSV
        with open(filename, mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(row)

        print(f"Logged at {now}: {current_readings}")
        time.sleep(1)  # Wait 1 second between reads

except KeyboardInterrupt:
    print("\nLogging stopped.")
