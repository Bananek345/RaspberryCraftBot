const mineflayer = require('mineflayer');
const http = require('http'); 
const https = require('https'); // Potrzebne do PING-owania URL po HTTPS

// --- Konfiguracja Serwera Minecraft ---
const MINECRAFT_SERVER_HOST = 'raspberrycraft.falixsrv.me';
const MINECRAFT_SERVER_PORT = 38497;
const BOT_USERNAME = 'RaspberryBot';
const AUTH_MODE = 'offline';
const MINECRAFT_VERSION = '1.8.8';

// --- Konfiguracja Vercel i Statusu HTTP ---
// Używamy portu dynamicznie przydzielonego przez Vercel (process.env.PORT) lub 10000 lokalnie
const STATUS_PORT = process.env.PORT || 10000; 

// WAŻNE: Adres URL do PING-owania, aby zapobiec uśpieniu przez Vercel
const PING_URL = 'https://raspberry-craft-bot.vercel.app/'; 

let botStatus = 'offline';   // Status bota
let isRegistered = false;    // Symulacja stanu rejestracji

// -------------------------------------------------------------------

// --- Funkcja Tworząca Bota (z mechanizmem reconnect) ---
function createBot() {
    const bot = mineflayer.createBot({
        host: MINECRAFT_SERVER_HOST,
        port: MINECRAFT_SERVER_PORT,
        username: BOT_USERNAME,
        auth: AUTH_MODE,
        version: MINECRAFT_VERSION
    });

    // --- Obsługa Zdarzeń Bota ---

    bot.on('login', () => {
        console.log(`[MC] Bot ${BOT_USERNAME} zalogował się.`);
        botStatus = 'online na serverze';
    });

    // System Logowania/Rejestracji
    bot.once('spawn', () => {
        console.log('[MC] Bot odrodził się na serwerze.');

        setTimeout(() => {
            if (isRegistered) {
                // Logowanie
                const loginCommand = `/login RHaaloaspbertyBot`; 
                bot.chat(loginCommand);
                console.log(`[MC] Wysłano komendę logowania: ${loginCommand}`);
            } else {
                // Rejestracja (używamy tego samego hasła dwukrotnie)
                const registerCommand = `/register RHaaloaspberryBot RHaaloaspberryBot`; 
                bot.chat(registerCommand);
                isRegistered = true; 
                console.log(`[MC] Wysłano komendę rejestracji: ${registerCommand}`);
            }
        }, 3000); // Czekaj 3 sekundy
    });

    // Funkcja do obsługi rozłączenia i reconnectu
    function handleDisconnect(reason) {
        console.log(`[MC] Rozłączenie! Powód: ${reason}`);
        botStatus = 'offline';
        // Automatyczne ponowne dołączenie
        setTimeout(() => {
            console.log('[MC] Próba ponownego dołączenia za 5 sekund...');
            createBot(); 
        }, 5000); 
    }
    
    bot.on('kicked', (reason) => handleDisconnect(`Wyrzucenie: ${reason}`));
    bot.on('end', (reason) => handleDisconnect(`Rozłączenie: ${reason}`));
    bot.on('error', (err) => handleDisconnect(`Błąd: ${err.message}`));

    return bot;
}

// -------------------------------------------------------------------

// --- Serwer Statusu HTTP (dla Vercel) ---

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    // Prosta strona ze statusem
    res.write(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Status RaspberryBot</title>
            <meta http-equiv="refresh" content="5"> 
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f4; }
                .status { font-size: 2em; padding: 20px; border-radius: 10px; display: inline-block; }
                .online { background-color: #4CAF50; color: white; }
                .offline { background-color: #f44336; color: white; }
            </style>
        </head>
        <body>
            <h1>Status Bota: ${BOT_USERNAME}</h1>
            <div class="status ${botStatus.includes('online') ? 'online' : 'offline'}">
                ${botStatus}
            </div>
            <p>Ostatnia aktualizacja: ${new Date().toLocaleTimeString()}</p>
            <p>Host MC: ${MINECRAFT_SERVER_HOST}:${MINECRAFT_SERVER_PORT}</p>
        </body>
        </html>
    `);
    res.end(); 
});

// Nasłuchiwanie na porcie Vercel i adresie 0.0.0.0 (wymagane dla dostępu zewnętrznego)
server.listen(STATUS_PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Serwer statusu HTTP działa na porcie ${STATUS_PORT}.`);
});

// -------------------------------------------------------------------

// --- Mechanizm Pingowania (Keep-Alive) dla Vercel ---
if (process.env.VERCEL) { 
    setInterval(() => {
        console.log('--- Wysłano PING (Keep-Alive) ---');
        
        // Wybieramy moduł (http lub https) w zależności od PING_URL
        const client = PING_URL.startsWith('https') ? https : http; 
        
        client.get(PING_URL, (res) => {
            console.log(`Status PING: ${res.statusCode} (OK = 200)`);
        }).on('error', (e) => {
            console.error(`Błąd pingowania: ${e.message}`);
        });
    }, 4 * 60 * 1000); // Pinguj co 4 minuty, aby zapobiec uśpieniu (limit Vercel to 5 min)
}

// --- Uruchomienie Bota ---
createBot();
