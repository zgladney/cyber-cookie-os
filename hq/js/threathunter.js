function initializeThreatHunter() {
    const startScan = document.getElementById("startScan");
    const viewLogs = document.getElementById("viewLogs");
    const consoleMessage = document.getElementById("consoleMessage");

    startScan.onclick = function () {
        consoleMessage.textContent = "Scanning logs...";

        setTimeout(function () {
            consoleMessage.textContent = "Checking IP reputation...";
        }, 1000);

        setTimeout(function () {
            consoleMessage.textContent = "Calculating threat score...";
        }, 2000);

        setTimeout(function () {
            consoleMessage.textContent = "Scan complete. Risk: LOW.";
        }, 3000);
    };

    viewLogs.onclick = function () {
        consoleMessage.textContent = "Logs feature coming soon.";
    };
}