const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const FormData = require('form-data');
const { HttpsProxyAgent } = require('https-proxy-agent');

class KucoinAPIClient {
    constructor(index) {
        this.headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Origin": "https://www.kucoin.com",
            "Referer": "https://www.kucoin.com/miniapp/tap-game",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?1",
            "Sec-Ch-Ua-Platform": '"Android"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
        };
        this.index = index;
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch (type) {
            case 'success':
                console.log(`[${timestamp}] [Tài khoản ${this.index}] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [Tài khoản ${this.index}] ${msg}`.magenta);
                break;
            case 'error':
                console.log(`[${timestamp}] [Tài khoản ${this.index}] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [Tài khoản ${this.index}] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [Tài khoản ${this.index}] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        this.log(`Chờ ${seconds} giây...`);
        for (let i = seconds; i > 0; i--) {
            readline.cursorTo(process.stdout, 0);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
    }

    generateRandomPoints(totalPoints, numRequests) {
        let points = new Array(numRequests).fill(0);
        let remainingPoints = totalPoints;

        for (let i = 0; i < numRequests - 1; i++) {
            const maxPoint = Math.min(60, remainingPoints - (numRequests - i - 1));
            const point = Math.floor(Math.random() * (maxPoint + 1));
            points[i] = point;
            remainingPoints -= point;
        }

        points[numRequests - 1] = remainingPoints;

        for (let i = points.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [points[i], points[j]] = [points[j], points[i]];
        }

        return points;
    }

    async increaseGold(cookie, increment, molecule, proxyAgent) {
        const url = "https://www.kucoin.com/_api/xkucoin/platform-telebot/game/gold/increase?lang=en_US";

        const formData = new FormData();
        formData.append('increment', increment);
        formData.append('molecule', molecule);
        const headers = {
            ...this.headers,
            "Cookie": cookie,
            ...formData.getHeaders()
        };

        try {
            const response = await axios.post(url, formData, {
                headers,
                httpsAgent: proxyAgent
            });
            if (response.status === 200) {
                return { success: true, data: response.data };
            } else {
                return { success: false, error: `HTTP Error: ${response.status}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async main(cookie, proxy) {

        while (true) {
            let proxyAgent = null;
            if (proxy) {

                proxyAgent = new HttpsProxyAgent(proxy);
            }

            const points = this.generateRandomPoints(3000, 55);
            let totalPoints = 0;
            let currentMolecule = 3000;

            for (let j = 0; j < points.length; j++) {
                const increment = points[j];
                currentMolecule -= increment;

                this.log(`Lần ${j + 1}: Bón ${increment} sâu cho ếch...`, 'info');
                let result = null;
                if (proxyAgent) {
                    result = await this.increaseGold(cookie, increment, currentMolecule, proxyAgent);
                } else {
                    result = await this.increaseGold(cookie, increment, currentMolecule);
                }
                if (result.success) {
                    this.log(`Đã bón được ${result.data.data} sâu`, 'success');
                    totalPoints += increment;
                    this.log(`Số sâu còn lại: ${currentMolecule}`, 'custom');
                } else {
                    this.log(`Không thể bón sâu: ${result.error}`, 'error');
                }

                await this.countdown(3);
            }

            this.log(`Tổng số gold đã tăng: ${totalPoints}`, 'custom');
            await this.countdown(60);
        }
    }
}

const promises = [];

process.stdout.write('\x1Bc')

const dataFile = path.join(__dirname, 'data.txt');
const cookies = fs.readFileSync(dataFile, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .filter(Boolean);

const proxyFile = path.join(__dirname, 'proxy.txt');
const proxies = fs.readFileSync(proxyFile, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .filter(Boolean);

if (cookies.length === 0) {
    console.log('Không có cookie nào trong file data.txt');
    process.exit(1);
}

if (proxies.length === 0) {
    console.log('Không có proxy trong file proxy.txt');
    process.exit(1);
}

for (let i = 0; i < cookies.length; i++) {
    let proxy = `http://${proxies[i].split(':')[2]}:${proxies[i].split(':')[3]}@${proxies[i].split(':')[0]}:${proxies[i].split(':')[1]}`;
    promises.push(new KucoinAPIClient(i + 1).main(cookies[i], proxy));
}
