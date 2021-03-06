import { sep, extname, dirname } from 'path';
import { NodeId as OpcNodeId } from 'node-opcua';

/**
 * OPC-UA node id types.
 * @type {Map<String, node-opcua~NodeIdType>}
 */
const Type = OpcNodeId.NodeIdType;

/**
 * File extensions to remove
 * @type {String[]}
 */
const ExtensionsToRemove = ['.script', '.display', '.qd'];

/**
 * OPC-UA node id types mapped against node-id identifiers (e.g. i, s ...).
 * @type {Map<String, node-opcua~NodeIdType>}
 */
const TypeForIdentifier = {
  i: Type.NUMERIC,
  s: Type.STRING,
  g: Type.GUID,
  b: Type.BYTESTRING,
};

/**
 * A wrapper around {@link node-opcua~NodeId}.
 */
export default class NodeId extends OpcNodeId {

  /**
   * Creates a new NodeId. Can be called in multiple ways:
   *  - with a {@link node-opcua~NodeIdType}, a value and a namespace (defaults to 0),
   *  - with a value only (type will be taken from it, namespace defaults to 1) or
   *  - with a {@link NodeId}s string representation (e.g. `ns=1;s=AGENT.DISPLAYS`).
   * @param {node-opcua~NodeIdType|String|Number} typeOrValue The type or value to use.
   * @param {(Number|String)} [value] The value to use.
   * @param {Number} [namespace=1] The namespace to use.
   */
  constructor(typeOrValue, value, namespace = 1) {
    if (!(Type.get(typeOrValue))) {
      let m = null;

      if (typeof typeOrValue === 'string') {
        m = typeOrValue.match(/^ns=([0-9]+);(i|s|g|b)=(.*)$/);
      }

      if (m === null) {
        super(
          Number.isNaN(Number.parseInt(typeOrValue, 10)) ? Type.STRING : Type.NUMERIC,
          typeOrValue,
          1
        );
      } else {
        const n = Number.parseInt(m[1], 10);
        const t = TypeForIdentifier[m[2]];
        const v = t === Type.NUMERIC ? Number.parseInt(m[3], 10) : m[3];

        super(t, v, n);
      }
    } else {
      super(typeOrValue, value, namespace);
    }
  }

  /**
   * Creates a new NodeId based on a file path.
   * @param {String} path The file path to use.
   * @return {NodeId} The resulting NodeId.
   */
  static fromFilePath(path) {
    let separator = '.';
    const extension = extname(path);

    // step one directory outside for split files
    if (ExtensionsToRemove.indexOf(extension) > -1) {
      // eslint-disable-next-line no-param-reassign
      path = dirname(path);
    }

    const value = path.split(sep)
      .reduce((result, current) => {
        const next = `${result}${separator}${current}`;

        if (current === 'RESOURCES') {
          separator = '/';
        }

        return next;
      });

    return new NodeId(NodeId.NodeIdType.STRING, value, 1);
  }

  /**
   * The node id's value, encoded to a file path.
   * @type {String}
   */
  get filePath() {
    const parts = this.value.split('RESOURCES');
    parts[0] = parts[0].split('.').join('/');

    return parts.join('RESOURCES');
  }

  /**
   * The node id's browsename as string
   * @type {String}
   */
  get browseName() {
    const lastSeperator = this.value.indexOf('/') > -1 ?
      '/' : '.';

    return this.value.substr(this.value.lastIndexOf(lastSeperator) + 1);
  }

  /**
   * The parent node id
   * @type {NodeId}
   */
  get parentNodeId() {
    const lastSeperator = this.value.indexOf('/') > -1 ?
      '/' : '.';

    return new NodeId(this.value.substr(0, this.value.lastIndexOf(lastSeperator)));
  }


  /**
   * Returns a string in the format 'namespace value' that is printed when inspecting the NodeId
   * using node.js's *util.inspect*.
   * @see https://nodejs.org/api/util.html#util_util_inspect_object_options
   * @param {Number} depth The depth to inspect.
   * @param {Object} options The options to use.
   * @return {String} A string in the format 'namespace value'.
   */
  inspect(depth, options) {
    return [
      options.stylize(this.namespace, 'number'),
      options.stylize(this.value, this.identifierType === Type.NUMERIC ? 'number' : 'string'),
    ].join(' ');
  }
}
