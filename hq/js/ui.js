function initializeUI() {
    const monitor = document.getElementById("securityMonitor");
    const popup = document.getElementById("popup");
    const closePopup = document.getElementById("closePopup");

    monitor.onclick = function () {
        popup.classList.remove("hidden");
    };

    closePopup.onclick = function () {
        popup.classList.add("hidden");
    };
}