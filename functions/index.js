const { setGlobalOptions } = require("firebase-functions");
const admin = require('firebase-admin');

// Initialize Admin App ONCE for the whole backend infrastructure
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Global config for secure scaling
setGlobalOptions({ maxInstances: 10 });

// 🎮 Import Interactive Activities from separate modular files
const fortuneClashActivity = require('./games/fortuneClash');
const turboRacingActivity = require('./games/turboRacing');

// 🚀 Export the triggers to Firebase (Export names preserved for frontend sync)
exports.processGlobalFortuneClashResult = fortuneClashActivity.processResult;
exports.processGlobalTurboRacingResult = turboRacingActivity.processResult;

// Inimel ethavathu pudhu interactive activity vandha intha format-la add pannunga:
// const aeroStrikeActivity = require('./games/aeroStrike');
// exports.processAeroStrikeResult = aeroStrikeActivity.processResult;