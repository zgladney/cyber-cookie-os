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
    let lastKnownScanCount = 0;

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

        if (currentThreat === "High") {
            activeAlertText.textContent = "HIGH RISK IP DETECTED";
            sideStateText.textContent = "investigate";
        } else if (currentThreat === "Medium") {
            activeAlertText.textContent = "Suspicious activity detected.";
            sideStateText.textContent = "investigate";
        } else {
            activeAlertText.textContent = "No active alerts.";
            sideStateText.textContent = "patrol";
        }
    }

    async function readScanLogs(showAllLogs) {
        try {
            const response = await fetch("scan_log.json?cache=" + Date.now());

            if (!response.ok) {
                throw new Error("scan_log.json not found");
            }

            const scans = await response.json();

            if (scans.length === 0) {
                return;
            }

            totalScans = scans.length;

            const latestScan = scans[scans.length - 1];
            currentThreat = latestScan.threat;
            lastScanTime = latestScan.timestamp;

            updateDashboard();

            if (showAllLogs === true) {
                clearFeed();

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
                lastKnownScanCount = scans.length;
                return;
            }

            if (scans.length > lastKnownScanCount) {
                const newScans = scans.slice(lastKnownScanCount);

                newScans.forEach(function (scan) {
                    addEvent(
                        "New scan detected → IP: " + scan.ip +
                        " | Threat: " + scan.threat +
                        " | Score: " + scan.score + "/100"
                    );
                });

                lastKnownScanCount = scans.length;
            }

        } catch (error) {
            monitoringStatusText.textContent = "Waiting";
            adapterStatusText.textContent = "No log file yet";
        }
    }

    addEvent("Threat Hunter online. Autonomous monitoring enabled.");
    addEvent("Checking scan_log.json every 5 seconds...");
    updateDashboard();

    readScanLogs(false);

    setInterval(function () {
        readScanLogs(false);
    }, 5000);

    startScan.onclick = function () {
        sideStateText.textContent = "scan";
        currentThreat = "Scanning...";
        updateDashboard();

        addEvent("Autonomous mode active.");
        addEvent("Run Python Threat Hunter in the terminal. Dashboard will update automatically.");
    };

    viewLogs.onclick = function () {
        sideStateText.textContent = "logs";
        readScanLogs(true);
    };
}