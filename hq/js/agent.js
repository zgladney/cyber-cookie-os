function startAgents() {
    const agent = document.getElementById("agent");
    const stateText = document.getElementById("currentState");
    const threatText = document.getElementById("threat");

    let x = 350;
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

        // 25% chance to turn around
        if (Math.random() < 0.25) {
            direction *= -1;
        }
    }

    function updateAgent() {

        if (state === "idle") {
            return;
        }

        let speed = 2;

        if (state === "investigate") {
            speed = 4;
        }

        if (state === "scan") {
            speed = 1;
        }

        x += direction * speed;

        if (x >= 620) {
            x = 620;
            direction = -1;
        }

        if (x <= 140) {
            x = 140;
            direction = 1;
        }

        // Flip sprite based on direction
        if (direction === 1) {
            agent.style.transform = "scaleX(1)";
        } else {
            agent.style.transform = "scaleX(-1)";
        }

        agent.style.left = x + "px";
    }

    chooseState();

    setInterval(chooseState, 5000);
    setInterval(updateAgent, 30);
}