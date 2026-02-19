# eBoard serial logger

## Install
```bash
git clone https://github.com/undeadpelmen/bord.git

cd bord

./install.sh
```

## Uninstall

```bash
./uninstall.sh
```

## Logs

```bash
journalctl -u serial_logger -f

# or

ls -lah /opt/serial_logger/log
```

## Received data

```bash
ls -lah /opt/serial_logger/data
```
