import QueueStream from '../stream/QueueStream';
import Logger from 'gulplog';
import { StatusCodes } from 'node-opcua';
import DiffItem from './DiffItem';
import { createWriteStream } from 'fs';

/**
 * The possible diff states
 * @type {DiffItem.DiffStates}
 */
const states = DiffItem.DiffStates;

/**
 * A stream checks if the given {@link NodeId}s exist on the atvise server or on the filesystem, depending on the
 * stream direction
 */
export default class DiffResultStream extends QueueStream {


  /**
   * Creates a new DiffItemStream.
   * @param {Object} The options to use.
   * @param {String|Path|Buffer} [options.filePath] The diff files path.
   */
  constructor(options = {}) {
    super();

    const filePath = options.filePath || 'diff.log';

    /**
     * The output write stream to create the logfile
     * @type {Stream}
     */
    this.logger = createWriteStream(filePath);
  }

  /**
   * Returns an error message specifically for the given mapping item.
   * @param {DiffFile} file The diff file to create the error message for.
   * @return {String} The specific error message.
   */
  processErrorMessage(file) {
    return `DiffStream#processErrorMessage: Error processing item ${file.toString()}`;
  }


  /**
   * Diffs the given {AtviseFile} with the corresponding atvise server resource or file systsem resource.
   * @param {DiffItem} diffItem The diffItem to process
   * @param {function(err: Error, statusCode: node-opcua~StatusCodes, onSuccess: function)}
   * handleErrors The error handler to call. See {@link QueueStream#processChunk} for details.
   */

  processChunk(diffItem, handleErrors) {
    handleErrors(null, StatusCodes.Good, done => {
      const state = diffItem.state;

      if (state != states.Equal) {
        this.logger.write(`${state} | ${diffItem.path}\n`);
      }

      done();
    });
  }
}

