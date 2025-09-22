// FINAL CORRECTED VERSION - Creates proper array structure with key/qty objects
// Copy and paste this into console on orders.html page

(async function importInventoryToFirestore() {
  try {
    console.log('Starting Firestore import with correct array structure...');

    // Import Firebase modules
    const { db } = await import('./js/firebase-config.js');
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    console.log('Firebase modules loaded successfully');

    // Inventory data as array of {key, qty} objects (CORRECT FORMAT)
    const inventoryItems = [
      { key: "Jackets|50 Shades|Base|S", qty: 20 },
      { key: "Jackets|50 Shades|Base|M", qty: 30 },
      { key: "Jackets|50 Shades|Base|L", qty: 25 },
      { key: "Jackets|50 Shades|Base|XL", qty: 25 },
      { key: "Jackets|50 Shades|Base|XXL", qty: 15 },
      { key: "Jackets|50 Shades|Base|3XL", qty: 6 },
      { key: "Jackets|Alpine|Brown|XL", qty: 8 },
      { key: "Jackets|Alpine|Charcoal|XL", qty: 7 },
      { key: "Jackets|Arrowtown|Base|M", qty: 12 },
      { key: "Jackets|Arrowtown|Base|XL", qty: 12 },
      { key: "Jackets|Arrowtown|Base|XXL", qty: 12 },
      { key: "Jackets|Arrowtown|Base|3XL", qty: 10 },
      { key: "Jackets|Glacier|Base|S", qty: 6 },
      { key: "Jackets|Glacier|Base|M", qty: 15 },
      { key: "Jackets|Glacier|Base|L", qty: 6 },
      { key: "Jackets|Glacier|Base|XL", qty: 10 },
      { key: "Jackets|Glacier|Base|XXL", qty: 8 },
      { key: "Jackets|Glacier|Base|3XL", qty: 3 },
      { key: "Jackets|Koru|Charcoal|L", qty: 8 },
      { key: "Jackets|Piha|Base|M", qty: 5 },
      { key: "Jackets|Piha|Base|L", qty: 6 },
      { key: "Jackets|Punakaiki|Ocean |XL", qty: 4 },
      { key: "Jackets|Punakaiki|Ocean |XXL", qty: 4 },
      { key: "Jackets|Punakaiki|Ocean |3XL", qty: 4 },
      { key: "Jackets|Punakaiki|Green|L", qty: 8 },
      { key: "Jackets|Punakaiki|Green|XL", qty: 4 },
      { key: "Jackets|Punakaiki|Grey|XL", qty: 4 },
      { key: "Jackets|Punakaiki|Grey|XXL", qty: 4 },
      { key: "Jackets|Punakaiki|Grey|3XL", qty: 4 },
      { key: "Jackets|Punakaiki|New Orange|M", qty: 1 },
      { key: "Jackets|Riverstone|Green|M", qty: 8 },
      { key: "Jackets|Riverstone|Green|L", qty: 8 },
      { key: "Jackets|Riverstone|Green|XL", qty: 5 },
      { key: "Jackets|Riverstone|Green|XXL", qty: 6 },
      { key: "Jackets|Riverstone|Green|3XL", qty: 5 },
      { key: "Jackets|Sherpa|Base|L", qty: 8 },
      { key: "Jackets|Sherpa|Base|XL", qty: 4 },
      { key: "Jackets|Sherpa|Base|XXL", qty: 12 },
      { key: "Jackets|Sherpa|Base|3XL", qty: 4 },
      { key: "Jackets|Te Anau|Oat|M", qty: 8 },
      { key: "Jackets|Te Anau|Oat|L", qty: 10 },
      { key: "Jackets|Te Anau|Oat|XL", qty: 10 },
      { key: "Jackets|Te Anau|Oat|XXL", qty: 8 },
      { key: "Jackets|Te Anau|Oat|3XL", qty: 6 },
      { key: "Jackets|Waiouru |Charcoal|M", qty: 2 },
      { key: "Jackets|Waiouru |Charcoal|XL", qty: 6 },
      { key: "Jackets|Whale Bay|Charcoal|L", qty: 8 },
      { key: "Jackets|Whale Bay|Charcoal|XL", qty: 10 },
      { key: "Jackets|Whale Bay|Charcoal|XXL", qty: 8 },
      { key: "Jackets|Whistler|Oat|M", qty: 6 },
      { key: "Jackets|Whistler|Oat|3XL", qty: 3 },
      { key: "Shawls|Chai|Base|One", qty: 30 },
      { key: "Shawls|Olive|Base|One", qty: 20 },
      { key: "Shawls|Black|Base|One", qty: 20 },
      { key: "Shawls|Forest|Base|One", qty: 20 },
      { key: "Shawls|??Fushia|Base|One", qty: 30 },
      { key: "Shawls|??Grape|Base|One", qty: 30 },
      { key: "Shawls|??Marine|Base|One", qty: 30 },
      { key: "Shawls|??Ocean|Base|One", qty: 30 },
      { key: "Shawls|??Red|Base|One", qty: 30 },
      { key: "Shawls|??Tangelo|Base|One", qty: 30 },
      { key: "Shawls|??Teal|Base|One", qty: 30 },
      { key: "Shawls|Aqua Marine|Base|One", qty: 30 },
      { key: "Rain Jacket|Aqua|Base|M", qty: 10 },
      { key: "Rain Jacket|Aqua|Base|3XL", qty: 6 },
      { key: "Rain Jacket|Navy/Grey|Base|M", qty: 3 },
      { key: "Rain Jacket|Navy/Grey|Base|L", qty: 3 },
      { key: "Rain Jacket|Navy/Grey|Base|XL", qty: 5 },
      { key: "Rain Jacket|Navy/Grey|Base|XXL", qty: 5 },
      { key: "Rain Jacket|Navy/Grey|Base|3XL", qty: 4 },
      { key: "Rain Jacket|Maroon/Grey|Base|M", qty: 5 },
      { key: "Rain Jacket|Maroon/Grey|Base|L", qty: 3 },
      { key: "Rain Jacket|Maroon/Grey|Base|XXL", qty: 6 },
      { key: "Rain Jacket|Green/Grey|Base|M", qty: 3 },
      { key: "Rain Jacket|Green/Grey|Base|L", qty: 3 },
      { key: "Rain Jacket|Green/Grey|Base|XL", qty: 3 },
      { key: "Rain Jacket|Black|Base|M", qty: 8 },
      { key: "Rain Jacket|Black|Base|L", qty: 8 },
      { key: "Rain Jacket|Black|Base|XL", qty: 8 },
      { key: "Rain Jacket|Black|Base|XXL", qty: 8 },
      { key: "Rain Jacket|Black|Base|3XL", qty: 6 },
      { key: "Rain Jacket|Black/Grey|Base|L", qty: 5 },
      { key: "Rain Jacket|Black/Grey|Base|XL", qty: 5 },
      { key: "Rain Jacket|Black/Grey|Base|XXL", qty: 5 },
      { key: "Rain Jacket|Black/Grey|Base|3XL", qty: 5 },
      { key: "Woodville Stitch|Black|Base|M", qty: 10 },
      { key: "Woodville Stitch|Black|Base|L", qty: 5 },
      { key: "Woodville Stitch|Black|Base|XL", qty: 5 },
      { key: "Woodville Stitch|Forest Green|Base|L", qty: 10 },
      { key: "Woodville Stitch|Forest Green|Base|XL", qty: 10 },
      { key: "Woodville Stitch|Forest Green|Base|XXL", qty: 10 },
      { key: "Station|Charcoal|Base|XL", qty: 10 },
      { key: "Station|Char/Grey|Base|XL", qty: 8 },
      { key: "Station|Natural Brown|Base|XXL", qty: 6 },
      { key: "Station|Natural Brown|Base|3XL", qty: 6 },
      { key: "Station|Dark Natural Brown|Base|M", qty: 10 },
      { key: "Station|Dark Natural Brown|Base|L", qty: 10 },
      { key: "Station|Dark Natural Brown|Base|XL", qty: 10 },
      { key: "Station|Dark Natural Brown|Base|XXL", qty: 8 },
      { key: "Station|Brown Mix|Base|M", qty: 6 },
      { key: "Station|Brown Mix|Base|L", qty: 8 },
      { key: "Coastal|Black|Base|M", qty: 6 },
      { key: "Coastal|Black|Base|L", qty: 10 },
      { key: "Coastal|Black|Base|XL", qty: 10 },
      { key: "Coastal|Black|Base|XXL", qty: 10 },
      { key: "Coastal|Grey|Base|M", qty: 15 },
      { key: "Coastal|Grey|Base|L", qty: 10 },
      { key: "Coastal|Grey|Base|XL", qty: 5 },
      { key: "Coastal|Charcoal|Base|M", qty: 10 },
      { key: "Coastal|Charcoal|Base|L", qty: 20 },
      { key: "Coastal|Charcoal|Base|XL", qty: 20 },
      { key: "Coastal|Charcoal|Base|XXL", qty: 5 },
      { key: "Coastal|Denim|Base|M", qty: 5 },
      { key: "Coastal|Denim|Base|L", qty: 10 },
      { key: "Coastal|Denim|Base|XL", qty: 20 },
      { key: "Coastal|Denim|Base|XXL", qty: 10 },
      { key: "Coastal|Denim|Base|3XL", qty: 10 },
      { key: "Coastal|Orange|Base|XL", qty: 10 },
      { key: "Coastal|Orange|Base|XXL", qty: 6 },
      { key: "Coastal|Orange|Base|3XL", qty: 6 },
      { key: "Coastal|Dark Natural Brown|Base|M", qty: 10 },
      { key: "Coastal|Dark Natural Brown|Base|L", qty: 15 },
      { key: "Coastal|Dark Natural Brown|Base|XL", qty: 10 },
      { key: "Coastal|Forest|Base|XXL", qty: 5 },
      { key: "Coastal|Forest|Base|3XL", qty: 5 },
      { key: "Coastal|Olive|Base|S", qty: 8 },
      { key: "Coastal|Olive|Base|M", qty: 8 },
      { key: "Coastal|Olive|Base|L", qty: 8 },
      { key: "Coastal|Olive|Base|XL", qty: 8 },
      { key: "Coastal|Olive|Base|XXL", qty: 6 },
      { key: "Weekender|Charcoal|Base|M", qty: 15 },
      { key: "Weekender|Charcoal|Base|L", qty: 15 },
      { key: "Weekender|Charcoal|Base|XXL", qty: 5 },
      { key: "Weekender|Dark Brown|Base|S", qty: 10 },
      { key: "Weekender|Dark Brown|Base|M", qty: 15 },
      { key: "Weekender|Dark Brown|Base|L", qty: 15 },
      { key: "Weekender|Dark Brown|Base|XXL", qty: 10 },
      { key: "Weekender|Petrol|Base|S", qty: 15 },
      { key: "Weekender|Petrol|Base|M", qty: 20 },
      { key: "Weekender|Petrol|Base|L", qty: 20 },
      { key: "Weekender|Petrol|Base|XL", qty: 20 },
      { key: "Weekender|Petrol|Base|XXL", qty: 15 },
      { key: "Weekender|50 Shades|Base|S", qty: 5 },
      { key: "Weekender|50 Shades|Base|M", qty: 15 },
      { key: "Weekender|50 Shades|Base|L", qty: 15 },
      { key: "Weekender|50 Shades|Base|XL", qty: 10 },
      { key: "Weekender|50 Shades|Base|XXL", qty: 10 },
      { key: "Weekender|Black|Base|M", qty: 5 },
      { key: "Weekender|Black|Base|L", qty: 10 },
      { key: "Weekender|Black|Base|XL", qty: 4 },
      { key: "Weekender|Burnt Orange|Base|M", qty: 1 },
      { key: "Weekender|Burnt Orange|Base|L", qty: 1 },
      { key: "Kids Jacket|Carnival|Multi|S", qty: 2 },
      { key: "Kids Jacket|Carnival|Multi|M", qty: 6 },
      { key: "Kids Jacket|Carnival|Multi|L", qty: 6 },
      { key: "Kids Jacket|Carnival|Multi|XL", qty: 6 },
      { key: "Kids Jacket|Carnival|Multi|XXL", qty: 6 },
      { key: "Kids Jacket|Whale Bay|Charcoal|S", qty: 8 },
      { key: "Kids Jacket|Whale Bay|Charcoal|M", qty: 8 },
      { key: "Kids Jacket|Whale Bay|Charcoal|L", qty: 8 },
      { key: "Kids Jacket|Whale Bay|Charcoal|XL", qty: 8 },
      { key: "Kids Jacket|Whale Bay|Charcoal|XXL", qty: 8 },
      { key: "Kids Jacket|Whale Bay|Charcoal|3XL", qty: 6 },
      { key: "Kids Jacket|Wave Rider|Blue|S", qty: 6 },
      { key: "Kids Jacket|Wave Rider|Blue|M", qty: 8 },
      { key: "Kids Jacket|Wave Rider|Blue|L", qty: 8 },
      { key: "Kids Jacket|Wave Rider|Blue|XL", qty: 8 },
      { key: "Kids Jacket|Wave Rider|Blue|XXL", qty: 6 },
      { key: "Kids Jacket|Wave Rider|Blue|3XL", qty: 6 },
      { key: "Kids Jacket|Lollipop|Mixed|S", qty: 8 },
      { key: "Kids Jacket|Lollipop|Mixed|M", qty: 8 },
      { key: "Kids Jacket|Lollipop|Mixed|L", qty: 6 },
      { key: "Kids Jacket|Lollipop|Mixed|XL", qty: 6 },
      { key: "Kids Jacket|Lollipop|Mixed|XXL", qty: 4 },
      { key: "Kids Jacket|Wave Rider|Orange|S", qty: 4 },
      { key: "Kids Jacket|Wave Rider|Orange|M", qty: 6 },
      { key: "Kids Jacket|Wave Rider|Orange|L", qty: 6 },
      { key: "Kids Jacket|Wave Rider|Orange|XL", qty: 6 },
      { key: "Kids Jacket|Wave Rider|Orange|XXL", qty: 6 },
      { key: "Kids Jacket|Wave Rider|Orange|3XL", qty: 4 },
      { key: "Kids Jacket|Wave Rider|New Green|S", qty: 4 },
      { key: "Kids Jacket|Wave Rider|New Green|M", qty: 6 },
      { key: "Kids Jacket|Wave Rider|New Green|L", qty: 6 },
      { key: "Kids Jacket|Wave Rider|New Green|XL", qty: 6 },
      { key: "Kids Jacket|Wave Rider|New Green|XXL", qty: 6 },
      { key: "Kids Jacket|Wave Rider|New Green|3XL", qty: 4 },
      { key: "Kids Jacket|Woodville Stitch|Grey|S", qty: 6 },
      { key: "Kids Jacket|Woodville Stitch|Grey|M", qty: 8 },
      { key: "Kids Jacket|Woodville Stitch|Grey|L", qty: 8 },
      { key: "Kids Jacket|Woodville Stitch|Grey|XL", qty: 8 },
      { key: "Kids Jacket|Woodville Stitch|Grey|XXL", qty: 8 },
      { key: "Kids Jacket|Woodville Stitch|Grey|3XL", qty: 6 },
      { key: "Kids Jacket|Woodville Stitch|Blue|S", qty: 4 },
      { key: "Kids Jacket|Woodville Stitch|Orange|M", qty: 6 },
      { key: "Kids Jacket|Woodville Stitch|Orange|L", qty: 6 },
      { key: "Kids Jacket|Woodville Stitch|Orange|XL", qty: 6 },
      { key: "Kids Jacket|Woodville Stitch|Orange|XXL", qty: 6 },
      { key: "Kids Jacket|Woodville Stitch|Orange|3XL", qty: 4 },
      { key: "Vest|Charcoal|Base|S", qty: 4 },
      { key: "Vest|Charcoal|Base|M", qty: 8 },
      { key: "Vest|Charcoal|Base|L", qty: 10 },
      { key: "Vest|Charcoal|Base|XL", qty: 10 },
      { key: "Vest|Charcoal|Base|XXL", qty: 8 },
      { key: "Vest|Charcoal|Base|3XL", qty: 6 },
      { key: "Vest|Navy|Base|S", qty: 4 },
      { key: "Vest|Navy|Base|M", qty: 8 },
      { key: "Vest|Navy|Base|L", qty: 10 },
      { key: "Vest|Navy|Base|XL", qty: 10 },
      { key: "Vest|Navy|Base|XXL", qty: 8 },
      { key: "Vest|Navy|Base|3XL", qty: 6 },
      { key: "Vest|Black|Base|S", qty: 4 },
      { key: "Vest|Black|Base|M", qty: 8 },
      { key: "Vest|Black|Base|L", qty: 10 },
      { key: "Vest|Black|Base|XL", qty: 10 },
      { key: "Vest|Black|Base|XXL", qty: 8 },
      { key: "Vest|Black|Base|3XL", qty: 6 },
      { key: "Vest|Forest|Base|S", qty: 4 },
      { key: "Vest|Forest|Base|M", qty: 8 },
      { key: "Vest|Forest|Base|L", qty: 10 },
      { key: "Vest|Forest|Base|XL", qty: 10 },
      { key: "Vest|Forest|Base|XXL", qty: 8 },
      { key: "Vest|Forest|Base|3XL", qty: 6 },
      { key: "House Socks|Arrowtown|Base|S/M", qty: 8 },
      { key: "House Socks|Marshmallow|Base|S/M", qty: 8 },
      { key: "House Socks|Nature|Base|S/M", qty: 8 },
      { key: "House Socks|Nordic|Base|S/M", qty: 8 },
      { key: "House Socks|Alpine|Base|L", qty: 6 },
      { key: "House Socks|Arrowtown|Base|L", qty: 8 },
      { key: "House Socks|Nature|Base|L", qty: 8 },
      { key: "House Socks|Nordic|Base|L", qty: 8 }
    ];

    // Calculate total
    const totalItems = inventoryItems.reduce((sum, item) => sum + item.qty, 0);

    // Create ship date (today's date in YYYY-MM-DD format)
    const today = new Date();
    const shipDate = today.toISOString().split('T')[0];

    // Create the order document with ARRAY structure
    const orderDoc = {
      history: [],
      items: inventoryItems, // Array of {key, qty} objects - CORRECT FORMAT
      meta: {
        name: "Inventory Upload - Full Stock",
        orderDate: today.toISOString(),
        shipDate: shipDate,
        shipMethod: "AIR"
      },
      status: "draft",
      timestamps: {
        created: serverTimestamp(),
        updated: serverTimestamp()
      },
      total: totalItems
    };

    console.log('Order document prepared with correct array structure:', {
      totalItems: totalItems,
      uniqueProducts: inventoryItems.length,
      status: 'draft',
      sampleItem: inventoryItems[0]
    });

    // Add to Firestore
    console.log('Uploading to Firestore...');
    const docRef = await addDoc(collection(db, 'orders'), orderDoc);
    
    console.log('SUCCESS! Order imported to Firestore with correct format');
    console.log('Document ID:', docRef.id);
    console.log('Summary:');
    console.log('   - Total items: ' + totalItems);
    console.log('   - Unique products: ' + inventoryItems.length);
    console.log('   - Status: draft');
    console.log('   - Format: Array of {key, qty} objects');

    return {
      success: true,
      docId: docRef.id,
      totalItems: totalItems,
      uniqueProducts: inventoryItems.length
    };

  } catch (error) {
    console.error('Import failed:', error);
    console.log('Troubleshooting:');
    console.log('   1. Make sure you are on the orders.html page');
    console.log('   2. Check Firestore permissions');
    console.log('   3. Verify internet connection');
    return { success: false, error: error.message };
  }
})();