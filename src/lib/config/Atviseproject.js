/* eslint-disable no-useless-escape */

import NodeId from '../db/NodeId';

class DisplayTransformer {}
class ScriptTransformer {}

/**
 * An *atvise-scm* project's configuration.
 * @abstract
 */
export default class Atviseproject {

  /**
   * The atvise-server's host. Defaults to *localhost*.
   * @type {String}
   */
  static get host() {
    return 'localhost';
  }

  /**
   * The atvise-server ports to use.
   * @type {Object}
   * @property {Number} [opc=4840] The OPC-UA port the atvise-server runs on.
   * @property {Number} [http=80] The HTTP port the atvise-server can be reached at.
   */
  static get port() {
    return {
      opc: 4840,
      http: 80,
    };
  }

  /**
   * The transformers to use in this project. Defaults to a single {@link DisplayTransformer}
   * @type {Transformer[]}
   */
  static get useTransformers() {
    return [
      new DisplayTransformer(),
      new ScriptTransformer(),
    ];
  }

  /**
   * The atvise-server nodes that atvise-scm should sync. Defaults to
   * `['ns=1;s=AGENT', 'ns=1;s=SYSTEM']`
   * @type {String[]|NodeId[]}
   */
  static get nodes() {
    return [
      new NodeId('ns=1;s=AGENT'),
      new NodeId('SYSTEM'),
      new NodeId('ObjectTypes.PROJECT'),
    ];
  }

  /**
   * The atvise-server nodes to watch in the corresponding tasks. Defaults to all nodes containing
   * displays.
   * @type {String[]|NodeId[]}
   */
  static get nodesToWatch() {
    return [
      new NodeId('AGENT.DISPLAYS'),
      new NodeId('SYSTEM.LIBRARY.PROJECT.OBJECTDISPLAYS'),
    ];
  }

  /**
   * An array of editor related node ids. They should be ignored in a atvise-scm project.
   * @type {NodeId[]}
   */
  static get EditorRelatedNodes() {
    return [
      new NodeId('SYSTEM\.JOURNALS\.ProjectHistory'),
    ];
  }

  /**
   * An array of server related node ids. They should be ignored in a atvise-scm project
   * as they are read-only.
   * @type {NodeId[]}
   */
  static get ServerRelatedNodes() {
    return [
      // eslint-disable-next-line max-len
      new NodeId('AGENT\.HISTORY\..*\.(Stepped|PercentData(Good|Bad)|TreatUncertainAsBad|UseSlopedExtrapolation)'),
      new NodeId('AGENT\.OPCUA\.server_url'),
      new NodeId('AGENT\.WEBACCESS\.https?[0-9]+\.(state|port)'),
      new NodeId('SYSTEM\.INFORMATION\.LOGS\.'),
    ];
  }

  /**
   * These nodes (and their subnodes, if any) will be ignored by atvise-scm. Defaults to
   * {@link Atviseproject.EditorRelatedNodes} combined with
   * {@link Atviseproject.ServerRelatedNodes}.
   * @type {NodeId[]}
   */
  static get ignoreNodes() {
    return this.EditorRelatedNodes.concat(this.ServerRelatedNodes);
  }

  /**
   * Returns an object containing the properties to inspect.
   * @see https://nodejs.org/api/util.html#util_util_inspect_object_options
   * @return {Object} The object to inspect.
   */
  static inspect() {
    return {
      host: this.host,
      port: this.port,
      useTransformers: this.useTransformers,
      nodes: this.nodes,
      nodesToWatch: this.nodesToWatch,
      ignoreNodes: this.ignoreNodes,
    };
  }

}