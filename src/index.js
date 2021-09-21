/**
 *  A simple and cool test runner that executes
 *  tests defined in an excel file.
 **/

const fs = require("fs");
const path = require("path");
const logger = require("log4js").getLogger("nashak");
const xlsx = require("node-xlsx");
const BPromise = require("bluebird");
const colors = require("colors");
const _ = require("lodash");
const moment = require("moment");
const sqloader = require("./sqloader");
const selUtils = require("./selenium-utils");

var options = {};

const currTime = moment().format("YYYY-MM-DD HH:mm:ss");

//Timers
let masterStart;
let taskStart;

// accummulator for test results summary.
var testStats = { passed: 0, failed: 0, skipped: 0 };
logger.level = "all";

module.exports = {
  /*
   * Begins execution of tests contained in excel file
   * @param {opts} a json object indicating various applicable options
   *        as defined below.
   *      {
   *        startRow: "id",       // optional.  If given, starts executing test cases from this id onwards.
   *        endRow: "id",         // optional.  If given, executes test cases until and including this one.
   *        modulePath: "path",   // optional. if given, identifies where all test code modules will be found.
   *        idColumn: 0,          // column where testcase id is stored. Default:0
   *        givenColumnNo: 1,           // column where "given" is stored. Default:1
   *        whenColumnNo: 2            // column where "when" is stored. Default:2
   *        thenColumnNo: 3            // column where "then" is stored. Default:3
   *        inputColumnNo: 4        // column where input payload is stored. Default:4
   *        expectedColumnNo: 5          // column where expected result is stored. Default:5
   *        executorColumn: 6      // column where executor module reference is stored. Default:6
   *      }
   */
  run: async (file, opts) => {
    printBanner();

    // Read the test file.
    logger.info("Reading file:%s...", file);
    let workbook = xlsx.parse(file);

    /* sets up default sensible options */
    options = {
      attempts: Number(opts.retry) + 1 || 2,
      wsIndex: opts.workSheet || 0, // Index of the worksheet where to read the data.
      startRow: opts.startRow || 1, // deafult start row is 1
      endRow: opts.endRow || undefined, // end row defaults to undefined. We look for EOF marker to stop execution.
      modulePath: opts.modulePath || ".", // path where the test code is present.
      idColumn: opts.idColumn || 0, // column index of id field
      givenColumnNo: opts.givenColumnNo || 1, // col index of 'given' field
      whenColumnNo: opts.whenColumnNo || 2, // col index of 'when' field
      thenColumnNo: opts.thenColumnNo || 3, // col index of 'then' field
      inputColumnNo: opts.inputColumnNo || 4, // col index of input payload field
      expectedColumnNo: opts.expectedColumnNo || 5, // col index of expected result field
      executorColumnNo: opts.executorColumnNo || 5, // col index of executor
      tagivenColumnNo: opts.tagivenColumnNo || 8, // col index of tags/label
      tags: opts.tags, // if no tags specified, all will be executed
      build: opts.build, // build number of the product being tested. Must, if 'record' is mentioned.
      record: opts.record, // Record test exec results to a database.
      uuid: opts.uuid, // generated uuid
      before: opts.before, // before func to execute, ahead of running test cases.
      after: opts.after, // after func to execute, after all tests have been run.
      imgPath: opts.imgPath, // base path where images (selenium screenshots) should be stored, if taken.
      imgBaseUrl: opts.imgBaseUrl // base url to prefix while forming imgurl of screenshot
    };

    if (!options.uuid) {
      options.uuid = uuidGen();
    }

    /* Validate parameters for boundary cases */
    if (options.wsIndex >= workbook.length || options.wsIndex < 0) {
      if (workbook.length === 1) {
        throw new Error("Worksheet index is out of bound.The file has only one worksheet (index 0)");
      } else {
        throw new Error("Worksheet Index is out of bounds.Should be a positive number between 0 and " + (workbook.length - 1));
      }
    }

    let validPath = await validatePath(options.imgPath);
    if (validPath && options.imgPath) {
      if (!options.imgBaseUrl) {
        throw new Error("imgBaseUrl should also be provided, when imgPath is provided.");
      }
      // Add the imgPath to global, so it can be accessed by screenshot function
      // defined in selenium-utils.
      global.imgPath = options.imgPath;
      global.imgBaseUrl = options.imgBaseUrl;
    }

    // record and build number validations..
    if (options.record) {
      if (options.build == undefined) throw new Error("build option must be provided, when record option is specified.");
      else {
        sqloader.setRecording(true);
      }
    }

    var tests = workbook[options.wsIndex].data;
    options.endRow = opts.endRow || tests.length;
    if (options.startRow >= tests.length) throw new Error("Start row cannot be greater than test case count.");
    if (options.startRow > options.endRow) throw new Error("Start row cannot be greater than end row.");

    /* extract the subset of rows */
    logger.info("Preparing execution subset %d:%d ...", options.startRow, options.endRow);

    let rows = [];
    for (let i = options.startRow; i <= options.endRow; i++) {
      if (tests[i] == null || tests[i][options.idColumn] === "EOF") break;
      if (options.tags == null) {
        rows.push(tests[i]);
      } else {
        if (options.tags.indexOf(tests[i][options.tagivenColumnNo]) >= 0) {
          rows.push(tests[i]);
        }
      }
    }

    //
    // Execute any initialization routine, before starting tests...
    //
    await onBefore();

    /*Insertion into summary table*/
    await sqloader.init(options.record);
    await sqloader.summaryInsert(options.uuid, opts.build, currTime, file, options.wsIndex);

    /* Execute and print summary stats */
    return BPromise.reduce(rows, executor, testStats).then(async (stats) => {
      try {
        stats.elapsedTime = new Date().getTime() - masterStart;
        let tot = stats.passed + stats.failed + stats.skipped;
        logger.info("UUID:%s, summary => total:%d, passed:%d, failed:%d, skipped:%d", options.uuid, tot, stats.passed, stats.failed, stats.skipped);
        logger.info("time taken => %d s", stats.elapsedTime / 1000);
        await sqloader.summaryUpdate(options.uuid, stats, currTime).then(sqloader.close);

        await onAfter();
      } catch (error) {
        logger.error("Something went wrong", error);
      }
    });
  },

  /**
   * Resets the execution stats of the current session.
   * Useful, if the client app is calling the run method again
   * on the same nashak instance.
   **/
  resetSummary: function () {
    testStats.passed = 0;
    testStats.failed = 0;
    testStats.skipped = 0;
  }
};

