/*
 *   Test code for UI based login operations to Web portal...
 */

const webdriver = require("selenium-webdriver");

const chromeCapabilities = webdriver.Capabilities.chrome();
const chromeOptions = {
  args: ["--test-type", "--incognito"]
};
chromeCapabilities.set("chromeOptions", chromeOptions);

const moment = require("moment");

const currTime = moment().format("YYYY-MM-DD HH:mm:ss");

try {
  global.driver = new webdriver.Builder().withCapabilities(chromeCapabilities).build();

  global.driver.manage().window().maximize();
  global.driver.manage().setTimeouts({
    implicit: 5000
  });
  global.logger.info("onBefore :: Initializing the test module..");
  global.logger.info("Test Start Time :: ", currTime);
  setUp().then(() => global.logger.info("Executed the Setup process successfully.."));
} catch (e) {
  global.logger.error("ERROR in setting up the environment..");
}

const functions = {
  onBefore: async function () {
    global.driver = new webdriver.Builder().withCapabilities(chromeCapabilities).build();
    global.driver.manage().window().maximize();
    global.driver.manage().setTimeouts({
      implicit: 5000
    });
    global.logger.info("onBefore :: Initializing the test module..");
    global.logger.info("Test Start Time :: ", currTime);
    try {
      await setUp();
      global.logger.info("Executed the Setup process successfully..");
    } catch (e) {
      global.logger.error("ERROR in setting up the environment..");
    }
  },

  onAfter: async function (testcase) {
    global.logger.info("onAfter :: Closing the selenium driver..");
    global.endTime = currTime;
    try {
      await tearDown(testcase);
      global.logger.info("Executed Tear Down process successfully..");
      global.logger.info("Test End Time :: ", currTime);
    } catch (e) {
      global.logger.error("ERROR in closing the selenium driver");
    }
    return global.driver.quit();
  }
};

module.exports = functions;

async function setUp() {
  global.logger.info("Calling Setup Function");
}

async function tearDown(testcase) {
  try {
    global.logger.info("Calling Tear Down Function");
  } catch (e) {
    global.logger.error("Error in Executing Tear Down Function");
    throw e;
  }
}
