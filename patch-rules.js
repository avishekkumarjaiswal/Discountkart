const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
  "      allow update: if isAdmin() || (isShopOwner(shopId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'subscriptionPlan', 'subscriptionStatus', 'trialStartDate', 'trialEndDate', 'subscriptionStartDate', 'subscriptionEndDate', 'isPromoted']));",
  "      allow update: if isAdmin() || (isShopOwner(shopId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'subscriptionPlan', 'subscriptionStatus', 'trialStartDate', 'trialEndDate', 'subscriptionStartDate', 'subscriptionEndDate', 'isPromoted'])) || (isAuthenticated() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['rating', 'ratingCount']));"
);

const ratingsRule = "\n    match /shop_ratings/{ratingId} {\n      allow read: if true;\n      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;\n      allow update: if isAuthenticated() && request.resource.data.userId == request.auth.uid;\n      allow delete: if isAdmin();\n    }\n";

rules = rules.replace(
  "  }\n}",
  ratingsRule + "  }\n}"
);

fs.writeFileSync('firestore.rules', rules);
