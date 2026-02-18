#!/bin/bash

# Exit on any error
set -e

# Variables
SERVICE_NAME="serial_logger"
SERVICE_FILE="${SERVICE_NAME}.service"
INSTALL_PATH="/opt/serial_logger"

echo "=== Serial Logger Uninstallation Script ==="

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo "This script should not be run as root. Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Function to stop and disable service
remove_service() {
    echo "Removing systemd service..."
    
    # Stop the service if running
    if sudo systemctl is-active --quiet ${SERVICE_NAME} 2>/dev/null; then
        echo "Stopping ${SERVICE_NAME} service..."
        sudo systemctl stop ${SERVICE_NAME}
    fi
    
    # Disable the service
    if sudo systemctl is-enabled --quiet ${SERVICE_NAME} 2>/dev/null; then
        echo "Disabling ${SERVICE_NAME} service..."
        sudo systemctl disable ${SERVICE_NAME}
    fi
    
    # Remove service file
    if [ -f "/etc/systemd/system/${SERVICE_FILE}" ]; then
        echo "Removing service file..."
        sudo rm /etc/systemd/system/${SERVICE_FILE}
        sudo systemctl daemon-reload
    fi
    
    echo "✅ Service removed successfully"
}

# Function to remove application files
remove_application() {
    echo "Removing application files..."
    
    if [ -d "${INSTALL_PATH}" ]; then
        echo "Removing ${INSTALL_PATH}..."
        sudo rm -rf ${INSTALL_PATH}
        echo "✅ Application files removed"
    else
        echo "⚠️  Application directory ${INSTALL_PATH} not found"
    fi
}

# Function to clear logs
clear_logs() {
    echo "Clearing service logs..."
    
    # Clear journal logs for the service
    if sudo journalctl -u ${SERVICE_NAME} --no-pager | grep -q "No journal files were found"; then
        echo "⚠️  No logs found for ${SERVICE_NAME}"
    else
        echo "Removing journal logs..."
        sudo journalctl --vacuum-files=1 -u ${SERVICE_NAME} 2>/dev/null || true
        echo "✅ Logs cleared"
    fi
    
    # Clear syslog entries if any
    if [ -f "/var/log/syslog" ]; then
        echo "Note: System logs in /var/log/syslog may still contain entries. To clear them:"
        echo "      sudo grep -v '${SERVICE_NAME}' /var/log/syslog > /tmp/syslog_clean && sudo mv /tmp/syslog_clean /var/log/syslog"
    fi
}

# Main uninstallation flow
main() {
    check_root
    
    echo "This will remove:"
    echo "- Serial Logger service (${SERVICE_NAME})"
    echo "- Application files (${INSTALL_PATH})"
    echo "- Service logs"
    echo ""
    read -p "Continue with uninstallation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Uninstallation cancelled."
        exit 0
    fi
    
    remove_service
    remove_application
    clear_logs
    
    echo ""
    echo "=== Uninstallation Complete ==="
    echo "Serial Logger has been completely removed from your system."
}

# Run main function
main "$@"
