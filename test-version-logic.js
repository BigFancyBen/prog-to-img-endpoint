// Test the extractVersionedValue logic directly

const template = {
    "id1": "2094",
    "id2": "2096", 
    "id3": "2098",
    "id4": "2100",
    "image1": "[[File:Odd cocktail 1.png]]",
    "image2": "[[File:Odd cocktail 2.png]]",
    "image3": "[[File:Odd cocktail 3.png]]",
    "image4": "[[File:Odd cocktail 4.png]]"
};

function extractVersionedValue(template, field, versionNum) {
    const versionedKey = `${field}${versionNum}`
    let value = null
    
    if (template[versionedKey]) {
        value = template[versionedKey]
    } else if (template[field]) {
        // Try without version number as fallback
        value = template[field]
    }
    
    // Special handling for image fields - clean the wiki markup
    if (value && field === 'image') {
        // If it's a File: link in wiki markup, extract just the filename
        const fileMatch = value.match(/\[\[File:([^\]]+)\]\]/)
        if (fileMatch) {
            // Extract filename and remove .png extension
            const filename = fileMatch[1].replace(/\.png$/i, '')
            return filename
        }
    }
    
    return value
}

console.log('🧪 Testing version extraction...');

// Test each version
for (let versionNum = 1; versionNum <= 4; versionNum++) {
    const id = extractVersionedValue(template, 'id', versionNum);
    const image = extractVersionedValue(template, 'image', versionNum);
    console.log(`Version ${versionNum}: ID=${id}, Image=${image}`);
}

// Now test how our current logic works
console.log('\n🔧 Current logic test:');
// Find all version numbers
const versionNumbers = new Set()
for (const key in template) {
    const match = key.match(/^(id|name|version)(\d+)$/i)
    if (match) {
        versionNumbers.add(parseInt(match[2]))
    }
}

console.log('Version numbers found:', Array.from(versionNumbers).sort());

// Extract data for each version
for (const versionNum of Array.from(versionNumbers).sort()) {
    const id = extractVersionedValue(template, 'id', versionNum)
    const image = extractVersionedValue(template, 'image', versionNum)
    console.log(`Processing version ${versionNum}: ID=${id} should get image=${image}`)
}
