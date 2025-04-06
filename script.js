let userBalance = parseFloat(localStorage.getItem("userBalance")) || 0.00;
let trades = JSON.parse(localStorage.getItem("trades")) || [];
let currentPrice = generateInitialPrice();
let previousPrice = currentPrice;
let buyCount = 0;
let sellCount = 0;
let currentTradeCount = 0;
const MAX_TRADES_PER_SESSION = 4;
const contactPhone = "+23275262886";
const SESSION_DURATION = 10 * 60 * 1000;
const BREAK_DURATION = 5 * 60 * 1000;
let inSession = localStorage.getItem("inSession") === "true" || true;
let sessionStartTime = parseInt(localStorage.getItem("sessionStartTime")) || Date.now();
let fundMeUsed = localStorage.getItem("fundMeUsed") === "true";
let savedUsername = localStorage.getItem("username");
let activeBuyPrice = null;
let priceTrendDirection = Math.random() < 0.5 ? "up" : "down"; // Start with either up or down
let trendCounter = 0;

if (savedUsername) {
  document.getElementById("usernameDisplay").innerText = `Trader: ${savedUsername}`;
  document.getElementById("userInputSection").style.display = "none";
}

function generateInitialPrice() {
  return parseFloat((Math.random() * 49 + 1).toFixed(2));
}

function generateTrendPrice() {
  let change = parseFloat((Math.random() * 2 + 0.5).toFixed(2)); // Small movement
  if (trendCounter > 4 || Math.random() < 0.15) {
    priceTrendDirection = priceTrendDirection === "up" ? "down" : "up"; // Reverse direction
    trendCounter = 0;
  } else {
    trendCounter++;
  }

  let newPrice = priceTrendDirection === "up"
    ? currentPrice + change
    : currentPrice - change;

  newPrice = Math.max(1.00, Math.min(50.00, newPrice)); // Clamp price between 1 and 50
  return parseFloat(newPrice.toFixed(2));
}

function formatCurrency(amount) {
  return `NLE ${amount.toFixed(2)}`;
}

function updatePriceBoxes() {
  document.getElementById("prevPriceBox").innerText = `Previous Price: ${formatCurrency(previousPrice)}`;
  document.getElementById("currPriceBox").innerText = `Current Price: ${formatCurrency(currentPrice)}`;
  const trendBox = document.getElementById("trendBox");

  if (currentPrice > previousPrice) {
    trendBox.innerText = "Trend: Up";
    trendBox.style.borderColor = "green";
  } else if (currentPrice < previousPrice) {
    trendBox.innerText = "Trend: Down";
    trendBox.style.borderColor = "red";
  } else {
    trendBox.innerText = "Trend: Stable";
    trendBox.style.borderColor = "#007BFF";
  }
}

function updateMarketStatus() {
  document.getElementById("datetime").innerText = new Date().toLocaleString();
  document.getElementById("balance").innerText = `Balance: ${formatCurrency(userBalance)}`;
  updatePriceBoxes();

  const status = inSession
    ? "Market Status: OPEN | Trade now"
    : "MARKET ON BREAK (5 mins): Session closed.";
  document.getElementById("marketStatus").innerText = status;
}

function renderTradeHistory() {
  const container = document.getElementById("tradeHistoryContainer");
  container.innerHTML = trades
    .map((t) => {
      let resultText = t.loss ? " (LOSS)" : t.profit ? " (PROFIT)" : "";
      return `<div>${t.timestamp} - ${t.type.toUpperCase()} at ${formatCurrency(t.price)}${resultText}</div>`;
    })
    .join("");
}

function saveTrade(type, price, isLoss = false, isProfit = false) {
  const trade = {
    type,
    price,
    timestamp: new Date().toLocaleString(),
    loss: isLoss,
    profit: isProfit,
  };
  trades.push(trade);
  localStorage.setItem("trades", JSON.stringify(trades));
  localStorage.setItem("userBalance", userBalance.toFixed(2));
  updateMarketStatus();
  renderTradeHistory();
  alert(`${type.toUpperCase()} successful at ${formatCurrency(price)}`);
}

function handleBuy() {
  if (!savedUsername) return alert("Enter your name before trading.");
  if (!inSession) return alert("Market on break.");
  if (currentTradeCount >= MAX_TRADES_PER_SESSION) return alert("Trade limit reached.");
  if (buyCount > sellCount) return alert("You must sell before exchanging again.");
  if (userBalance < currentPrice) return alert("Insufficient balance to buy.");

  previousPrice = currentPrice;
  userBalance -= currentPrice;
  activeBuyPrice = currentPrice;
  currentPrice = generateTrendPrice();
  currentTradeCount++;
  buyCount++;
  saveTrade("buy", activeBuyPrice);
}

function handleSell() {
  if (!savedUsername) return alert("Enter your name before trading.");
  if (!inSession) return alert("Market on break.");
  if (buyCount === sellCount) return alert("You must buy before making an exchange.");
  if (activeBuyPrice === null) return alert("No active buy trade.");

  previousPrice = currentPrice;
  const sellPrice = generateTrendPrice();
  let profit = sellPrice > activeBuyPrice;
  let loss = !profit;

  userBalance += sellPrice;
  currentPrice = sellPrice;
  sellCount++;
  currentTradeCount++;
  saveTrade("sell", sellPrice, loss, profit);
  activeBuyPrice = null;
}

