const { By, until } = require("selenium-webdriver");
const selUtils = require("nashak").seleniumUtils;

const commonFns = {
  // Function to Login to Portal
  createSetup: async function (testcase) {
    try {
      let btn = await findxpath("//*[@id='root']/div/div/main/div[2]/div[1]/button[1]");
      await btn.click();
      let setupName = await global.driver.wait(until.elementLocated(By.xpath("//*[@id='name']")), 10000);
      global.logger.debug("Entering username : %s", testcase.input.setup);
      await selUtils.sendKeys(global.driver, setupName, testcase.input.setup);
      btn = await findxpath("//*[@id='root']/div/div/main/div[2]/div[3]/form/div/div[2]/div/div[4]/button");
      await btn.click();
      let span = await findxpath("//*[@id='root']/div/div/main/div[2]/div[3]/div/div[2]/div/span[contains(.,'Success to create setup')]");
      console.log(span != null);
      btn = await findxpath("//*[@id='root']/div/div/main/div[2]/div[3]/div/div[2]/div/div/button");
      await btn.click();
    } catch (e) {
      global.logger.error("Error in createSetup:", e);
      if (testcase) {
        await selUtils.screenshot(global.driver, testcase);
      }
      throw e;
    }
  },
  findxpath,
  findselector
};

module.exports = commonFns;

async function findxpath(xpath) {
  try {
    global.logger.trace("Inside Find ELement Function");
    let e1 = await global.driver.findElement(By.xpath(xpath));
    // Below code will wait untill the element is visible.
    await global.driver.wait(until.elementIsVisible(e1), 5000);
    global.logger.trace(xpath + " is visible ");
    // Below code will wait untill the element is enabled.
    await global.driver.wait(until.elementIsEnabled(e1), 5000);
    global.logger.trace(xpath + " is enabled ");
    global.logger.trace("locating " + xpath);
    let element = global.driver.wait(until.elementLocated(By.xpath(xpath)), 3000);
    global.logger.info("located " + xpath);
    await global.driver.sleep(400);
    return element;
  } catch (e) {
    global.logger.error(xpath + "Selector not found ..", e);
    return;
  }
}

async function findselector(selector) {
  try {
    global.logger.trace("Inside Find ELement Function");
    let e1 = await global.driver.findElement(By.css(selector));
    // Below code will wait untill the element is visible.
    await global.driver.wait(until.elementIsVisible(e1), 5000);
    global.logger.trace(selector + " is visible ");
    // Below code will wait untill the element is enabled.
    await global.driver.wait(until.elementIsEnabled(e1), 5000);
    global.logger.trace(selector + " is enabled ");
    global.logger.trace("locating " + selector);
    let element = await global.driver.wait(until.elementLocated(By.css(selector)), 3000);
    global.logger.info("located " + selector);
    await global.driver.sleep(400);
    return element;
  } catch (e) {
    global.logger.error(selector + "Selector not found ..", e);
    return;
  }
}
