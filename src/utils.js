/**
 *  filesystem utilities. currently, recursive directory creation.
 *  More may be added in the future.
 **/

const fs = require("fs");
const path = require("path");
const logger = require("log4js").getLogger("nashak");

function mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : "";
  const baseDir = isRelativeToScript ? __dirname : ".";

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
    } catch (err) {
      if (err.code === "EEXIST") {
        // curDir already exists!
        return curDir;
      }

      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === "ENOENT") {
        // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir "${parentDir}"`);
      }

      const caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
      if (!caughtErr || (caughtErr && curDir === path.resolve(targetDir))) {
        throw err; // Throw if it's just the last created dir.
      }
    }
    return curDir;
  }, initDir);
}

/*
 * Returns the next possible file name in a given directory.
 * For example, if a path contains files like img1, img2, then
 * it returns img3 as the next possible name.
 */
function getNextFile(directory, file) {
  return new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) return reject(err);
      let matched = files.filter((f) => f.startsWith(file));
      if (matched.length === 0) return resolve(file + "1");

      // if there are already some files matching the filter,
      // then extract the number part, sort them into array
      // and then check max number.
      let numbered = matched.map((f) => {
        let fileNumber = 0;
        try {
          let fileNameWithoutExt = path.parse(path.basename(f)).name;
          fileNumber = Number(fileNameWithoutExt.split("-")[1]);
          if (isNaN(fileNumber)) fileNumber = 0;
        } catch (e) {
          fileNumber = 0;
          logger.warn("Something caught %s. Ignoring...", e);
        }
        return fileNumber;
      });
      let sorted = numbered.sort((a, b) => a - b);
      return resolve(file + (sorted[sorted.length - 1] + 1));
    });
  });
}

module.exports = {
  mkdirp: mkDirByPathSync,
  getNextFile: getNextFile
};
