import DeleteServerStream from '../lib/gulp/DeleteServerStream';
import ProjectConfig from '../config/ProjectConfig';

/**
 * Deletes listed atvise server nodes.
 */
export default function deleteServer(callback) {
  return new DeleteServerStream({
    deleteFileName: ProjectConfig.DeleteFileNames.server,
  })
    .on('finish', callback);
}

deleteServer.description = 'Deletes listed nodes from atvise server';
