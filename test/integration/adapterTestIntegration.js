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

// stub and attemptTimeout are used throughout the code so set them here
let logLevel = 'none';
const stub = true;
const isRapidFail = false;
const isSaveMockData = false;
const attemptTimeout = 10000;

// these variables can be changed to run in integrated mode so easier to set them here
// always check these in with bogus data!!!
const host = 'localhost';
const username = 'your username';
const password = 'your password';
const port = 3306;
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
      id: 'Test-db_mysql',
      type: 'MySQL',
      properties: {
        database: 'your database name',
        host,
        port,
        authentication: {
          username,
          password
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

// require the adapter that we are going to be using
const MySQL = require('../../adapter.js');

// begin the testing - these should be pretty well defined between the describe and the it!
describe('[integration] MySQL Adapter Test', () => {
  describe('MySQL Class Tests', () => {
    const a = new MySQL(
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
          try {
            a.connect();

            setTimeout(() => {
              assert.equal(true, a.alive);
              done();
            }, 1000);
          } catch (error) {
            log.error(`Adapter Exception: ${error}`);
            done(error);
          }
        });
      }
    });

    describe('heatlhCheck should yield', function () {
      if (!stub) {
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

    const createSQL = 'CREATE TABLE Dogs (DogID int, Name varchar(255));';
    describe('#create', function () {
      if (!stub) {
        it('should create a table', (done) => {
          try {
            a.create(createSQL, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
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

    const insertSQL = 'INSERT INTO Dogs (DogID, Name) VALUES (001, "dog001");';
    describe('#insert', function () {
      if (!stub) {
        it('should insert a record', (done) => {
          try {
            a.insert(insertSQL, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
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

    const selectSQL = 'SELECT name FROM Dogs;';
    describe('#select', function () {
      if (!stub) {
        it('should select a record', (done) => {
          try {
            a.select(selectSQL, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
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

    const querySQL = 'SELECT name FROM Dogs;';
    describe('#query', function () {
      if (!stub) {
        it('should query a record', (done) => {
          try {
            a.query(querySQL, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
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

    const updateSQL = 'UPDATE Dogs SET Name="dogs001" WHERE DogID=1;';
    describe('#update', function () {
      if (!stub) {
        it('should update a record', (done) => {
          try {
            a.update(updateSQL, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
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

    const deleteSQL = 'DELETE FROM Dogs WHERE DogID=1;';
    describe('#delete', function () {
      if (!stub) {
        it('should delete a record', (done) => {
          try {
            a.delete(deleteSQL, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
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

    const dropSQL = 'DROP TABLE Dogs;';
    describe('#drop', function () {
      if (!stub) {
        it('should drop a record', (done) => {
          try {
            a.drop(dropSQL, (data, error) => {
              try {
                runCommonAsserts(data, error);
                assert.equal(200, data.code);
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
