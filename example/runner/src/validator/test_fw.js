/*
 * Code to test Web portal.
 */

const cmnFns = require("../utils");
const selUtils = require("nashak").seleniumUtils;

const functions = {
  // This Function is to create the Workflow Defnition from Admin Portal
  testCreateSetup: async function (testcase) {
    try {
      global.logger.info("Loading page: %s...", global.Setting.webPortal);
      await global.driver.get(global.Setting.webPortal);

      let btn = await cmnFns.findxpath("//*[@id='root']/div/div/main/div[2]/div[1]/button[1]");
      await btn.click();
      let setupName = await cmnFns.findxpath("//*[@id='name']");
      global.logger.debug("Entering username : %s", testcase.input.setup);
      await selUtils.sendKeys(global.driver, setupName, testcase.input.setup);
      btn = await cmnFns.findxpath("//*[@id='root']/div/div/main/div[2]/div[3]/form/div/div[2]/div/div[4]/button");
      await btn.click();
      let span = await cmnFns.findxpath(
        "//*[@id='root']/div/div/main/div[2]/div[3]/div/div[2]/div/span[contains(.,'" + testcase.expected.response + "')]"
      );
      btn = await cmnFns.findxpath("//*[@id='root']/div/div/main/div[2]/div[3]/div/div[2]/div/div/button");
      await btn.click();
      testcase.result = span !== null;
      testcase.actual = "Expected result matched";
    } catch (e) {
      testcase.result = false;
      testcase.actual = e.stack;
      global.logger.error("Error :: ", e);
    }
    return testcase;
  },

  testLoad: async function (testcase) {
    return testcase;
  }
};

module.exports = functions;