module.exports.seleniumUtils = selUtils;

/////////////////////////////////////////////////////////////////////////////////////
// Internal functions...
/////////////////////////////////////////////////////////////////////////////////////
/* Prints our beautiful logo */
function printBanner() {
  console.log(require("../package.json").version);
}

masterStart = new Date().getTime();
/** Executes each test case row, and prints results **/
function executor(accumulator, item, index, length) {
  logger.info("executor: Executing test case %d...", item[0]);
  return prepareTestCase(item)
    .then(exec)
    .then(compareResult)
    .then(saveResult)
    .then(printResult)
    .then(updateStats.bind(null, accumulator))
    .catch(function (e) {
      logger.warn("Skipping test case %d due to error.", item[0]);
      logger.warn("Skipping test case due to error.", e);
      // I strongly hope e === testcase.

      e.elapsedTime = new Date().getTime() - taskStart;
      var skipPromise = null;
      if (e.result === 2)
        // if result is skipped.
        skipPromise = saveResult(e);

      if (skipPromise != null) return skipPromise.then(updateStats.bind(null, accumulator));
      else return updateStats(accumulator);
    });
}

/**
 * Takes an array defining a test case, and converts it to a
 * testcase json object, so as to pass down the execution pipeline.
 **/
function prepareTestCase(testData) {
  var tc = {
    id: testData[options.idColumn],
    given: testData[options.givenColumnNo],
    when: testData[options.whenColumnNo],
    then: testData[options.thenColumnNo],
    //expected: JSON.parse(testData[expectedColumn]),
    executor: testData[options.executorColumnNo],
    tags: testData[options.tagivenColumnNo],
    result: false // by default fails, unless someone "passes" it.
  };

  /*
   Check if more than or euqal to 3 rows are consecutively empty.
   if so, we probably ran out of test cases.
*/

  try {
    tc.input = JSON.parse(testData[options.inputColumnNo]);
  } catch (e) {
    logger.warn("testcase (%d): JSON parse error for 'input' column.", tc.id);
    tc.result = 2; // "skipped";
    return BPromise.reject(tc);
  }

  try {
    tc.expected = JSON.parse(testData[options.expectedColumnNo]);
    return BPromise.resolve(tc);
  } catch (e) {
    logger.warn("testcase (%d): JSON parse error for 'expected output' column.  Falling back to 'text' type", tc.id);
    tc.expected = testData[options.expectedColumnNo];
    tc.result = 2; // "skipped";
    return BPromise.reject(tc);
  }
}

/**
 * Executes (invokes) a given <module>.<function>, and
 * fills in the results in "testcase.result" placeholder.
 **/
