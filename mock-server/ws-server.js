const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('Mock WebSocket server started on ws://localhost:8080');
console.log('Sending mock trade data every 1 second...');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD'];
const exchanges = ['Binance', 'Coinbase', 'Kraken', 'Gemini'];

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  const sendTradeInterval = setInterval(() => {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const price = (Math.random() * (4000 - 100) + 100).toFixed(2);
    const size = (Math.random() * (10 - 0.1) + 0.1).toFixed(4); 
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];

    const trade = {
      id: generateUUID(),
      timestamp: Date.now(),
      symbol: symbol,
      price: parseFloat(price),
      size: parseFloat(size),
      side: side,
      exchange: exchange
    };

    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(trade));
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, 1000); // Send a trade every 1 second

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(sendTradeInterval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error on client:', error);
    clearInterval(sendTradeInterval);
  });
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});