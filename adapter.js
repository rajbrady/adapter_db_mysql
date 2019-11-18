/* @copyright Itential, LLC 2019 (pre-modifications) */

// Set globals
/* global log */
/* eslint no-underscore-dangle: warn  */
/* eslint no-loop-func: warn */
/* eslint no-cond-assign: warn */
/* eslint no-unused-vars: warn */
/* eslint consistent-return: warn */

/* Required libraries.  */
const fs = require('fs-extra');
const path = require('path');

// libraries to import
const mysql = require('mysql');
// Itential framework event
const EventEmitter = require('events');

let myid = null;
let errors = [];

/**
 * @summary Build a standard error object from the data provided
 *
 * @function formatErrorObject
 * @param {String} origin - the originator of the error (optional).
 * @param {String} type - the internal error type (optional).
 * @param {String} variables - the variables to put into the error message (optional).
 * @param {Integer} sysCode - the error code from the other system (optional).
 * @param {Object} sysRes - the raw response from the other system (optional).
 * @param {Exception} stack - any available stack trace from the issue (optional).
 *
 * @return {Object} - the error object, null if missing pertinent information
 */
function formatErrorObject(origin, type, variables, sysCode, sysRes, stack) {
  log.trace(`${myid}-adapter-formatErrorObject`);

  // add the required fields
  const errorObject = {
    icode: 'AD.999',
    IAPerror: {
      origin: `${myid}-unidentified`,
      displayString: 'error not provided',
      recommendation: 'report this issue to the adapter team!'
    }
  };

  if (origin) {
    errorObject.IAPerror.origin = origin;
  }
  if (type) {
    errorObject.IAPerror.displayString = type;
  }

  // add the messages from the error.json
  for (let e = 0; e < errors.length; e += 1) {
    if (errors[e].key === type) {
      errorObject.icode = errors[e].icode;
      errorObject.IAPerror.displayString = errors[e].displayString;
      errorObject.IAPerror.recommendation = errors[e].recommendation;
    } else if (errors[e].icode === type) {
      errorObject.icode = errors[e].icode;
      errorObject.IAPerror.displayString = errors[e].displayString;
      errorObject.IAPerror.recommendation = errors[e].recommendation;
    }
  }

  // replace the variables
  let varCnt = 0;
  while (errorObject.IAPerror.displayString.indexOf('$VARIABLE$') >= 0) {
    let curVar = '';

    // get the current variable
    if (variables && Array.isArray(variables) && variables.length >= varCnt + 1) {
      curVar = variables[varCnt];
    }
    varCnt += 1;
    errorObject.IAPerror.displayString = errorObject.IAPerror.displayString.replace('$VARIABLE$', curVar);
  }

  // add all of the optional fields
  if (sysCode) {
    errorObject.IAPerror.code = sysCode;
  }
  if (sysRes) {
    errorObject.IAPerror.raw_response = sysRes;
  }
  if (stack) {
    errorObject.IAPerror.stack = stack;
  }

  // return the object
  return errorObject;
}

class MySQL extends EventEmitter {
  constructor(prongid, properties) {
    log.trace('adapter mysql loading');
    // Instantiate the EventEmitter super class
    super();

    this.props = properties;
    this.alive = false;
    this.id = prongid;
    myid = prongid;

    // get the path for the specific error file
    const errorFile = path.join(__dirname, '/error.json');

    // if the file does not exist - error
    if (!fs.existsSync(errorFile)) {
      const origin = `${this.id}-adapter-constructor`;
      log.warn(`${origin}: Could not locate ${errorFile} - errors will be missing details`);
    }

    // Read the action from the file system
    const errorData = JSON.parse(fs.readFileSync(errorFile, 'utf-8'));
    ({ errors } = errorData);
  }

  /**
   * Itential connect call for system green/red light
   *
   * @param {function} callback
   */
  connect() {
    const meth = 'adapter-connect';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    // get connection
    this.connection = mysql.createConnection({
      host: this.props.host,
      port: this.props.port,
      user: this.props.authentication.username,
      password: this.props.authentication.password,
      database: this.props.database,
      acquireTimeout: this.props.acquireTimout || 1000000
    });

    this.connection.connect((error) => {
      if (error) {
        log.error(`error connecting to MySQL: ${error}`);
        // emit failure
        this.alive = false;
        this.emit('OFFLINE', {
          id: this.id
        });
      } else {
        // emit success
        this.alive = true;
        this.emit('ONLINE', {
          id: this.id
        });
        log.info(`connected as id: ${this.connection.threadId}`);
      }
    });
  }

