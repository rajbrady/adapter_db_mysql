/* @copyright Itential, LLC 2019 (pre-modifications) */

// Set globals
/* global describe it log pronghornProps */
/* eslint global-require:warn */
/* eslint no-unused-vars: warn */

// include required items for testing & logging
const assert = require('assert');
const fs = require('fs-extra');
const mocha = require('mocha');
const path = require('path');
const util = require('util');
const winston = require('winston');
const execute = require('child_process').execSync;
const { expect } = require('chai');
const { use } = require('chai');
const td = require('testdouble');

const anything = td.matchers.anything();

// stub and attemptTimeout are used throughout the code so set them here
let logLevel = 'none';
const stub = true;
const isRapidFail = false;
const attemptTimeout = 120000;

// these variables can be changed to run in integrated mode so easier to set them here
// always check these in with bogus data!!!
const host = 'replace.hostorip.here';
const username = 'username';
const password = 'password';
const port = 80;
const sslenable = false;
const sslinvalid = false;

// these are the adapter properties. You generally should not need to alter
// any of these after they are initially set up
global.pronghornProps = {
  pathProps: {
    encrypted: false
  },
  adapterProps: {
    adapters: [{
      id: 'Test-db_mongo',
      type: 'DBMongo',
      properties: {
        db: 'mydatabase',
        url: 'myurl',
        host,
        port,
        credentials: {
          dbAuth: 'request_token',
          user: username,
          passwd: password
        },
        ssl: {
          enabled: sslenable,
          acceptInvalidCerts: sslinvalid,
          sslCA: '',
          checkServerIdentity: false
        },
        replSet: {
          enabled: false
        }
      }
    }]
  }
};

global.$HOME = `${__dirname}/../..`;

// set the log levels that Pronghorn uses, spam and trace are not defaulted in so without
// this you may error on log.trace calls.
const myCustomLevels = {
  levels: {
    spam: 6,
    trace: 5,
    debug: 4,
    info: 3,
    warn: 2,
    error: 1,
    none: 0
  }
};

// need to see if there is a log level passed in
process.argv.forEach((val) => {
  // is there a log level defined to be passed in?
  if (val.indexOf('--LOG') === 0) {
    // get the desired log level
    const inputVal = val.split('=')[1];

    // validate the log level is supported, if so set it
    if (Object.hasOwnProperty.call(myCustomLevels.levels, inputVal)) {
      logLevel = inputVal;
    }
  }
});

