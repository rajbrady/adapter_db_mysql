MySQL Adapter
===========

This adapter allows interaction with a MySQL server. For efficiency, this adapter should only be used in IAP workflow calls. Calling the adapter from Applications instead of using the npm mysql pacakge will be less efficient!

Notes:
1. If IAP is running in docker, and MySQL server is running in the local machine, host in adapter properties should be 'host.docker.internal' instead of 'localhost' or '127.0.0.1'.
2. If MySQL version is 4.1 or higher, the adapter throws this error 'Error: ER_NOT_SUPPORTED_AUTH_MODE: Client does not support authentication protocol requested by server; consider upgrading MySQL client'. To solve this, run this command (ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your password';) in MySQL server.

License & Maintainers
---

### Maintained by:

Itential Adapter Team (<product_team@itential.com>)

Check the [changelog](CHANGELOG.md) for the latest changes.

### License

Itential, LLC proprietary
