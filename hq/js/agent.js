function startAgents() {
    const agent = document.getElementById("agent");
    const stateText = document.getElementById("currentState");
    const threatText = document.getElementById("threat");

    let x = 350;
    let direction = 1;
    let state = "patrol";

    function chooseState() {
        const states = ["patrol", "patrol", "idle", "investigate"];

        state = states[Math.floor(Math.random() * states.length)];

        stateText.textContent = state;

        if (state === "investigate") {
            threatText.textContent = "Medium";
        } else {
            threatText.textContent = "Low";
        }
    }

    function updateAgent() {
        if (state === "idle") {
            return;
        }

        if (state === "investigate") {
            x += direction * 4;
        } else {
            x += direction * 2;
        }

        if (x > 620) {
            direction = -1;
        }

        if (x < 140) {
            direction = 1;
        }

        agent.style.left = x + "px";
    }

    setInterval(chooseState, 5000);
    setInterval(updateAgent, 30);
}