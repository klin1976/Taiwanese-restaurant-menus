const fetch = require('node-fetch');

async function testCloudFunction() {
    const url = 'https://asia-east1-company-lunch-order.cloudfunctions.net/sendTeamsNotification';

    // 模擬前端 payload
    const payload = {
        summary: "Test Notification",
        text: "This is a test notification from script."
    };

    try {
        console.log("Testing with raw object...");
        const response1 = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { payload: payload } }) // Firebase Callable 格式
        });
        console.log("Response 1:", await response1.text());

        console.log("Testing with stringified payload...");
        const response2 = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { payload: JSON.stringify(payload) } })
        });
        console.log("Response 2:", await response2.text());

    } catch (error) {
        console.error("Test Error:", error);
    }
}

testCloudFunction();
