const { By, until } = require("selenium-webdriver");
const selUtils = require("nashak").seleniumUtils;

module.exports = {
  // Function to Login to Portal
  createSetup: async function (testcase) {
    try {
      let btn = await findXPath("//*[@id='root']/div/div/main/div[2]/div[1]/button[1]");
      await btn.click();
      let setupName = await global.driver.wait(until.elementLocated(By.xpath("//*[@id='name']")), 10000);
      global.logger.debug("Entering username : %s", testcase.input.setup);
      await selUtils.sendKeys(global.driver, setupName, testcase.input.setup);
      btn = await findXPath("//*[@id='root']/div/div/main/div[2]/div[3]/form/div/div[2]/div/div[4]/button");
      await btn.click();
      let span = await findXPath("//*[@id='root']/div/div/main/div[2]/div[3]/div/div[2]/div/span[contains(.,'Success to create setup')]");
      console.log(span != null);
      btn = await findXPath("//*[@id='root']/div/div/main/div[2]/div[3]/div/div[2]/div/div/button");
      await btn.click();
    } catch (e) {
      global.logger.error("Error in createSetup:", e);
      if (testcase) {
        await selUtils.screenshot(global.driver, testcase);
      }
      throw e;
    }
  },
  findXPath,
  findSelector
};

async function findXPath(xpath, waitFor = 5000) {
  try {
    let element = await global.driver.findElement(By.xpath(xpath));
    await global.driver.wait(until.elementIsVisible(element), waitFor);
    await global.driver.wait(until.elementIsEnabled(element), waitFor);
    return global.driver.wait(until.elementLocated(By.xpath(xpath)), waitFor);
  } catch (e) {
    global.logger.error(xpath + "XPATH not found ..", e);
    return;
  }
}

async function findSelector(selector, waitFor = 5000) {
  try {
    let element = await global.driver.findElement(By.css(selector));
    await global.driver.wait(until.elementIsVisible(element), waitFor);
    await global.driver.wait(until.elementIsEnabled(element), waitFor);
    return global.driver.wait(until.elementLocated(By.css(selector)), waitFor);
  } catch (e) {
    global.logger.error(selector + "Selector not found ..", e);
    return;
  }
}
