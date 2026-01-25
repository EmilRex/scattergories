/**
 * Built-in category lists for Scattergories
 */

// Large pool of categories to randomly select from
const CATEGORY_POOL = [
  // Classic categories
  "A boy's name",
  "A girl's name",
  "Animals",
  "Things that are cold",
  "Things in a kitchen",
  "U.S. cities",
  "Things that are round",
  "Foods",
  "Sports",
  "TV shows",
  "Movies",
  "Occupations",
  "Things at a beach",
  "School subjects",
  "Things in a bathroom",
  "Countries",
  "Things that are sticky",
  "Fruits",
  "Vegetables",
  "Things that fly",

  // More categories
  "Types of drinks",
  "Things at a party",
  "Musical instruments",
  "Clothing items",
  "Things in a bedroom",
  "Celebrities",
  "Cartoon characters",
  "Things that are soft",
  "Things at a zoo",
  "Brand names",
  "Song titles",
  "Book titles",
  "Video games",
  "Things at the mall",
  "Things you recycle",
  "Things in a purse/wallet",
  "Desserts",
  "Things at a wedding",
  "Things in an office",
  "Historical figures",

  // Creative categories
  "Reasons to call in sick",
  "Things you shout",
  "Excuses for being late",
  "Things in a junk drawer",
  "Things that smell bad",
  "Things you're afraid of",
  "Things that bounce",
  "Things that grow",
  "Things in the sky",
  "Things at a concert",
  "Things in a garage",
  "Things you plug in",
  "Things that are hot",
  "Things at a hospital",
  "Things on a pizza",
  "Things in a horror movie",
  "Things you do every day",
  "Things at a farm",
  "Things at an airport",
  "Things in a toolbox",

  // Fun categories
  "Things you hide",
  "Things that make noise",
  "Things that are green",
  "Things that are red",
  "Bad habits",
  "Things in space",
  "Things at a picnic",
  "Things in a forest",
  "Things you collect",
  "Things at a circus",
  "Things in a garden",
  "Things at a restaurant",
  "Things you wear on your head",
  "Things you do at night",
  "Things that come in pairs",
  "Things with wheels",
  "Things that are heavy",
  "Things in a classroom",
  "Things you read",
  "Things at a gym",

  // More creative
  "Nicknames",
  "Things in a haunted house",
  "Things at a carnival",
  "Things you do on vacation",
  "Things at a library",
  "Things that are slippery",
  "Things you wear in summer",
  "Things you wear in winter",
  "Things in the ocean",
  "Things at a campsite",
  "Things in a museum",
  "Things you lose",
  "Things at a birthday party",
  "Things that are blue",
  "Things in a hotel room",
  "Things that melt",
  "Things you do in the morning",
  "Things at a bakery",
  "Things in a castle",
  "Words associated with money",
];

/**
 * Get a random selection of categories
 * @param {number} count - Number of categories to select
 * @returns {string[]} Array of category strings
 */
export function getCategories(count = 12) {
  // Shuffle and pick
  const shuffled = [...CATEGORY_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get all available categories (for testing/debugging)
 */
export function getAllCategories() {
  return [...CATEGORY_POOL];
}

/**
 * Get total number of available categories
 */
export function getCategoryCount() {
  return CATEGORY_POOL.length;
}

export default {
  getCategories,
  getAllCategories,
  getCategoryCount,
};
