const express = require("express");
const { SerialPort, ReadlineParser } = require("serialport");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve public/ folder
app.use(express.static("public"));

// ===== CSV LOG SETUP =====
const LOG_FILE = "log.csv";

if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "timestamp,temp,setpoint,rpm,pwm\n");
}

// ===== SERIAL PORT CONFIG =====
const port = new SerialPort({
    path: "/dev/ttyUSB0",   //Ganti sesuai nama port, ex >> Windows: COM3/COM4
    baudRate: 9600
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

parser.on("data", (line) => {
    line = line.trim();
    console.log("RX:", line);

    const parts = line.split(",");
    if (parts.length !== 4) return; // Skip incorrect data

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

    // Append to log CSV
    const row = `${Date.now()},${temp},${setpoint},${rpm},${pwm}\n`;
    fs.appendFile(LOG_FILE, row, (err) => {
        if (err) console.error("CSV Write Error:", err);
    });
});

server.listen(3000, () => {
    console.log("Dashboard running at: http://localhost:3000");
});
