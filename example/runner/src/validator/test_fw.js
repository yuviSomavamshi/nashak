/*
 * Code to test Web portal.
 */

const cmnFns = require("../utils");
const selUtils = require("nashak").seleniumUtils;

const functions = {
  // This Function is to create the Workflow Defnition from Admin Portal
  testCreateSetup: async function (testcase) {
    try {
      global.logger.info("Loading page: %s...", global.Settings.webPortal);

      let btn = await cmnFns.findXPath("//*[@id='root']/div/div/main/div[2]/div[1]/button[1]");
      await btn.click();
      let setupName = await cmnFns.findXPath("//*[@id='name']");
      global.logger.debug("Entering username : %s", testcase.input.setup);
      await selUtils.sendKeys(global.driver, setupName, testcase.input.setup);

      let errorEle = await cmnFns
        .findXPath("//*[@id='root']/div/div/main/div[2]/div[3]/form/div/div[2]/div/label[2]", 500)
        .catch((e) => global.logger.error(e));
      console.log(errorEle);
      if (errorEle === undefined) {
        btn = await cmnFns.findXPath("//*[@id='root']/div/div/main/div[2]/div[3]/form/div/div[2]/div/div[4]/button");
        await btn.click();

        let span = await cmnFns.findXPath("//*[@id='root']/div/div/main/div[2]/div[3]/div/div[2]/div/span");
        testcase.actual = await span.getText();
        testcase.result = testcase.actual === testcase.expected.response;

        btn = await cmnFns.findXPath("//*[@id='root']/div/div/main/div[2]/div[3]/div/div[2]/div/div/button");
        await btn.click();
      } else {
        testcase.actual = await errorEle.getText();
        testcase.result = testcase.actual === testcase.expected.response;
        btn = await cmnFns.findXPath("//*[@id='root']/div/div/main/div[2]/div[3]/form/div/div[2]/div/div[1]/button");
        await btn.click();
      }
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
