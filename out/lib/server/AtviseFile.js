'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DataTypeForExtension = exports.ExtensionForDataType = undefined;

var _vinyl = require('vinyl');

var _vinyl2 = _interopRequireDefault(_vinyl);

var _nodeOpcua = require('node-opcua');

var _gulplog = require('gulplog');

var _gulplog2 = _interopRequireDefault(_gulplog);

var _Types = require('./Types');

var _Types2 = _interopRequireDefault(_Types);

var _NodeId = require('./NodeId');

var _NodeId2 = _interopRequireDefault(_NodeId);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Path related cache
const AtviseTypesByValue = _Types2.default.reduce((result, type) => Object.assign(result, {
  [type.typeDefinition.value]: type
}), {});

const AtviseTypesByIdentifier = _Types2.default.reduce((result, type) => Object.assign(result, {
  [type.identifier]: type
}), {});

/**
 * A map providing shorter extensions for data types
 * @type {Map<NodeOpcua.DataType, String>}
 */
const ExtensionForDataType = exports.ExtensionForDataType = {
  [_nodeOpcua.DataType.Boolean]: 'bool',
  [_nodeOpcua.DataType.XmlElement]: 'xml'
};

function reverseObject(obj) {
  return Object.keys(obj).reduce((result, key) => Object.assign(result, {
    [obj[key]]: key
  }), {});
}

/**
 * A map providing data types for shorter extensions (Reverse of {@link DataTypeForExtension}).
 * * @type {Map<String, NodeOpcua.DataType>}
 */
const DataTypeForExtension = exports.DataTypeForExtension = reverseObject(ExtensionForDataType);

// Cache DataType
const types = Object.keys(_nodeOpcua.DataType);
const typeExtensions = types.map(t => t.toLowerCase());

// Cache TypeDefinitions
const VariableTypeDefinition = new _NodeId2.default(_NodeId2.default.NodeIdType.NUMERIC, 62, 0);
const PropertyTypeDefinition = new _NodeId2.default(_NodeId2.default.NodeIdType.NUMERIC, 68, 0);

// Cache Regular expressions
const ExtensionRegExp = /\.([^/\\]*)$/;

// Value encoding related cache
const Decoder = {
  [_nodeOpcua.DataType.Boolean]: stringValue => stringValue === 'true',
  [_nodeOpcua.DataType.String]: stringValue => stringValue,
  [_nodeOpcua.DataType.NodeId]: stringValue => (0, _nodeOpcua.resolveNodeId)(stringValue),
  [_nodeOpcua.DataType.DateTime]: stringValue => new Date(Number.parseInt(stringValue, 10))
};

const Encoder = {
  [_nodeOpcua.DataType.DateTime]: date => date.getTime().toString()
};

/**
 * Returns the extension for a specific {@link NodeOpcua.DataType}.
 * Algorithm:
 *   - if the type has a shortened extension defined in {@link ExtensionForDataType}, return it.
 *   - else return the DataType's name, in lowercase letters.
 * @param {NodeOpcua.DataType} dataType The datatype to get the extension for.
 * @return {String} The resulting extension.
 */
function extensionForDataType(dataType) {
  return ExtensionForDataType[dataType] || dataType.toString().toLowerCase();
}

/**
 * An extension to {@link vinyl~File} providing some additional, atvise-related properties.
 * @property {NodeOpcua.DataType} AtviseFile#dataType The {@link NodeOpcua.DataType} the node is
 * stored against on atvise server.
 * @property {NodeId} typeDefinition The file's type definition on atvise server.
 * FIXME: Additional properties not showing in API docs.
 */
class AtviseFile extends _vinyl2.default {

