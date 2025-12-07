const express = require("express");
const { SerialPort, ReadlineParser } = require("serialport");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve public dashboard folder
app.use(express.static("public"));

// ===== CSV LOG SETUP =====
const LOG_FILE = "log.csv";

if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "timestamp,temp,setpoint,rpm,pwm\n");
}

// ===== SERIAL PORT CONFIG =====
const port = new SerialPort({
    path: "/dev/ttyUSB0",     // Change to COM3, COM4, etc on Windows
    baudRate: 115200
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

parser.on("data", (line) => {
    line = line.trim();
    console.log("RX:", line);

    const parts = line.split(",");
    if (parts.length !== 4) return;  // Ensure correct data format

    const temp = parseFloat(parts[0]);
    const setpoint = parseFloat(parts[1]);
    const rpm = parseFloat(parts[2]);
    const pwm = parseInt(parts[3]);

    // Send live data to frontend
    io.emit("dashboard-data", {
        temp,
        setpoint,
        rpm,
        pwm
    });

    // Write row to CSV log
    const row = `${Date.now()},${temp},${setpoint},${rpm},${pwm}\n`;
    fs.appendFile(LOG_FILE, row, (err) => {
        if (err) console.error("CSV Write Error:", err);
    });
});

server.listen(3000, () => {
    console.log("Dashboard running at: http://localhost:3000");
});
