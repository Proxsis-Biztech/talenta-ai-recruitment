import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFaceVerificationToken,
  evaluateHumanVerificationAnalysis,
  FaceVerificationError,
  parseImageDataUrl,
  verifyFaceVerificationToken,
  verifyHumanFacePhoto,
  type VisionModelClient
} from './humanFaceVerificationService';

const makeValidJpegDataUrl = (byteSize = 2048): string => {
  const buf = Buffer.alloc(byteSize, 0xab);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
};

describe('humanFaceVerificationService', () => {
  it('parseImageDataUrl accepts valid JPEG and rejects invalid/small/oversized inputs', () => {
    const valid = parseImageDataUrl(makeValidJpegDataUrl(2048));
    assert.equal(valid.mimeType, 'image/jpeg');
    assert.equal(valid.byteLength, 2048);
    assert.equal(valid.imageSha256.length, 64);

    assert.throws(() => parseImageDataUrl(''), (err: unknown) => err instanceof FaceVerificationError && err.statusCode === 400);
    assert.throws(() => parseImageDataUrl('data:text/plain;base64,aGVsbG8='), (err: unknown) => err instanceof FaceVerificationError && err.statusCode === 400);
    assert.throws(() => parseImageDataUrl(makeValidJpegDataUrl(200)), (err: unknown) => err instanceof FaceVerificationError && err.statusCode === 400);
    assert.throws(() => parseImageDataUrl(makeValidJpegDataUrl(2_600_000)), (err: unknown) => err instanceof FaceVerificationError && err.statusCode === 413);
  });

  it('evaluateHumanVerificationAnalysis rejects non-human, spoofed screen, multi-face, missing/unclear face', () => {
    const nonHuman = evaluateHumanVerificationAnalysis(
      { isHuman: false, isLivePhoto: true, faceCount: 1, faceClear: true, isHalfBody: true, spoofReason: 'Terdeteksi boneka atau kartun.' },
      'hash1'
    );
    assert.equal(nonHuman.approved, false);
    assert.match(nonHuman.reason, /boneka/i);

    const screenSpoof = evaluateHumanVerificationAnalysis(
      { isHuman: true, isLivePhoto: false, faceCount: 1, faceClear: true, isHalfBody: true },
      'hash2'
    );
    assert.equal(screenSpoof.approved, false);
    assert.match(screenSpoof.reason, /layar/i);

    const noFace = evaluateHumanVerificationAnalysis(
      { isHuman: true, isLivePhoto: true, faceCount: 0, faceClear: false, isHalfBody: true },
      'hash3'
    );
    assert.equal(noFace.approved, false);

    const multiFace = evaluateHumanVerificationAnalysis(
      { isHuman: true, isLivePhoto: true, faceCount: 2, faceClear: true, isHalfBody: true },
      'hash4'
    );
    assert.equal(multiFace.approved, false);
    assert.match(multiFace.reason, /2 wajah/i);

    const unclear = evaluateHumanVerificationAnalysis(
      { isHuman: true, isLivePhoto: true, faceCount: 1, faceClear: false, isHalfBody: true },
      'hash5'
    );
    assert.equal(unclear.approved, false);

    const faceOnly = evaluateHumanVerificationAnalysis(
      { isHuman: true, isLivePhoto: true, faceCount: 1, faceClear: true, isHalfBody: false },
      'hash5b'
    );
    assert.equal(faceOnly.approved, false);
    assert.match(faceOnly.reason, /setengah badan/i);

    const ok = evaluateHumanVerificationAnalysis(
      { isHuman: true, isLivePhoto: true, faceCount: 1, faceClear: true, isHalfBody: true, spoofReason: '', summary: 'Wajah asli jelas.' },
      'hash6'
    );
    assert.equal(ok.approved, true);
    assert.equal(ok.reason, 'Wajah asli jelas.');
  });

  it('verifyHumanFacePhoto integrates with VisionModelClient and rejects non-human photo cleanly', async () => {
    const dataUrl = makeValidJpegDataUrl(2048);
    const fakeAiHuman: VisionModelClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            isHuman: true,
            isLivePhoto: true,
            faceCount: 1,
            faceClear: true,
            isHalfBody: true,
            spoofReason: '',
            summary: 'Manusia asli terdeteksi dengan jelas.'
          })
        })
      }
    };

    const resOk = await verifyHumanFacePhoto(dataUrl, { aiClient: fakeAiHuman, modelOverride: 'gemini-2.5-flash' });
    assert.equal(resOk.approved, true);

    const fakeAiCartoon: VisionModelClient = {
      models: {
        generateContent: async () => ({
          text: '```json\n{"isHuman":false,"isLivePhoto":true,"faceCount":0,"faceClear":false,"isHalfBody":true,"spoofReason":"Gambar merupakan karakter kartun, bukan manusia asli.","summary":"Ditolak"}\n```'
        })
      }
    };

    const resReject = await verifyHumanFacePhoto(dataUrl, { aiClient: fakeAiCartoon, modelOverride: 'gemini-2.5-flash' });
    assert.equal(resReject.approved, false);
    assert.match(resReject.reason, /kartun/i);
  });

  it('face verification token validates user + image hash and rejects tampering', () => {
    const imgA = makeValidJpegDataUrl(2048);
    const imgB = makeValidJpegDataUrl(2060);
    const parsedA = parseImageDataUrl(imgA);

    const token = createFaceVerificationToken('user-123', parsedA.imageSha256);
    assert.equal(verifyFaceVerificationToken(token, 'user-123', imgA), true);
    assert.equal(verifyFaceVerificationToken(token, 'user-999', imgA), false);
    assert.equal(verifyFaceVerificationToken(token, 'user-123', imgB), false);
    assert.equal(verifyFaceVerificationToken('invalid.jwt.token', 'user-123', imgA), false);
  });
});
