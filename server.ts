import fs from 'fs';
import express from 'express';
import cors from 'cors';

import path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';

import { createRequire } from 'module';
const customRequire = typeof require !== 'undefined' ? require : createRequire(import.meta.url);
const { initializeApp: initWebApp } = customRequire('firebase/app');
const { getFirestore: getWebFirestore, collection: webCol, getDocs: webGetDocs, query: webQuery, where: webWhere } = customRequire('firebase/firestore');

const firebaseConfig = {
  projectId: "gen-lang-client-0644295069",
  appId: "1:398668682192:web:1f453f58c69af99333dfd5",
  apiKey: "AIzaSyC-8qChxglcMAidF-cQe8ZOro6CU-1kfpU",
  authDomain: "gen-lang-client-0644295069.firebaseapp.com",
  storageBucket: "gen-lang-client-0644295069.firebasestorage.app",
  messagingSenderId: "398668682192"
};

const webApp = initWebApp(firebaseConfig);
const webDb = getWebFirestore(webApp, "ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f");


// Initialize Firebase Admin
const adminApp = admin.initializeApp({
  projectId: "gen-lang-client-0644295069"
});
const db = getFirestore(adminApp, 'ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Headers Middleware (OWASP Standard)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Simple In-Memory Rate Limiter (Prevents DDoS and Brute Force)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
app.use((req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 120; // 120 requests per min per IP

  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);

  if (record.count > maxRequests) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Middleware to verify Firebase Auth token
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth(adminApp).verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generate OTP
app.post('/api/redemptions/generate', authenticate, async (req, res) => {
  try {
    const { discountId } = req.body;
    const uid = (req as any).user.uid;

    if (!discountId) {
       res.status(400).json({ error: 'Discount ID is required' });
       return;
    }

    // Check discount validity
    const discountRef = db.collection('discounts').doc(discountId);
    const discountDoc = await discountRef.get();

    if (!discountDoc.exists) {
       res.status(404).json({ error: 'Discount not found' });
       return;
    }

    const discount = discountDoc.data()!;
    if (!discount.active) {
       res.status(400).json({ error: 'Discount is not active' });
       return;
    }

    // For MVP: Check if user already has an active or redeemed redemption for this discount
    const existingRedemptions = await db.collection('redemptions')
      .where('userId', '==', uid)
      .where('discountId', '==', discountId)
      .get();
      
    const hasValidRedemption = existingRedemptions.docs.some(doc => {
      const status = doc.data().status;
      return status === 'active' || status === 'redeemed';
    });

    if (hasValidRedemption) {
       res.status(400).json({ error: 'You already have an offer for this discount.' });
       return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newRedemptionRef = db.collection('redemptions').doc();
    await newRedemptionRef.set({
      userId: uid,
      shopId: discount.shopId,
      discountId: discountId,
      otp: otp, // In a real prod environment we might hash this, but MVP plaintext is ok for matching
      status: 'active',
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: FieldValue.serverTimestamp()
    });

    res.json({ redemptionId: newRedemptionRef.id, otp, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('Error generating OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
app.post('/api/redemptions/verify', authenticate, async (req, res) => {
  try {
    const { otp } = req.body;
    const uid = (req as any).user.uid;

    if (!otp) {
       res.status(400).json({ error: 'OTP is required' });
       return;
    }

    // Find active redemption with this OTP
    const redemptionsSnapshot = await db.collection('redemptions')
      .where('otp', '==', String(otp))
      .where('status', '==', 'active')
      .get();

    if (redemptionsSnapshot.empty) {
       res.status(404).json({ error: 'Invalid or expired OTP' });
       return;
    }

    // Note: since OTP is 6 digits, there could be collisions globally, 
    // so we filter by shopId belonging to the current user
    let validDoc = null;
    for (const doc of redemptionsSnapshot.docs) {
      const data = doc.data();
      // Verify shop ownership
      const shopDoc = await db.collection('shops').doc(data.shopId).get();
      if (shopDoc.exists && shopDoc.data()?.ownerId === uid) {
        validDoc = doc;
        break;
      }
    }

    if (!validDoc) {
       res.status(404).json({ error: 'OTP not found for your shops' });
       return;
    }

    const data = validDoc.data();
    if (data.expiresAt.toDate() < new Date()) {
      await validDoc.ref.update({ status: 'expired' });
       res.status(400).json({ error: 'OTP has expired' });
       return;
    }

    // Fetch discount details for the shop
    const discountDoc = await db.collection('discounts').doc(data.discountId).get();
    
    res.json({
      redemptionId: validDoc.id,
      userId: data.userId,
      discount: discountDoc.exists ? discountDoc.data() : null
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redeem Discount
app.post('/api/redemptions/redeem', authenticate, async (req, res) => {
  try {
    const { redemptionId } = req.body;
    const uid = (req as any).user.uid;

    if (!redemptionId) {
       res.status(400).json({ error: 'Redemption ID is required' });
       return;
    }

    const redemptionRef = db.collection('redemptions').doc(redemptionId);
    
    const transactionResult = await db.runTransaction(async (t) => {
      const doc = await t.get(redemptionRef);
      if (!doc.exists) {
        throw new Error('Redemption not found');
      }

      const data = doc.data()!;
      if (data.status !== 'active') {
        throw new Error(`Redemption is ${data.status}`);
      }

      if (data.expiresAt.toDate() < new Date()) {
        t.update(redemptionRef, { status: 'expired' });
        throw new Error('OTP has expired');
      }

      // Verify shop ownership
      const shopDoc = await t.get(db.collection('shops').doc(data.shopId));
      if (!shopDoc.exists || shopDoc.data()?.ownerId !== uid) {
        throw new Error('Unauthorized');
      }

      const transactionId = 'DM-' + crypto.randomBytes(4).toString('hex').toUpperCase();

      t.update(redemptionRef, {
        status: 'redeemed',
        redeemedAt: FieldValue.serverTimestamp(),
        transactionId
      });

      return transactionId;
    });

    res.json({ success: true, transactionId: transactionResult });

  } catch (error: any) {
    console.error('Error redeeming:', error);
    res.status(400).json({ error: error.message });
  }
});


// Basic In-Memory Search Cache for MVP
let searchCache = {
  shops: [],
  products: [],
  discounts: [],
  lastFetch: 0
};

function editDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isFuzzyMatch(target: string | undefined, query: string): boolean {
  if (!target) return false;
  const t = target.toLowerCase();
  const q = query.toLowerCase();

  if (t.includes(q)) return true;

  const words = t.split(/[\s,.-]+/);
  for (const word of words) {
    if (!word) continue;
    if (word.startsWith(q)) return true;
    if (q.length >= 4) {
      const maxDistance = q.length > 6 ? 2 : 1;
      if (Math.abs(word.length - q.length) <= maxDistance && editDistance(word, q) <= maxDistance) return true;
    }
  }
  return false;
}

app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q?.toString().trim().toLowerCase();
    if (!q) {
      res.setHeader('Cache-Control', 'public, max-age=120');
      res.json([]);
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

    const now = Date.now();
    if (now - searchCache.lastFetch > 5 * 60 * 1000) {
      console.log('Refreshing high-performance search cache from Firestore...');
      const [shopsSnap, productsSnap, discountsSnap] = await Promise.all([
        webGetDocs(webQuery(webCol(webDb, 'shops'), webWhere('status', '==', 'approved'))),
        webGetDocs(webCol(webDb, 'products')),
        webGetDocs(webCol(webDb, 'discounts'))
      ]);
      
      searchCache.shops = shopsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      searchCache.products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      searchCache.discounts = discountsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      searchCache.lastFetch = now;
    }

    const matchingShopIds = new Map<string, string>();
    
    for (const p of searchCache.products) {
      if (isFuzzyMatch(p.name, q) && p.shopId) {
        if (!matchingShopIds.has(p.shopId)) {
          matchingShopIds.set(p.shopId, 'Product: ' + p.name);
        }
      }
    }
    
    for (const d of searchCache.discounts) {
      if (isFuzzyMatch(d.title, q) && d.shopId) {
        if (!matchingShopIds.has(d.shopId)) {
          matchingShopIds.set(d.shopId, 'Offer: ' + d.title);
        }
      }
    }

    const results = [];
    for (const shop of searchCache.shops) {
      const matchName = isFuzzyMatch(shop.shopName, q);
      const matchCategory = isFuzzyMatch(shop.category, q);
      const matchArea = isFuzzyMatch(shop.area, q);
      const itemMatchReason = matchingShopIds.get(shop.id);
      
      if (matchName || matchCategory || matchArea || itemMatchReason) {
        results.push({
          id: shop.id,
          shopName: shop.shopName,
          category: shop.category,
          area: shop.area,
          city: shop.city,
          address: shop.address,
          phone: shop.phone,
          openingTime: shop.openingTime,
          closingTime: shop.closingTime,
          coverImageUrl: shop.coverImageUrl || shop.coverImage || shop.image,
          rating: shop.rating,
          ratingCount: shop.ratingCount || shop.reviewCount,
          isMatch: true,
          matchReason: matchName ? null : (matchCategory ? 'Category: ' + shop.category : (matchArea ? 'Area: ' + shop.area : itemMatchReason))
        });
      }
      
      if (results.length >= 25) break;
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Vite Middleware & Static handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      const altPort = Number(PORT) + 1;
      console.log(`Port ${PORT} in use, falling back to ${altPort}...`);
      app.listen(altPort, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${altPort}`);
      });
    } else {
      console.error(e);
    }
  });
}

startServer();
