(function() {

  var myBank = null;

  const startOfx = (cardNumber) => {

    return `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
      <CURDEF>BRL
        <BANKACCTFROM>
          <BANKID>0000
          <ACCTID>${cardNumber}
          <ACCTTYPE>CHECKING
        </BANKACCTFROM>
        <BANKTRANLIST>`;
  }

  const endOfx = () =>
      `
            </BANKTRANLIST>
          </STMTRS>
        </STMTTRNRS>
      </BANKMSGSRSV1>
    </OFX>`;

  const bankStatement = (id, date, amount, description, invertSignal) => {
    if(invertSignal) return `
    <STMTTRN>
      <TRNTYPE>CREDIT</TRNTYPE>
      <FITID>${id}
      <CHECKNUM>${id}
      <DTPOSTED>${date}</DTPOSTED>
      <TRNAMT>${amount * -1}</TRNAMT>
      <MEMO>${description}</MEMO>
    </STMTTRN>`;
    else return `
    <STMTTRN>
      <TRNTYPE>CREDIT</TRNTYPE>
      <FITID>${id}
      <CHECKNUM>${id}
      <DTPOSTED>${date}</DTPOSTED>
      <TRNAMT>${amount}</TRNAMT>
      <MEMO>${description}</MEMO>
    </STMTTRN>`;
  }
    
  const normalizeAmount = (text) => {
    text = clearText(text,1);
    text = text.replace('.', '').replace(',','.').replace("R$","");
    return text;
  }
    
  const normalizeDate = (date) => {
    date = clearText(date,1);
    const dateArray = date.split('/');
    var month = "";
    if (parseInt(dateArray[1])>0) month = dateArray[1];
    else {
      switch(dateArray[1]){
        case "jan": month="01"; break;
        case "fev": month="02"; break;
        case "mar": month="03"; break;
        case "abr": month="04"; break;
        case "mai": month="05"; break;
        case "jun": month="06"; break;
        case "jul": month="07"; break;
        case "ago": month="08"; break;
        case "set": month="09"; break;
        case "out": month="10"; break;
        case "nov": month="11"; break;
        case "dez": month="12"; break;
      }
    }
    const today = new Date();
    var year = today.getFullYear();
    if(today.getMonth()<month-1) year--;
    return year+month+dateArray[0];
  }

  function clearText(text, clearSpaces){
    if(clearSpaces)
      return text.replace(/(\r\n|\n|\r|\t|\s)/gm, "");
    else
      return text.replace(/(\r\n|\n|\r|\t)/gm, "");
  }
  
  ////// PARSERS ////////

  const runParserItaucard = () => {
    // grab card details
    var cardDetail = clearText(document.querySelectorAll(".fatura__nome")[1].textContent,0);
    /*chrome.runtime.sendMessage({msg: "cardDetail", cardDetail: cardDetail}, function(response) {
      console.log(response.status);
    });*/

    var ofxOutput = startOfx(cardDetail);

    var tables = document.getElementsByTagName("table");
    for (let table of tables){
      if(String(table.summary).includes("lançamentos nacionais")){
        // grab national transactions
        var transactions = table.querySelectorAll(".linha-valor-total");
        var i = 0;
        transactions.forEach((trans) => {
          i++;
          var cols = trans.getElementsByTagName("td");
          var date = normalizeDate(cols[0].getElementsByTagName("span")[0].textContent);
          var desc = clearText(cols[1].textContent,0);
          var value = cols[2].getElementsByClassName("sr-only");
          if (value.length == 0) { // is positive value
            value = cols[2].getElementsByTagName("span")[0];
            value = normalizeAmount(value.innerText);
          } else{ // is negative value
            value = normalizeAmount(value[0].innerText);
          }
          ofxOutput = ofxOutput + '\n' + bankStatement(i,date,value,desc,true);
        });
      } else if(String(table.summary).includes("lançamentos internacionais")){
        // grab international transactions
        var transactions = table.querySelectorAll("tbody");
        var i = 0;
        for (let trans of transactions){
          i++;
          var date = normalizeDate(trans.querySelector('tr:nth-child(1) td:nth-child(1) span:nth-child(2)').textContent);
          var desc = clearText(trans.querySelector('tr:nth-child(2) td:nth-child(2)').textContent,0);
          var value = trans.querySelector('tr:nth-child(2) td:nth-child(3) span:nth-child(1)');
          if(value.innerText=='-') value = trans.querySelector('tr:nth-child(2) td:nth-child(3) span:nth-child(2)'); // if is negative value, grab second span
          value = normalizeAmount(value.textContent);
          
          ofxOutput = ofxOutput + '\n' + bankStatement(i,date,value,desc,true);
        };
      }
    }
    ofxOutput = ofxOutput + endOfx();
    //console.log(ofxOutput);
    chrome.runtime.sendMessage({msg: "ofxOutput", ofx: ofxOutput}, function(response) {
        console.log(response.status);
    });
  }

  const runParserAlelo = () => {
    var ofxOutput = startOfx("Alelo");
    var i=0;
    var transactions = document.getElementsByClassName("transaction-container");
    for (trans of transactions){
      i++;
      var date = trans.querySelector(".date");
      if(date) date = normalizeDate(date.textContent);
      
      var desc = trans.querySelector(".description-debit");
      if(!desc) desc = trans.querySelector(".description-credit");
      desc = clearText(desc.textContent,0);

      var value = trans.querySelector(".value");
      value = normalizeAmount(value.textContent);

      ofxOutput = ofxOutput + '\n' + bankStatement(i,date,value,desc, false);
    }
    ofxOutput = ofxOutput + endOfx();
    //console.log(ofxOutput);
    chrome.runtime.sendMessage({msg: "ofxOutput", ofx: ofxOutput}, function(response) {
        console.log(response.status);
    });
  }

  const runParserSafra = () => {
    var ofxOutput = startOfx("Safra");
    var i=0;
    var transactionsTable = document.getElementsByClassName("tabela-extrato");
    if(transactionsTable.length == 0) return;
    var transactions = transactionsTable[0].getElementsByClassName("passado");
    for (trans of transactions){
      if(String(trans.querySelector("td:nth-child(2)").textContent).includes("Entrada") ||
        String(trans.querySelector("td:nth-child(2)").textContent).includes("Saída")){ // Is it a transaction
        i++;
        var date = trans.querySelector("td:nth-child(1) span");
        if(date) date = normalizeDate(date.textContent);
        
        var desc = trans.querySelector("td:nth-child(3) span");
        desc = clearText(desc.innerText.replace("\n", " "),0);

        var value = trans.querySelector("td:nth-child(5) span");
        value = normalizeAmount(value.textContent);

        ofxOutput = ofxOutput + '\n' + bankStatement(i,date,value,desc, false);
      }
      
    }
    ofxOutput = ofxOutput + endOfx();
    //console.log(ofxOutput);
    chrome.runtime.sendMessage({msg: "ofxOutput", ofx: ofxOutput}, function(response) {
        console.log(response.status);
    });
  }

  const runParserVerocard = () => {
    var ofxOutput = startOfx("Verocard");
    var i=0;
    var transactionsTable = document.getElementsByClassName("extrato");
    if(transactionsTable.length == 0) return;
    var transactions = transactionsTable[0].getElementsByClassName("item");
    for (trans of transactions){
      i++;
      var date = trans.querySelector("div div:nth-child(1) time");
      date = date.innerText.split(" ")[0];
      if(date) date = normalizeDate(date);
      
      var desc = trans.querySelector("div div:nth-child(1) h3");
      desc = clearText(desc.innerText,0);

      var value = trans.querySelector("div div:nth-child(2) div span");
      value = normalizeAmount(value.textContent);

      var inverterSinal = !desc.includes("CARGA DE CREDITO");
      ofxOutput = ofxOutput + '\n' + bankStatement(i,date,value,desc, inverterSinal);
      
      
    }
    ofxOutput = ofxOutput + endOfx();
    //console.log(ofxOutput);
    chrome.runtime.sendMessage({msg: "ofxOutput", ofx: ofxOutput}, function(response) {
        console.log(response.status);
    });
  }

  function bankDiscovery(){
    var title;
    // Check for itaucard
    title = document.getElementsByTagName("h1");
    if (title[0] && title[0].innerText.includes("fatura e limite")){
      myBank = "Itaucard";
      return myBank;
    }

    // Check for Alelo
    title = document.getElementsByTagName("h5");
    if (title[0] && title[0].innerText.includes("Alelo")){
      myBank = "Alelo";
      return myBank;
    }

    // Check for Safra
    title = document.getElementsByTagName("h2");
    if (title[0] && title[0].innerText.includes("Lançamentos")){
      myBank = "Safra";
      return myBank;
    }

    // Check for Verocard
    title = document.getElementsByClassName("title");
    if (title.length>0 && title[0].innerText.includes("Consultar saldo")){
      myBank = "Verocard";
      return myBank;
    }
    return null;
  }

  function runOnLoad(){
    // Listener to receive messages from extension
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (request.msg === "generateOFX"){
          switch(myBank){
            case "Itaucard": runParserItaucard(); break;
            case "Alelo": runParserAlelo(); break;
            case "Safra": runParserSafra(); break;
            case "Verocard": runParserVerocard(); break;
          }
          sendResponse({status: "OK"});
        } else if (request.msg === "init"){
          chrome.runtime.sendMessage({msg: "init", bank: bankDiscovery()}, function(response) {
            console.log(response.status);
        });
        }
      }
    );
  };

  window.addEventListener ("load", runOnLoad, false);

})();