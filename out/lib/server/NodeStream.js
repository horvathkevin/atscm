'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _nodeOpcua = require('node-opcua');

var _Stream = require('./Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _NodeId = require('./NodeId');

var _NodeId2 = _interopRequireDefault(_NodeId);

var _ProjectConfig = require('../../config/ProjectConfig');

var _ProjectConfig2 = _interopRequireDefault(_ProjectConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * An object transform stream that browses atvise server and pushes the resulting
 * {@link NodeOpcua.ReferenceDescription}s.
 */
class NodeStream extends _Stream2.default {

  /**
   * Creates a new NodesStream based on the nodes to start browsing at and some options.
   * @param {NodeId[]} nodesToBrowse The nodes to start browsing at.
   * @param {Object} [options] The options to use.
   * @param {NodeId[]} [options.ignoreNodes=ProjectConfig.ignoreNodes] An array of {@link NodeId}s
   * to ignore.
   * @param {Boolean} [options.recursive=true] If the discovered nodes should be browsed as well.
   * @param {Boolean} [options.read=false] If the discovered nodes should be read (*Not
   * implemented yet*).
   */
  constructor(nodesToBrowse, options) {
    if (!nodesToBrowse || !(nodesToBrowse instanceof Array)) {
      throw new Error('nodes is required');
    }

    if (options && options.ignoreNodes !== undefined && !(options.ignoreNodes instanceof Array)) {
      throw new Error('ignoreNodes must be an array of node ids');
    }

    super();

    this.once('session-open', () => this.browseNodes(nodesToBrowse).then(() => this.end()).catch(err => this.emit('error', err)));

    // Handle options
    /**
     * If the discovered nodes should be browsed as well.
     * @type {Boolean}
     */
    this.recursive = true;

    /**
     * If the discovered nodes should be read (*Not implemented yet*).
     * @type {Boolean}
     * @todo Implement
     */
    this.readNodes = false;

    /**
     * An array of {@link NodeId}s to ignore.
     * @type {NodeId[]}
     */
    this.ignoreNodes = _ProjectConfig2.default.ignoreNodes;

    if (options) {
      if (options.read !== undefined) {
        this.readNodes = options.read;
      }

      if (options.recursive !== undefined) {
        this.recursive = options.recursive;
      }

      if (options.ignoreNodes !== undefined) {
        this.ignoreNodes = options.ignoreNodes;
      }
    }

    /**
     * The result mask to use.
     * @type {UInt32}
     */
    this._resultMask = _nodeOpcua.browse_service.makeResultMask('ReferenceType | NodeClass | TypeDefinition');

    /**
     * A regular expression matching all node ids specified in {@link NodeStream#ignoreNodes}
     * @type {RegExp}
     */
    this.ignoredRegExp = new RegExp(`^(${this.ignoreNodes.map(n => n.toString()).join('|')})`);
  }

  /**
   * Browses the given node.
   * @param {NodeId} nodeId The node to browse.
   * @return {Promise<NodeId[], Error>} Fulfilled with the next nodes to browse or rejected with the
   * error that occurred while browsing.
   */
  browseNode(nodeId) {
    const promise = new Promise((resolve, reject) => {
      this.session.browse({
        nodeId,
        browseDirection: _nodeOpcua.browse_service.BrowseDirection.Forward,
        includeSubtypes: true,
        resultMask: this._resultMask
      }, (err, results) => {
        if (err) {
          reject(new Error(`Browsing ${nodeId.toString()} failed: ${err.message}`));
        } else if (!results || results.length === 0) {
          reject(new Error(`Browsing ${nodeId.toString()} failed: No results`));
        } else if (results[0].statusCode > 0) {
          reject(new Error(`Browsing ${nodeId.toString()} failed: Code ${results[0].statusCode}`));
        } else {
          const browseNext = results[0].references
          // Remove parent nodes
          .filter(ref => ref.nodeId.value.toString().split(nodeId.value).length > 1)
          // TODO: Print ignored nodes (debug level)
          .filter(ref => !ref.nodeId.toString().match(this.ignoredRegExp))

          // Remove variable nodes
          .map(ref => {
            // Push all variable ids
            if (ref.nodeClass.value === _nodeOpcua.NodeClass.Variable.value) {
              // "Cast" ref.nodeId to NodeId
              Object.setPrototypeOf(ref.nodeId, _NodeId2.default.prototype);

              // TODO: Use read option to read variable nodes
              this.push(ref);
            }

            return ref.nodeId;
          });

          resolve(browseNext);
        }
      });
    });

    if (this.recursive) {
      return promise.then(childObjectNodes => this.browseNodes(childObjectNodes));
    }

    return promise;
  }

  /**
   * Browses the given nodes.
   * @param {NodeId[]} nodes The nodes to browse.
   * @return {Promise<?NodeId[], Error>} Rejected with the error that occurred, otherwise fulfilled
   * with the next nodes to browse.
   * If {@link NodeStream#recursive} is set to `true` this method is called recursively.
   */
  browseNodes(nodes) {
    return Promise.all(nodes.map(node => this.browseNode(node)));
  }

}
exports.default = NodeStream;