function handleUsernameSubmit() {
  const input = document.getElementById("userNameInput").value.trim();
  if (!input) return alert("Please enter your name.");
  if (localStorage.getItem("username")) return alert("Name already set and cannot be changed.");

  savedUsername = input;
  localStorage.setItem("username", savedUsername);
  document.getElementById("userInputSection").style.display = "none";
  document.getElementById("usernameDisplay").innerText = `Trader: ${savedUsername}`;
  alert("Name recorded successfully. You can now trade.");
}

function setActiveBuyToLoss() {
  if (activeBuyPrice !== null) {
    saveTrade("buy", activeBuyPrice, true);
    activeBuyPrice = null;
  }
}

function analyzeSession() {
  const sessionTrades = trades.slice(-currentTradeCount);
  let totalProfit = 0,
    totalLoss = 0;

  sessionTrades.forEach((t) => {
    if (t.profit) totalProfit += t.price;
    if (t.loss) totalLoss += t.price;
  });

  const summary = `
    <strong>Session Summary:</strong><br>
    Profit: ${formatCurrency(totalProfit)}<br>
    Loss: ${formatCurrency(totalLoss)}<br>
    Total Trades: ${sessionTrades.length}
  `;
  const trendBox = document.getElementById("trendAnalysis");
  trendBox.innerHTML = summary;
  trendBox.style.display = "block";
}

function toggleSession() {
  inSession = !inSession;
  sessionStartTime = Date.now();
  localStorage.setItem("inSession", inSession);
  localStorage.setItem("sessionStartTime", sessionStartTime);

  if (!inSession) {
    setActiveBuyToLoss();
    analyzeSession();
  } else {
    currentTradeCount = 0;
    buyCount = 0;
    sellCount = 0;
    document.getElementById("trendAnalysis").style.display = "none";
  }

  updateMarketStatus();
  renderTradeHistory();
}

function updateTimer() {
  const now = Date.now();
  const elapsed = now - sessionStartTime;
  const duration = inSession ? SESSION_DURATION : BREAK_DURATION;

  if (elapsed >= duration) {
    toggleSession();
  }

  const remaining = duration - elapsed;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  const label = inSession ? "Session Time Left" : "Break Time Left";
  document.getElementById("sessionStatus").innerText = `${label}: ${minutes}m ${seconds}s`;
}

function handleFundMe() {
  if (userBalance > 5) return alert("You can only use this if your balance is Nle 5.00.");
  if (fundMeUsed) return alert("You’ve already used Fund Me.");

  userBalance += 20;
  fundMeUsed = true;
  localStorage.setItem("userBalance", userBalance.toFixed(2));
  localStorage.setItem("fundMeUsed", true);
  updateMarketStatus();
  alert("You’ve been funded with NLE 20.00 (non-withdrawable).");
}

function validatePhone(phone) {
  return /^\+232\d{8}$/.test(phone);
}

function handleWithdraw() {
  const name = document.getElementById("userFullName").value.trim();
  const address = document.getElementById("userAddress").value.trim();
  const phone = document.getElementById("userPhone.").value.trim();
  const amount = parseFloat(document.getElementById("withdrawAmount").value);
  const image = document.getElementById("userImage").files[0];

  if (!name || !address || !phone || !amount || !image) {
    return alert("All fields including image are required.");
  }

  if (!validatePhone(phone)) {
    return alert("Phone must be in format +232XXXXXXXX");
  }

  if (name !== savedUsername) {
    return alert("Name must match your trader name.");
  }

  if (amount < 100 || amount > 200) {
    return alert("Withdrawal amount must be between NLE 100 and NLE 200.");
  }

  if (userBalance < amount) {
    return alert("Insufficient balance.");
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const tradeSlice = trades.slice(-2);
    const receipt = `
      <html><head><title>Withdrawal Receipt</title></head>
      <body>
        <h2>Withdrawal Receipt</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Amount:</strong> ${formatCurrency(amount)}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <h3>Last 2 Trades:</h3>
        ${tradeSlice.map(t => `<p>${t.timestamp} - ${t.type.toUpperCase()} at ${formatCurrency(t.price)}</p>`).join("")}
        <img src="${e.target.result}" alt="ID Image" width="100"><br><br>
        <p>Payment takes 2-3 working days. Upload this receipt at the payment group. Contact/what's app this number: ${contactPhone}</p>
      </body></html>
    `;

    const blob = new Blob([receipt], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `withdrawal_receipt_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    userBalance -= amount;
    localStorage.setItem("userBalance", userBalance.toFixed(2));
    updateMarketStatus();
  };
  reader.readAsDataURL(image);
}

document.addEventListener("DOMContentLoaded", () => {
  updateMarketStatus();
  renderTradeHistory();

  document.getElementById("buyBtn").onclick = handleBuy;
  document.getElementById("sellBtn").onclick = handleSell;
  document.getElementById("submitUsername").onclick = handleUsernameSubmit;
  document.getElementById("fundMeBtn").onclick = handleFundMe;
  document.getElementById("withdrawBtn").onclick = handleWithdraw;

  document.getElementById("toggleTradeHistory").addEventListener("click", () => {
    const container = document.getElementById("tradeHistoryContainer");
    container.style.display = container.style.display === "none" ? "block" : "none";
  });

  setInterval(() => {
    previousPrice = currentPrice;
    currentPrice = generateTrendPrice();
    updateMarketStatus();
  }, 60000);

  setInterval(updateTimer, 1000);
});