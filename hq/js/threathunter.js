function initializeThreatHunter() {

    const startScan = document.getElementById("startScan");
    const viewLogs = document.getElementById("viewLogs");
    const consoleMessage = document.getElementById("consoleMessage");
    const eventFeed = document.getElementById("eventFeed");

    const totalScansText = document.getElementById("totalScans");
    const dashboardThreatText = document.getElementById("dashboardThreat");
    const lastScanText = document.getElementById("lastScan");
    const activeAlertText = document.getElementById("activeAlert");
    const monitoringStatusText = document.getElementById("monitoringStatus");
    const adapterStatusText = document.getElementById("adapterStatus");

    const sideThreatText = document.getElementById("threat");
    const sideStateText = document.getElementById("currentState");

    let totalScans = 0;
    let lastScanTime = "None";
    let currentThreat = "Low";

    function getTime() {
        return new Date().toLocaleTimeString();
    }

    function addEvent(message) {
        const entry = document.createElement("p");
        entry.textContent = "[" + getTime() + "] " + message;
        eventFeed.appendChild(entry);
        eventFeed.scrollTop = eventFeed.scrollHeight;
        consoleMessage.textContent = message;
    }

    function clearFeed() {
        eventFeed.innerHTML = "";
    }

    function updateDashboard() {
        totalScansText.textContent = totalScans;
        dashboardThreatText.textContent = currentThreat;
        lastScanText.textContent = lastScanTime;
        monitoringStatusText.textContent = "Active";
        adapterStatusText.textContent = "Connected";

        sideThreatText.textContent = currentThreat;
        sideStateText.textContent = "logs";

        if (currentThreat === "High") {
            activeAlertText.textContent = "HIGH RISK IP DETECTED";
        } else if (currentThreat === "Medium") {
            activeAlertText.textContent = "Suspicious activity detected.";
        } else {
            activeAlertText.textContent = "No active alerts.";
        }
    }

    async function loadScanLogs() {
        try {
            addEvent("Loading real scan data from scan_log.json...");

            const response = await fetch("scan_log.json");

            if (!response.ok) {
                throw new Error("scan_log.json not found");
            }

            const scans = await response.json();

            clearFeed();

            if (scans.length === 0) {
                addEvent("No scans found in scan_log.json.");
                return;
            }

            totalScans = scans.length;

            const latestScan = scans[scans.length - 1];
            currentThreat = latestScan.threat;
            lastScanTime = latestScan.timestamp;

            updateDashboard();

            scans.forEach(function (scan) {
                addEvent(
                    scan.timestamp +
                    " | IP: " + scan.ip +
                    " | Type: " + scan.type +
                    " | Threat: " + scan.threat +
                    " | Score: " + scan.score + "/100"
                );
            });

            addEvent("Real scan logs loaded successfully.");

        } catch (error) {
            addEvent("Could not load scan_log.json yet.");
            addEvent("Make sure scan_log.json is inside the hq folder.");
        }
    }

    addEvent("Threat Hunter online. Awaiting operator...");
    updateDashboard();

    startScan.onclick = function () {
        sideStateText.textContent = "scan";
        currentThreat = "Scanning...";
        updateDashboard();

        addEvent("Run Python Threat Hunter in the terminal to create a real scan.");
        addEvent("Then copy scan_log.json into the hq folder and click View Logs.");
    };

    viewLogs.onclick = function () {
        sideStateText.textContent = "logs";
        loadScanLogs();
    };
}