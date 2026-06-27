function startAgents() {

    const agent = document.getElementById("agent");
    const stateText = document.getElementById("currentState");
    const threatText = document.getElementById("threat");

    let x = 120;
    const floorY = 395;

    let direction = 1;
    let state = "patrol";

    const states = [
        "patrol",
        "patrol",
        "idle",
        "investigate",
        "scan"
    ];

    function chooseState() {
        state = states[Math.floor(Math.random() * states.length)];
        stateText.textContent = state;

        switch (state) {
            case "investigate":
                threatText.textContent = "Medium";
                break;
            case "scan":
                threatText.textContent = "Scanning...";
                break;
            default:
                threatText.textContent = "Low";
        }

        if (Math.random() < 0.25) {
            direction *= -1;
        }
    }

    function updateAgent() {
        if (state === "idle") {
            return;
        }

        let speed = 2.5;

        if (state === "investigate") {
            speed = 4.5;
        }

        if (state === "scan") {
            speed = 1.5;
        }

        x += direction * speed;

        if (x > 720) {
            x = 720;
            direction = -1;
        }

        if (x < 80) {
            x = 80;
            direction = 1;
        }

        const bounce = Math.sin(Date.now() / 180) * 2;

        agent.style.left = x + "px";
        agent.style.top = (floorY + bounce) + "px";

        if (direction === 1) {
            agent.style.transform = "scaleX(1)";
        } else {
            agent.style.transform = "scaleX(-1)";
        }
    }

    chooseState();

    setInterval(chooseState, 5000);
    setInterval(updateAgent, 30);
}