  /**
   * Returns a storage path for a {@link ReadStream.ReadResult}.
   * @param {ReadStream.ReadResult} readResult The read result to get a path for.
   */
  static pathForReadResult(readResult) {
    let path = readResult.nodeId.filePath;

    const dataType = readResult.value.$dataType;
    const arrayType = readResult.value.$arrayType;
    const typeDefinition = readResult.referenceDescription.typeDefinition;

    if (typeDefinition.value === VariableTypeDefinition.value) {
      // Variable nodes are stored with their lowercase datatype as an extension
      path += `.${extensionForDataType(dataType)}`;
    } else if (typeDefinition.value === PropertyTypeDefinition.value) {
      // Property nodes are stored with ".prop" and their lowercase datatype as an extension
      path += `.prop.${extensionForDataType(dataType)}`;
    } else {
      // Handle object types
      let identifier = 'obj';
      let fileExtension = false;
      let keepExtension = false;

      const atType = AtviseTypesByValue[typeDefinition.value];
      if (atType) {
        identifier = atType.identifier;
        fileExtension = atType.fileExtension;
        keepExtension = atType.keepExtension;
      } else {
        process.stdout.clearLine();
        _gulplog2.default.warn('\rMissing', typeDefinition.namespace, typeDefinition.value, `(${readResult.nodeId.value})`);
      }

      if (!keepExtension) {
        path += `.${identifier}.${fileExtension || extensionForDataType(dataType)}`;
      }
    }

    // Add "array" or "matrix" extensions for corresponding array types
    if (arrayType !== _nodeOpcua.VariantArrayType.Scalar) {
      path += `.${arrayType === _nodeOpcua.VariantArrayType.Array ? 'array' : 'matrix'}`;
    }

    return path;
  }

  /**
   * Encodes a node's value to file contents.
   * @param {*} value The value to encode.
   * @param {NodeOpcua.DataType} dataType The {@link NodeOpcua.DataType} to encode the value for.
   * @return {?Buffer} The encoded file contents or null.
   */
  static encodeValue(value, dataType) {
    if (value === null) {
      return null;
    }

    const encoder = Encoder[dataType];
    return Buffer.from(encoder ? encoder(value.value) : value.value.toString());
  }

  /**
   * Decodes a file's contents to a node's value
   * @param {Buffer} buffer The file contents to decode.
   * @param {NodeOpcua.DataType} dataType The {@link NodeOpcua.DataType} to decode the contents for.
   * @return {?*} The decoded node value or null.
   */
  static decodeValue(buffer, dataType) {
    if (buffer === null) {
      return null;
    }

    const decoder = Decoder[dataType];

    if (decoder) {
      return decoder(buffer.toString());
    }

    return buffer;
  }

  /**
   * Creates a new {@link AtviseFile} for the given {@link ReadStream.ReadResult}.
   * @param {ReadStream.ReadResult} readResult The read result to create the file for.
   * @return {AtviseFile} The resulting file.
   */
  static fromReadResult(readResult) {
    if (!readResult.value) {
      throw new Error('no value');
    }

    return new AtviseFile({
      path: AtviseFile.pathForReadResult(readResult),
      contents: AtviseFile.encodeValue(readResult.value, readResult.value.$dataType),
      _dataType: readResult.value.$dataType,
      _arrayType: readResult.value.$arrayType,
      _typeDefinition: readResult.referenceDescription.typeDefinition
    });
  }

