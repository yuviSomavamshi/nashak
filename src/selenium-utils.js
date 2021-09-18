/**
 *    Utility functions for selenium based test automation.
 *    These functions include (but not limited to):
 *    -- preparation of xpath checking command from xpath syntax
 *    -- preparation of css syntax
 *
 **/

"use strict";

const fs = require("fs");
const path = require("path");
const { By, until } = require("selenium-webdriver");
const logger = require("log4js").getLogger("nashak");
const fsUtils = require("./utils.js");
const BPromise = require("bluebird");

module.exports = {
  /*
   *  Compares an expected predicate expression against the GUI.
   *
   *  @input {object} driver -- the selenium driver instance
   *      that is expected to contain a page which can be used for
   *      checking the presence of elements.
   *
   *  @input {object} 0 -- An object of the form
   *          { type: <type>, val: <val>, timeout: t }
   *       where,
   *        type can be one of css, xpath, id, class
   *        val is the corresponding value expression .
   *        Examples: :
   *        1.  The below object expression defines using css syntax,
   *            that the gui page shall contain a span element having an id "myspan"
   *          {
   *            type:  "css",
   *            val:   "span#myspan"
   *          }
   *
   *        2. Same thing can be written in an anternate way using xpath syntax.
   *          {
   *            type: "xpath",
   *            val:  "//span[@id, "myspan"]
   *          }
   *
   *        3. or simply using a direct id based mapping
   *          {
   *            type: "id",
   *            val:  "span#myspan"  (or simply "#myspan")
   *          }
   *
   */
  compare: function (driver, o) {
    /*
     switch(o.type) {
       case "css":  return driver.wait(until.elementLocated(By[
       case "xpath":
       case "id":
       case "class":
       default:
         throw new Error("Unknown comparison type found.");
     }
     */
    const condition = until.elementLocated(By[o.type](o.val));
    return driver.wait(async (d) => condition.fn(d), 5000);
  },

  /**
   *  Takes screenshot of the UI at the current the moment,
   *  and stores it into a file, using the options provided.
   *
   *  @param driver => The selenium driver instance
   *  @param opts => {
   *    path: "/path/to/store/the/file",  // default: directory where selenium is running, or as set by global options.
   *    filename: "filename",             // default: testcaseid_img.png
   *
   *  }
   **/
  screenshot: async function (driver, testcase, opts) {
    try {
      let imgPath = global.imgPath || ".";

      // Based on which test case is running, append subdir appropriately.
      let buildNo = testcase.buildNo || "";
      let module = path.basename(testcase.module) || "";
      let pathSuffix = `/builds/${buildNo}/${module}/tcs/${testcase.id}/images`;

      // final path resolution and directory creation (if not already existing)
      imgPath = path.resolve(path.join(imgPath, pathSuffix));
      await fsUtils.mkdirp(imgPath);
      let fileName = (await fsUtils.getNextFile(imgPath, "img-")) + ".png";
      let imgFile = path.join(imgPath, fileName);

      let image = await driver.takeScreenshot();
      await fs.writeFileSync(imgFile, image, "base64");
      testcase.screenshot = global.imgBaseUrl + path.join(pathSuffix, fileName);
      console.log("screenshot url:", testcase.screenshot);
    } catch (e) {
      logger.warn("Failed while taking screenshot:", e);
    }
  },

  /**
   * Our very own version of sendkeys for selenium because,
   * the native implementation doesn"t take care of properly
   * waiting for each key to be added to the element, before attempting
   * to add the next one.  This often results in partial entry
   * of characters, mostly by omitting/overriding some chars in between.
   * For example, if we attempt to enter nashak-root, it might get entered
   * as "nashak-root".
   **/
  sendKeys: async function (driver, element, str) {
    let o = { driver: driver, element: element };
    return BPromise.reduce(str, entryFn, o);
  }
};

/*
 * Sends a char to input element.
 * Waits for this char to be available as attribute, before returning.
 */
async function entryFn(o, char) {
  o.text = char;
  await o.element.sendKeys(char);
  let val = await o.element.getAttribute("value");
  if (val != o.text) o.driver.sleep(100);
  o.text += char;
  return o;
}
