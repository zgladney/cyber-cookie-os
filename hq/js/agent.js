function startAgents() {

    const agent = document.getElementById("agent");
    const stateText = document.getElementById("currentState");
    const threatText = document.getElementById("threat");

    let x = 120;
    const floorY = 395;
    const leftBoundary = 80;
    const rightBoundary = 720;
    const monitorPosition = 410;

    let direction = 1;
    let mode = "patrol";

    function getThreatLevel() {
        return threatText.textContent.trim();
    }

    function setAgentPosition() {
        const bounce = Math.sin(Date.now() / 180) * 2;

        agent.style.left = x + "px";
        agent.style.top = (floorY + bounce) + "px";

        if (direction === 1) {
            agent.style.transform = "scaleX(1)";
        } else {
            agent.style.transform = "scaleX(-1)";
        }
    }

    function moveToward(target, speed) {
        if (x < target) {
            x += speed;
            direction = 1;
        } else if (x > target) {
            x -= speed;
            direction = -1;
        }

        if (Math.abs(x - target) < speed) {
            x = target;
        }
    }

    function patrol() {
        mode = "patrol";
        stateText.textContent = "patrol";

        x += direction * 2.2;

        if (x > rightBoundary) {
            x = rightBoundary;
            direction = -1;
        }

        if (x < leftBoundary) {
            x = leftBoundary;
            direction = 1;
        }
    }

    function investigate(threat) {
        mode = "investigate";
        stateText.textContent = "investigate";

        let speed = 3;

        if (threat === "High") {
            speed = 5;
        }

        moveToward(monitorPosition, speed);
    }

    function updateAgent() {
        const threat = getThreatLevel();

        if (threat === "High" || threat === "Medium") {
            investigate(threat);
        } else if (threat === "Scanning...") {
            stateText.textContent = "scan";
            moveToward(monitorPosition, 3);
        } else {
            patrol();
        }

        setAgentPosition();
    }

    setAgentPosition();

    setInterval(updateAgent, 30);
}