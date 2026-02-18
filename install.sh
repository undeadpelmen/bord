#!/bin/bash

# Exit on any error
set -e

# Variables
SERVICE_NAME="serial_logger"
SERVICE_FILE="${SERVICE_NAME}.service"
INSTALL_PATH="/opt/serial_logger"
REPO_URL="https://github.com/undeadpelmen/bord.git"
NODE_VERSION="20"

echo "=== Serial Logger Installation Script ==="

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo "This script should not be run as root. Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Function to install Node.js if not present
install_nodejs() {
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        
        # Update package list
        sudo apt update
        
        # Install prerequisites
        sudo apt install -y curl git
        
        # Install Node.js using NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt install -y nodejs
        
        echo "Node.js $(node -v) installed successfully"
    else
        echo "Node.js $(node -v) is already installed"
    fi
}

# Function to create installation directory and clone repository
setup_application() {
    echo "Setting up application in ${INSTALL_PATH}..."
    
    # Create installation directory
    sudo mkdir -p ${INSTALL_PATH}
    
    # Clone or update repository
    if [ -d "${INSTALL_PATH}/.git" ]; then
        echo "Updating existing repository..."
        cd ${INSTALL_PATH}
        sudo git pull origin master
    else
        echo "Cloning repository..."
        sudo git clone ${REPO_URL} ${INSTALL_PATH}
    fi
    
    # Install dependencies
    echo "Installing Node.js dependencies..."
    cd ${INSTALL_PATH}
    sudo npm install
    
    # Set proper ownership
    sudo chown -R $USER:$USER ${INSTALL_PATH}
}

# Function to create systemd service
create_service() {
    echo "Creating systemd service..."
    
    sudo bash -c "cat > /etc/systemd/system/${SERVICE_FILE}" << EOF
[Unit]
Description=Arduino Serial Logger
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_PATH}
ExecStart=/usr/bin/node ${INSTALL_PATH}/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

    echo "Service file created"
}

# Function to enable and start service
setup_service() {
    echo "Setting up systemd service..."
    
    # Reload systemd daemon
    sudo systemctl daemon-reload
    
    # Enable service to start on boot
    sudo systemctl enable ${SERVICE_NAME}
    
    # Start the service
    sudo systemctl start ${SERVICE_NAME}
    
    # Check service status
    if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
        echo "✅ Service ${SERVICE_NAME} is running successfully"
    else
        echo "❌ Service ${SERVICE_NAME} failed to start"
        sudo systemctl status ${SERVICE_NAME}
        exit 1
    fi
}

# Main installation flow
main() {
    check_root
    install_nodejs
    setup_application
    create_service
    setup_service
    
    echo ""
    echo "=== Installation Complete ==="
    echo "Service: ${SERVICE_NAME}"
    echo "Status: $(sudo systemctl is-active ${SERVICE_NAME})"
    echo "Logs: sudo journalctl -u ${SERVICE_NAME} -f"
    echo "Manage: sudo systemctl {start|stop|restart|status} ${SERVICE_NAME}"
}

# Run main function
main "$@"
