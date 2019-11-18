/**
 * Validate the package.json file to prevent mistakes.
 */
const path = require('path');
const util = require('util');
const packageDotJson = require(path.resolve(__dirname, '../package.json'));
const PJV = require('package-json-validator').PJV;
const options = {
  warnings: true, // show warnings
  recommendations: true // show recommendations
};
let exitCode = 0;
const results = PJV.validate(JSON.stringify(packageDotJson), 'npm', options);
if (results.valid === false) {
  console.log('The package.json contains the following errors: ');
  console.log(util.inspect(results));
  exitCode = 1;
} else {
  console.log('package.json file is valid');
}
process.exit(exitCode);
