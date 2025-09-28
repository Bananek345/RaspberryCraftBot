const mineflayer = require('mineflayer');
const http = require('http'); 
const https = require('https'); 

// --- Konfiguracja Serwera Minecraft ---
const MINECRAFT_SERVER_HOST = 'raspberrycraft.falixsrv.me';
const MINECRAFT_SERVER_PORT = 38497;
const BOT_USERNAME = 'RaspberryBot';
const AUTH_MODE = 'offline';
const MINECRAFT_VERSION = '1.8.8';

// --- Konfiguracja Vercel i Statusu HTTP ---
const STATUS_PORT = process.env.PORT || 10000; 
const PING_URL = 'https://raspberry-craft-bot.vercel.app/'; 

let botStatus = 'offline';   
let isRegistered = false;    
let bot = null; // Zmienna globalna dla instancji bota
let reconnectTimeout = null; // Do przechowywania timeoutu ponownego łączenia
const RECONNECT_DELAY = 5000; // Opóźnienie ponownego łączenia (5 sekund)

// -------------------------------------------------------------------

// --- Funkcja do ponownego łączenia ---
function scheduleReconnect(reason) {
    // Zapobiegaj wielokrotnym próbom ponownego łączenia
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    
    console.log(`[MC] Rozłączenie! Powód: ${reason}`);
    botStatus = 'offline';
    
    // Ustaw automatyczne ponowne dołączenie
    reconnectTimeout = setTimeout(() => {
        console.log('[MC] Próba ponownego dołączenia...');
        // Nie tworzymy nowego bota, a wywołujemy funkcję connectBot
        connectBot(); 
    }, RECONNECT_DELAY); 
}

// --- Funkcja do stworzenia i podłączenia bota ---
function connectBot() {
    // Jeśli bot już istnieje (np. po rozłączeniu), użyjemy go, jeśli nie, stworzymy nową instancję.
    if (bot) {
        // Ponowne łączenie, jeśli bot już istnieje
        bot.connect({
            host: MINECRAFT_SERVER_HOST,
            port: MINECRAFT_SERVER_PORT,
            username: BOT_USERNAME,
            auth: AUTH_MODE,
            version: MINECRAFT_VERSION
        });
        return;
    }
    
    // Utworzenie nowej instancji bota (tylko raz, przy pierwszym uruchomieniu)
    bot = mineflayer.createBot({
        host: MINECRAFT_SERVER_HOST,
        port: MINECRAFT_SERVER_PORT,
        username: BOT_USERNAME,
        auth: AUTH_MODE,
        version: MINECRAFT_VERSION
    });

    // --- Obsługa Zdarzeń Bota (dodana tylko raz) ---

    bot.on('login', () => {
        console.log(`[MC] Bot ${BOT_USERNAME} zalogował się.`);
        botStatus = 'online na serverze';
        // Wyczyść timeout, jeśli bot się pomyślnie połączył
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
    });

    // System Logowania/Rejestracji
    bot.on('spawn', () => {
        console.log('[MC] Bot odrodził się na serwerze.');
        // Dodatkowe opóźnienie, aby serwer miał czas na wysłanie komunikatów
        setTimeout(() => {
            if (isRegistered) {
                // Logowanie
                const loginCommand = `/login RHaaloaspbertyBot`; 
                bot.chat(loginCommand);
                console.log(`[MC] Wysłano komendę logowania: ${loginCommand}`);
            } else {
                // Rejestracja
                const registerCommand = `/register RHaaloaspberryBot RHaaloaspberryBot`; 
                bot.chat(registerCommand);
                isRegistered = true; // Zmień stan na zarejestrowany po pierwszej próbie
                console.log(`[MC] Wysłano komendę rejestracji: ${registerCommand}`);
            }
        }, 5000); // Wydłużono czas oczekiwania do 5 sekund
    });

    // Obsługa rozłączenia i ponownego łączenia
    bot.on('kicked', (reason) => scheduleReconnect(`Wyrzucenie: ${reason}`));
    bot.on('end', (reason) => scheduleReconnect(`Rozłączenie: ${reason}`));
    bot.on('error', (err) => scheduleReconnect(`Błąd: ${err.message}`));
}

// -------------------------------------------------------------------

// --- Serwer Statusu HTTP (dla Vercel) ---
// (Pozostała część kodu HTTP i Keep-Alive jest taka sama)

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

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

server.listen(STATUS_PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Serwer statusu HTTP działa na porcie ${STATUS_PORT}.`);
});

// -------------------------------------------------------------------

// --- Mechanizm Pingowania (Keep-Alive) dla Vercel ---
if (process.env.VERCEL) { 
    setInterval(() => {
        console.log('--- Wysłano PING (Keep-Alive) ---');
        
        const client = PING_URL.startsWith('https') ? https : http; 
        
        client.get(PING_URL, (res) => {
            console.log(`Status PING: ${res.statusCode} (OK = 200)`);
        }).on('error', (e) => {
            console.error(`Błąd pingowania: ${e.message}`);
        });
    }, 4 * 60 * 1000); 
}

// --- Uruchomienie Bota ---
connectBot();
