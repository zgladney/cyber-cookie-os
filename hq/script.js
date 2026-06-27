const agent=document.getElementById("agent");
const stateText=document.getElementById("currentState");
const threatText=document.getElementById("threat");

const monitor=document.getElementById("securityMonitor");
const popup=document.getElementById("popup");
const closePopup=document.getElementById("closePopup");

const startScan=document.getElementById("startScan");
const viewLogs=document.getElementById("viewLogs");
const consoleMessage=document.getElementById("consoleMessage");

let x=350;
let direction=1;
let state="patrol";

function chooseState(){
    const states=["patrol","patrol","idle","investigate"];

    state=states[Math.floor(Math.random()*states.length)];

    stateText.textContent=state;

    if(state==="investigate"){
        threatText.textContent="Medium";
    }else{
        threatText.textContent="Low";
    }
}

function updateAgent(){
    if(state==="idle"){
        return;
    }

    if(state==="investigate"){
        x+=direction*4;
    }else{
        x+=direction*2;
    }

    if(x>620){
        direction=-1;
    }

    if(x<140){
        direction=1;
    }

    agent.style.left=x+"px";
}

monitor.onclick=function(){
    popup.classList.remove("hidden");
}

closePopup.onclick=function(){
    popup.classList.add("hidden");
}

startScan.onclick=function(){
    consoleMessage.textContent="Scanning logs...";

    setTimeout(function(){
        consoleMessage.textContent="Checking IP reputation...";
    },1000);

    setTimeout(function(){
        consoleMessage.textContent="Calculating threat score...";
    },2000);

    setTimeout(function(){
        consoleMessage.textContent="Scan complete. Risk: LOW.";
    },3000);
}

viewLogs.onclick=function(){
    consoleMessage.textContent="Logs feature coming soon.";
}

setInterval(chooseState,5000);
setInterval(updateAgent,30);