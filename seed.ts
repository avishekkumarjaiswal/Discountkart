import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

admin.initializeApp({
  projectId: "gen-lang-client-0644295069"
});
const db = getFirestore();
db.settings({ databaseId: 'ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f' });

async function seed() {
  console.log('Starting seed...');

  const shops = [
    {
      shopName: 'ABC Footwear',
      area: 'Kamla Nagar',
      city: 'Delhi',
      status: 'approved',
      subscriptionStatus: 'active',
      ownerId: 'demo-owner-1',
      description: 'Best footwear in town.',
    },
    {
      shopName: 'XYZ Clothing',
      area: 'Kamla Nagar',
      city: 'Delhi',
      status: 'approved',
      subscriptionStatus: 'active',
      ownerId: 'demo-owner-2',
      description: 'Trending fashion.',
    },
    {
      shopName: 'PQR Accessories',
      area: 'Kamla Nagar',
      city: 'Delhi',
      status: 'approved',
      subscriptionStatus: 'active',
      ownerId: 'demo-owner-3',
      description: 'Cool accessories.',
    }
  ];

  for (const shop of shops) {
    const shopRef = db.collection('shops').doc();
    await shopRef.set({
      ...shop,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // Add discount
    await db.collection('discounts').doc().set({
      shopId: shopRef.id,
      categoryId: shop.shopName.includes('Footwear') ? 'Footwear' : (shop.shopName.includes('Clothing') ? 'Fashion' : 'Accessories'),
      title: '20% OFF Everything',
      discountType: 'percentage',
      discountValue: 20,
      minimumPurchase: 1000,
      maximumDiscount: 500,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      active: true,
      createdAt: FieldValue.serverTimestamp()
    });
  }

  console.log('Seeded successfully!');
}

seed().catch(console.error);

