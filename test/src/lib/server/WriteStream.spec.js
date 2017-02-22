import expect from 'unexpected';
import { stub, spy } from 'sinon';

import { Buffer } from 'buffer';
import { NodeId, DataType, VariantArrayType } from 'node-opcua';
import WriteStream from '../../../../src/lib/server/WriteStream';
import AtviseFile from '../../../../src/lib/server/AtviseFile';

/** @test {WriteStream} */
describe('WriteStream', function() {
  /** @test {WriteStream#writeFile} */
  describe('#writeFile', function() {
    it('should call node-opcua~ClientSession#writeSingleNode', function(done) {
      const stream = new WriteStream();
      stream.once('session-open', () => {
        stub(stream.session, 'writeSingleNode', (node, value, cb) => cb(null, node));
      });

      stream.on('data', () => {}); // Unpause readable stream
      stream.write(new AtviseFile({ path: 'AGENT/DISPLAYS/Main.display' }));

      stream.once('end', () => {
        const writeStub = stream.session.writeSingleNode;
        expect(writeStub.calledOnce, 'to be', true);

        const args = writeStub.lastCall.args;
        expect(args[0], 'to equal', 'ns=1;s=AGENT.DISPLAYS.Main');
        expect(args[1].dataType, 'to equal', DataType.XmlElement);
        expect(args[1].arrayType, 'to equal', VariantArrayType.Scalar);

        done();
      });

      stream.end();
    });
  });

  /** @test {WriteStream#_transform} */
  describe('#_transform', function() {
    it('should wait for session to open', function(done) {
      const stream = new WriteStream();
      stub(stream, 'writeFile', (file, cb) => cb(null));
      spy(stream, '_transform');

      stream.on('data', () => {}); // Unpause readable stream
      stream.write(new AtviseFile({ path: 'AGENT/DISPLAYS/Main.display' }));

      expect(stream._transform.calledOnce, 'to be', true);
      expect(stream.writeFile.callCount, 'to equal', 0);

      stream.once('end', () => {
        expect(stream._transform.calledOnce, 'to be', true);
        expect(stream.writeFile.calledOnce, 'to be', true);
        done();
      });

      stream.end();
    });

    it('should write immediately if session is open', function(done) {
      const stream = new WriteStream();
      stub(stream, 'writeFile', (file, cb) => cb(null));

      stream.on('data', () => {}); // Unpause readable stream

      stream.once('session-open', () => {
        stream.write(new AtviseFile({ path: 'AGENT/DISPLAYS/Main.display' }));
        expect(stream.writeFile.calledOnce, 'to be true');
        stream.end();
      });

      stream.on('end', done);
    });
  });
});