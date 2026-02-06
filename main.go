package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"periph.io/x/conn/v3/physic"
	"periph.io/x/conn/v3/spi"
	"periph.io/x/conn/v3/spi/spireg"
	"periph.io/x/host/v3"
)

func readChannel(p spi.Port, channel int) (int, error) {
	tx := []byte{1, byte((8 + channel) << 4), 0}
	rx := make([]byte, 3)

	c, err := p.Connect(1*physic.MegaHertz, spi.Mode0, 8)
	if err != nil {
		return 0, err
	}

	if err := c.Tx(tx, rx); err != nil {
		return 0, err
	}

	return int(rx[1]&3)<<8 | int(rx[2]), nil
}

func main() {
	if _, err := host.Init(); err != nil {
		log.Fatal(err)
	}

	p, err := spireg.Open("")
	if err != nil {
		log.Fatal(err)
	}
	defer p.Close()

	file, err := os.OpenFile("log.csv", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()
	writer := csv.NewWriter(file)

	fmt.Println("Starting data log... Press Ctrl+C to stop.")

	for {
		timestamp := time.Now().Format(time.RFC3339)
		row := []string{timestamp}

		for ch := 0; ch < 8; ch++ {
			val, err := readChannel(p, ch)
			if err != nil {
				log.Printf("Error reading CH%d: %v", ch, err)
				row = append(row, "err")
				continue
			}
			row = append(row, strconv.Itoa(val))
		}

		writer.Write(row)
		writer.Flush()

		fmt.Printf("Logged at %s: %v\n", timestamp, row[1:])
		time.Sleep(1 * time.Second)
	}
}
