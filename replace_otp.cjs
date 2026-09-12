const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [oldText, newText] of replacements) {
        // Using global replace with string or regex if needed
        content = content.split(oldText).join(newText);
    }
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
}

// 1. MyOffers.tsx
replaceInFile('src/pages/customer/MyOffers.tsx', [
    ['Active OTP', 'Active Code'],
    ['title="Copy OTP"', 'title="Copy Code"'],
    ['View OTP', 'View Code']
]);

// 2. OTPGenerated.tsx
replaceInFile('src/pages/customer/OTPGenerated.tsx', [
    ['Your Discount OTP', 'Your Discount Code'],
    ['Show this OTP to the shop owner', 'Show this code to the shop owner'],
    ['Copy OTP', 'Copy Code'],
    ['Do not share this OTP with anyone', 'Do not share this code with anyone'],
    ['OTP Expired', 'Code Expired'],
    ['Generate New OTP', 'Generate New Code']
]);

// 3. Home.tsx
replaceInFile('src/pages/customer/Home.tsx', [
    ['Get OTP', 'Get Code']
]);

// 4. OfferDetails.tsx
replaceInFile('src/pages/customer/OfferDetails.tsx', [
    ['VIEW ACTIVE OTP', 'VIEW ACTIVE CODE']
]);

// 5. VerifyOTP.tsx
replaceInFile('src/pages/shop/VerifyOTP.tsx', [
    ['Please enter a 6-digit OTP', 'Please enter a 6-digit code'],
    ['Invalid or expired OTP', 'Invalid or expired code'],
    ['OTP not found for your shops', 'Code not found for your shops'],
    ['OTP has expired', 'Code has expired'],
    ['Failed to verify OTP', 'Failed to verify code'],
    ['This OTP has already been redeemed or is expired.', 'This code has already been redeemed or is expired.'],
    ['This OTP has expired.', 'This code has expired.'],
    ['Enter Customer OTP', 'Enter Customer Code'],
    ['OTP VALID', 'CODE VALID']
]);

// 6. Dashboard.tsx (Shop)
replaceInFile('src/pages/shop/Dashboard.tsx', [
    ['Verify OTP', 'Verify Code']
]);

// 7. ShopLayout.tsx
replaceInFile('src/components/layout/ShopLayout.tsx', [
    ['Verify OTP', 'Verify Code']
]);

