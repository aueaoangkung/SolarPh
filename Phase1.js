let knex = require('knex')({
    client: 'mssql',
    connection: {
        server: process.env.DB_SERVER,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    }
});

const axios = require('axios');
const cron = require("node-cron");
require('dotenv').config();
const baseUrl = 'https://gateway.isolarcloud.com.hk/openapi/';

let currentToken = null; // Global token storage
let lastDeviceListUpdate = null;
let cachedDeviceList = [];

async function login() {
    const url = baseUrl + 'login';
    const body = {
        appkey: process.env.API_KEY,
        user_account: process.env.USER_ACCOUNT,
        user_password: process.env.USER_PASSWORD,
        lang: "_en_US"
    };
    const config = {
        headers: {
            'x-access-key': 'dqfp8d2mvcrjt35mk5k5zib6ngkjksni',
            'sys_code': '901',
            'Content-Type': 'application/json;charset=UTF-8',
        }
    };

    try {
        const response = await axios.post(url, body, config);
        if (response.data.result_code === "1" && response.data.result_data && response.data.result_data.token) {
            currentToken = response.data.result_data.token;
            console.log('Login successful, token received:', currentToken);
        } else {
            throw new Error('Login failed: ' + response.data.result_msg);
        }
    } catch (error) {
        console.error('Error during login:', error.message);
        throw error;
    }
}

async function getDeviceList(ps_id) {
    const today = new Date().toISOString().slice(0, 10);
    if (lastDeviceListUpdate !== today || !cachedDeviceList.length) {
        console.log("Fetching new device list for today...");
        if (!currentToken) await login();
        const url = baseUrl + 'getDeviceList';
        const body = {
            appkey: "43314D73678D47C1C785C8EE43BA46E6",
            ps_id: ps_id,
            curPage: 1,
            size: 1000,
            token: currentToken
        };
        const config = {
            headers: {
                'x-access-key': 'dqfp8d2mvcrjt35mk5k5zib6ngkjksni',
                'sys_code' : '901',
                'Content-Type': 'application/json;charset=UTF-8',
            }
        };
        try {
            const response = await axios.post(url, body, config);
            if (response.data.result_code !== "1") {
                throw new Error('Error fetching device list: ' + response.data.result_msg);
            }
            cachedDeviceList = response.data.result_data.pageList;
            lastDeviceListUpdate = today;
        } catch (error) {
            console.error('Failed to fetch device list:', error.message);
            throw error;
        }
    }
    return cachedDeviceList;
}

async function getDeviceData(point_id, ps_key, device_type) {
    if (!currentToken) {
        console.log("Token is missing or invalid, logging in...");
        await login();
    }
    const url = baseUrl + 'getDeviceRealTimeData'; // Adjust the endpoint if necessary
    const data = {
        appkey: '43314D73678D47C1C785C8EE43BA46E6',
        point_id_list: [point_id],
        ps_key_list: [ps_key],
        device_type: device_type,
        token: currentToken
    };
    const config = {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'x-access-key': 'dqfp8d2mvcrjt35mk5k5zib6ngkjksni',
            'sys_code' : '901',
        }
    };

    try {
        const response = await axios.post(url, data, config);
        if (response.data.result_code !== "1") {
            console.error('Error fetching device data:', response.data.result_msg);
            throw new Error('API Error');
        }
        return response.data.result_data.device_point_list;
    } catch (error) {
        console.error('Error fetching device data:', error.message);
        throw error;
    }
}

cron.schedule('50 4,19,34,49 5-19 * * *', async () => {
    await writeDB('1208601', 'PowerHouse1');
    await writeDB('1242062', 'PowerHouse2');
});

async function writeDB(ps_id, powerHouseName) {
    try {
        const deviceKeys = await getDeviceList(ps_id);
        if (deviceKeys.length === 0) {
            console.error('No device keys found. Cannot proceed with writeDB.');
            return;
        }

        for (const key of deviceKeys) {
            const deviceData = await getDeviceData('24', key.ps_key, 1);
            for (const data of deviceData) {
                const devicePoint = data.device_point;
                const ActivePower = parseFloat(devicePoint['p24']) / 1000;
                const dateTime = devicePoint['device_time'];
                const formattedDate = new Date(`${dateTime.slice(0, 4)}-${dateTime.slice(4, 6)}-${dateTime.slice(6, 8)}T${dateTime.slice(8, 10)}:${dateTime.slice(10, 12)}:${dateTime.slice(12, 14)}Z`);

                formattedDate.setHours(formattedDate.getHours() - 7);
                if (!isNaN(formattedDate.getTime()) && !isNaN(ActivePower)) {
                    await knex('dbo.Ph_Dv').insert({
                        PowerHouse: powerHouseName,
                        DateTime: formattedDate,
                        CodeTime: dateTime.slice(10, 12),
                        DeviceId: key.ps_key,
                        InverterNo: devicePoint['device_name'],
                        ActivePower: parseFloat(ActivePower.toFixed(2)),
                        CodeCurrentTime: dateTime,
                        Status: devicePoint['dev_status']
                    });
                    console.log(`Data inserted for device ${devicePoint['device_sn']}`);
                } else {
                    console.error('Invalid data:', devicePoint);
                }
            }
        }
    } catch (error) {
        console.error('Error in writeDB function:', error.message);
    }
}