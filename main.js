const mineflayer = require('mineflayer');
const http = require('http'); // Moduł do stworzenia serwera HTTP

// --- Konfiguracja Serwera Minecraft ---
const MINECRAFT_SERVER_HOST = 'raspberrycraft.falixsrv.me';
const MINECRAFT_SERVER_PORT = 38497;
const BOT_USERNAME = 'RaspberryBot';
const AUTH_MODE = 'offline';
const MINECRAFT_VERSION = '1.8.8';

// --- Konfiguracja Serwera Statusu HTTP ---
const STATUS_PORT = 10000;
let botStatus = 'offline'; // Zmienna przechowująca status bota

// --- Funkcja Tworząca Bota ---
function createBot() {
    const bot = mineflayer.createBot({
        host: MINECRAFT_SERVER_HOST,
        port: MINECRAFT_SERVER_PORT,
        username: BOT_USERNAME,
        auth: AUTH_MODE,
        version: MINECRAFT_VERSION
    });

    // --- Obsługa Zdarzeń Bota ---

    // Po pomyślnym dołączeniu
    bot.on('login', () => {
        console.log(`Bot ${BOT_USERNAME} zalogował się.`);
        botStatus = 'online na serverze';
    });

    // System Logowania/Rejestracji
    let isRegistered = false; // Zmienna symulująca, czy bot jest już zarejestrowany

    bot.once('spawn', () => {
        console.log('Bot odrodził się na serwerze.');

        // Daj serwerowi chwilę na załadowanie przed wysłaniem komendy
        setTimeout(() => {
            if (isRegistered) {
                // Jeśli bot jest już "zarejestrowany" (w symulacji), użyj logowania
                const loginCommand = `/login RHaaloaspbertyBot`;
                bot.chat(loginCommand);
                console.log(`Wysłano komendę logowania: ${loginCommand}`);
            } else {
                // Jeśli to pierwszy raz, użyj rejestracji i ustaw isRegistered na true
                const registerCommand = `/register RHaaloaspberryBot RHaaloaspberryBot`; // Wymagane 2 hasła
                bot.chat(registerCommand);
                isRegistered = true; // Zmieniamy stan na zarejestrowany
                console.log(`Wysłano komendę rejestracji: ${registerCommand}`);
            }
        }, 3000); // Czekaj 3 sekundy
    });

    // Po wyrzuceniu (kick)
    bot.on('kicked', (reason, loggedIn) => {
        console.log(`Bot został wyrzucony! Powód: ${reason}`);
        botStatus = 'offline';
        // Automatyczne ponowne dołączenie
        setTimeout(() => {
            console.log('Próba ponownego dołączenia...');
            createBot(); // Wywołanie funkcji tworzącej bota rozpocznie próbę reconnectu
        }, 5000); // Czekaj 5 sekund przed ponownym dołączeniem
    });

    // Błąd
    bot.on('error', (err) => {
        console.log(`Wystąpił błąd: ${err.message}`);
        botStatus = 'offline';
        // W przypadku błędu (np. nie ma serwera) też spróbuj ponownie
        setTimeout(() => {
            console.log('Próba ponownego dołączenia po błędzie...');
            createBot();
        }, 10000); // Czekaj 10 sekund po błędzie
    });

    // Rozłączenie (np. serwer się wyłączył)
    bot.on('end', (reason) => {
        console.log(`Połączenie zakończone. Powód: ${reason}`);
        botStatus = 'offline';
        // Automatyczne ponowne dołączenie
        setTimeout(() => {
            console.log('Próba ponownego dołączenia...');
            createBot();
        }, 5000); // Czekaj 5 sekund przed ponownym dołączeniem
    });

    return bot;
}

// --- Serwer Statusu HTTP ---

// Tworzenie serwera
const server = http.createServer((req, res) => {
    // Ustawienie nagłówków (Content-Type: text/html)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    // Prosta strona ze statusem
    res.write(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Status RaspberryBot</title>
            <meta http-equiv="refresh" content="5"> <style>
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
    res.end(); // Zakończenie odpowiedzi
});

// Nasłuchiwanie na porcie 10000
server.listen(STATUS_PORT, () => {
    console.log(`Serwer statusu HTTP działa na porcie ${STATUS_PORT}. Otwórz http://localhost:${STATUS_PORT} w przeglądarce.`);
    console.log(`Pamiętaj, że na Vercel musisz skonfigurować to jako funkcję serverless/web service!`);
});

// --- Uruchomienie Bota ---
createBot();


