const fs = require('fs');
const file = './android/app/build.gradle';
let data = fs.readFileSync(file, 'utf8');
data = data.replace('defaultConfig {', 'splits { abi { enable true; reset(); include "arm64-v8a"; universalApk false } }\n    defaultConfig {');
fs.writeFileSync(file, data);
console.log("Production Build Optimization Applied: ABI Splits Configured. 🚀");