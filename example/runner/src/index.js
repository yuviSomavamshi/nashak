/***********************************************************************
 * =====================================================================
 *     Node.JS Selenium Automation Framework for GUI /Web Operations
 * =====================================================================
 ***********************************************************************
 */
"use strict";
global.Settings = require("./settings.json");
const commander = require("commander");
const log4js = require("log4js");
global.logger = log4js.getLogger("nashak");
global.logger.level = global.Settings.logging.level;
const nashak = require("nashak");
const BPromise = require("bluebird");
const TestManager = require("./test_manager");

commander
  .version(require("../package.json").version)
  .option("-H, --host [host]", "Redis host. defaults to `localhost`", "127.0.0.1")
  .option("-p, --port [port]", "Optional - Port for configuration server. Default: 6379", "6379")
  .option("-n, --db [db]", "Optional - Db number in Redis config server, where configuration data is located. Default: 0", "0")
  .option("-a, --password [password]", "config server password", undefined)
  .option("-f, --file [file]", "Test case file", "./testFiles/setup.xlsx")
  .option("-l, --language [language]", "Inputs the language to Test Framework -> English: en, Hindi: hi, Spanish: es")
  .option("-b, --build [build]", "Temporary Build No, to be replaced with Jenkins Build-ID")
  .option("-w, --wsIndex [wsIndex]", "Worksheet Index for each sheet", "1")
  .option("-s, --suite [suite]", "Test suite name")
  .option("-i, --id [id]", "Test case ID")
  .option("-r, --range [range]", "Test case ID range separated by comma(,)")
  .option("-d, --record [record]", "Optional - DBUrl (of format host:port:user:password:db), where test results should be stored. Default none")
  .parse(process.argv);

const program = commander.opts();

if (!program.file) {
  console.log("\t\nERROR :: Test file is required..\n");
  program.help();
  process.exit(0);
}

if (!program.wsIndex) {
  console.log("\t\nERROR :: Worksheet Index is required..\n");
  program.help();
  process.exit(0);
}

program.host = program.host ? program.host : "127.0.0.1";

var excelFiles = program.file.split(",");
var ws = program.wsIndex.split(",");
var myArray = [];

for (var i = 0; i < excelFiles.length; i++) {
  for (var j = 0; j < ws[i]; j++) {
    if (i == 0 && j == 0) {
      var tempVar = {
        file: excelFiles[i],
        workIndex: {
          workSheet: j
        }
      };

      myArray.push(tempVar);
    } else if (i + 1 == excelFiles.length && j + 1 == ws[i]) {
      let tempVar1 = {
        file: excelFiles[i],
        workIndex: {
          workSheet: j
        }
      };

      myArray.push(tempVar1);
    } else {
      myArray.push({
        file: excelFiles[i],
        workIndex: {
          workSheet: j
        }
      });
    }
  }
}

// if record to db option specified, but no dbURL than read config.
if (program.record && typeof program.record != "string") {
  console.error("\t\nWARN :: DB Url not specified for recording test execution results, so going with default configurations stored in config.js\n");
  program.help();
} else if (global.Settings.capture.results) {
  let db = global.Settings.database;
  var dbInfo = db.host + ":" + db.port + ":" + db.username + ":" + db.password + ":" + db.database;
}

// if record screenshots, read config.
if (global.Settings.capture.screenshots) {
  var ssPath = __dirname + "/screenshots"; // Conf to specify the path from the central server to store the captured SS
  var ssPathUrl = __dirname + "/"; // Base URL from the Central Server to be appended to above Path
}

var start = 1,
  end = null;
if (program.range) {
  var data = program.range.split(",").map((s) => (isNaN(s.trim()) ? null : Number(s.trim())));
  start = data[0];
  end = data[1];
} else if (!isNaN(program.id)) {
  start = Number(program.id);
  end = start;
}

const options = Object.assign({}, process.argv, {
  startRow: start, // Automation Execution Starting TestCase ID
  endRow: end, // Automation Execution Ending TestCase ID (used in range based)
  // TestCases Column Mapping with Automation Framework
  givenColumnNo: 2, // Given Column from TestCases Sheet is on 2nd position
  whenColumnNo: 3, // When Column from TestCases Sheet is on 3rd position
  thenColumnNo: 4, // Then Column from TestCases Sheet is on 4th position
  inputColumnNo: 5, // Input Payload from TestCases Sheet is on 5th position
  expectedColumnNo: 6, // Expected Result from TestCases Sheet is on 6th position
  executorColumnNo: 7, // Automation Functor from TestCases Sheet is on 7th position
  record: program.record || dbInfo,
  tags: program.suite,
  imgPath: ssPath,
  imgBaseUrl: ssPathUrl,
  build: program.build || 1
});

BPromise.reduce(myArray, runner, "")
  .then(() => {
    global.logger.trace("Test execution finished.");
    process.exit(0);
  })
  .catch((e) => {
    global.logger.error("Test execution failed.", e);
    process.exit(0);
  });

function runner(prev, item) {
  // Appends the Before & After Hooks with series of TestCases Sheet Array
  let opts = options;
  global.logger.debug("OPTS Before :: " + JSON.stringify(opts) + ", ITEM :: " + "Before : " + item.before + " After : " + item.after);
  if (item.before) {
    opts = Object.assign({}, opts, {
      before: item.before
    });
  }
  if (item.after) {
    opts = Object.assign({}, opts, {
      after: item.after
    });
  }
  opts = Object.assign({}, opts, item.workIndex);
  global.logger.debug("OPTS After :: " + JSON.stringify(opts) + ", ITEM :: " + "Before : " + item.before + " After : " + item.after);
  global.logger.debug("Executing nashak for file: %s", item.file);
  global.logger.debug("Executing Sheet : ", item.workIndex);
  return nashak.run(item.file, opts).then(nashak.resetSummary);
}