  /**
   * Call to run a healthcheck on the mysql database
   *
   * @function healthCheck
   * @param {healthCallback} callback - a callback function to return a result
   *                                    healthcheck success or failure
   */
  healthCheck(callback) {
    const meth = 'adapter-healthCheck';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    try {
      // verify that we are connected to MySQL
      if (!this.alive || !this.connection) {
        log.error('Error during healthcheck: Not connected to MySQL Database');
        return callback({
          id: this.id,
          status: 'fail'
        });
      }

      this.connection.query('SELECT "test";', (error, results, fields) => {
        if (error) {
          log.error(`Error during healthcheck: ${error}`);
          return callback({
            id: this.id,
            status: 'fail'
          });
        }

        log.info(`result from mysql connect: ${JSON.stringify(results)}`);
        return callback({
          id: this.id,
          status: 'success'
        });
      });
    } catch (ex) {
      log.error(`Exception during healthcheck: ${ex}`);
      return callback({
        id: this.id,
        status: 'fail'
      });
    }
  }

  /**
   * getAllFunctions is used to get all of the exposed function in the adapter
   *
   * @function getAllFunctions
   */
  getAllFunctions() {
    let myfunctions = [];
    let obj = this;

    // find the functions in this class
    do {
      const l = Object.getOwnPropertyNames(obj)
        .concat(Object.getOwnPropertySymbols(obj).map(s => s.toString()))
        .sort()
        .filter((p, i, arr) => typeof obj[p] === 'function' && p !== 'constructor' && (i === 0 || p !== arr[i - 1]) && myfunctions.indexOf(p) === -1);
      myfunctions = myfunctions.concat(l);
    }
    while (
      (obj = Object.getPrototypeOf(obj)) && Object.getPrototypeOf(obj)
    );

    return myfunctions;
  }

  /**
   * getWorkflowFunctions is used to get all of the workflow function in the adapter
   *
   * @function getWorkflowFunctions
   */
  getWorkflowFunctions() {
    const myfunctions = this.getAllFunctions();
    const wffunctions = [];

    // remove the functions that should not be in a Workflow
    for (let m = 0; m < myfunctions.length; m += 1) {
      if (myfunctions[m] === 'addListener') {
        // got to the second tier (adapterBase)
        break;
      }
      if (myfunctions[m] !== 'connect' && myfunctions[m] !== 'healthCheck'
        && myfunctions[m] !== 'getAllFunctions' && myfunctions[m] !== 'getWorkflowFunctions') {
        wffunctions.push(myfunctions[m]);
      }
    }

    return wffunctions;
  }

