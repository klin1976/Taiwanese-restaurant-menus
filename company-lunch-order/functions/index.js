const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const functions = require("firebase-functions"); // Key for legacy config
const fetch = require("node-fetch");

admin.initializeApp();
setGlobalOptions({ region: "asia-east1" });

// AI 菜單辨識模組
const { analyzeMenuImage } = require("./menuAI");

// P4: AI 菜單辨識
exports.analyzeMenuImage = analyzeMenuImage;

exports.sendTeamsNotification = onCall(async (request) => {
    console.log("=== Cloud Function Start (v3.1 - Config Fix) ===");

    // 1. Auth Check
    if (!request.auth) {
        console.warn("Unauthenticated request");
        throw new HttpsError("unauthenticated", "User must be logged in");
    }

    // 2. Resolve Webhook URL (Try env first, then legacy config)
    let WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
    if (!WEBHOOK_URL) {
        try {
            WEBHOOK_URL = functions.config().teams?.webhook;
            if (WEBHOOK_URL) console.log("Loaded URL from functions.config()");
        } catch (e) {
            console.warn("Error reading functions.config:", e.message);
        }
    } else {
        console.log("Loaded URL from process.env");
    }

    if (!WEBHOOK_URL) {
        console.error("CRITICAL: TEAMS_WEBHOOK_URL is missing in both env and config");
        return { success: false, error: "Server config error: Missing Webhook URL" };
    }

    // 3. Payload Processing
    const { payload } = request.data || {};
    if (!payload) {
        console.error("Missing payload");
        return { success: false, error: "Missing payload" };
    }

    try {
        const bodyString = typeof payload === 'string' ? payload : JSON.stringify(payload);
        console.log(`Sending payload (${bodyString.length} chars)`);

        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyString,
        });

        const text = await response.text();
        console.log(`Teams Response: ${response.status} - ${text}`);

        if (response.ok || text === "1") {
            return { success: true };
        } else {
            return { success: false, error: `Teams API Error ${response.status}: ${text}` };
        }

    } catch (error) {
        console.error("Fetch Exception:", error);
        return { success: false, error: error.message };
    }
});