async function exec(testcase) {
  taskStart = new Date().getTime();
  // retrieve module name /func.  Load the module and call the func.
  let moduleData = getModuleInfo(testcase.executor);
  if (moduleData === null) {
    logger.info("Ignoring test case %d, as no module/function provided...", testcase.id);
    return BPromise.resolve(testcase);
  }
  testcase.module = moduleData.module; // used later for taking screenshots.

  var resStatus = false;
  var moduleFile = path.resolve(path.join(options.modulePath, moduleData.module));
  logger.trace("Loading module: %s ...", moduleFile);
  var module = require(moduleFile);
  moduleData.beforeFunc = "before" + moduleData.func;
  if (module[moduleData.beforeFunc]) {
    logger.trace("Executing before test function : %s ...", moduleData.beforeFunc);
    resStatus = await module[moduleData.beforeFunc](testcase);
    if (!resStatus) {
      logger.info("%s failed...", moduleData.beforeFunc);
      return BPromise.reject();
    }
  }

  if (module[moduleData.func]) {
    let result;
    for (let attemp = 1; attemp <= options.attempts; attemp++) {
      logger.trace("Executing test function: %s, attempt: %d ...", moduleData.func, attemp);
      result = await module[moduleData.func](testcase);
      if (result != null && result.result) break;
    }
    return result;
  } else {
    logger.info('No matching function "%s" found in "%s"', moduleData.func, moduleData.module);
    return BPromise.reject();
  }
}

/***
 *
 *  Computes the result of executing a function, against the expected result.
 *
 *  Note ->
 *  1. If the exec function itself compared the expected Vs actual,
 *          then this function will just pass through (doing nothing).
 *  2. The default check done by this function is deep-equal-comparison of jsons'
 *
 *  @param {item} - an array containing test case information
 *  @param {output} - result data as obtained by executing a function.
 *
 *  @returns {json} - a comparison result object, that can be fed to printResult
 *
 ***/
function compareResult(testcase) {
  if (testcase.result !== undefined) return BPromise.resolve(testcase);
  testcase.result = _.isEqual(testcase.expected, testcase.actual);
  return testcase;
}

/**
 * Saves the testcase result to configurd DB.
 * If --record option is not provided, it simply returns true.
 **/
function saveResult(testcase) {
  testcase.elapsedTime = new Date().getTime() - taskStart;
  return sqloader.saveRecord(options.uuid, testcase).then(() => testcase);
}

/***
 * Prints results to stdout as a structured /formatted output.
 ***/
function printResult(testcase) {
  try {
    console.log("Test case id:".magenta.bold, testcase.id);
    console.log("   UUID     :".magenta.bold, options.uuid);
    console.log("   Given    :".magenta.bold, testcase.given);
    console.log("   When     :".magenta.bold, testcase.when);
    console.log("   Then     :".magenta.bold, testcase.then);
    console.log("   Expected :".magenta.bold, JSON.stringify(testcase.expected));
    console.log("   Actual   :".magenta.bold, testcase.actual);
    console.log("   Result => ".magenta.bold, testcase.result ? "Pass".green.bold : "Fail".red.bold);
  } catch (error) {
    logger.error(error);
  }
  return testcase;
}

/** accummulates success, failures and skipped counts **/
function updateStats(stats, testcase) {
  testcase = testcase || {};
  if (testcase.result && testcase.result === true) stats.passed = stats.passed == null ? 1 : stats.passed + 1;
  else if (testcase.result === false) stats.failed = stats.failed == null ? 1 : stats.failed + 1;
  else stats.skipped = stats.skipped == null ? 1 : stats.skipped + 1;
  return stats;
}

/**
 * Returns the name of the loadable module and function as a JSON,
 * from the given input string.
 * Tries to make best guess if the data is in JSON string or
 * dot-notation format.
 *
 **/
function getModuleInfo(data) {
  if (data == null) return null;
  data = data.trim();
  if (data.length === 0) return null;
  try {
    // try to parse it as json. and return.
    logger.trace("Trying to parse the data as json...");
    return JSON.parse(data);
  } catch (e) {
    logger.debug("The data is not a valid json. Trying if its dotted notation....");
    var arr = data.split(".");
    if (arr.length !== 2) {
      logger.debug("Doesn't seem to be a dotted format string (module.func) either.");
      return null;
    }
    return { module: arr[0], func: arr[1] };
  }
}

/*Generates UUID for the MYSQL tables*/
function uuidGen() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function onBefore() {
  // if no onBefore function available, simply return.
  if (!options.before || !options.before.module) return Promise.resolve();

  let moduleFile = path.resolve(options.before.module);
  let module = require(moduleFile);
  if (module) {
    logger.info("Executing onBefore function %s::%s...", options.before.module, options.before.func);
    module[options.before.func]();
  }
}

function onAfter() {
  // if no onAfter function available, simply return.
  if (!options.after || !options.after.module) return Promise.resolve();

  let moduleFile = path.resolve(options.after.module);
  let module = require(moduleFile);
  if (module) {
    logger.info("Executing onAfter function %s::%s...", options.after.module, options.after.func);
    module[options.after.func]();
  }
}

function validatePath(imgPath) {
  if (imgPath == null) return Promise.resolve(true);
  logger.info("Performing read/write validations on img path:%s ...", imgPath);
  return new Promise((resolve, reject) => {
    fs.access(imgPath, fs.constants.W_OK, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}