  /**
   * Call to query the MySQL server.
   * @function query
   * @param sql - a sql string (required)
   * @param callback - a callback function to return a result
   */
  query(sql, callback) {
    const meth = 'adapter-query';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);
    log.trace(`mysql query started with sql: ${sql}`);
    try {
      // verify the required data has been provided
      if (!sql) {
        const errorObj = formatErrorObject(origin, 'Missing Data', ['sql'], null, null, null);
        log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
        return callback(null, errorObj);
      }

      // query connection
      this.connection.query(sql, (error, results, fields) => {
        // close connection
        // this.connection.end();

        log.debug(`result from query: ${JSON.stringify(results)}`);
        log.debug(`result from query: ${JSON.stringify(fields)}`);

        if (error) {
          const errorObj = formatErrorObject(origin, 'Database Error', [error], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        return callback({
          status: 'success',
          code: 200,
          response: results
        });
      });
    } catch (ex) {
      const errorObj = formatErrorObject(origin, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * Call to create a table into MySQL server.
   * @function create
   * @param sql - a sql string (required)
   * @param callback - a callback function to return a result
   */
  create(sql, callback) {
    const meth = 'adapter-create';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);
    log.trace(`mysql create started with sql: ${sql}`);

    try {
      // verify the required data has been provided
      if (!sql) {
        const errorObj = formatErrorObject(origin, 'Missing Data', ['sql'], null, null, null);
        log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
        return callback(null, errorObj);
      }

      if (!sql.toLowerCase().startsWith('create')) {
        return callback(null, 'SQL statement must start with "CREATE"');
      }

      this.query(sql, callback);
    } catch (ex) {
      const errorObj = formatErrorObject(origin, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * Call to select item from MySQL server.
   * @function select
   * @param sql - a sql string (required)
   * @param callback - a callback function to return a result
   */
  select(sql, callback) {
    const meth = 'adapter-select';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);
    log.trace(`mysql insert started with sql: ${sql}`);

    try {
      // verify the required data has been provided
      if (!sql) {
        const errorObj = formatErrorObject(origin, 'Missing Data', ['sql'], null, null, null);
        log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
        return callback(null, errorObj);
      }

      if (!sql.toLowerCase().startsWith('select')) {
        return callback(null, 'SQL statement must start with "SELECT"');
      }

      this.query(sql, callback);
    } catch (ex) {
      const errorObj = formatErrorObject(origin, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * Call to insert item into MySQL server.
   * @function insert
   * @param sql - a sql string (required)
   * @param callback - a callback function to return a result
   */
  insert(sql, callback) {
    const meth = 'adapter-insert';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);
    log.trace(`mysql insert started with sql: ${sql}`);

    try {
      // verify the required data has been provided
      if (!sql) {
        const errorObj = formatErrorObject(origin, 'Missing Data', ['sql'], null, null, null);
        log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
        return callback(null, errorObj);
      }
      if (!sql.toLowerCase().startsWith('insert')) {
        return callback(null, 'SQL statement must start with "INSERT"');
      }

      this.query(sql, callback);
    } catch (ex) {
      const errorObj = formatErrorObject(origin, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * Call to update item into MySQL server.
   * @function update
   * @param sql - a sql string (required)
   * @param callback - a callback function to return a result
   */
  update(sql, callback) {
    const meth = 'adapter-update';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);
    log.trace(`mysql update started with sql: ${sql}`);

    try {
      // verify the required data has been provided
      if (!sql) {
        const errorObj = formatErrorObject(origin, 'Missing Data', ['sql'], null, null, null);
        log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
        return callback(null, errorObj);
      }
      if (!sql.toLowerCase().startsWith('update')) {
        return callback(null, 'SQL statement must start with "UPDATE"');
      }

      this.query(sql, callback);
    } catch (ex) {
      const errorObj = formatErrorObject(origin, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * Call to delete item from MySQL server.
   * @function delete
   * @param sql - a sql string (required)
   * @param callback - a callback function to return a result
   */
  delete(sql, callback) {
    const meth = 'adapter-delete';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);
    log.trace(`mysql delete started with sql: ${sql}`);
    try {
      // verify the required data has been provided
      if (!sql) {
        const errorObj = formatErrorObject(origin, 'Missing Data', ['sql'], null, null, null);
        log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
        return callback(null, errorObj);
      }
      if (!sql.toLowerCase().startsWith('delete')) {
        return callback(null, 'SQL statement must start with "DELETE"');
      }

      this.query(sql, callback);
    } catch (ex) {
      const errorObj = formatErrorObject(origin, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * Call to drop table from MySQL server.
   * @function drop
   * @param sql - a sql string (required)
   * @param callback - a callback function to return a result
   */
  drop(sql, callback) {
    const meth = 'adapter-drop';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);
    log.trace(`mysql drop started with sql: ${sql}`);
    try {
      // verify the required data has been provided
      if (!sql) {
        const errorObj = formatErrorObject(origin, 'Missing Data', ['sql'], null, null, null);
        log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
        return callback(null, errorObj);
      }
      if (!sql.toLowerCase().startsWith('drop')) {
        return callback(null, 'SQL statement must start with "DROP"');
      }

      this.query(sql, callback);
    } catch (ex) {
      const errorObj = formatErrorObject(origin, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }
}

// export to Itential
module.exports = MySQL;
