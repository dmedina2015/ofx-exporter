
const exportName = 'extrato.ofx';
var ofxOutput = '';

window.addEventListener ("load", main, false);

function main(){
    // Default text
    document.getElementById("bank").innerText = "Nada a exportar";
    
    // Listener to Generate OFX Button
    document.getElementById("generateOFX").addEventListener("click",generateOFX);

    // Listener to receive messages from webpage
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            msgHandler(request);
            sendResponse({status: "OK"});
            return true;
        }
    );

    // Asks for bank
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {msg: "init"}, function(response) {
        });
    });
}

// Function that requests banking information for the webpage
function generateOFX() {
    ofxOutput = ''; //reset OFX records
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {msg: "generateOFX"}, function(response) {
        });
    });
}

// Function that exports OFX file
function exportOFX() {
    if(ofxOutput === "") {
        alert('OFX file was not generated.');
        return;
    }
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(ofxOutput));
    element.setAttribute('download', exportName);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

// Function that handles incoming messages
function msgHandler(request){
    if(request.msg === "ofxOutput"){
        ofxOutput = request.ofx;
        exportOFX();
    }else if(request.msg === "init"){
        var bankDiv = document.getElementById("bank");
        var bankImg = document.getElementById("bankImg");
        if(request.bank) bankDiv.innerText = request.bank;

        switch(request.bank){
            case "Alelo": 
                bankImg.src="./img/alelo.png";
                document.getElementById("generateOFX").removeAttribute("style"); // unhide
                document.querySelector(":root").style.setProperty('--fore-color','black');
                document.querySelector(":root").style.setProperty('--back-color',"#C4D858");
                break;
            case "Itaucard": 
                bankImg.src="./img/itaucard.png";
                document.getElementById("generateOFX").removeAttribute("style"); // unhide
                document.querySelector(":root").style.setProperty('--fore-color','white');
                document.querySelector(":root").style.setProperty('--back-color',"#EC7000");
                break;
            case "Safra": 
                bankImg.src="./img/safra.png";
                document.getElementById("generateOFX").removeAttribute("style"); // unhide
                document.querySelector(":root").style.setProperty('--fore-color','white');
                document.querySelector(":root").style.setProperty('--back-color','#001C40');
                break;
            case "Verocard": 
                bankImg.src="./img/verocard.png";
                document.getElementById("generateOFX").removeAttribute("style"); // unhide
                document.querySelector(":root").style.setProperty('--fore-color','white');
                document.querySelector(":root").style.setProperty('--back-color','#BD2222');
                break;
            case "Santander": 
                bankImg.src="./img/santander.png";
                document.getElementById("generateOFX").removeAttribute("style"); // unhide
                document.querySelector(":root").style.setProperty('--fore-color','white');
                document.querySelector(":root").style.setProperty('--back-color','#EC0101');
                break;
            default:
                bankImg.src="./img/ofx-exporter.png";
                document.getElementById("generateOFX").setAttribute("style","display: none"); // hide
                document.querySelector(":root").style.setProperty('--fore-color','black');
                document.querySelector(":root").style.setProperty('--back-color','white');
                break;
        }
    }
}
