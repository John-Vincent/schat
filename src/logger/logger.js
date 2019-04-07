const path = require('path');
const fs = require('fs');
var logMode = process.env.LOG_MODE;

var Logger = {};

//check/set log mode
if(logMode == 'info' || logMode == 'error' || logMode == 'debug')
{
    Logger.logMode = logMode;
}

//check if filepath env variables are set, if so create some write streams to them
try
{
    //try to resolve log file paths
    var infoLogFilePath = process.env.INFO_LOG_FILE_PATH ? path.resolve(process.env.INFO_LOG_FILE_PATH) : null;
    var errLogFilePath = process.env.ERR_LOG_FILE_PATH ? path.resolve(process.env.ERR_LOG_FILE_PATH) : null;
    var debugLogFilePath = process.env.DEBUG_LOG_FILE_PATH ? path.resolve(process.env.DEBUG_LOG_FILE_PATH) : null;

    //try to create file streams from given file paths
    Logger.errLogFile = process.env.ERR_LOG_FILE_PATH ? fs.createWriteStream(errLogFilePath, {'flags' : 'a'}) : null;
    Logger.debugLogFile = process.env.DEBUG_LOG_FILE_PATH ? fs.createWriteStream(debugLogFilePath, {'flags' : 'a'}) : null;
    Logger.infoLogFile = process.env.INFO_LOG_FILE_PATH ? fs.createWriteStream(infoLogFilePath, {'flags' : 'a'}) : null;

}
catch(err)
{
    console.log("Error creating write stream to one of the specified logging files \n", err);
}

/**
 * Find all the indecies of a given substring
 * @author Matt Bechtel mattbechtel123@gmail.com
 * @date  2018-08-21T19:48:58-050
 * @param  {String}                str  String to search
 * @param  {String}                find Substring to search for
 * @return {Array<String>}                     Array of all indecies of given Substring
 */
function indecies(str, find) {
  var result = [];
  var index = -1;
  while (index < str.length) {
    index = str.indexOf(find, index + 1);
    if (index == -1) break;
    result.push(index);
  }
  return result;
}

/**
 * Format the given filename to only have the immediate package/filename
 * @author Matt Bechtel mattbechtel123@gmail.com
 * @date  2018-08-21T19:51:11-050
 * @param  {String}                filename given filename to format
 * @return {String}                         Formatted filename
 */
function formatFilename(filename)
{
    var slashIndex = 0;
    var slashIndecies = indecies(filename, "/");
    if(slashIndecies.length > 1 && slashIndecies != -1)
    {
        slashIndex = slashIndecies[slashIndecies.length - 2];
    }

    return filename.slice(slashIndex);
}

/**
 * --Only active if env var LOG_MODE equals "error" or "debug"--
 * Print an error message to stdout and a file if specifed by environment variable ERR_LOG_FILE_PATH
 * @author Matt Bechtel mattbechtel123@gmail.com
 * @date  2018-08-21T19:52:06-050
 * @param  {String}                msg      error message
 * @param  {String}                filename filename error came from
 */
Logger.error = (msg, filename) =>
{
    if(Logger.logMode === 'error' || Logger.logMode === 'debug' || Logger.logMode === 'info')
    {
        var writeMsg = typeof msg != String ? JSON.stringify(msg) : msg;

        var formattedError = filename ? "[ERROR " + new Date().toISOString() + " " + formatFilename(filename) + "] " : "[ERROR " + new Date().toISOString() + "] ";
        console.log(formattedError, msg);

        if(Logger.errLogFile)
        {
            Logger.errLogFile.write(formattedError + writeMsg + "\n");
        }

        if(Logger.debugLogFile)
        {
            Logger.debugLogFile.write(formattedError + writeMsg + "\n");
        }
    }
}

/**
 * --Only active if env var LOG_MODE equals "info" or "debug"--
 * Print an info message to stdout and a file if specifed by environment variable INFO_LOG_FILE_PATH
 * @author Matt Bechtel mattbechtel123@gmail.com
 * @date  2018-08-21T19:52:06-050
 * @param  {String}                msg      error message
 * @param  {String}                filename filename error came from
 */
Logger.info = (msg, filename) =>
{
    if(Logger.logMode === 'info' || Logger.logMode === 'debug')
    {
        var writeMsg = typeof msg != String ? JSON.stringify(msg) : msg;

        var formattedInfo = filename ? "[INFO " + new Date().toISOString() + " " + formatFilename(filename) + "] " : "[INFO " + new Date().toISOString() + "] ";
        console.log(formattedInfo, msg);
        if(Logger.infoLogFile)
        {
            Logger.infoLogFile.write(formattedInfo + writeMsg + "\n");
        }

        if(Logger.debugLogFile)
        {
            Logger.debugLogFile.write(formattedInfo + writeMsg + "\n");
        }
    }
}

/**
 * --Only active if env var LOG_MODE="debug"--
 * Print an debug message to stdout and a file if specifed by environment variable DEBUG_LOG_FILE_PATH
 * @author Matt Bechtel mattbechtel123@gmail.com
 * @date  2018-08-21T19:52:06-050
 * @param  {String}                msg      error message
 * @param  {String}                filename filename error came from
 */
Logger.debug = (msg, filename) =>
{
    if(Logger.logMode === 'debug')
    {
        var writeMsg = typeof msg != String ? JSON.stringify(msg) : msg;

        var formattedDebug = filename ? "[DEBUG " + new Date().toISOString() + " " + formatFilename(filename) + "] " : "[DEBUG " + new Date().toISOString() + "] ";
        console.log(formattedDebug, msg);
        if(Logger.debugLogFile)
        {
            Logger.debugLogFile.write(formattedDebug + writeMsg + "\n");
        }
    }
}

module.exports = Logger;
