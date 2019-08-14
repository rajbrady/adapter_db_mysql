/* @copyright Itential, LLC 2019 (pre-modifications) */

// Set globals
/* global describe it log pronghornProps */
/* eslint no-unused-vars: warn */
/* eslint no-underscore-dangle: warn  */

// include required items for testing & logging
const assert = require('assert');
const fs = require('fs');
const mocha = require('mocha');
const path = require('path');
const winston = require('winston');
const { expect } = require('chai');
const { use } = require('chai');
const td = require('testdouble');

const anything = td.matchers.anything();

// stub and attemptTimeout are used throughout the code so set them here
let logLevel = 'none';
const stub = true;
const isRapidFail = false;
const isSaveMockData = false;
const attemptTimeout = 30000;

// these variables can be changed to run in integrated mode so easier to set them here
// always check these in with bogus data!!!
const host = 'localhost';
const username = 'username';
const password = 'password';
const protocol = 'mongodb';
const port = 27017;
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
        db: 'database',
        url: 'mongodb://localhost:27017',
        host,
        port,
        credentials: {
          dbAuth: 'false',
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
 * Runs the common asserts for test
 */
function runCommonAsserts(data, error) {
  assert.equal(undefined, error);
  assert.notEqual(undefined, data);
  assert.notEqual(null, data);
  assert.notEqual(undefined, data.response);
  assert.notEqual(null, data.response);
}

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

/**
 * @function saveMockData
 * Attempts to take data from responses and place them in MockDataFiles to help create Mockdata.
 * Note, this was built based on entity file structure for Adapter-Engine 1.6.x
 * @param {string} entityName - Name of the entity saving mock data for
 * @param {string} actionName -  Name of the action saving mock data for
 * @param {string} descriptor -  Something to describe this test (used as a type)
 * @param {string or object} responseData - The data to put in the mock file.
 */
function saveMockData(entityName, actionName, descriptor, responseData) {
  // do not need to save mockdata if we are running in stub mode (already has mock data) or if told not to save
  if (stub || !isSaveMockData) {
    return false;
  }

  // must have a response in order to store the response
  if (responseData && responseData.response) {
    const data = responseData.response;

    try {
      const base = `./entities/${entityName}/`;
      const filename = `mockdatafiles/${actionName}-${descriptor}.json`;

      // write the data we retrieved
      fs.writeFile(base + filename, JSON.stringify(data, null, 2), 'utf8', (errWritingMock) => {
        if (errWritingMock) throw errWritingMock;

        // update the action file to reflect the changes. Note: We're replacing the default object for now!
        fs.readFile(`${base}action.json`, (errRead, content) => {
          if (errRead) throw errRead;

          // parse the action file into JSON
          const parsedJson = JSON.parse(content);

          // The object update we'll write in.
          const responseObj = {
            type: descriptor,
            key: '',
            mockFile: filename
          };

          // get the object for method we're trying to change.
          const currentMethodAction = parsedJson.actions.find(obj => obj.name === actionName);

          // if the method was not found - should never happen but...
          if (!currentMethodAction) {
            throw Error('Can\'t find an action for this method in the provided entity.');
          }

          // if there is a response object, we want to replace the Response object. Otherwise we'll create one.
          const actionResponseObj = currentMethodAction.responseObjects.find(obj => obj.type === descriptor);

          // Add the action responseObj back into the array of response objects.
          if (!actionResponseObj) {
            // if there is a default response object, we want to get the key.
            const defaultResponseObj = currentMethodAction.responseObjects.find(obj => obj.type === 'default');

            // save the default key into the new response object
            if (!defaultResponseObj) {
              responseObj.key = defaultResponseObj.key;
            }

            // save the new response object
            currentMethodAction.responseObjects = [responseObj];
          } else {
            // update the location of the mock data file
            actionResponseObj.mockFile = responseObj.mockFile;
          }

          // Save results
          fs.writeFile(`${base}action.json`, JSON.stringify(parsedJson, null, 2), (err) => {
            if (err) throw err;
          });
        });
      });
    } catch (e) {
      log.debug(`Failed to save mock data for ${actionName}. ${e.message}`);
      return false;
    }
  }

  // no response to save
  log.debug(`No data passed to save into mockdata for ${actionName}`);
  return false;
}


// require the adapter that we are going to be using
const Mongo = require('../../adapter.js');

// begin the testing - these should be pretty well defined between the describe and the it!
describe('[integration] Mongo Adapter Test', () => {
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

    describe('#connect', () => {
      if (!stub) {
        it('should get connected', (done) => {
          a.connect();

          setTimeout(() => {
            assert.equal(true, a.alive);
            done();
          }, 1000);
        });
      }
    });

    describe('heatlhCheck should yield', function () {
      if (stub) {
        afterEach(() => {
          td.reset();
        });

        it('fail object when clientDB stats error.', (done) => {
          // Trigger the error that will be called back as fail object.
          a.alive = true;
          a.clientDB = td.object(['stats']);
          td.when(a.clientDB.stats()).thenCallback('errorFake');

          try {
            a.healthCheck((data) => {
              try {
                assert.notEqual(null, data);
                assert.notEqual(undefined, data);
                assert.equal('fail', data.status);
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
        });

        it('success object when no clientDB stats error.', (done) => {
          // Trigger the success that will be called back.
          a.alive = true;
          a.clientDB = td.object(['stats']);
          td.when(a.clientDB.stats()).thenCallback(null);

          try {
            a.healthCheck((data) => {
              try {
                assert.notEqual(null, data);
                assert.notEqual(undefined, data);
                assert.equal('success', data.status);
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
        });
      } else {
        it('healthcheck should succeed', (done) => {
          try {
            a.healthCheck((data) => {
              try {
                assert.notEqual(null, data);
                assert.notEqual(undefined, data);
                assert.equal('success', data.status);
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
        });
      }
    });

    /*
    -----------------------------------------------------------------------
    -----------------------------------------------------------------------
    *** All code above this comment will be replaced during a migration ***
    ******************* DO NOT REMOVE THIS COMMENT BLOCK ******************
    -----------------------------------------------------------------------
    -----------------------------------------------------------------------
    */
    const randExt = `${Math.random()}`;
    const myColl = 'mycollection';
    const myData = { test: `test1${randExt}` };
    let myDataId = '0';
    describe('create should yield', function () {
      if (!stub) {
        it('create should succeed', (done) => {
          try {
            a.create(myColl, myData, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                myDataId = data.response._id;
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
        });
      }
    });

    const myMultiData = [{ test: `test2${randExt}` }, { test: `test3${randExt}` }];
    let myDataMulti2Id = '0';
    describe('createMany should yield', function () {
      if (!stub) {
        it('createMany should succeed', (done) => {
          try {
            a.createMany(myColl, myMultiData, null, null, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                myDataMulti2Id = data.response._id;
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
        });
      }
    });

    const queryDoc = { collection: myColl, filter: { test: `test3${randExt}` } };
    let myDataMulti3Id = '0';
    describe('query should yield', function () {
      if (!stub) {
        it('query should succeed', (done) => {
          try {
            a.query(queryDoc, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                myDataMulti3Id = data.response._id;
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
        });
      }
    });

    const options = { entity: myColl, filter: { test: `test3${randExt}` } };
    describe('find should yield', function () {
      if (!stub) {
        it('find should succeed', (done) => {
          try {
            a.find(options, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal(myDataMulti3Id, data.response._id);
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
        });
      }
    });

    const myFilter = { test: `test3${randExt}` };
    describe('count should yield', function () {
      if (!stub) {
        it('count should succeed', (done) => {
          try {
            a.count(myColl, myFilter, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.notEqual(0, data.response);
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
        });
      }
    });

    const aggregations = [
      { $match: myFilter || {} },
      { $group: { _id: null, count: { $sum: 1 } } }
    ];
    describe('aggregate should yield', function () {
      if (!stub) {
        it('aggregate should succeed', (done) => {
          try {
            a.aggregate(myColl, aggregations, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.notEqual(0, data.response.count);
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
        });
      }
    });

    describe('search should yield', function () {
      if (!stub) {
        it('search should succeed', (done) => {
          try {
            a.search(myColl, myFilter, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal(myDataMulti3Id, data.response._id);
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
        });
      }
    });

    const distFilter = { test: /test/ };
    const field = 'test';
    describe('distinct should yield', function () {
      if (!stub) {
        it('distinct should succeed', (done) => {
          try {
            a.distinct(myColl, field, distFilter, null, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.notEqual(0, data.response.length);
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
        });
      }
    });

    describe('exists should yield', function () {
      if (!stub) {
        it('exists should succeed', (done) => {
          try {
            a.exists(myColl, myFilter, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal(true, data.response);
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
        });
      }
    });

    const projection = { test: 1, _id: 0 };
    describe('filterFields should yield', function () {
      if (!stub) {
        it('filterFields should succeed', (done) => {
          try {
            a.filterFields(myColl, distFilter, projection, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.notEqual(0, data.response.length);
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
        });
      }
    });

    const sortQueryDoc = {
      collectionName: myColl,
      filter: { test: `test3${randExt}` },
      projection: { test: 1, _id: 0 }
    };
    describe('sortQuery should yield', function () {
      if (!stub) {
        it('sortQuery should succeed', (done) => {
          try {
            a.sortQuery(sortQueryDoc, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal(1, data.response.length);
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
        });
      }
    });

    describe('searchById should yield', function () {
      if (!stub) {
        it('searchById should succeed', (done) => {
          try {
            a.searchById(myColl, myDataId, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal(`test1${randExt}`, data.response.test);
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
        });
      }
    });

    const uuid = require('uuid');
    const anotherOne = { _id: uuid.v4(), test: `test4${randExt}` };
    describe('save should yield', function () {
      if (!stub) {
        it('save should succeed', (done) => {
          try {
            a.save(myColl, anotherOne._id, anotherOne, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal(`test4${randExt}`, data.response.test);
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
        });
      }
    });

    const replaceData = { test: `test3${randExt}`, addField: 'added data' };
    describe('updateSearched should yield', function () {
      if (!stub) {
        it('updateSearched should succeed', (done) => {
          try {
            a.updateSearched(myColl, myFilter, replaceData, null, null, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal('successfully updated document', data.response.substring(0, 29));
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
        });
      }
    });

    const updateData = { test: `test3${randExt}`, addField: 'changed added data' };
    describe('findAndModify should yield', function () {
      if (!stub) {
        it('findAndModify should succeed', (done) => {
          try {
            a.findAndModify(myColl, myFilter, null, updateData, null, null, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal(`test3${randExt}`, data.response.test);
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
        });
      }
    });

    describe('deleteById should yield', function () {
      if (!stub) {
        it('deleteById should succeed', (done) => {
          try {
            a.deleteById(myColl, myDataId, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal(`Successfully deleted id: ${myDataId}`, data.response);
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
        });
      }
    });

    describe('deleteSearched should yield', function () {
      if (!stub) {
        it('deleteSearched should succeed', (done) => {
          try {
            a.deleteSearched(myColl, distFilter, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
                assert.equal('successfully deleted document', data.response);
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
        });
      }
    });
  });
});