// need to set global logging
global.log = new (winston.Logger)({
  level: logLevel,
  levels: myCustomLevels.levels,
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Runs the error asserts for the test
 */
function runErrorAsserts(data, error, code, origin, displayStr) {
  assert.equal(null, data);
  assert.notEqual(undefined, error);
  assert.notEqual(null, error);
  assert.notEqual(undefined, error.IAPerror);
  assert.notEqual(null, error.IAPerror);
  assert.notEqual(undefined, error.IAPerror.displayString);
  assert.notEqual(null, error.IAPerror.displayString);
  assert.equal(code, error.icode);
  assert.equal(origin, error.IAPerror.origin);
  assert.equal(displayStr, error.IAPerror.displayString);
}


// require the adapter that we are going to be using
const Mongo = require('../../adapter.js');

// delete the .DS_Store directory in entities -- otherwise this will cause errors
const dirPath = path.join(__dirname, '../../entities/.DS_Store');
if (fs.existsSync(dirPath)) {
  try {
    fs.removeSync(dirPath);
    console.log('.DS_Store deleted');
  } catch (e) {
    console.log('Error when deleting .DS_Store:', e);
  }
}

// begin the testing - these should be pretty well defined between the describe and the it!
describe('[unit] Mongo Adapter Test', () => {
  describe('Mongo Class Tests', () => {
    const a = new Mongo(
      pronghornProps.adapterProps.adapters[0].id,
      pronghornProps.adapterProps.adapters[0].properties
    );

    if (isRapidFail) {
      const state = {};
      state.passed = true;

      mocha.afterEach(function x() {
        state.passed = state.passed
        && (this.currentTest.state === 'passed');
      });
      mocha.beforeEach(function x() {
        if (!state.passed) {
          return this.currentTest.skip();
        }
        return true;
      });
    }

    describe('#class instance created', () => {
      it('should be a class with properties', (done) => {
        assert.notEqual(null, a);
        assert.notEqual(undefined, a);
        const check = global.pronghornProps.adapterProps.adapters[0].id;
        assert.equal(check, a.id);
        done();
      }).timeout(attemptTimeout);
    });

    let wffunctions = [];
    describe('#getWorkflowFunctions', () => {
      it('should retrieve workflow functions', (done) => {
        wffunctions = a.getWorkflowFunctions();
        assert.notEqual(0, wffunctions.length);
        done();
      }).timeout(attemptTimeout);
    });

    describe('package.json', () => {
      it('should have a package.json', (done) => {
        fs.exists('package.json', (val) => {
          assert.equal(true, val);
          done();
        });
      });
      it('package.json should be validated', (done) => {
        const packageDotJson = require('../../package.json');
        const { PJV } = require('package-json-validator');
        const options = {
          warnings: true, // show warnings
          recommendations: true // show recommendations
        };
        const results = PJV.validate(JSON.stringify(packageDotJson), 'npm', options);

        if (results.valid === false) {
          log.error('The package.json contains the following errors: ');
          log.error(util.inspect(results));
          assert.equal(true, results.valid);
        } else {
          assert.equal(true, results.valid);
        }

        done();
      });
      it('package.json should be customized', (done) => {
        const packageDotJson = require('../../package.json');
        assert.notEqual(-1, packageDotJson.name.indexOf('db_mongo'));
        assert.notEqual(undefined, packageDotJson.version);
        assert.notEqual(null, packageDotJson.version);
        assert.notEqual('', packageDotJson.version);
        done();
      });
    });

    describe('pronghorn.json', () => {
      it('should have a pronghorn.json', (done) => {
        fs.exists('pronghorn.json', (val) => {
          assert.equal(true, val);
          done();
        });
      });
      it('pronghorn.json should be customized', (done) => {
        const pronghornDotJson = require('../../pronghorn.json');
        assert.notEqual(-1, pronghornDotJson.id.indexOf('db_mongo'));
        assert.equal('DBMongo', pronghornDotJson.export);
        assert.equal('DBMongo', pronghornDotJson.displayName);
        assert.equal('DBMongo', pronghornDotJson.title);
        done();
      });
      it('pronghorn.json should only expose workflow functions', (done) => {
        const pronghornDotJson = require('../../pronghorn.json');

        for (let m = 0; m < pronghornDotJson.methods.length; m += 1) {
          let found = false;
          let paramissue = false;

          for (let w = 0; w < wffunctions.length; w += 1) {
            if (pronghornDotJson.methods[m].name === wffunctions[w]) {
              found = true;
              const methLine = execute(`grep "${wffunctions[w]}(" adapter.js | grep "callback) {"`).toString();
              let wfparams = [];

              if (methLine.indexOf('(') >= 0 && methLine.indexOf(')') >= 0) {
                const temp = methLine.substring(methLine.indexOf('(') + 1, methLine.indexOf(')'));
                wfparams = temp.split(',');

                for (let t = 0; t < wfparams.length; t += 1) {
                  // remove default value from the parameter name
                  wfparams[t] = wfparams[t].substring(0, wfparams[t].search(/=/) > 0 ? wfparams[t].search(/#|\?|=/) : wfparams[t].length);
                  // remove spaces
                  wfparams[t] = wfparams[t].trim();

                  if (wfparams[t] === 'callback') {
                    wfparams.splice(t, 1);
                  }
                }
              }

              // if there are inputs defined but not on the method line
              if (wfparams.length === 0 && (pronghornDotJson.methods[m].input
                  && pronghornDotJson.methods[m].input.length > 0)) {
                paramissue = true;
              } else if (wfparams.length > 0 && (!pronghornDotJson.methods[m].input
                  || pronghornDotJson.methods[m].input.length === 0)) {
                // if there are no inputs defined but there are on the method line
                paramissue = true;
              } else {
                for (let p = 0; p < pronghornDotJson.methods[m].input.length; p += 1) {
                  let pfound = false;
                  for (let wfp = 0; wfp < wfparams.length; wfp += 1) {
                    if (pronghornDotJson.methods[m].input[p].name.toUpperCase() === wfparams[wfp].toUpperCase()) {
                      pfound = true;
                    }
                  }

                  if (!pfound) {
                    paramissue = true;
                  }
                }
                for (let wfp = 0; wfp < wfparams.length; wfp += 1) {
                  let pfound = false;
                  for (let p = 0; p < pronghornDotJson.methods[m].input.length; p += 1) {
                    if (pronghornDotJson.methods[m].input[p].name.toUpperCase() === wfparams[wfp].toUpperCase()) {
                      pfound = true;
                    }
                  }

                  if (!pfound) {
                    paramissue = true;
                  }
                }
              }

              break;
            }
          }

          if (!found) {
            // this is the reason to go through both loops - log which ones are not found so
            // they can be worked
            log.error(`${pronghornDotJson.methods[m].name} not found in workflow functions`);
          }
          if (paramissue) {
            // this is the reason to go through both loops - log which ones are not found so
            // they can be worked
            log.error(`${pronghornDotJson.methods[m].name} has a parameter mismatch`);
          }
          assert.equal(true, found);
          assert.equal(false, paramissue);
        }
        done();
      }).timeout(attemptTimeout);
      it('pronghorn.json should expose all workflow functions', (done) => {
        const pronghornDotJson = require('../../pronghorn.json');
        for (let w = 0; w < wffunctions.length; w += 1) {
          let found = false;

          for (let m = 0; m < pronghornDotJson.methods.length; m += 1) {
            if (pronghornDotJson.methods[m].name === wffunctions[w]) {
              found = true;
              break;
            }
          }

          if (!found) {
            // this is the reason to go through both loops - log which ones are not found so
            // they can be worked
            log.error(`${wffunctions[w]} not found in pronghorn.json`);
          }
          assert.equal(true, found);
        }
        done();
      });
    });

    describe('propertiesSchema.json', () => {
      it('should have a propertiesSchema.json', (done) => {
        fs.exists('propertiesSchema.json', (val) => {
          assert.equal(true, val);
          done();
        });
      });
      it('propertiesSchema.json should be customized', (done) => {
        const propertiesDotJson = require('../../propertiesSchema.json');
        assert.equal('adapter-db_mongo', propertiesDotJson.$id);
        done();
      });
    });

    describe('error.json', () => {
      it('should have an error.json', (done) => {
        fs.exists('error.json', (val) => {
          assert.equal(true, val);
          done();
        });
      });
    });

    describe('README.md', () => {
      it('should have a README', (done) => {
        fs.exists('README.md', (val) => {
          assert.equal(true, val);
          done();
        });
      });
      it('README.md should be customized', (done) => {
        fs.readFile('README.md', 'utf8', (err, data) => {
          assert.equal(-1, data.indexOf('[System]'));
          assert.equal(-1, data.indexOf('[system]'));
          assert.equal(-1, data.indexOf('[version]'));
          assert.equal(-1, data.indexOf('[namespace]'));
          done();
        });
      });
    });

    describe('#connect', () => {
      it('should have a connect function', (done) => {
        assert.equal(true, typeof a.connect === 'function');
        done();
      });
    });

    describe('#healthCheck', () => {
      it('should have a healthCheck function', (done) => {
        assert.equal(true, typeof a.healthCheck === 'function');
        done();
      });
    });

    /*
    -----------------------------------------------------------------------
    -----------------------------------------------------------------------
    *** All code above this comment will be replaced during a migration ***
    ******************* DO NOT REMOVE THIS COMMENT BLOCK ******************
    -----------------------------------------------------------------------
    -----------------------------------------------------------------------
    */

    describe('#create - errors', () => {
      it('should have a create function', (done) => {
        assert.equal(true, typeof a.create === 'function');
        done();
      });
      it('should error on create - no collection', (done) => {
        try {
          a.create(null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-create', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on create - no data', (done) => {
        try {
          a.create('fake', null, (data, error) => {
            try {
              const displayE = 'data is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-create', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#createMany - errors', () => {
      it('should have a createMany function', (done) => {
        assert.equal(true, typeof a.createMany === 'function');
        done();
      });
      it('should error on createMany - no collection', (done) => {
        try {
          a.createMany(null, null, false, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-createMany', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on createMany - no data', (done) => {
        try {
          a.createMany('fake', null, false, null, (data, error) => {
            try {
              const displayE = 'data is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-createMany', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on createMany - data not array', (done) => {
        try {
          a.createMany('fake', 'fake', false, null, (data, error) => {
            try {
              const displayE = 'Invalid data format - data must be an array';
              runErrorAsserts(data, error, 'AD.999', 'Test-db_mongo-adapter-createMany', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#query - errors', () => {
      it('should have a query function', (done) => {
        assert.equal(true, typeof a.query === 'function');
        done();
      });
      it('should error on query - no queryDoc', (done) => {
        try {
          a.query(null, (data, error) => {
            try {
              const displayE = 'queryDoc is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-query', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on query - query collection', (done) => {
        try {
          a.query({ fake: 'fake' }, (data, error) => {
            try {
              const displayE = 'queryDoc.collection is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-query', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#find - errors', () => {
      it('should have a find function', (done) => {
        assert.equal(true, typeof a.find === 'function');
        done();
      });
      it('should error on find - no options', (done) => {
        try {
          a.find(null, (data, error) => {
            try {
              const displayE = 'options is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-find', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on find - options entity', (done) => {
        try {
          a.find({ fake: 'fake' }, (data, error) => {
            try {
              const displayE = 'options.entity is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-find', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#count - errors', () => {
      it('should have a count function', (done) => {
        assert.equal(true, typeof a.count === 'function');
        done();
      });
      it('should error on count - no collection', (done) => {
        try {
          a.count(null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-aggregate', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#aggregate - errors', () => {
      it('should have a aggregate function', (done) => {
        assert.equal(true, typeof a.aggregate === 'function');
        done();
      });
      it('should error on aggregate - no collection', (done) => {
        try {
          a.aggregate(null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-aggregate', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on aggregate - no aggregation', (done) => {
        try {
          a.aggregate('fake', null, (data, error) => {
            try {
              const displayE = 'aggregations is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-aggregate', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#search - errors', () => {
      it('should have a search function', (done) => {
        assert.equal(true, typeof a.search === 'function');
        done();
      });
      it('should error on search - no collection', (done) => {
        try {
          a.search(null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-search', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#distinct - errors', () => {
      it('should have a distinct function', (done) => {
        assert.equal(true, typeof a.distinct === 'function');
        done();
      });
      it('should error on distinct - no collection', (done) => {
        try {
          a.distinct(null, null, null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-distinct', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on distinct - no field', (done) => {
        try {
          a.distinct('fake', null, null, null, (data, error) => {
            try {
              const displayE = 'field is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-distinct', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#exists - errors', () => {
      it('should have a exists function', (done) => {
        assert.equal(true, typeof a.exists === 'function');
        done();
      });
      it('should error on exists - no collection', (done) => {
        try {
          a.exists(null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-aggregate', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#filterFields - errors', () => {
      it('should have a filterFields function', (done) => {
        assert.equal(true, typeof a.filterFields === 'function');
        done();
      });
      it('should error on filterFields - no collection', (done) => {
        try {
          a.filterFields(null, null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-filterFields', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#sortQuery - errors', () => {
      it('should have a sortQuery function', (done) => {
        assert.equal(true, typeof a.sortQuery === 'function');
        done();
      });
      it('should error on sortQuery - no queryDoc', (done) => {
        try {
          a.sortQuery(null, (data, error) => {
            try {
              const displayE = 'queryDoc is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-sortQuery', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on sortQuery - query collection', (done) => {
        try {
          a.sortQuery({ fake: 'fake' }, (data, error) => {
            try {
              const displayE = 'queryDoc.collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-sortQuery', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#searchById - errors', () => {
      it('should have a searchById function', (done) => {
        assert.equal(true, typeof a.searchById === 'function');
        done();
      });
      it('should error on searchById - no collection', (done) => {
        try {
          a.searchById(null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-searchById', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on searchById - no id', (done) => {
        try {
          a.searchById('fake', null, (data, error) => {
            try {
              const displayE = 'id is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-searchById', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#save - errors', () => {
      it('should have a save function', (done) => {
        assert.equal(true, typeof a.save === 'function');
        done();
      });
      it('should error on save - no collection', (done) => {
        try {
          a.save(null, null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-save', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on save - no id', (done) => {
        try {
          a.save('fake', null, null, (data, error) => {
            try {
              const displayE = 'id is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-save', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on save - no data', (done) => {
        try {
          a.save('fake', 'fake', null, (data, error) => {
            try {
              const displayE = 'data is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-save', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#updateSearched - errors', () => {
      it('should have a updateSearched function', (done) => {
        assert.equal(true, typeof a.updateSearched === 'function');
        done();
      });
      it('should error on updateSearched - no collection', (done) => {
        try {
          a.updateSearched(null, null, null, false, false, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-updateSearched', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on updateSearched - no data', (done) => {
        try {
          a.updateSearched('fake', null, null, false, false, (data, error) => {
            try {
              const displayE = 'data is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-updateSearched', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#findAndModify - errors', () => {
      it('should have a findAndModify function', (done) => {
        assert.equal(true, typeof a.findAndModify === 'function');
        done();
      });
      it('should error on findAndModify - no collection', (done) => {
        try {
          a.findAndModify(null, null, null, null, false, false, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-findAndModify', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on findAndModify - no data', (done) => {
        try {
          a.findAndModify('fake', null, null, null, false, false, (data, error) => {
            try {
              const displayE = 'data is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-findAndModify', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#deleteById - errors', () => {
      it('should have a deleteById function', (done) => {
        assert.equal(true, typeof a.deleteById === 'function');
        done();
      });
      it('should error on deleteById - no collection', (done) => {
        try {
          a.deleteById(null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-deleteById', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
      it('should error on deleteById - no id', (done) => {
        try {
          a.deleteById('fake', null, (data, error) => {
            try {
              const displayE = 'id is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-deleteById', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });

    describe('#deleteSearched - errors', () => {
      it('should have a deleteSearched function', (done) => {
        assert.equal(true, typeof a.deleteSearched === 'function');
        done();
      });
      it('should error on deleteSearched - no collection', (done) => {
        try {
          a.deleteSearched(null, null, (data, error) => {
            try {
              const displayE = 'collectionName is required';
              runErrorAsserts(data, error, 'AD.300', 'Test-db_mongo-adapter-deleteSearched', displayE);
              done();
            } catch (ex) {
              log.error(`Test Failure: ${ex}`);
              done(ex);
            }
          });
        } catch (exc) {
          log.error(`Adapter Exception: ${exc}`);
          done(exc);
        }
      }).timeout(attemptTimeout);
    });
  });
});
