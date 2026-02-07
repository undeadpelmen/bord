#!/bin/bash
SERVICE_FILE="/etc/systemd/system/arduino_logger.service"

sudo mkdir /opt/serial_logger

sudo cp ./main.py /opt/serial_logger/main.py

sudo bash -c "cat > $SERVICE_FILE" << EOF
[Unit]
Description=Arduino Serial Logger
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/serial_logger/main.py
WorkingDirectory=/opt/serial_logger/
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable arduino_logger.service
sudo systemctl start arduino_logger.service
