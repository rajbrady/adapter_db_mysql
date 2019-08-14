//libraries to import
const mysql = require('mysql');

//Itential framework event
const EventEmitter = require('events');

class MySQL extends EventEmitter {
    constructor(id, props) {
        log.trace('adapter mysql loading');

        // Instantiate the EventEmitter super class
        super();

        // Capture the adapter id
        this.id = id;

        // Set the properties
        this.props = props;


        // default emit success
        this.emit('ONLINE', {
            id: this.id
        });
    }

    /**
     * Itential connect call for system green/red light
     *
     * @param {function} callback
     */
    connect(callback) {
        log.trace('mysql connect started');

        // get connection
        let connection = this.connection();

        // test connection
        connection.query(`SELECT 'test';`, (error, results, fields) => {
            // close connection
            connection.end();

        log.debug(`result from mysql connect: ${JSON.stringify(results)}`);

        if (error) {
            log.error(`connection query test failed ${error}`);

            // emit failure
            this.emit('OFFLINE', {
                id: this.id
            });

            return callback(null, error);
        };

        // emit success
        this.emit('ONLINE', {
            id: this.id
        });

        log.debug('The solution is: ', results[0].solution);
        return callback('success');
    });
    }

    connection() {
        log.trace('mysql connection started');
        let connection = mysql.createConnection({
            host: this.props.host,
            port: this.props.port,
            user: this.props.authentication.username,
            password: this.props.authentication.password,
            database: this.props.database,
            acquireTimeout: this.props.acquireTimout || 1000000
        });
        connection.connect();
        return connection;
    }

    query(sql, callback) {
        // get connection
        let connection = this.connection();

        // query connection
        connection.query(sql, (error, results, fields) => {
            // close connection
            connection.end();

        log.debug(`result from query: ${JSON.stringify(results)}`);

        if (error) {
            log.error(`query failed ${error}`);
            return callback(null, error);
        };

        return callback(results);
    });
    }

    select(sql, callback) {
        log.trace(`mysql select started with sql: ${sql}`);

        if (!sql.toLowerCase().startsWith('select')) {
            return callback(null, 'SQL statement must start with "SELECT"');
        }

        this.query(sql, callback);
    }

    insert(sql, callback) {
        log.trace(`mysql insert started with sql: ${sql}`);

        if (!sql.toLowerCase().startsWith('insert')) {
            return callback(null, 'SQL statement must start with "INSERT"');
        }

        this.query(sql, callback);
    }

    update(sql, callback) {
        log.trace(`mysql update started with sql: ${sql}`);

        if (!sql.toLowerCase().startsWith('update')) {
            return callback(null, 'SQL statement must start with "UPDATE"');
        }

        this.query(sql, callback);
    }

    delete(sql, callback) {
        log.trace(`mysql delete started with sql: ${sql}`);

        if (!sql.toLowerCase().startsWith('delete')) {
            return callback(null, 'SQL statement must start with "DELETE"');
        }

        this.query(sql, callback);
    }

} //close class

//export to Itential
module.exports = MySQL;