  /**
   * Recalculates {@link AtviseFile#dataType}, {@link AtviseFile#arrayType} and
   * {@link AtviseFile#typeDefinition}. **Never call this method directly.**
   */
  _getMetadata() {
    // Set default metadata
    /**
     * The node's stored {@link NodeOpcua.VariantArrayType}.
     * @type {?NodeOpcua.VariantArrayType}
     */
    this._arrayType = _nodeOpcua.VariantArrayType.Scalar;

    let extensions = [];
    extensions = this.relative.match(ExtensionRegExp)[1].split('.');

    function ifLastExtensionMatches(matches, fn) {
      if (matches(extensions[extensions.length - 1])) {
        fn(extensions.pop());
      }
    }

    const complete = () => this._dataType !== undefined && this._typeDefinition !== undefined;

    // Handle array types
    ifLastExtensionMatches(ext => ext === 'array', () => {
      this._arrayType = _nodeOpcua.VariantArrayType.Array;
    });

    ifLastExtensionMatches(ext => ext === 'matrix', () => {
      this._arrayType = _nodeOpcua.VariantArrayType.Matrix;
    });

    ifLastExtensionMatches(ext => typeExtensions.includes(ext), ext => {
      /**
       * The node's stored {@link NodeOpcua.DataType}.
       * @type {?NodeOpcua.DataType}
       */
      this._dataType = _nodeOpcua.DataType[types[typeExtensions.indexOf(ext)]];
    });

    // Handle wrapped data types (e.g. "bool" for DataType.Boolean)
    ifLastExtensionMatches(ext => DataTypeForExtension[ext], ext => {
      this._dataType = _nodeOpcua.DataType[DataTypeForExtension[ext]];
    });

    if (extensions.length === 0) {
      // Got variable
      /**
       * The node's stored type definition.
       * @type {?NodeOpcua.NodeId}
       */
      this._typeDefinition = new _NodeId2.default(_NodeId2.default.NodeIdType.NUMERIC, 62, 0);
    }

    ifLastExtensionMatches(ext => ext === 'prop', () => {
      this._typeDefinition = new _NodeId2.default(_NodeId2.default.NodeIdType.NUMERIC, 68, 0);
    });

    let gotCustomType = false;
    ifLastExtensionMatches(ext => ext === 'obj', () => {
      gotCustomType = true;

      _gulplog2.default.warn('NEED SPECIAL HANDLING');
    });

    if (!gotCustomType && !complete()) {
      // Handle atvise types
      let foundAtType = false;

      Object.keys(AtviseTypesByIdentifier).forEach(identifier => {
        if (!foundAtType && extensions.includes(identifier)) {
          foundAtType = true;
          const type = AtviseTypesByIdentifier[identifier];

          this._typeDefinition = type.typeDefinition;
          this._dataType = type.dataType;
        }
      });
    }

    if (!gotCustomType && !complete()) {
      _gulplog2.default.warn('FALLING BACK TO OCTET STREAM');
      this._typeDefinition = new _NodeId2.default('VariableTypes.ATVISE.Resource.OctetStream');
      this._dataType = _nodeOpcua.DataType.ByteString;
    }

    if (!complete()) {
      _gulplog2.default.warn('Unable to map', this.relative);
    }
  }

  /**
   * The file's {@link NodeOpcua.DataType}.
   * @type {NodeOpcua.DataType}
   */
  get dataType() {
    if (!this._dataType) {
      this._getMetadata();
    }

    return this._dataType;
  }

  /**
   * The file's {@link NodeOpcua.VariantArrayType}.
   * @type {NodeOpcua.VariantArrayType}
   */
  get arrayType() {
    if (!this._arrayType) {
      this._getMetadata();
    }

    return this._arrayType;
  }

  /**
   * The file's type definition.
   * @type {NodeOpcua.NodeId}
   */
  get typeDefinition() {
    if (!this._typeDefinition) {
      this._getMetadata();
    }

    return this._typeDefinition;
  }

  /**
   * `true` for files containing atvise displays.
   * @type {Boolean}
   */
  get isDisplay() {
    return this.typeDefinition.value === 'VariableTypes.ATVISE.Display';
  }

  /**
   * Sets the node value for the file.
   * @param {?*} newValue The value to set.
   */
  set value(newValue) {
    /**
     * The file's contents.
     * @type {?Buffer}
     */
    this.contents = AtviseFile.encodeValue(newValue, this.dataType);
  }

  /**
   * Returns the decoded node value for the file.
   * @return {?*} The file's decoded value.
   */
  get value() {
    return AtviseFile.decodeValue(this.contents, this.dataType);
  }

  /**
   * Returns the node id associated with the file.
   * @return {NodeId} The file's node id.
   */
  get nodeId() {
    const atType = AtviseTypesByValue[this.typeDefinition.value];
    let idPath = this.relative;

    if (!atType || !atType.keepExtension) {
      const exts = idPath.match(ExtensionRegExp)[1];
      idPath = idPath.split(`.${exts}`)[0];
    }

    return _NodeId2.default.fromFilePath(idPath);
  }

}
exports.default = AtviseFile;