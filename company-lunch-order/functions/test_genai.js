const { GoogleGenAI } = require("@google/genai");
try {
  const ai = new GoogleGenAI({ vertexai: true, project: "company-lunch-order", location: "us-central1" });
  console.log("initialized!");
} catch (e) {
  console.error("error:", e.message);
}
