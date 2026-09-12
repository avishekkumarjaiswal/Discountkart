const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const adminApp = admin.initializeApp({
  projectId: "gen-lang-client-0644295069"
});
const db = getFirestore(adminApp, 'ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f');

async function test() {
  try {
    console.log("Fetching shops...");
    await db.collection("shops").get();
    
    console.log("Fetching users...");
    await db.collection("users").where("role", "==", "customer").get();
    
    console.log("Fetching redemptions...");
    await db.collection("redemptions").where("status", "==", "redeemed").get();
    
    console.log("Fetching paymentRequests...");
    await db.collection("paymentRequests").where("status", "==", "pending").get();
    
    console.log("Fetching analyticsEvents...");
    await db.collection("analyticsEvents").where("eventType", "==", "offer_claim").get();
    
    console.log("All success!");
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
