const Sequelize = require("sequelize");
const logger = require("log4js").getLogger("nashak");
const fs = require("fs");
const path = require("path");
/**
 * Loads test results data into database...
 **/
var recording = false;
var nashakDB;
module.exports = {
  init: () => {
    let nashakStore = {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      username: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      dialect: "mysql",
      timezone: "+05:30",
      pool: {
        minConnections: 5,
        maxIdleTime: 10
      },
      logging: false,
      dialectOptions: {
        dateStrings: true,
        typeCast: true
      }
    };
    logger.info("Initializing the nashakStore", nashakStore);

    if (nashakStore == null) {
      throw new Error("Cannot initialize nashakStore, unless db config variables are set.");
    }
    return new Promise(async (resolve) => {
      try {
        if (!recording) return resolve(true);
        const basename = path.basename(module.filename);
        const dbDir = path.join(__dirname, "models");

        logger.warn("dialect:" + nashakStore.dialect);

        nashakDB = new Sequelize(nashakStore.database, nashakStore.username, nashakStore.password, nashakStore);
        let db = {};
        fs.readdirSync(dbDir)
          .filter((file) => {
            return file.indexOf(".") != 0 && file != basename;
          })
          .forEach((file) => {
            if (file.slice(-3) != ".js") {
              return;
            }
            let filepath = path.join(dbDir, file);
            if (logger.isTraceEnabled()) {
              logger.trace("Importing File: " + filepath);
            }
            let model = nashakDB["import"](filepath);
            db[model.name] = model;
          });
        Object.keys(db).forEach((modelName) => {
          if (db[modelName].associate) db[modelName].associate(db);
        });
        await nashakDB.sync();
        let status = await nashakDB.query("SELECT 1");
        logger.info("nashakDB:", status);
        resolve(true);
      } catch (e) {
        logger.error("Failed to sync nashakStore", e);
        resolve(null);
      }
    });
  },

  // When recording is off (by default off), then
  // there is no writing to DB.
  setRecording: (record) => {
    recording = record;
  },

  saveRecord: (uuid, testcase) => {
    if (!recording) return Promise.resolve(testcase);
    //removing quotes from string to avoid mysql insertion error
    testcase["gv"] = removeQuote(testcase.given);
    testcase["wh"] = removeQuote(testcase.when);
    testcase["th"] = removeQuote(testcase.then);
    testcase["uuid"] = uuid;
    testcase["tid"] = testcase.id != null ? testcase.id : -1;
    testcase["category"] = removeQuote(testcase.tags);
    testcase["execTime"] = testcase.elapsedTime != null ? testcase.elapsedTime : -1;
    //stringify the given, when, then, expected and actual results
    if (typeof testcase.expected == "object" || typeof testcase.expected == "number") testcase.expected = JSON.stringify(testcase.expected);
    if (typeof testcase.actual == "object" || typeof testcase.actual == "number") testcase.actual = JSON.stringify(testcase.actual);
    return nashakDB.models.Task.upsert(testcase, { uuid: uuid, tid: testcase.tid });
  },

  /* Inserts a summary row into test summary table */
  summaryInsert: async (uuid, build, currTime, fileName, wsIndex) => {
    if (!recording) return Promise.resolve(true);
    try {
      await nashakDB.models.Summary.create({
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        execTime: 0,
        uuid: uuid,
        timestamp: currTime,
        build: build,
        fileName: fileName,
        wsIndex: wsIndex
      });
    } catch (error) {
      //ignore
    }
    return Promise.resolve(true);
  },

  /* Update the summary row with final info, after completion of test suite exectuion */
  summaryUpdate: (uuid, stats, currTime) => {
    if (!recording) return Promise.resolve(true);
    return nashakDB.models.Summary.update(
      {
        passed: stats.passed,
        failed: stats.failed,
        skipped: stats.skipped,
        total: stats.total,
        execTime: stats.elapsedTime
      },
      { where: { timestamp: currTime, uuid: uuid } }
    );
  },

  close: () => {
    if (recording) return nashakDB.close();
  }
};

/*Removing single quote*/
function removeQuote(str) {
  return (str && str.replace(/'/, "\\'")) || "Unknown";
}
